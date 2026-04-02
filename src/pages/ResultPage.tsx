import { useMemo } from 'react';
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

export default function ResultPage({
  locale,
  settings,
  themeMode,
  onThemeModeChange,
  onReplay,
  onHome,
  onTop,
}: ResultPageProps) {
  const { dishName, style } = settings;
  const t = UI_TEXT[locale];
  const styleConfig = getStyleConfigs(locale).find((s) => s.id === style)!;
  const isLight = themeMode === 'light';

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

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b ${
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

      <div className="relative z-10 flex flex-col items-center px-6 max-w-md w-full text-center">
        <div
          className="result-complete-orb w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-scale-in"
          style={{
            border: `2px solid ${styleConfig.accentColor}40`,
            boxShadow: `0 0 24px ${styleConfig.accentColor}40, inset 0 0 16px ${styleConfig.accentColor}25`,
          }}
        >
          <span
            role="img"
            aria-label="celebration"
            className="text-4xl leading-none select-none"
            style={{
              filter: `drop-shadow(0 0 12px ${styleConfig.accentColor}99) drop-shadow(0 0 20px ${styleConfig.accentColor}66)`,
              transform: 'translateY(-1px)',
            }}
          >
            🎉
          </span>
        </div>

        <h1 className={`font-display text-4xl font-bold mb-2 animate-fade-up ${isLight ? 'text-slate-900' : 'text-white'}`}>
          {t.dramaDone}
        </h1>

        <div
          className="my-6 px-6 py-4 rounded-2xl border animate-fade-up w-full"
          style={{
            borderColor: `${styleConfig.accentColor}30`,
            background: `${styleConfig.accentColor}08`,
            animationDelay: '0.2s',
          }}
        >
          <p
            className="text-base font-medium italic leading-relaxed"
            style={{ color: `${styleConfig.accentColor}cc` }}
          >
            「{randomMessage}」
          </p>
        </div>

        <p
          className="text-lg font-bold mb-1 animate-fade-up"
          style={{
            color: styleConfig.accentColor,
            animationDelay: '0.1s',
          }}
        >
          {dishName}
        </p>

        <p className={`text-sm mb-2 animate-fade-up ${isLight ? 'text-slate-500' : 'text-slate-400'}`} style={{ animationDelay: '0.15s' }}>
          {styleConfig.emoji} {styleConfig.label}
        </p>

        <div className="flex flex-col gap-3 w-full animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={onReplay}
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-lg transition-all active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${styleConfig.accentColor}cc, ${styleConfig.accentColor})`,
              boxShadow: `0 0 20px ${styleConfig.accentColor}40`,
            }}
          >
            <RotateCcw size={20} />
            {t.replay}
          </button>

          <button
            onClick={handleShare}
            className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-base border transition-all active:scale-95 ${
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
            className={`text-sm py-2 transition-colors ${isLight ? 'text-slate-600 hover:text-slate-700' : 'text-slate-500 hover:text-slate-400'}`}
          >
            {t.backTop}
          </button>
        </div>
      </div>
    </div>
  );
}
