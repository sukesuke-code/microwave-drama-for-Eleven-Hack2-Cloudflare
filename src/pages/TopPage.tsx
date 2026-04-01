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
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
        <select
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value as Locale)}
          className={`text-xs rounded-lg px-2 py-1 border ${isLight ? 'bg-white text-slate-700 border-slate-300' : 'bg-slate-900/80 text-slate-200 border-white/10'}`}
          aria-label="Language switcher"
        >
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
        <button
          onClick={() => onThemeModeChange(isLight ? 'dark' : 'light')}
          className={`text-xs rounded-lg px-2 py-1 border ${isLight ? 'bg-white text-slate-700 border-slate-300' : 'bg-slate-900/80 text-slate-200 border-white/10'}`}
          aria-label="Dark mode switcher"
        >
          {isLight ? '🌙 Dark' : '☀️ Light'}
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

      <div className="relative z-10 flex flex-col items-center px-6 max-w-md w-full">
        <h1
          className="font-display text-5xl md:text-6xl font-bold text-center mb-2 tracking-tight whitespace-nowrap soft-glow-pulse"
          style={{
            background: 'linear-gradient(135deg, #ff6b35 0%, #f97316 40%, #fbbf24 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            filter: 'drop-shadow(0 0 20px rgba(249,115,22,0.5))',
          }}
        >
          {t.topTitle}
        </h1>

        <div
          className="h-px w-24 mb-8"
          style={{
            background: 'linear-gradient(90deg, transparent, #f97316, transparent)',
          }}
        />

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

        <button
          onClick={onStart}
          className="relative group w-full max-w-xs py-5 rounded-2xl font-display text-2xl font-bold tracking-widest text-white uppercase overflow-hidden soft-glow-pulse"
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

        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
          <span>{t.styleShort[0]}</span>
          <span className="text-slate-600">·</span>
          <span>{t.styleShort[1]}</span>
          <span className="text-slate-600">·</span>
          <span>{t.styleShort[2]}</span>
          <span className="text-slate-600">·</span>
          <span>{t.styleShort[3]}</span>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-600 text-xs text-center w-full max-w-xs">
        <div className="flex flex-col items-center gap-3">
          <AudioWaveVisualizer color="#f97316" barCount={16} />
          <span className="text-xs text-slate-500">{t.startHint}</span>
        </div>
      </div>
    </div>
  );
}
