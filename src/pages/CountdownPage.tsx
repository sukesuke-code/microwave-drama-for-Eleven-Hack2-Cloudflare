import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, Moon, Sun } from 'lucide-react';
import { Locale, Settings, ThemeMode } from '../types';
import { getFinishLine, getStyleConfigs } from '../data/narrations';
import CircularTimer from '../components/CircularTimer';
import NarrationText from '../components/NarrationText';
import AudioWaveVisualizer from '../components/AudioWaveVisualizer';
import BackgroundEffect from '../components/BackgroundEffect';
import FlashOverlay from '../components/FlashOverlay';
import Confetti from '../components/Confetti';
import { UI_TEXT } from '../i18n';
import {
  getPhaseFromRemainingTime,
  getSignedUrl,
  saveNarration,
  startSession,
  type CountdownPhase,
  updatePhase,
} from '../lib/microwaveAgentApi';
import { AgentConnection, AgentStatus, connectAgent } from '../lib/elevenlabsAgent';

interface CountdownPageProps {
  locale: Locale;
  settings: Settings;
  themeMode: ThemeMode;
  onThemeModeChange: (themeMode: ThemeMode) => void;
  onBack: () => void;
  onFinish: () => void;
}

function getPhaseNarrationText(phase: CountdownPhase, dishName: string, locale: Locale): string {
  const d = dishName || (locale === 'ja' ? '謎の料理' : 'mystery dish');

  if (locale === 'ja') {
    switch (phase) {
      case 'opening':
        return `${d}、スタート！最高の加熱ショーの幕開けです。`;
      case 'quarter':
        return `残り75%！${d}は順調に温まり続けています。`;
      case 'middle':
        return `折り返し通過、${d}が一気に仕上がっていきます。`;
      case 'final':
        return `ラストスパート！${d}の完成まであと少しです。`;
      case 'done':
        return `${d}、完成です！`;
    }
  }

  switch (phase) {
    case 'opening':
      return `${d} is in. The microwave show has begun.`;
    case 'quarter':
      return `75% remaining. ${d} is heating on schedule.`;
    case 'middle':
      return `Halfway through. ${d} is building momentum.`;
    case 'final':
      return `Final stretch. ${d} is almost ready.`;
    case 'done':
      return `${d} is done. Show complete.`;
  }
}

