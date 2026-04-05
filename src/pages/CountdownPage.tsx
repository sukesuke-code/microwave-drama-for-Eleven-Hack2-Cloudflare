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
import { api, NORMAL_MUSIC_LEVEL, SFX_DEFAULT_VOLUME } from '../api/client';

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

    // Microwave-like "ding-dong" chime.
    scheduleTone(0, 1320, 0.22, 0.22);
    scheduleTone(0.25, 980, 0.28, 0.18);

    window.setTimeout(() => void ctx.close(), 900);
  }, []);

  const getPhase = useCallback((tl: number, tt: number): 'opening' | 'quarter' | 'middle' | 'final' | 'done' => {
    if (tl <= 0) return 'done';
    const percent = tt > 0 ? (tl / tt) * 100 : 0;
    if (percent > 75) return 'opening';
    if (percent > 50) return 'quarter';
    if (percent > 25) return 'middle';
    return 'final';
  }, []);

  const buildNarrationLine = useCallback((tl: number, tt: number) => {
    if (tl <= 0) {
      return getFinishLine(style, dishName, locale);
    }
    return getCurrentNarration(tl, tt, style, dishName, locale);
  }, [style, dishName, locale]);

  const handlePhaseEffects = useCallback(async (phase: 'opening' | 'quarter' | 'middle' | 'final' | 'done') => {
    if (isPausedRef.current || isUnmountedRef.current) return;

    // Helper to generate prompts based on style and move
    const getPrompts = () => {
      switch (style) {
        case 'sports':
          if (phase === 'opening') return { music: 'energetic stadium organ music, high tempo sports broadcast theme', sfx: 'stadium crowd cheering and whistling' };
          if (phase === 'middle') return { sfx: 'referee whistle blow' };
          if (phase === 'final') return { music: 'intense fast-paced percussion, sports countdown climax', sfx: 'crowd chanting' };
          if (phase === 'done') return { music: null, sfx: 'sports game buzzer and massive crowd victory roar' };
          break;
        case 'horror':
          if (phase === 'opening') return { music: 'creepy dissonant strings, horror movie ambient drones', sfx: 'creaky old wooden door opening' };
          if (phase === 'middle') return { sfx: 'sudden high-pitched violin sting' };
          if (phase === 'final') return { music: 'fast heartbeat rhythm, heavy low-end horror suspense', sfx: 'ghostly whisper' };
          if (phase === 'done') return { music: null, sfx: 'blood-curdling cinematic impact and deep silence' };
          break;
        case 'documentary':
          if (phase === 'opening') return { music: 'elegant minimal piano and cello, sophisticated documentary theme', sfx: 'old book pages turning' };
          if (phase === 'middle') return { sfx: 'subtle technological notification chime' };
          if (phase === 'final') return { music: 'grand cinematic orchestral build-up, epic discovery music', sfx: 'clock ticking' };
          if (phase === 'done') return { music: null, sfx: 'professional orchestral final chord' };
          break;
        case 'anime':
          if (phase === 'opening') return { music: 'upbeat high-energy j-pop synth theme, anime opening vibes', sfx: 'magical sparkling transition' };
          if (phase === 'middle') return { sfx: 'anime power-up charging sound effect' };
          if (phase === 'final') return { music: 'epic battle intense electronic rock, anime climax', sfx: 'shimmering sword clash' };
          if (phase === 'done') return { music: null, sfx: 'anime victory jingle and cheerful sparkle' };
          break;
        case 'movie':
          if (phase === 'opening') return { music: 'cinematic trailer underscore, tense strings and brass', sfx: 'deep cinematic bass drop' };
          if (phase === 'middle') return { sfx: 'cinematic whoosh rise' };
          if (phase === 'final') return { music: 'fast rhythmic action thriller percussion, trailer climax', sfx: 'metallic clattering tension' };
          if (phase === 'done') return { music: null, sfx: 'cinematic ending impact hit, short trailer ending' };
          break;
        case 'nature':
          if (phase === 'opening') return { music: 'calm nature ambience, soft wind and acoustic guitar', sfx: 'birds chirping in a forest' };
          if (phase === 'middle') return { sfx: 'soft water splash and rippling sound' };
          if (phase === 'final') return { music: 'airy ethereal pads, peaceful natural wonder music', sfx: 'gentle gust of wind' };
          if (phase === 'done') return { music: null, sfx: 'soft forest chime, gentle resolution' };
          break;
      }
      return null;
    };

    const prompts = getPrompts();
    if (!prompts) return;

    const tasks: Promise<void>[] = [];
    
    if (prompts.music === null) {
      api.stopMusic();
    } else if (prompts.music) {
      tasks.push(api.playMusic(prompts.music).catch(console.error));
    }
    
    if (prompts.sfx) {
      tasks.push(api.playSfx(prompts.sfx).catch(console.error));
    }

    await Promise.all(tasks);
  }, [style]);

  const buildAgentNarrationContext = useCallback((tl: number, phase: 'opening' | 'quarter' | 'middle' | 'final' | 'done') => {
    const availableSeconds = (phase === 'opening' 
      ? Math.max(3, totalSeconds - Math.floor(totalSeconds * 0.75))
      : phase === 'quarter'
      ? Math.max(3, Math.floor(totalSeconds * 0.75) - Math.floor(totalSeconds * 0.5))
      : phase === 'middle'
      ? Math.max(3, Math.floor(totalSeconds * 0.5) - 10)
      : phase === 'final'
      ? 10
      : 8) - 1.0; // Strictly finish 1.0s BEFORE the countdown ends

    return {
      sessionId: sessionIdRef.current ?? undefined,
      style,
      dishName,
      totalTime: totalSeconds,
      remainingTime: tl,
      phase,
      locale,
      availableSeconds: Math.max(1, availableSeconds),
    };
  }, [style, dishName, totalSeconds, locale]);



  const initializationRef = useRef(false);
  useEffect(() => {
    async function initSession() {
      if (initializationRef.current) return;
      initializationRef.current = true;
      
      // Stop all background sounds before starting show to ensure clean start
      api.stopAllAudio();

      if (initialAssets) {
        console.log("[CountdownPage] Using pre-fetched assets for session:", initialAssets.session.sessionId);
        sessionIdRef.current = initialAssets.session.sessionId;
        const mode = initialAssets.session.sessionId.startsWith('local-') ? 'local-fallback' : 'remote';
        setSessionMode(mode);
        sessionStorage.setItem('sessionId', initialAssets.session.sessionId);
        sessionStorage.setItem('sessionMode', mode);
        
        // Use pre-fetched opening narration
        setNarrationText(initialAssets.narrationText);
        phaseRef.current = 'opening';
        lastQueuedNarrationRef.current = initialAssets.narrationText;

        // Play initial audio immediately
        if (!isPausedRef.current && !isUnmountedRef.current) {
          console.log("[CountdownPage] Playing pre-fetched opening audio...");
          
          if (initialAssets.musicAudio) {
            void api.playAudioBlob(initialAssets.musicAudio, { isMusic: true, loop: true, volume: NORMAL_MUSIC_LEVEL }).catch(console.warn);
          }
          if (initialAssets.sfxAudio) {
            void api.playAudioBlob(initialAssets.sfxAudio, { isSfx: true, volume: SFX_DEFAULT_VOLUME }).catch(console.warn);
          }
          
          await api.playAudioBlob(initialAssets.narrationAudio, { 
            onStart: () => setNarrationText(initialAssets.narrationText),
            volume: 1.0
          }).catch(err => {
            const isInterrupted = err instanceof Error && (err.message.includes("stopped") || err.message.includes("interrupted") || err.message.includes("aborted"));
            if (isInterrupted) return;
            console.warn("[CountdownPage] Initial AI narration playback failed, skipping local fallback:", err);
          });
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
    if (isPaused) return;

    const phase = getPhase(timeLeft, totalSeconds);
    if (phaseRef.current === phase) return;
    
    console.log(`[CountdownPage] Phase transition detected: ${phaseRef.current} -> ${phase} (Time: ${timeLeft}s)`);
    phaseRef.current = phase;

    const fallbackLine = buildNarrationLine(timeLeft, totalSeconds);
    
    const context = buildAgentNarrationContext(timeLeft, phase);
    console.log(`[CountdownPage] Queueing narration for phase: ${phase}`);

    ttsQueueRef.current = ttsQueueRef.current
      .then(async () => {
        const isUm = isUnmountedRef.current;
        const isPs = isPausedRef.current;
        const isFn = isFinishedRef.current;
        
        console.log(`[CountdownPage] Task starting for ${phase}. States: unmounted=${isUm}, paused=${isPs}, finished=${isFn}`);

        if (isUm || isPs) return;
        if (isFn && phase !== 'done') return;

        try {
          const preFetched = initialAssets?.allPhases?.[phase];
          
          let currentText = '';
          let playAudio: (onReady?: () => void) => Promise<void>;

          if (preFetched) {
            console.log(`[CountdownPage] Using pre-fetched assets for ${phase}`);
            currentText = preFetched.narrationText;
             playAudio = async (onReady) => {
               const tasks: Promise<void>[] = [];
               
               if (preFetched.narrationAudio) {
                 tasks.push(api.playAudioBlob(preFetched.narrationAudio, { onStart: onReady, volume: 1.0 }));
               } else {
                 console.log(`[CountdownPage] narrationAudio missing for ${phase}, falling back to local TTS`);
                 tasks.push(api.playLocalNarration(currentText, locale, onReady));
               }

               if (preFetched.musicAudio) {
                 tasks.push(api.playAudioBlob(preFetched.musicAudio, { isMusic: true, loop: true, volume: 0.2 }));
               } else if (phase === 'done') {
                 api.stopMusic();
               }

               if (preFetched.sfxAudio) {
                 tasks.push(api.playAudioBlob(preFetched.sfxAudio, { isSfx: true, volume: 0.4 }));
               }
               
               await Promise.all(tasks).catch(err => {
                 console.warn(`[CountdownPage] Audio task part failed for ${phase}:`, err);
               });
             };
          } else {
            console.log(`[CountdownPage] No pre-fetched assets for ${phase}, requesting now...`);
            const narration = await api.requestAgentNarration(context);
            currentText = narration.text;
            playAudio = narration.play;
          }
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

          if (!isPausedRef.current && !isUnmountedRef.current && (!isFinishedRef.current || phase === 'done')) {
            console.log(`[CountdownPage] Executing narration and effects for ${phase}...`);
            
            const effectTask = (!preFetched) ? handlePhaseEffects(phase) : Promise.resolve();
            
            try {
              // Ensure we stop any pending local TTS before starting AI audio
              window.speechSynthesis.cancel();
              await playAudio(triggerTextSync);
            } catch (err) {
              const isInterrupted = err instanceof Error && (err.message.includes("stopped") || err.message.includes("interrupted") || err.message.includes("aborted"));
              if (isInterrupted) return;
              
              // NEW: If we have an AI narration blob, DO NOT fallback to local TTS.
              const assets = (initialAssets && initialAssets.allPhases) ? initialAssets.allPhases[phase] : undefined;
              const hasAiBlob = !!(assets?.narrationAudio);
              
              if (hasAiBlob) {
                console.warn(`[CountdownPage] AI playback failed for ${phase}, but skipping local fallback as requested.`);
                return;
              }

              console.warn(`[CountdownPage] Main playback failed for ${phase}, falling back:`, err);
              await api.playLocalNarration(currentText, locale, triggerTextSync).catch(console.error);
            }

            triggerTextSync();
            await effectTask;

            if (phase === 'done' && !isUnmountedRef.current) {
              console.log("[CountdownPage] final narration finished, preparing result transition...");
              setTimeout(() => {
                if (!isUnmountedRef.current) {
                  api.stopAllAudio();
                  onFinish();
                }
              }, 2000);
            }
          }
        } catch (err) {
          console.error(`[CountdownPage] Phase task failed for ${phase}:`, err);
          if (isUnmountedRef.current || isPausedRef.current) return;

          // Local Fallback
          prevNarrationRef.current = fallbackLine;
          setNarrationText(fallbackLine);
          
          await handlePhaseEffects(phase).catch(() => {});
          
          if (!isPausedRef.current && !isUnmountedRef.current && (!isFinishedRef.current || phase === 'done')) {
            await api.playLocalNarration(fallbackLine, locale).catch(e => console.error("Local fallback failed:", e));
          }
        }
      })
      .finally(() => {
        console.log(`[CountdownPage] Task for phase ${phase} completed/exited.`);
      });
  }, [isPaused, timeLeft, totalSeconds, buildNarrationLine, getPhase, handlePhaseEffects, buildAgentNarrationContext, locale, initialAssets, onFinish]);
    return () => {
      disconnectAgent();
      agentConnectedRef.current = false;
      if (syncClientRef.current) {
        syncClientRef.current.disconnect();
        syncClientRef.current = null;
      }
    };
  }, [totalSeconds, style, dishName, locale, settings.sessionId, settings.aiEnhancedInstruction]);

  useEffect(() => {
    const unsubscribe = api.subscribeTtsMeter(({ level, spectrum }) => {
      setTtsLevel(level);
      setTtsSpectrum(spectrum);
    });
    return () => {
      unsubscribe();
      api.stopTtsPlayback();
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
          api.stopAllAudio(); // Use stopAllAudio to ensure EVERYTHING stops at zero
          const finishText = getFinishLine(style, dishName, locale);
          prevNarrationRef.current = finishText;
          setNarrationText(finishText);

          if (sessionIdRef.current) {
            api.tickSession(sessionIdRef.current, 0).catch((err) => {
              console.error('Failed to tick session on finish:', err);
            });
          }

          flashTimeoutRef.current = setTimeout(() => setIsFlashing(false), 600);
          
          // Safety auto-transition: Go to result after a fixed delay even if narration is slow
          if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
          finishTimeoutRef.current = setTimeout(() => {
            if (!isUnmountedRef.current) {
              api.stopAllAudio();
              onFinish();
            }
          }, 2500); // 2.5s is enough to show finish text+confetti before transition

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

  useEffect(() => () => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
    }
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
