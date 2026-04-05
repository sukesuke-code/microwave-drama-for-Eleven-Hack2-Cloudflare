import { Languages, Moon, Sun, Zap } from 'lucide-react';
import AudioWaveVisualizer from '../components/AudioWaveVisualizer';
import FloatingSpheres from '../components/FloatingSpheres';
import { Locale, ThemeMode } from '../types';
import { UI_TEXT } from '../i18n';
import microwaveShowIcon from '../assets/microwave-show-icon.svg';

interface TopPageProps {
  onStart: () => void;
  locale: Locale;
  themeMode: ThemeMode;
  onLocaleChange: (locale: Locale) => void;
  onThemeModeChange: (themeMode: ThemeMode) => void;
}

export default function TopPage({
  onStart,
  locale,
  themeMode,
  onLocaleChange,
  onThemeModeChange,
}: TopPageProps) {
  const t = UI_TEXT[locale];
  const isLight = themeMode === 'light';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden noise-bg ${isLight ? 'bg-slate-100' : 'bg-[#00031a]'}`}>
      <FloatingSpheres />
      <div
        className={`absolute right-4 top-4 z-30 flex items-center gap-2 rounded-2xl border px-2.5 py-2 backdrop-blur-md ${
          isLight
            ? 'bg-white/90 border-orange-200/80 shadow-[0_0_24px_rgba(249,115,22,0.15)]'
            : 'bg-slate-950/65 border-orange-500/25 shadow-[0_0_26px_rgba(249,115,22,0.2)]'
        }`}
      >
        <div className={`flex items-center gap-1 rounded-xl px-2 py-1 ${isLight ? 'bg-orange-50/90' : 'bg-orange-500/10'}`}>
          <Languages size={14} className={isLight ? 'text-orange-600' : 'text-orange-300'} />
          <select
            value={locale}
            onChange={(e) => onLocaleChange(e.target.value as Locale)}
            className={`text-xs font-semibold bg-transparent pr-1 focus:outline-none ${
              isLight ? 'text-orange-700' : 'text-orange-200'
            }`}
            aria-label="Language switcher"
          >
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </div>
        <button
          onClick={() => onThemeModeChange(isLight ? 'dark' : 'light')}
          className={`flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold transition-colors ${
            isLight
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700'
          }`}
          aria-label="Dark mode switcher"
        >
          {isLight ? <Moon size={14} /> : <Sun size={14} />}
          {isLight ? 'Dark' : 'Light'}
        </button>
      </div>

      <div className="absolute inset-0 pointer-events-none hero-bg-glow" />

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hero-circle-600" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hero-circle-400" />

      <div className="relative z-10 mt-20 md:mt-24 flex flex-col items-center px-6 max-w-2xl w-full">
        <div className="inline-flex flex-col items-stretch mb-8 hero-rise-in [animation-delay:0.05s]">
          <img
            src={microwaveShowIcon}
            alt="Microwave Show icon"
            className="mx-auto mb-4 h-20 w-20 sm:h-24 sm:w-24 select-none drop-shadow-[0_0_20px_rgba(249,115,22,0.45)]"
          />
          <h1
            className={`font-display ${isLight ? 'hero-light-step-blink' : 'hero-blink'} w-full max-w-full whitespace-nowrap text-[clamp(1.75rem,9.2vw,5.4rem)] font-bold text-center mb-2 tracking-tight leading-none inline-flex items-center justify-center gap-1 sm:gap-2 hero-title-main`}
          >
            <Zap className="text-orange-300/90 h-[clamp(1.8rem,8.2vw,5.5rem)] w-[clamp(1.8rem,8.2vw,5.5rem)] shrink-0" strokeWidth={1.8} fill="none" />
            <span>{t.topTitle}</span>
            <Zap className="text-orange-300/90 h-[clamp(1.8rem,8.2vw,5.5rem)] w-[clamp(1.8rem,8.2vw,5.5rem)] shrink-0" strokeWidth={1.8} fill="none" />
          </h1>

          <div className="h-px w-full hero-divider" />
        </div>

        <p
          className={`${isLight ? 'hero-copy-blink hero-copy-light' : 'hero-copy-blink'} hero-rise-in text-center text-base leading-relaxed mb-2 font-medium ${isLight ? 'text-slate-700' : 'text-slate-300/80'} [animation-delay:0.35s]`}
        >
          {t.topTagline1}
        </p>
        <p
          className={`${isLight ? 'hero-copy-blink hero-copy-light' : 'hero-copy-blink'} hero-rise-in text-center text-lg font-bold mb-10 ${isLight ? 'text-slate-900' : 'text-white'} [animation-delay:0.7s]`}
        >
          {t.topTagline2}
        </p>

        <div className={`${isLight ? 'hero-section-blink-light' : 'hero-section-blink'} hero-rise-in mb-4 flex flex-wrap items-center justify-center gap-2 text-xs [animation-delay:1s]`}>
          <span>{t.styleShort[0]}</span>
          <span className="text-slate-600">·</span>
          <span>{t.styleShort[1]}</span>
          <span className="text-slate-600">·</span>
          <span>{t.styleShort[2]}</span>
          <span className="text-slate-600">·</span>
          <span>{t.styleShort[3]}</span>
        </div>

        <div className="hero-rise-in w-full flex justify-center [animation-delay:1.3s]">
          <button
            onClick={onStart}
            className={`relative group my-10 w-full max-w-xs py-5 rounded-2xl font-display text-2xl font-bold tracking-widest text-white uppercase overflow-hidden ${isLight ? 'start-button-blink start-button-blink-light' : 'start-button-blink'} ${isLight ? 'hero-start-btn-light' : 'hero-start-btn-dark'} [animation-delay:1.3s]`}
          >
            <span className="relative z-10">{t.startButton}</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hero-start-btn-hover" />
            <div className="absolute inset-0 group-hover:animate-glow-pulse" />
          </button>
        </div>

        <div className={`${isLight ? 'hero-section-blink-light' : 'hero-section-blink'} hero-rise-in mt-3 text-xs text-center w-full max-w-xs [animation-delay:1.6s]`}>
          <div className="flex flex-col items-center gap-2">
          <AudioWaveVisualizer color="#f97316" barCount={16} inverted motionProfile="classic" />
          <span className="text-xs">{t.startHint}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