export default function CountdownPage({
  locale,
  settings,
  themeMode,
  onThemeModeChange,
  onBack,
  onFinish,
}: CountdownPageProps) {
  const { totalSeconds: totalTime, dishName: foodName, style } = settings;
  const currentScreen = 'countdown';
  const t = UI_TEXT[locale];
  const [remainingTime, setRemainingTime] = useState(totalTime);
  const [narrationText, setNarrationText] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [waveBeat, setWaveBeat] = useState(0);
  const [sessionId, setSessionId] = useState('');
  const [phase, setPhase] = useState<CountdownPhase>('opening');
  const [latestNarration, setLatestNarration] = useState('');
  const [bestMoment, setBestMoment] = useState('');
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('disconnected');
  const [error, setError] = useState('');

  const timerStartRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const pausedTotalMsRef = useRef(0);
  const prevPhaseRef = useRef<CountdownPhase | null>(null);
  const finishTimeoutRef = useRef<number | null>(null);
  const agentRef = useRef<AgentConnection | null>(null);

  const styleConfig = getStyleConfigs(locale).find((s) => s.id === style)!;
  const isDanger = remainingTime <= 10 && remainingTime > 0;
  const isLight = themeMode === 'light';
  const lightBgGradient = style === 'sports'
    ? 'from-sky-50 via-blue-50/80 to-slate-100'
    : 'from-slate-50 via-orange-50/80 to-slate-100';

  const playAlarmTone = useCallback(() => {
    const AudioContextImpl = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextImpl) return;

    const ctx = new AudioContextImpl();
    const scheduleTone = (offset: number, frequency: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + offset);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.24);
    };

    scheduleTone(0, 880);
    scheduleTone(0.28, 1046.5);
    scheduleTone(0.56, 1318.5);

    window.setTimeout(() => void ctx.close(), 1300);
  }, []);

  const syncNarration = useCallback(async (activeSessionId: string, text: string) => {
    setLatestNarration(text);
    setNarrationText(text);

    if (agentStatus === 'connected' || agentStatus === 'speaking') {
      agentRef.current?.sendText(text);
      setAgentStatus('speaking');
      window.setTimeout(() => {
        setAgentStatus((status) => (status === 'speaking' ? 'connected' : status));
      }, 800);
    }

    try {
      await saveNarration(activeSessionId, text);
    } catch (saveError) {
      console.warn('narration save failed', saveError);
    }
  }, [agentStatus]);

  const handlePhaseTransition = useCallback(async (activeSessionId: string, nextRemainingTime: number) => {
    const nextPhase = getPhaseFromRemainingTime(nextRemainingTime, totalTime);
    if (prevPhaseRef.current === nextPhase) return;

    prevPhaseRef.current = nextPhase;
    setPhase(nextPhase);

    try {
      await updatePhase(activeSessionId, nextRemainingTime);
    } catch (tickError) {
      console.warn('phase update failed', tickError);
    }

    const phaseText = getPhaseNarrationText(nextPhase, foodName, locale);
    void syncNarration(activeSessionId, phaseText);
  }, [foodName, locale, syncNarration, totalTime]);

  const connectWithSignedUrl = useCallback(async () => {
    setAgentStatus('connecting');

    try {
      const signedUrl = await getSignedUrl();
      agentRef.current?.disconnect();
      agentRef.current = connectAgent(signedUrl, {
        onOpen: () => {
          setAgentStatus('connected');
          setError('');
        },
        onSpeaking: () => setAgentStatus('speaking'),
        onText: (text) => {
          setLatestNarration(text);
          setNarrationText(text);
        },
        onClose: () => {
          setAgentStatus((status) => (status === 'error' ? status : 'disconnected'));
        },
        onError: () => {
          setAgentStatus('error');
          setError(locale === 'ja'
            ? '音声接続に失敗しました。テキストのみで継続中です。再接続できます。'
            : 'Voice connection failed. Continuing in text mode. You can retry.');
        },
      });
    } catch {
      setAgentStatus('error');
      setError(locale === 'ja'
        ? 'signed URLの取得に失敗しました。テキストのみで継続中です。再試行してください。'
        : 'Failed to get signed URL. Continuing in text mode. Please retry.');
    }
  }, [locale]);

  useEffect(() => {
    let cancelled = false;

    const initializeSession = async () => {
      setError('');
      try {
        const createdSessionId = await startSession(foodName, totalTime, style);
        if (cancelled) return;

        setSessionId(createdSessionId);
        await connectWithSignedUrl();
        if (cancelled) return;

        const initialPhase = getPhaseFromRemainingTime(totalTime, totalTime);
        prevPhaseRef.current = null;
        setPhase(initialPhase);
        setIsRunning(true);
        timerStartRef.current = Date.now();
        pausedTotalMsRef.current = 0;
      } catch {
        setError(locale === 'ja'
          ? 'セッション開始に失敗しました。設定画面に戻って再試行してください。'
          : 'Failed to start session. Go back and try again.');
        setIsRunning(false);
      }
    };

    void initializeSession();

    return () => {
      cancelled = true;
      if (finishTimeoutRef.current) {
        window.clearTimeout(finishTimeoutRef.current);
      }
      agentRef.current?.disconnect();
    };
  }, [connectWithSignedUrl, foodName, locale, style, totalTime]);

  useEffect(() => {
    if (!isRunning || isPaused || isFinished || !sessionId) return;

    const intervalId = window.setInterval(() => {
      if (!timerStartRef.current) return;

      const elapsedMs = Date.now() - timerStartRef.current - pausedTotalMsRef.current;
      const nextRemainingTime = Math.max(totalTime - Math.floor(elapsedMs / 1000), 0);

      setRemainingTime(nextRemainingTime);
      void handlePhaseTransition(sessionId, nextRemainingTime);

      if (nextRemainingTime <= 0) {
        window.clearInterval(intervalId);
        setIsRunning(false);
        setIsFinished(true);
        setIsFlashing(true);
        setShowConfetti(true);
        playAlarmTone();
        const finishText = getFinishLine(style, foodName, locale);
        setBestMoment(finishText);
        void syncNarration(sessionId, finishText);
        window.setTimeout(() => setIsFlashing(false), 600);
        finishTimeoutRef.current = window.setTimeout(() => onFinish(), 4000);
      }
    }, 200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [foodName, handlePhaseTransition, isFinished, isPaused, isRunning, locale, onFinish, playAlarmTone, sessionId, style, syncNarration, totalTime]);

  useEffect(() => {
    if (!isRunning || isFinished || !sessionId) return;

    if (isPaused) {
      pausedAtRef.current = Date.now();
      return;
    }

    if (pausedAtRef.current) {
      pausedTotalMsRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
  }, [isFinished, isPaused, isRunning, sessionId]);

  const progressPercent = totalTime > 0 ? (remainingTime / totalTime) * 100 : 0;

  const waveSeed = useMemo(() => {
    const textSeed = narrationText
      .split('')
      .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);
    return textSeed + (totalTime - remainingTime) * 31 + waveBeat * 13;
  }, [narrationText, totalTime, remainingTime, waveBeat]);

  const waveIntensity = useMemo<'low' | 'medium' | 'high'>(() => {
    if (isDanger || /[!?！？]/.test(narrationText)) return 'high';
    if (narrationText.length > 42) return 'medium';
    return 'low';
  }, [isDanger, narrationText]);

  useEffect(() => {
    if (isPaused || isFinished) return;

    const punctuationBoost = (narrationText.match(/[!?！？]/g) ?? []).length;
    const lengthBoost = Math.min(5, Math.floor(narrationText.length / 24));
    const tempoScore = Math.max(1, punctuationBoost + lengthBoost + (waveIntensity === 'high' ? 3 : waveIntensity === 'medium' ? 2 : 1));
    const cadenceMs = Math.max(90, 180 - tempoScore * 14);

    const beatTimer = setInterval(() => {
      setWaveBeat((prev) => prev + 1);
    }, cadenceMs);

    return () => clearInterval(beatTimer);
  }, [isPaused, isFinished, narrationText, waveIntensity]);

  return (
      <div
      className={`h-[100dvh] flex flex-col relative overflow-hidden bg-gradient-to-b ${isLight ? lightBgGradient : styleConfig.bgGradient}`}
      data-screen={currentScreen}
      data-session-id={sessionId}
      data-phase={phase}
      data-agent-status={agentStatus}
      data-best-moment={bestMoment}
      data-latest-narration={latestNarration}
    >
      <BackgroundEffect style={style} isDanger={isDanger} themeMode={themeMode} />
      <FlashOverlay visible={isFlashing} />
      {showConfetti && <Confetti />}

      {isDanger && !isFinished && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, ${styleConfig.accentColor}15 100%)`,
            animation: 'vignettePulse 0.5s ease-in-out infinite',
          }}
        />
      )}

      <div className="relative z-20 flex h-full flex-col">
        <div className={`relative flex items-center justify-center px-4 pt-safe pt-3 pb-2 border-b ${isLight ? 'border-slate-200/80 bg-white/75' : 'border-white/5'}`}>
          <button
            onClick={onBack}
            className={`absolute left-4 top-4 rounded-lg p-1 transition-colors ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-300 hover:bg-white/10'}`}
            aria-label="Back to settings"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col items-center text-center">
            <span className={`text-xs uppercase tracking-widest font-bold ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
              {styleConfig.emoji} {styleConfig.label}
            </span>
            <span
              className="text-sm font-bold mt-0.5"
              style={{ color: styleConfig.accentColor }}
            >
              {foodName}
            </span>
          </div>
        </div>

        <div className="absolute right-4 top-4 z-30">
          <button
            onClick={() => onThemeModeChange(isLight ? 'dark' : 'light')}
            className={`flex items-center justify-center rounded-xl p-2 transition-colors ${
              isLight
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700'
            }`}
            aria-label="Dark mode switcher"
          >
            {isLight ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center px-4 py-3">
          <div className="flex h-[250px] w-full flex-col items-center justify-start gap-1 sm:h-[280px] md:h-[320px]">
            <CircularTimer
              remaining={remainingTime}
              total={totalTime}
              size={200}
              style={style}
              locale={locale}
            />

            <div className="w-full max-w-xs mt-3">
              <div className={`h-1 w-full rounded-full overflow-hidden ${isLight ? 'bg-slate-300/80' : 'bg-white/5'}`}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${progressPercent}%`,
                    background: `linear-gradient(90deg, ${styleConfig.accentColor}80, ${styleConfig.accentColor})`,
                    boxShadow: `0 0 8px ${styleConfig.accentColor}60`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-1">
            <AudioWaveVisualizer
              color={styleConfig.accentColor}
              barCount={16}
              intensity={waveIntensity}
              syncSeed={waveSeed}
            />
          </div>

          <div className="mt-3 h-[120px] w-full max-w-sm sm:h-[140px] md:h-[170px]">
            <NarrationText text={narrationText} style={style} themeMode={themeMode} />
          </div>

          {isDanger && !isFinished && (
            <div
              className={`mt-2 translate-y-8 text-center font-display text-base font-bold tracking-widest uppercase sm:text-lg ${styleConfig.textShadowClass}`}
              style={{
                animation: 'dangerPulse 0.5s ease-in-out infinite',
                textShadow: `0 0 15px ${styleConfig.accentColor}`,
              }}
            >
              {t.almostDone}
            </div>
          )}
        </div>

        <div className="px-4 pb-3 text-center">
          <button
            onClick={() => setIsPaused((p) => !p)}
            className={`mb-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              isLight
                ? 'bg-slate-200/90 text-slate-700 hover:bg-slate-300'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {isPaused ? t.resume : t.pause}
          </button>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>
            {totalTime - remainingTime} {t.elapsed} / {totalTime} {t.seconds}
          </p>
          {error && <p className={`mt-1 text-[10px] ${isLight ? 'text-red-600' : 'text-red-400'}`}>{error}</p>}
          {agentStatus === 'error' && !isFinished && (
            <button
              onClick={() => { void connectWithSignedUrl(); }}
              className={`mt-1 inline-flex items-center gap-2 rounded-lg px-3 py-1 text-[10px] font-bold transition-colors ${
                isLight
                  ? 'bg-slate-200/90 text-slate-700 hover:bg-slate-300'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {locale === 'ja' ? '音声接続を再試行' : 'Retry voice connection'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
