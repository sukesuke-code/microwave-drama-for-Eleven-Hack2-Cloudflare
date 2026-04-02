import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Moon, RotateCcw, Share2, Sun } from 'lucide-react';
import { Locale, Settings, ThemeMode } from '../types';
import { getStyleConfigs } from '../data/narrations';
import { RESULT_MESSAGES, UI_TEXT } from '../i18n';
import microwaveShowIcon from '../assets/microwave-show-icon.svg';

interface ResultPageProps {
  locale: Locale;
  settings: Settings;
  themeMode: ThemeMode;
  onThemeModeChange: (themeMode: ThemeMode) => void;
  onReplay: () => void;
  onHome: () => void;
  onTop: () => void;
}

interface AutoFitSingleLineTextProps {
  text: string;
  className?: string;
  minPx?: number;
  maxPx?: number;
}

function AutoFitSingleLineText({
  text,
  className = '',
  minPx = 13,
  maxPx = 26,
}: AutoFitSingleLineTextProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [fontPx, setFontPx] = useState(maxPx);

  useLayoutEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const fit = () => {
      let next = maxPx;
      el.style.fontSize = `${next}px`;

      while (next > minPx && el.scrollWidth > el.clientWidth) {
        next -= 1;
        el.style.fontSize = `${next}px`;
      }
      setFontPx(next);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    if (el.parentElement) observer.observe(el.parentElement);

    return () => observer.disconnect();
  }, [text, minPx, maxPx]);

  return (
    <span
      ref={spanRef}
      className={`block w-full whitespace-nowrap overflow-hidden ${className}`}
      style={{ fontSize: `${fontPx}px` }}
      title={text}
    >
      {text}
    </span>
  );
}

