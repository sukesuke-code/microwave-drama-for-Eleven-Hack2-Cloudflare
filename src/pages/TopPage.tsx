import { Languages, Moon, Sun, Zap } from 'lucide-react';
import AudioWaveVisualizer from '../components/AudioWaveVisualizer';
import FloatingSpheres from '../components/FloatingSpheres';
import { Locale, ThemeMode } from '../types';
import { UI_TEXT } from '../i18n';

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

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(249,115,22,0.08) 0%, transparent 70%)',
        }}
      />

      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          border: '1px solid rgba(249,115,22,0.06)',
          boxShadow: '0 0 80px rgba(249,115,22,0.04)',
        }}
      />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          border: '1px solid rgba(249,115,22,0.08)',
        }}
      />

      <div className="relative z-10 mt-12 md:mt-16 flex flex-col items-center px-6 max-w-md w-full">
        <div className="inline-flex flex-col items-stretch mb-8">
          <h1
            className="font-display text-5xl md:text-6xl font-bold text-center mb-2 tracking-tight whitespace-nowrap soft-glow-pulse inline-flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #ff6b35 0%, #f97316 40%, #fbbf24 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 20px rgba(249,115,22,0.5))',
            }}
          >
            <Zap size={64} className="text-orange-300/90 shrink-0" strokeWidth={1.8} fill="none" />
            <span>{t.topTitle}</span>
            <Zap size={64} className="text-orange-300/90 shrink-0" strokeWidth={1.8} fill="none" />
          </h1>

          <div
            className="h-px w-full"
            style={{
              background: 'linear-gradient(90deg, transparent, #f97316, transparent)',
            }}
          />
        </div>

        <p
          className={`text-center text-base leading-relaxed mb-2 font-medium soft-glow-pulse ${isLight ? 'text-slate-700' : 'text-slate-300/80'}`}
          style={{ animationDelay: '0.5s' }}
        >
          {t.topTagline1}
        </p>
        <p
          className={`text-center text-lg font-bold mb-10 soft-glow-pulse ${isLight ? 'text-slate-900' : 'text-white'}`}
          style={{ animationDelay: '0.9s' }}
        >
          {t.topTagline2}
        </p>

        <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
          <span>{t.styleShort[0]}</span>
          <span className="text-slate-600">·</span>
          <span>{t.styleShort[1]}</span>
          <span className="text-slate-600">·</span>
          <span>{t.styleShort[2]}</span>
          <span className="text-slate-600">·</span>
          <span>{t.styleShort[3]}</span>
        </div>

        <button
          onClick={onStart}
          className="relative group my-10 w-full max-w-xs py-5 rounded-2xl font-display text-2xl font-bold tracking-widest text-white uppercase overflow-hidden soft-glow-pulse"
          style={{
            background: 'linear-gradient(135deg, #ea580c, #f97316, #fb923c)',
            boxShadow: '0 0 30px rgba(249,115,22,0.5), 0 0 60px rgba(249,115,22,0.2)',
            animationDelay: '1.3s',
          }}
        >
          <span className="relative z-10 soft-glow-pulse">{t.startButton}</span>
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(135deg, #c2410c, #ea580c, #f97316)',
            }}
          />
          <div className="absolute inset-0 group-hover:animate-glow-pulse" />
        </button>

        <div className="mt-3 text-slate-600 text-xs text-center w-full max-w-xs">
          <div className="flex flex-col items-center gap-2">
          <AudioWaveVisualizer color="#f97316" barCount={16} />
          <span className="text-xs text-slate-500">{t.startHint}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
