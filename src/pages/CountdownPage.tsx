import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, Moon, Sun } from 'lucide-react';
import { Locale, Settings, ThemeMode } from '../types';
import { getCurrentNarration, getFinishLine, getStyleConfigs } from '../data/narrations';
import CircularTimer from '../components/CircularTimer';
import NarrationText from '../components/NarrationText';
import AudioWaveVisualizer from '../components/AudioWaveVisualizer';
import BackgroundEffect from '../components/BackgroundEffect';
import FlashOverlay from '../components/FlashOverlay';
import Confetti from '../components/Confetti';
import { UI_TEXT } from '../i18n';
import {
  connectAgent,
  disconnectAgent,
  sendUserMessage,
  subscribeAgentMeter,
  isAgentConnected,
} from '../api/elevenlabs-agent';
import type { AgentCallbacks, DynamicVars } from '../api/elevenlabs-agent';
import { api } from '../api/client';

type SessionPhase = 'opening' | 'quarter' | 'middle' | 'final' | 'done';

interface CountdownPageProps {
  locale: Locale;
  settings: Settings;
  themeMode: ThemeMode;
  onThemeModeChange: (themeMode: ThemeMode) => void;
  onBack: () => void;
  onFinish: () => void;
}

export default function CountdownPage({
  locale,
  settings,
  themeMode,
  onThemeModeChange,
  onBack,
  onFinish,
}: CountdownPageProps) {
  const { totalSeconds, dishName, style } = settings;
  const t = UI_TEXT[locale];
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [narrationText, setNarrationText] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [waveBeat, setWaveBeat] = useState(0);
  const [ttsLevel, setTtsLevel] = useState(0);
  const [ttsSpectrum, setTtsSpectrum] = useState<number[]>([]);
  const [agentStatus, setAgentStatus] = useState<string>('disconnected');
  const prevNarrationRef = useRef('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<SessionPhase | null>(null);
  const agentConnectedRef = useRef(false);
  const narrationRequestInFlightRef = useRef(false);
  const timeLeftRef = useRef(totalSeconds);
  const syncClientRef = useRef<any>(null);

  const styleConfig = getStyleConfigs(locale).find((s) => s.id === style)!;
  const isDanger = timeLeft <= 10 && timeLeft > 0;
  const isLight = themeMode === 'light';
  const lightBgGradient = style === 'sports'
    ? 'from-sky-50 via-blue-50/80 to-slate-100'
    : 'from-slate-50 via-orange-50/80 to-slate-100';

  const playAlarmTone = useCallback(() => {
    const AudioContextImpl = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextImpl) return;

    const ctx = new AudioContextImpl();
    const scheduleTone = (offset: number, frequency: number, duration: number, peakGain: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + offset);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(peakGain, ctx.currentTime + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + duration + 0.02);
    };

    scheduleTone(0, 1320, 0.22, 0.22);
    scheduleTone(0.25, 980, 0.28, 0.18);
    window.setTimeout(() => void ctx.close(), 900);
  }, []);

  const getPhase = useCallback((tl: number, tt: number): SessionPhase => {
    if (tl <= 0) return 'done';
    const percent = tt > 0 ? (tl / tt) * 100 : 0;
    if (percent > 75) return 'opening';
    if (percent > 50) return 'quarter';
    if (percent > 25) return 'middle';
    return 'final';
  }, []);

  // Build the "current situation" message for the Agent
  const buildSituationMessage = useCallback((tl: number, phase: SessionPhase): string => {
    const elapsed = totalSeconds - tl;
    const pct = totalSeconds > 0 ? Math.round((tl / totalSeconds) * 100) : 0;

    return [
      `--- Current Situation ---`,
      `dish: ${dishName}`,
      `style: ${style}`,
      `phase: ${phase}`,
      `totalTime: ${totalSeconds}s`,
      `remainingTime: ${tl}s`,
      `elapsed: ${elapsed}s`,
      `progress: ${100 - pct}%`,
      `locale: ${locale}`,
      `ai_director_instruction: ${settings.aiEnhancedInstruction || 'none'}`,
      ``,
      `Create one short vivid narration line for this exact moment.`,
      `Stay fully in character for the ${style} style.`,
      `Match sound and energy to the ${phase} phase.`,
    ].join('\n');
  }, [dishName, style, totalSeconds, locale, settings.aiEnhancedInstruction]);

  // Play local SFX/music effects per phase
  const handlePhaseEffects = useCallback(async (phase: SessionPhase) => {
    try {
      if (style === 'movie') {
        if (phase === 'done') {
          api.stopMusic();
          await api.playSfx('cinematic ending impact, short trailer hit');
          return;
        }
        if (phase === 'opening') {
          await api.playMusic('cinematic trailer underscore, tense and dramatic');
        }
        if (phase === 'middle' || phase === 'final') {
          await api.playSfx('cinematic whoosh rise, short transition');
        }
        return;
      }

      if (style === 'nature') {
        if (phase === 'done') {
          api.stopMusic();
          await api.playSfx('soft forest chime, gentle resolution');
          return;
        }
        if (phase === 'opening') {
          await api.playMusic('calm nature ambience, soft wind and birds');
        }
        if (phase === 'middle' || phase === 'final') {
          await api.playSfx('light natural rustle and airy swell');
        }
      }
    } catch (e) {
      console.warn('Phase effects failed (non-critical):', e);
    }
  }, [style]);

  // ---------- Agent connection ----------
  useEffect(() => {
    const initial = getCurrentNarration(totalSeconds, totalSeconds, style, dishName, locale);
    prevNarrationRef.current = initial;
    setNarrationText(initial);

    const dynamicVars: DynamicVars = {
      dish_name: dishName,
      style: style,
      total_time: String(totalSeconds),
      remaining_time: String(totalSeconds),
      phase: 'opening',
      locale: locale,
      ai_instruction: settings.aiEnhancedInstruction || '',
    };

    const callbacks: AgentCallbacks = {
      onStatusChange: (status) => {
        setAgentStatus(status);
        agentConnectedRef.current = status === 'connected';
      },
      onAgentText: (text) => {
        // Agent sent narration text → display it
        if (text && text.trim()) {
          prevNarrationRef.current = text;
          setNarrationText(text);
        }
        narrationRequestInFlightRef.current = false;
      },
      onAgentAudioDone: () => {
        narrationRequestInFlightRef.current = false;
      },
      onError: (err) => {
        console.warn('ElevenLabs agent error:', err.message);
        agentConnectedRef.current = false;
      },
    };

    connectAgent(dynamicVars, callbacks).catch((err) => {
      console.warn('Agent connect failed, using local fallback:', err);
      agentConnectedRef.current = false;
    });

    // Sub-routine: Connect to Durable Objects Backend if a Session ID exists
    if (settings.sessionId) {
      import('../api/session-sync').then(({ SessionSyncClient }) => {
        const client = new SessionSyncClient(
          settings.sessionId!,
          (state) => {
            setIsPaused(state.isPaused);
          },
          (tl) => {
            setTimeLeft(tl);
            timeLeftRef.current = tl;
          }
        );
        client.connect();
        syncClientRef.current = client;
      }).catch(e => console.error("Sync client import fail:", e));
    }

    return () => {
      disconnectAgent();
      agentConnectedRef.current = false;
      if (syncClientRef.current) {
        syncClientRef.current.disconnect();
        syncClientRef.current = null;
      }
    };
  }, [totalSeconds, style, dishName, locale, settings.sessionId, settings.aiEnhancedInstruction]);

  // ---------- Agent meter → visualizer ----------
  useEffect(() => {
    const unsub = subscribeAgentMeter(({ level, spectrum }) => {
      setTtsLevel(level);
      setTtsSpectrum(spectrum);
    });
    return () => {
      unsub();
    };
  }, []);

  // ---------- Phase-based narration triggers ----------
  const handleTogglePause = () => {
    if (isFinished) return;
    setIsPaused((p) => {
      const next = !p;
      if (syncClientRef.current) {
        if (next) syncClientRef.current.pause();
        else syncClientRef.current.resume();
      }
      return next;
    });
  };

  useEffect(() => {
    if (isPaused) return;

    const phase = getPhase(timeLeft, totalSeconds);
    if (phaseRef.current === phase) return;
    phaseRef.current = phase;

    // If agent is connected, send situation
    if (agentConnectedRef.current && isAgentConnected()) {
      if (!narrationRequestInFlightRef.current) {
        narrationRequestInFlightRef.current = true;
        const situationMsg = buildSituationMessage(timeLeft, phase);
        sendUserMessage(situationMsg);
      }
    } else {
      // Fallback: local narration
      const fallbackLine = timeLeft <= 0
        ? getFinishLine(style, dishName, locale)
        : getCurrentNarration(timeLeft, totalSeconds, style, dishName, locale);
      prevNarrationRef.current = fallbackLine;
      setNarrationText(fallbackLine);

      api.playLocalNarration(fallbackLine, locale).catch((e) => {
        console.warn('Local TTS fallback failed:', e);
      });
    }

    // SFX/music effects regardless
    void handlePhaseEffects(phase);
  }, [isPaused, timeLeft, totalSeconds, getPhase, buildSituationMessage, handlePhaseEffects, style, dishName, locale]);

  // ---------- Countdown timer ----------
  useEffect(() => {
    if (isPaused || isFinished) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        timeLeftRef.current = next;

        if (next <= 0) {
          clearInterval(intervalRef.current!);
          setIsFinished(true);
          setIsFlashing(true);
          setShowConfetti(true);
          playAlarmTone();

          const finishText = getFinishLine(style, dishName, locale);
          prevNarrationRef.current = finishText;
          setNarrationText(finishText);

          // Tell the agent too
          if (agentConnectedRef.current && isAgentConnected()) {
            sendUserMessage(buildSituationMessage(0, 'done'));
          }

          flashTimeoutRef.current = setTimeout(() => setIsFlashing(false), 600);
          finishTimeoutRef.current = setTimeout(() => {
            disconnectAgent();
            onFinish();
          }, 4000);
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, isFinished, style, dishName, totalSeconds, onFinish, locale, playAlarmTone, buildSituationMessage]);

  // ---------- Cleanup ----------
  useEffect(() => () => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
  }, []);

  const progressPercent = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0;

  const narrationSeed = useMemo(() => narrationText
    .split('')
    .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0), [narrationText]);

  const waveSeed = useMemo(
    () => narrationSeed + (totalSeconds - timeLeft) * 31 + waveBeat * 13,
    [narrationSeed, totalSeconds, timeLeft, waveBeat]
  );

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

  // Agent status badge
  const statusLabel = agentStatus === 'connected'
    ? (locale === 'ja' ? '🟢 AI接続中' : '🟢 AI Connected')
    : agentStatus === 'connecting'
    ? (locale === 'ja' ? '🟡 AI接続中...' : '🟡 Connecting...')
    : (locale === 'ja' ? '🔴 ローカルモード' : '🔴 Local Mode');

  return (
      <div
      className={`h-[100dvh] flex flex-col relative overflow-hidden bg-gradient-to-b ${isLight ? lightBgGradient : styleConfig.bgGradient} page-container`}
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
              {dishName}
            </span>
          </div>
        </div>

        {/* Agent status indicator */}
        <div className="mx-4 mt-2 text-center">
          <span className={`inline-block rounded-full px-3 py-0.5 text-[10px] font-bold ${
            agentStatus === 'connected'
              ? isLight ? 'bg-green-100 text-green-700' : 'bg-green-900/30 text-green-300'
              : agentStatus === 'connecting'
              ? isLight ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-900/30 text-yellow-300'
              : isLight ? 'bg-red-100 text-red-700' : 'bg-red-900/30 text-red-300'
          }`}>
            {statusLabel}
          </span>
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
              remaining={timeLeft}
              total={totalSeconds}
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
              audioLevel={ttsLevel}
              audioSpectrum={ttsSpectrum}
              mode="bars"
              motionProfile="classic"
              addBaseMotion
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
            {totalSeconds - timeLeft} {t.elapsed} / {totalSeconds} {t.seconds}
          </p>
        </div>
      </div>
    </div>
  );
}
