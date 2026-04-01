import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Moon, Sun } from 'lucide-react';
import { Locale, NarrationStyle, Settings, ThemeMode } from '../types';
import { UI_TEXT } from '../i18n';

interface SettingsPageProps {
  locale: Locale;
  themeMode: ThemeMode;
  onThemeModeChange: (themeMode: ThemeMode) => void;
  onBack: () => void;
  onStart: (settings: Settings) => void;
}

const QUICK_PRESETS = [
  { seconds: 30, label: '30Sec' },
  { seconds: 60, label: '1Min' },
  { seconds: 120, label: '2Min' },
  { seconds: 180, label: '3Min' },
  { seconds: 300, label: '5Min' },
] as const;

const SETTINGS_DRAFT_STORAGE_KEY = 'ching-drama-settings-draft';

const STYLE_CARDS: Array<{
  id: NarrationStyle;
  emoji: string;
  title: { ja: string; en: string };
  description: { ja: string; en: string };
  gradient: string;
  border: string;
}> = [
  {
    id: 'sports',
    emoji: '🏟️',
    title: { ja: 'スポーツ実況', en: 'Sports' },
    description: { ja: '熱狂的な生中継スタイル', en: 'Live play-by-play style' },
    gradient: 'from-blue-900/60 to-cyan-900/60',
    border: 'border-cyan-700',
  },
  {
    id: 'movie',
    emoji: '🎬',
    title: { ja: '映画予告編', en: 'Movie Trailer' },
    description: { ja: '壮大なシネマティック演出', en: 'Epic cinematic delivery' },
    gradient: 'from-yellow-900/60 to-orange-900/60',
    border: 'border-yellow-700',
  },
  {
    id: 'horror',
    emoji: '😱',
    title: { ja: 'ホラー', en: 'Horror' },
    description: { ja: '恐怖の深淵へようこそ…', en: 'Welcome to the abyss...' },
    gradient: 'from-red-950/60 to-gray-900/60',
    border: 'border-red-800',
  },
  {
    id: 'nature',
    emoji: '🌍',
    title: { ja: '自然ドキュメンタリー', en: 'Nature Doc' },
    description: { ja: 'BBCスタイルの静謐な語り', en: 'Calm BBC-style narration' },
    gradient: 'from-green-950/60 to-emerald-900/60',
    border: 'border-emerald-700',
  },
];

function clampDuration(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.max(1, Math.min(600, Math.floor(value)));
}

