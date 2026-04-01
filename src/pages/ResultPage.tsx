import { RotateCcw, Share2, Trophy } from 'lucide-react';
import { Locale, Settings } from '../types';
import { getStyleConfigs } from '../data/narrations';
import { RESULT_MESSAGES, UI_TEXT } from '../i18n';

interface ResultPageProps {
  locale: Locale;
  settings: Settings;
  onReplay: () => void;
  onHome: () => void;
}

export default function ResultPage({ locale, settings, onReplay, onHome }: ResultPageProps) {
  const { dishName, style } = settings;
  const t = UI_TEXT[locale];
  const styleConfig = getStyleConfigs(locale).find((s) => s.id === style)!;

  const handleShare = async () => {
    const text = locale === 'ja'
      ? `チンドラマで「${dishName}」を完璧に温め直した！\n\n#チンドラマ #ChingDrama #電子レンジ`
      : `I reheated "${dishName}" perfectly with Ching Drama!\n\n#ChingDrama #Microwave`;
    if (navigator.share) {
      await navigator.share({ text }).catch(() => null);
    } else {
      await navigator.clipboard.writeText(text).catch(() => null);
      alert(t.shareCopied);
    }
  };

  const randomMessage = RESULT_MESSAGES[locale][style][Math.floor(Math.random() * RESULT_MESSAGES[locale][style].length)];

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b ${styleConfig.bgGradient} bg-[#00031a]`}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${styleConfig.accentColor}10 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 max-w-md w-full text-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-scale-in"
          style={{
            background: `linear-gradient(135deg, ${styleConfig.accentColor}30, ${styleConfig.accentColor}10)`,
            border: `2px solid ${styleConfig.accentColor}40`,
            boxShadow: `0 0 40px ${styleConfig.accentColor}30`,
          }}
        >
          <Trophy
            size={40}
            style={{ color: styleConfig.accentColor }}
          />
        </div>

        <h1 className="font-display text-4xl font-bold text-white mb-2 animate-fade-up">
          {t.dramaDone}
        </h1>

        <p
          className="text-lg font-bold mb-1 animate-fade-up"
          style={{
            color: styleConfig.accentColor,
            animationDelay: '0.1s',
          }}
        >
          {dishName}
        </p>

        <p className="text-slate-400 text-sm mb-2 animate-fade-up" style={{ animationDelay: '0.15s' }}>
          {styleConfig.emoji} {styleConfig.label}
        </p>

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
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-slate-300 text-base bg-white/5 border border-white/10 transition-all hover:bg-white/8 active:scale-95"
          >
            <Share2 size={18} />
            {t.share}
          </button>

          <button
            onClick={onHome}
            className="text-slate-500 text-sm py-2 hover:text-slate-400 transition-colors"
          >
            {t.backTop}
          </button>
        </div>
      </div>
    </div>
  );
}
