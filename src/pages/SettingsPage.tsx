import { useState } from 'react';
import { ChevronLeft, Moon, Play, Sun } from 'lucide-react';
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

export default function SettingsPage({
  locale,
  themeMode,
  onThemeModeChange,
  onBack,
  onStart,
}: SettingsPageProps) {
  const [minutes, setMinutes] = useState(2);
  const [seconds, setSeconds] = useState(0);
  const [dishName, setDishName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<NarrationStyle>('sports');

  const t = UI_TEXT[locale];
  const isLight = themeMode === 'light';
  const totalSeconds = Math.max(1, Math.min(600, minutes * 60 + seconds));

  const handleStart = () => {
    onStart({
      totalSeconds,
      dishName: dishName.trim() || t.mysteryDish,
      style: selectedStyle,
    });
  };

  const styleConfigs = getStyleConfigs(locale);
  const styleConfig = styleConfigs.find((s) => s.id === selectedStyle)!;

  return (
    <div className={`min-h-screen flex flex-col ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#00031a] text-slate-100'}`}>
      <div className={`flex items-center justify-between gap-3 px-4 pt-safe pt-4 pb-4 border-b ${isLight ? 'border-slate-200 bg-white/90' : 'border-white/5'}`}>
        <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${isLight ? 'bg-slate-200 hover:bg-slate-300' : 'bg-white/5 hover:bg-white/10'}`}
        >
          <ChevronLeft size={20} className={isLight ? 'text-slate-700' : 'text-slate-300'} />
        </button>
        <h2 className={`font-display text-xl font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>{t.settings}</h2>
        </div>
        <button
          onClick={() => onThemeModeChange(isLight ? 'dark' : 'light')}
          className={`flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold transition-colors ${
            isLight
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700'
          }`}
          aria-label="Dark mode switcher"
        >
          {isLight ? <Moon size={14} /> : <Sun size={14} />}
          {isLight ? 'Dark' : 'Light'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-6 max-w-lg mx-auto space-y-8">
          <section>
            <label className={`block text-xs font-bold uppercase tracking-widest mb-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {t.timeSetting}
            </label>
            <div className={`rounded-2xl p-5 space-y-5 border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/3 border-white/8'}`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.minutes}</span>
                  <span className="font-display text-2xl font-bold text-orange-400">
                    {String(minutes).padStart(2, '0')}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="9"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="w-full accent-orange-500 h-2 rounded-full cursor-pointer"
                  style={{ accentColor: '#f97316' }}
                />
                <div className={`flex justify-between text-xs mt-1 ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span>0 {t.minutes}</span>
                  <span>9 {t.minutes}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.seconds}</span>
                  <span className="font-display text-2xl font-bold text-orange-400">
                    {String(seconds).padStart(2, '0')}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(Number(e.target.value))}
                  className="w-full h-2 rounded-full cursor-pointer"
                  style={{ accentColor: '#f97316' }}
                />
                <div className={`flex justify-between text-xs mt-1 ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span>0 {t.seconds}</span>
                  <span>59 {t.seconds}</span>
                </div>
              </div>

              <div
                className={`text-center py-3 rounded-xl border ${isLight ? 'border-orange-300/60 bg-orange-100/80' : 'border-orange-500/20 bg-orange-950/20'}`}
              >
                <span className="font-display text-3xl font-bold text-orange-400">
                  {String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:
                  {String(totalSeconds % 60).padStart(2, '0')}
                </span>
                <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{t.total} {totalSeconds} {t.seconds}</p>
              </div>
            </div>
          </section>

          <section>
            <label className={`block text-xs font-bold uppercase tracking-widest mb-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {t.optionalDish}
            </label>
            <div className="relative">
              <input
                type="text"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                placeholder={t.dishPlaceholder}
                maxLength={30}
                className={`w-full border rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-orange-500/50 transition-colors ${
                  isLight
                    ? 'bg-white text-slate-900 placeholder-slate-400 border-slate-200'
                    : 'bg-white/3 text-white placeholder-slate-600 border-white/10'
                }`}
              />
              <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
                {dishName.length}/30
              </span>
            </div>
          </section>

          <section>
            <label className={`block text-xs font-bold uppercase tracking-widest mb-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {t.style}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {styleConfigs.map((s) => {
                const isSelected = selectedStyle === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStyle(s.id)}
                    className={`
                      relative flex flex-col items-center justify-center
                      p-4 rounded-2xl border-2 transition-all duration-200
                      ${isSelected
                        ? isLight ? 'bg-orange-50 scale-[1.02]' : 'bg-white/8 scale-[1.02]'
                        : isLight ? 'bg-white border-slate-200 hover:bg-slate-100' : 'bg-white/3 border-white/8 hover:bg-white/5'
                      }
                    `}
                    style={isSelected ? {
                      borderColor: s.accentColor,
                      boxShadow: `0 0 20px ${s.accentColor}30`,
                    } : {
                      borderColor: isLight ? 'rgb(226 232 240)' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {isSelected && (
                      <div
                        className="absolute top-2 right-2 w-2 h-2 rounded-full"
                        style={{ backgroundColor: s.accentColor }}
                      />
                    )}
                    <span className="text-3xl mb-2">{s.emoji}</span>
                    <span
                      className="text-sm font-bold text-center leading-tight"
                      style={{ color: isSelected ? s.accentColor : 'rgb(148 163 184)' }}
                    >
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="pb-8">
            <button
              onClick={handleStart}
              disabled={totalSeconds < 1}
              className="w-full py-5 rounded-2xl font-display text-xl font-bold tracking-widest text-white uppercase flex items-center justify-center gap-3 transition-all duration-200 active:scale-95 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${styleConfig.accentColor}cc, ${styleConfig.accentColor})`,
                boxShadow: `0 0 25px ${styleConfig.accentColor}50`,
              }}
            >
              <Play size={22} fill="white" />
              {t.startNarration}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