function readSettingsDraft(locale: Locale): { duration: number; dishName: string; style: NarrationStyle } {
  const fallback = {
    duration: 60,
    dishName: locale === 'ja' ? '冷凍チャーハン' : '',
    style: 'sports' as NarrationStyle,
  };

  try {
    const raw = localStorage.getItem(SETTINGS_DRAFT_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<{ duration: number; dishName: string; style: NarrationStyle }>;
    const style = parsed.style;
    const isValidStyle = style === 'sports' || style === 'movie' || style === 'horror' || style === 'nature';
    return {
      duration: clampDuration(Number(parsed.duration ?? fallback.duration)),
      dishName: typeof parsed.dishName === 'string' ? parsed.dishName : fallback.dishName,
      style: isValidStyle ? style : fallback.style,
    };
  } catch {
    return fallback;
  }
}

export default function SettingsPage({
  locale,
  themeMode,
  onThemeModeChange,
  onBack,
  onStart,
}: SettingsPageProps) {
  const [draft] = useState(() => readSettingsDraft(locale));
  const [duration, setDuration] = useState(draft.duration);
  const [dishName, setDishName] = useState(draft.dishName);
  const [style, setStyle] = useState<NarrationStyle>(draft.style);

  const t = UI_TEXT[locale];
  const isLight = themeMode === 'light';

  const { minutes, seconds } = useMemo(() => {
    const m = Math.floor(duration / 60);
    const s = duration % 60;
    return { minutes: m, seconds: s };
  }, [duration]);

  const updateMinutes = (value: string) => {
    const nextMinutes = Math.max(0, Math.min(9, Number(value || '0')));
    setDuration(clampDuration(nextMinutes * 60 + seconds));
  };

  const updateSeconds = (value: string) => {
    const nextSeconds = Math.max(0, Math.min(59, Number(value || '0')));
    setDuration(clampDuration(minutes * 60 + nextSeconds));
  };

  const handleStart = () => {
    onStart({
      totalSeconds: duration,
      dishName: dishName.trim() || t.mysteryDish,
      style,
    });
  };

  useEffect(() => {
    const nextDraft = { duration, dishName, style };
    try {
      localStorage.setItem(SETTINGS_DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
    } catch {
      // no-op when storage is unavailable
    }
  }, [duration, dishName, style]);

  return (
    <div className={`h-[100dvh] overflow-hidden ${isLight ? 'bg-gray-100 text-gray-900' : 'bg-gray-950 text-white'}`}>
      <div className="mx-auto flex h-full w-full max-w-md flex-col p-4">
        <header className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className={`justify-self-start rounded-lg p-1 transition-colors ${isLight ? 'text-gray-700 hover:bg-gray-200' : 'text-white/80 hover:bg-white/10'}`}
            aria-label="back"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className={`text-center text-xl font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>{t.settings}</h1>
          <button
            type="button"
            onClick={() => onThemeModeChange(isLight ? 'dark' : 'light')}
            className={`justify-self-end rounded-lg px-2 py-1 text-xs font-bold transition-colors ${isLight ? 'bg-gray-200 text-gray-700' : 'bg-gray-800 text-gray-200'}`}
          >
            {isLight ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </header>

        <div className="mt-4 flex flex-1 flex-col justify-between gap-4">
          <section className="space-y-4">
            <p className="text-orange-400 text-xs font-black uppercase tracking-[0.2em]">{t.timeSetting}</p>

          <div className="grid grid-cols-5 gap-2">
            {QUICK_PRESETS.map((preset) => {
              const selected = preset.seconds === duration;
              return (
                <button
                  key={preset.seconds}
                  type="button"
                  onClick={() => setDuration(preset.seconds)}
                  className={`rounded-lg px-1 py-1.5 text-[10px] font-black leading-none transition-colors ${
                    selected
                      ? 'bg-orange-500 text-white'
                      : isLight
                        ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className={`rounded-xl border p-3 ${isLight ? 'border-gray-300 bg-white' : 'border-gray-800 bg-gray-900'}`}>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
              <div>
                <p className={`mb-1 text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>{t.minutes}</p>
                <input
                  type="number"
                  min={0}
                  max={9}
                  value={minutes}
                  onChange={(e) => updateMinutes(e.target.value)}
                  className={`w-full appearance-none bg-transparent text-center text-3xl font-black outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${isLight ? 'text-gray-900' : 'text-white'}`}
                />
              </div>
              <span className="text-3xl font-black text-orange-400">:</span>
              <div>
                <p className={`mb-1 text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>{t.seconds}</p>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={String(seconds).padStart(2, '0')}
                  onChange={(e) => updateSeconds(e.target.value)}
                  className={`w-full appearance-none bg-transparent text-center text-3xl font-black outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${isLight ? 'text-gray-900' : 'text-white'}`}
                />
              </div>
            </div>
          </div>

          <div className="space-y-0.5">
            <input
              type="range"
              min={1}
              max={600}
              step={1}
              value={duration}
              onChange={(e) => setDuration(clampDuration(Number(e.target.value)))}
              className="h-2 w-full cursor-pointer accent-orange-500"
            />
            <div className={`flex justify-between text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
              <span>1{t.seconds}</span>
              <span>10{t.minutes}</span>
            </div>
          </div>
          </section>

          <section className="space-y-4">
            <p className="text-orange-400 text-xs font-black uppercase tracking-[0.2em]">{t.optionalDish}</p>
            <input
              type="text"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              maxLength={100}
              placeholder={locale === 'ja' ? '例: 冷凍チャーハン、お弁当...' : 'e.g. Frozen fried rice, Bento...'}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm placeholder:text-gray-500 outline-none transition-colors focus:border-orange-500 ${isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-800 bg-gray-900 text-white'}`}
            />
          </section>

          <section className="space-y-4">
            <p className="text-orange-400 text-xs font-black uppercase tracking-[0.2em]">{t.style}</p>
            <div className="grid h-full max-h-[34vh] grid-cols-2 gap-2">
              {STYLE_CARDS.map((card) => {
                const selected = style === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setStyle(card.id)}
                    className={`relative rounded-xl border bg-gradient-to-br p-3 text-left transition-all ${card.gradient} ${card.border} ${
                      selected
                        ? 'scale-[1.02] shadow-lg ring-2 ring-orange-400 opacity-100'
                        : 'opacity-70 hover:opacity-90'
                    }`}
                  >
                    {selected && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-orange-400" />}
                    <p className="mb-1 text-lg">{card.emoji}</p>
                    <p className="text-xs font-bold text-white">{card.title[locale]}</p>
                    <p className="mt-1 text-[10px] text-gray-300">{card.description[locale]}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <button
            type="button"
            onClick={handleStart}
            disabled={duration < 1}
            className="w-full rounded-xl py-3 text-sm font-black tracking-widest text-white transition-opacity disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #ea580c, #dc2626)',
              boxShadow: '0 0 24px rgba(234, 88, 12, 0.45)',
            }}
          >
            {t.startNarration}
          </button>
        </div>
      </div>
    </div>
  );
}
