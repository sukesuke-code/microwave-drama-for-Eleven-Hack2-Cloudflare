import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Locale, Settings, NarrationStyle, ThemeMode } from '../types';
import { getStyleConfigs } from '../data/narrations';
import { UI_TEXT } from '../i18n';

interface SettingsPageProps {
  locale: Locale;
  themeMode: ThemeMode;
  onThemeModeChange: (themeMode: ThemeMode) => void;
  onBack: () => void;
  onStart: (settings: Settings) => void;
}

const QUICK_SECONDS = [30, 60, 120, 180, 300];

const STYLE_DESCRIPTIONS: Record<Locale, Record<NarrationStyle, string>> = {
  ja: {
    sports: '熱狂的な生中継スタイル',
    movie: '壮大なシネマティック演出',
    horror: '恐怖の深淵へようこそ…',
    nature: 'BBCスタイルの静謐な語り',
  },
  en: {
    sports: 'Live play-by-play energy',
    movie: 'Epic cinematic delivery',
    horror: 'Welcome to pure dread...',
    nature: 'Calm documentary narration',
  },
};

export default function SettingsPage({ locale, onBack, onStart }: SettingsPageProps) {
  const [totalSeconds, setTotalSeconds] = useState(67);
  const [dishName, setDishName] = useState(locale === 'ja' ? '冷凍チャーハン' : 'Frozen fried rice');
  const [selectedStyle, setSelectedStyle] = useState<NarrationStyle>('sports');

  const t = UI_TEXT[locale];
  const styleConfigs = getStyleConfigs(locale);

  const { minutes, seconds } = useMemo(() => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return { minutes: mins, seconds: secs };
  }, [totalSeconds]);

  const handleStart = () => {
    onStart({
      totalSeconds,
      dishName: dishName.trim() || t.mysteryDish,
      style: selectedStyle,
    });
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#020818] text-slate-100">
      <div className="mx-auto flex h-full w-full max-w-[760px] flex-col px-5 pb-5 pt-4">
        <header className="mb-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/10"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-black tracking-tight">{t.settings}</h1>
        </header>

        <section className="mb-5">
          <p className="mb-2 text-xl font-black text-orange-400">{t.timeSetting}</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_SECONDS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTotalSeconds(value)}
                className={`rounded-2xl px-4 py-2 text-2xl font-black transition-colors ${
                  totalSeconds === value
                    ? 'bg-slate-500/60 text-white'
                    : 'bg-slate-700/35 text-slate-300 hover:bg-slate-600/50'
                }`}
              >
                {value < 60 ? `${value}${t.seconds}` : `${value / 60}${t.minutes}`}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-[#243650] bg-[#101d35] px-5 py-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center text-center">
              <div>
                <p className="mb-1 text-sm text-slate-400">{t.minutes}</p>
                <p className="text-6xl font-black leading-none">{minutes}</p>
              </div>
              <p className="mx-5 text-6xl font-black leading-none text-orange-400">:</p>
              <div>
                <p className="mb-1 text-sm text-slate-400">{t.seconds}</p>
                <p className="text-6xl font-black leading-none">{String(seconds).padStart(2, '0')}</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <input
              type="range"
              min={1}
              max={600}
              value={totalSeconds}
              onChange={(e) => setTotalSeconds(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-600/70 accent-orange-500"
            />
            <div className="mt-1 flex justify-between text-base text-slate-500">
              <span>1{t.seconds}</span>
              <span>10{t.minutes}</span>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <p className="mb-2 text-xl font-black text-orange-400">{locale === 'ja' ? '料理名' : 'Dish Name'}</p>
          <input
            type="text"
            value={dishName}
            onChange={(e) => setDishName(e.target.value)}
            className="w-full rounded-3xl border border-[#253a5c] bg-[#101d35] px-5 py-4 text-2xl font-bold text-white placeholder:text-slate-500 focus:border-orange-400/60 focus:outline-none"
            placeholder={t.dishPlaceholder}
          />
        </section>

        <section className="mb-5 flex-1">
          <p className="mb-2 text-xl font-black text-orange-400">{t.style}</p>
          <div className="grid grid-cols-2 gap-3">
            {styleConfigs.map((style) => {
              const isSelected = selectedStyle === style.id;
              const cardClass =
                style.id === 'sports'
                  ? 'from-[#1f3263] to-[#0e5d89] border-[#2d95c6]'
                  : style.id === 'movie'
                    ? 'from-[#5b3018] to-[#683628] border-[#9d5b23]'
                    : style.id === 'horror'
                      ? 'from-[#330919] to-[#1a102f] border-[#8b1a2c]'
                      : 'from-[#042d2a] to-[#0e5037] border-[#0b8e65]';

              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setSelectedStyle(style.id)}
                  className={`relative rounded-3xl border bg-gradient-to-br p-4 text-left transition-transform hover:scale-[1.01] ${cardClass}`}
                  style={{
                    boxShadow: isSelected ? `0 0 0 3px ${style.accentColor}, 0 8px 26px ${style.accentColor}40` : undefined,
                  }}
                >
                  {isSelected && <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-orange-400" />}
                  <p className="mb-2 text-2xl">{style.emoji}</p>
                  <p className="mb-1 text-[1.8rem] font-black leading-tight text-white">{style.label}</p>
                  <p className="text-xl text-slate-300">{STYLE_DESCRIPTIONS[locale][style.id]}</p>
                </button>
              );
            })}
          </div>
        </section>

        <button
          onClick={handleStart}
          className="mt-auto w-full rounded-3xl bg-gradient-to-r from-[#ff6a00] to-[#ff2b2b] py-4 text-3xl font-black text-white shadow-[0_0_35px_rgba(255,98,0,0.45)]"
        >
          {t.startNarration}
        </button>
      </div>
    </div>
  );
}
