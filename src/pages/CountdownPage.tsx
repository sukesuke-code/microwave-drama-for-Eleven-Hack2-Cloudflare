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
import { api } from '../api/client';
import { agentNarrate, AgentPhase } from '../api/agent';

interface CountdownPageProps {
  locale: Locale;
  settings: Settings;
  themeMode: ThemeMode;
  onThemeModeChange: (themeMode: ThemeMode) => void;
  onBack: () => void;
  onFinish: () => void;
}

let activeAgentAudio: HTMLAudioElement | null = null;
let activeAgentObjectUrl: string | null = null;
let agentStopRequested = false;
let activeAgentMeterCleanup: (() => void) | null = null;

function stopAgentAudio(): void {
  agentStopRequested = true;
  if (activeAgentMeterCleanup) {
    activeAgentMeterCleanup();
    activeAgentMeterCleanup = null;
  }
  if (activeAgentAudio) {
    activeAgentAudio.pause();
    activeAgentAudio.src = "";
    activeAgentAudio.load();
    activeAgentAudio = null;
  }
  if (activeAgentObjectUrl) {
    URL.revokeObjectURL(activeAgentObjectUrl);
    activeAgentObjectUrl = null;
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const narrationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastQueuedPhaseRef = useRef<AgentPhase | null>(null);

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

  const getPhase = useCallback((tl: number, tt: number): AgentPhase => {
    if (tl <= 0) return 'done';
    const percent = tt > 0 ? (tl / tt) * 100 : 0;
    if (percent > 75) return 'opening';
    if (percent > 50) return 'quarter';
    if (percent > 25) return 'middle';
    return 'final';
  }, []);

  const attachAgentAudioMeter = useCallback((audio: HTMLAudioElement): () => void => {
    const AudioContextImpl = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextImpl) return () => {};

    const audioContext = new AudioContextImpl();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;
    const waveformData = new Uint8Array(analyser.fftSize);
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    let frameId = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(waveformData);
      analyser.getByteFrequencyData(frequencyData);
      let sumSquares = 0;
      for (let i = 0; i < waveformData.length; i += 1) {
        const normalized = (waveformData[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / waveformData.length);
      const level = Math.min(1, rms * 3.8);
      const spectrumBins = 16;
      const nyquist = audioContext.sampleRate / 2;
      const minHz = 90;
      const maxHz = Math.min(9000, nyquist);
      const logMin = Math.log10(minHz);
      const logMax = Math.log10(maxHz);
      const spectrum = Array.from({ length: spectrumBins }, (_, index) => {
        const startRatio = index / spectrumBins;
        const endRatio = (index + 1) / spectrumBins;
        const startHz = Math.pow(10, logMin + (logMax - logMin) * startRatio);
        const endHz = Math.pow(10, logMin + (logMax - logMin) * endRatio);
        const startBin = Math.max(0, Math.floor((startHz / nyquist) * frequencyData.length));
        const endBin = Math.min(
          frequencyData.length,
          Math.max(startBin + 1, Math.ceil((endHz / nyquist) * frequencyData.length))
        );
        let sum = 0;
        for (let i = startBin; i < endBin; i += 1) {
          sum += frequencyData[i];
        }
        const avg = sum / Math.max(1, endBin - startBin);
        return Math.min(1, (avg / 255) * 2.2);
      });

      setTtsLevel(level);
      setTtsSpectrum(spectrum);
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      source.disconnect();
      analyser.disconnect();
      setTtsLevel(0);
      setTtsSpectrum([]);
      void audioContext.close();
    };
  }, []);

  const playAgentAudioBlob = useCallback(async (blob: Blob): Promise<void> => {
    agentStopRequested = false;
    const url = URL.createObjectURL(blob);

    if (activeAgentObjectUrl) {
      URL.revokeObjectURL(activeAgentObjectUrl);
      activeAgentObjectUrl = null;
    }

    const audio = new Audio();
    audio.preload = "auto";
    audio.src = url;
    audio.muted = false;
    audio.volume = 1;
    audio.setAttribute("playsinline", "true");
    activeAgentAudio = audio;
    activeAgentObjectUrl = url;
    activeAgentMeterCleanup = attachAgentAudioMeter(audio);

    try {
      await audio.play();
      await new Promise<void>((resolve, reject) => {
        let completed = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
          if (completed) return;
          completed = true;
          cleanup();
          reject(new Error("Agent audio timed out"));
        }, 30000);

        const cleanup = () => {
          audio.onended = null;
          audio.onerror = null;
          audio.onpause = null;
          if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        };

        audio.onpause = () => {
          if (audio.ended || completed) return;
          if (agentStopRequested) {
            completed = true;
            cleanup();
            reject(new Error("Agent audio stopped"));
            return;
          }
          void audio.play().catch((err) => {
            if (completed) return;
            completed = true;
            cleanup();
            reject(err);
          });
        };

        audio.onended = () => {
          if (completed) return;
          completed = true;
          cleanup();
          resolve();
        };

        audio.onerror = () => {
          if (completed) return;
          completed = true;
          cleanup();
          reject(audio.error ?? new Error("Agent audio playback error"));
        };
      });
    } finally {
      if (activeAgentObjectUrl === url) {
        URL.revokeObjectURL(url);
        activeAgentObjectUrl = null;
      }
      if (activeAgentAudio === audio) {
        activeAgentAudio.src = "";
        activeAgentAudio.load();
        activeAgentAudio = null;
      }
      if (activeAgentMeterCleanup) {
        activeAgentMeterCleanup();
        activeAgentMeterCleanup = null;
      }
    }
  }, [attachAgentAudioMeter]);

  const handlePhaseEffects = useCallback(async (phase: AgentPhase) => {
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
  }, [style]);

  useEffect(() => {
    sessionIdRef.current = sessionStorage.getItem('sessionId');
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const phase = getPhase(timeLeft, totalSeconds);
    if (lastQueuedPhaseRef.current === phase) return;
    lastQueuedPhaseRef.current = phase;

    if (phase === 'done') return;

    narrationQueueRef.current = narrationQueueRef.current
      .then(async () => {
        const situation = {
          foodName: dishName,
          totalTime: totalSeconds,
          remainingTime: timeLeft,
          phase,
          style,
          locale,
        };

        const result = await agentNarrate(situation);

        setNarrationText(result.text);

        if (sessionIdRef.current) {
          await api.saveNarration(sessionIdRef.current, result.text);
        }

        await playAgentAudioBlob(result.audioBlob);
        await handlePhaseEffects(phase);
      })
      .catch((err) => {
        console.error('Agent narration failed:', err);
      });
  }, [isPaused, timeLeft, totalSeconds, dishName, style, locale, getPhase, handlePhaseEffects, playAgentAudioBlob]);

  useEffect(() => {
    return () => {
      stopAgentAudio();
      api.stopMusic();
    };
  }, []);

  useEffect(() => {
    if (isPaused || isFinished) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(intervalRef.current!);
          setIsFinished(true);
          setIsFlashing(true);
          setShowConfetti(true);
          playAlarmTone();
          const finishText = getFinishLine(style, dishName, locale);
          setNarrationText(finishText);

          if (sessionIdRef.current) {
            api.tickSession(sessionIdRef.current, 0).catch((err) => {
              console.error('Failed to tick session on finish:', err);
            });
          }

          setTimeout(() => setIsFlashing(false), 600);
          setTimeout(() => onFinish(), 4000);
          return 0;
        }

        if (sessionIdRef.current) {
          api.tickSession(sessionIdRef.current, next).catch((err) => {
            console.error('Failed to tick session:', err);
          });
        }

        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, isFinished, style, dishName, totalSeconds, onFinish, locale, playAlarmTone]);

  const progressPercent = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0;

  const waveSeed = useMemo(() => {
    const textSeed = narrationText
      .split('')
      .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);
    return textSeed + (totalSeconds - timeLeft) * 31 + waveBeat * 13;
  }, [narrationText, totalSeconds, timeLeft, waveBeat]);

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
