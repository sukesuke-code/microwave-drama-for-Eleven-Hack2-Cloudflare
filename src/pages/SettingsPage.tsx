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
  const [totalSeconds, setTotalSeconds] = useState(60);
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
      <div className="mx-auto flex h-full w-full max-w-[860px] flex-col px-6 pb-8 pt-7">
        <header className="mb-7 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/10"
          >
            <ChevronLeft size={26} />
          </button>
          <h1 className="text-[clamp(1.6rem,5.3vw,3.2rem)] font-black leading-none tracking-tight">{t.settings}</h1>
        </header>

        <section className="mb-7">
          <p className="mb-4 text-[clamp(1.4rem,4.8vw,2.8rem)] font-black leading-none text-orange-400">{t.timeSetting}</p>
          <div className="mb-5 flex flex-wrap gap-3">
            {QUICK_SECONDS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTotalSeconds(value)}
                className={`rounded-[18px] px-6 py-3 text-[clamp(1.1rem,4vw,2.7rem)] font-black leading-none transition-colors ${
                  totalSeconds === value
                    ? 'bg-[#ff7a14] text-white'
                    : 'bg-[#26334a] text-slate-200 hover:bg-[#32435f]'
                }`}
              >
                {value < 60 ? `${value}${t.seconds}` : `${value / 60}${t.minutes}`}
              </button>
            ))}
          </div>

          <div className="rounded-[34px] border border-[#243650] bg-[#101d35] px-8 py-7">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center text-center">
              <div>
                <p className="mb-2 text-[clamp(.9rem,3.5vw,2.35rem)] text-slate-500">{t.minutes}</p>
                <p className="text-[clamp(2.4rem,8vw,5.6rem)] font-black leading-none">{minutes}</p>
              </div>
              <p className="mx-10 text-[clamp(2.4rem,8vw,5.6rem)] font-black leading-none text-orange-400">:</p>
              <div>
                <p className="mb-2 text-[clamp(.9rem,3.5vw,2.35rem)] text-slate-500">{t.seconds}</p>
                <p className="text-[clamp(2.4rem,8vw,5.6rem)] font-black leading-none">{String(seconds).padStart(2, '0')}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 px-2">
            <input
              type="range"
              min={1}
              max={600}
              value={totalSeconds}
              onChange={(e) => setTotalSeconds(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#405373] accent-orange-500"
            />
            <div className="mt-1 flex justify-between text-[clamp(.9rem,3.5vw,2.35rem)] text-slate-600">
              <span>1{t.seconds}</span>
              <span>10{t.minutes}</span>
            </div>
          </div>
        </section>

        <section className="mb-7">
          <p className="mb-4 text-[clamp(1.4rem,4.8vw,2.8rem)] font-black leading-none text-orange-400">{locale === 'ja' ? '料理名' : 'Dish Name'}</p>
          <input
            type="text"
            value={dishName}
            onChange={(e) => setDishName(e.target.value)}
            className="w-full rounded-[34px] border border-[#253a5c] bg-[#101d35] px-7 py-5 text-[clamp(1.4rem,4.8vw,3.05rem)] font-bold leading-none text-white placeholder:text-slate-500 focus:border-orange-400/60 focus:outline-none"
            placeholder={t.dishPlaceholder}
          />
        </section>

        <section className="mb-7 flex-1">
          <p className="mb-4 text-[clamp(1.4rem,4.8vw,2.8rem)] font-black leading-none text-orange-400">{t.style}</p>
          <div className="grid h-full max-h-[34vh] grid-cols-2 gap-4">
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
                  className={`relative h-full rounded-[30px] border bg-gradient-to-br p-6 text-left ${cardClass}`}
                  style={{
                    boxShadow: isSelected ? `0 0 0 3px #ff9a43, inset 0 0 0 1px #ff9a43` : undefined,
                  }}
                >
                  {isSelected && <span className="absolute right-4 top-4 h-3.5 w-3.5 rounded-full bg-orange-400" />}
                  <p className="mb-3 text-[clamp(1.4rem,4.3vw,2.6rem)] leading-none">{style.emoji}</p>
                  <p className="mb-2 text-[clamp(1.6rem,5.3vw,3.2rem)] font-black leading-none text-white">{style.label}</p>
                  <p className="text-[clamp(1rem,3.9vw,2.5rem)] leading-none text-slate-400">{STYLE_DESCRIPTIONS[locale][style.id]}</p>
                </button>
              );
            })}
          </div>
        </section>

        <button
          onClick={handleStart}
          className="mt-auto w-full rounded-[34px] bg-gradient-to-r from-[#ff5f0f] to-[#ff2f2f] py-7 text-[clamp(1.8rem,6vw,3.8rem)] font-black leading-none text-white shadow-[0_0_35px_rgba(255,98,0,0.45)]"
        >
          {t.startNarration}
        </button>
      </div>
    </div>
  );
}