export default function ResultPage({
  locale,
  settings,
  themeMode,
  onThemeModeChange,
  onReplay,
  onHome,
  onTop,
}: ResultPageProps) {
  const { dishName, style, totalSeconds } = settings;
  const t = UI_TEXT[locale];
  const styleConfig = getStyleConfigs(locale).find((s) => s.id === style)!;
  const isLight = themeMode === 'light';
  const summaryLabels = locale === 'ja'
    ? { dish: '料理', time: '加熱時間', narration: '実況スタイル' }
    : { dish: 'Dish', time: 'Cook Time', narration: 'Narration Style' };

  const handleShare = async () => {
    const text = locale === 'ja'
      ? `チンドラマで「${dishName}」を完璧に温め直した！\n\n#チンドラマ #ChingDrama #電子レンジ`
      : `I reheated "${dishName}" perfectly with Ching Show!\n\n#ChingShow #Microwave`;
    if (navigator.share) {
      await navigator.share({ text }).catch(() => null);
    } else {
      await navigator.clipboard.writeText(text).catch(() => null);
      alert(t.shareCopied);
    }
  };

  const randomMessage = useMemo(() => {
    const messages = RESULT_MESSAGES[locale][style];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [locale, style]);
  const subtitleText = locale === 'ja'
    ? `${dishName}の${totalSeconds}秒が、ついに幕を閉じたー`
    : `${dishName}'s ${totalSeconds}s has finally come to an end—`;
  return (
    <div
      className={`h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b ${
        isLight ? 'from-slate-50 via-orange-50/70 to-slate-100' : `${styleConfig.bgGradient} bg-[#00031a]`
      }`}
    >
      <div className="absolute right-4 top-4 z-30">
        <button
          onClick={() => onThemeModeChange(isLight ? 'dark' : 'light')}
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
            isLight
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700'
          }`}
          aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {isLight ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
      <button
        onClick={onTop}
        className={`absolute left-4 top-4 z-30 rounded-xl p-1.5 transition-colors ${
          isLight ? 'bg-white/85 hover:bg-white' : 'bg-slate-900/65 hover:bg-slate-900/90'
        }`}
        aria-label="Back to landing page"
      >
        <img src={microwaveShowIcon} alt="Microwave Show icon" className="h-7 w-7" />
      </button>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${styleConfig.accentColor}10 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex h-full w-full max-w-md flex-col items-center justify-between px-4 pb-3 pt-14 text-center hero-rise-in sm:px-6 sm:pb-6 sm:pt-16">
        <div
          className="result-complete-orb h-16 w-16 rounded-full flex items-center justify-center mb-2 sm:h-24 sm:w-24 sm:mb-6"
          style={{
            border: `2px solid ${styleConfig.accentColor}40`,
            boxShadow: `0 0 24px ${styleConfig.accentColor}40, inset 0 0 16px ${styleConfig.accentColor}25`,
          }}
        >
          <span
            role="img"
            aria-label="celebration"
            className="text-3xl leading-none select-none sm:text-4xl"
            style={{
              filter: `drop-shadow(0 0 12px ${styleConfig.accentColor}99) drop-shadow(0 0 20px ${styleConfig.accentColor}66)`,
              transform: 'translateY(-1px)',
            }}
          >
            🎉
          </span>
        </div>

        <h1 className={`font-display text-3xl sm:text-4xl font-bold mb-1 sm:mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          {t.dramaDone}
        </h1>

        <div
          className="my-2 sm:my-6 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border w-full"
          style={{
            borderColor: `${styleConfig.accentColor}30`,
            background: `${styleConfig.accentColor}08`,
          }}
        >
          <p
            className="text-base font-medium italic leading-relaxed"
            style={{ color: `${styleConfig.accentColor}cc` }}
          >
            「{randomMessage}」
          </p>
        </div>

        <div className="mb-2 sm:mb-3 w-full px-1">
          <AutoFitSingleLineText
            text={subtitleText}
            minPx={12}
            maxPx={23}
            className={`text-center whitespace-nowrap font-normal tracking-tight ${
              isLight ? 'text-slate-700' : 'text-slate-300'
            }`}
          />
        </div>

        <div
          className={`mb-2 sm:mb-3 w-full rounded-[1.75rem] border px-4 sm:px-6 py-3 sm:py-5 text-left ${
            isLight
              ? 'border-slate-300 bg-slate-100/85'
              : 'border-slate-700/70 bg-slate-900/55'
          }`}
        >
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 sm:gap-x-6 gap-y-2.5 sm:gap-y-3.5">
            <p className={`text-sm sm:text-base font-semibold whitespace-nowrap ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{summaryLabels.dish}</p>
            <AutoFitSingleLineText
              text={dishName}
              className={`justify-self-end text-right font-black leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}
            />

            <p className={`text-sm sm:text-base font-semibold whitespace-nowrap ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{summaryLabels.time}</p>
            <AutoFitSingleLineText
              text={`${totalSeconds}${locale === 'ja' ? '秒' : 's'}`}
              className={`justify-self-end text-right font-black leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}
            />

            <p className={`text-sm sm:text-base font-semibold whitespace-nowrap ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{summaryLabels.narration}</p>
            <AutoFitSingleLineText
              text={`${styleConfig.emoji} ${styleConfig.label}`}
              className={`justify-self-end text-right font-black leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:gap-3 w-full">
          <button
            onClick={onReplay}
            className="replay-gradient-button flex items-center justify-center gap-3 w-full py-3 sm:py-4 rounded-2xl font-bold text-white text-base sm:text-lg transition-all active:scale-95"
            style={{
              background: `linear-gradient(120deg, ${styleConfig.accentColor}e0, ${styleConfig.accentColor}, #f97316, ${styleConfig.accentColor})`,
              backgroundSize: '220% 220%',
              boxShadow: `0 0 20px ${styleConfig.accentColor}40`,
            }}
          >
            <RotateCcw size={20} />
            {t.replay}
          </button>

          <button
            onClick={handleShare}
            className={`flex items-center justify-center gap-3 w-full py-3 sm:py-4 rounded-2xl font-bold text-sm sm:text-base border transition-all active:scale-95 ${
              isLight
                ? 'text-slate-700 bg-white border-slate-200 hover:bg-slate-100'
                : 'text-slate-300 bg-white/5 border-white/10 hover:bg-white/8'
            }`}
          >
            <Share2 size={18} />
            {t.share}
          </button>

          <button
            onClick={onHome}
            className={`text-xs sm:text-sm py-1.5 sm:py-2 transition-colors ${isLight ? 'text-slate-600 hover:text-slate-700' : 'text-slate-500 hover:text-slate-400'}`}
          >
            {t.backTop}
          </button>
        </div>
      </div>
    </div>
  );
}
