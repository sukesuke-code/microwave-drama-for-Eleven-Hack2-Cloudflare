import { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronLeft, Moon, Sun } from 'lucide-react';
import { Locale, Settings, ThemeMode } from '../types';
import { getCurrentNarration, getFinishLine, getStyleConfigs } from '../data/narrations';
import CircularTimer from '../components/CircularTimer';
import NarrationText from '../components/NarrationText';
import WaveAnimation from '../components/WaveAnimation';
import BackgroundEffect from '../components/BackgroundEffect';
import FlashOverlay from '../components/FlashOverlay';
import Confetti from '../components/Confetti';
import { UI_TEXT } from '../i18n';

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
  const prevNarrationRef = useRef('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const styleConfig = getStyleConfigs(locale).find((s) => s.id === style)!;
  const isDanger = timeLeft <= 10 && timeLeft > 0;
  const isLight = themeMode === 'light';
  const lightBgGradient = style === 'sports'
    ? 'from-sky-50 via-blue-50/80 to-slate-100'
    : 'from-slate-50 via-orange-50/80 to-slate-100';

  const updateNarration = useCallback((tl: number, tt: number) => {
    if (tl <= 0) return;
    const text = getCurrentNarration(tl, tt, style, dishName, locale);
    if (text !== prevNarrationRef.current) {
      prevNarrationRef.current = text;
      setNarrationText(text);
    }
  }, [style, dishName, locale]);

  useEffect(() => {
    const initial = getCurrentNarration(totalSeconds, totalSeconds, style, dishName, locale);
    prevNarrationRef.current = initial;
    setNarrationText(initial);
  }, [totalSeconds, style, dishName, locale]);

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
          const finishText = getFinishLine(style, dishName, locale);
          prevNarrationRef.current = finishText;
          setNarrationText(finishText);
          setTimeout(() => setIsFlashing(false), 600);
          setTimeout(() => onFinish(), 4000);
          return 0;
        }
        updateNarration(next, totalSeconds);
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, isFinished, style, dishName, totalSeconds, updateNarration, onFinish, locale]);

  const progressPercent = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0;

  return (
      <div
      className={`min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-b ${isLight ? lightBgGradient : styleConfig.bgGradient}`}
    >
      <BackgroundEffect style={style} isDanger={isDanger} />
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

      <div className="relative z-20 flex flex-col min-h-screen">
        <div className={`relative flex items-center justify-center px-4 pt-safe pt-4 pb-3 border-b ${isLight ? 'border-slate-200/80 bg-white/75' : 'border-white/5'}`}>
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

        <div className="flex-1 flex flex-col items-center px-4 py-6">
          <div className="flex h-[320px] w-full flex-col items-center justify-start gap-2">
            <CircularTimer
              remaining={timeLeft}
              total={totalSeconds}
              size={240}
              style={style}
            />

            <div className="w-full max-w-xs mt-2">
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

          <div className="mt-2">
            <WaveAnimation style={style} active={!isPaused && !isFinished} />
          </div>

          <div className="mt-6 h-[170px] w-full max-w-sm">
            <NarrationText text={narrationText} style={style} themeMode={themeMode} />
          </div>

          {isDanger && !isFinished && (
            <div
              className={`mt-4 text-center font-display text-lg font-bold tracking-widest uppercase ${styleConfig.textShadowClass}`}
              style={{
                animation: 'dangerPulse 0.5s ease-in-out infinite',
                textShadow: `0 0 15px ${styleConfig.accentColor}`,
              }}
            >
              {t.almostDone}
            </div>
          )}

          {isFinished && (
            <div
              className="text-center font-display text-4xl font-bold animate-scale-in"
              style={{
                color: '#f97316',
                textShadow: '0 0 16px rgba(249,115,22,0.7), 0 0 28px rgba(251,146,60,0.45)',
                filter: 'drop-shadow(0 0 12px rgba(249,115,22,0.35))',
              }}
            >
              {t.done}
            </div>
          )}
        </div>

        <div className="px-4 pb-6 text-center">
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
