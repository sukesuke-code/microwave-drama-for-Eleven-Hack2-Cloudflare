import { useState } from 'react';
import { ChevronLeft, Play } from 'lucide-react';
import { Settings, NarrationStyle } from '../types';
import { STYLE_CONFIGS } from '../data/narrations';

interface SettingsPageProps {
  onBack: () => void;
  onStart: (settings: Settings) => void;
}

export default function SettingsPage({ onBack, onStart }: SettingsPageProps) {
  const [minutes, setMinutes] = useState(2);
  const [seconds, setSeconds] = useState(0);
  const [dishName, setDishName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<NarrationStyle>('sports');

  const totalSeconds = Math.max(1, Math.min(600, minutes * 60 + seconds));

  const handleStart = () => {
    onStart({
      totalSeconds,
      dishName: dishName.trim() || '謎の料理',
      style: selectedStyle,
    });
  };

  const styleConfig = STYLE_CONFIGS.find((s) => s.id === selectedStyle)!;

  return (
    <div className="min-h-screen flex flex-col bg-[#00031a]">
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-4 border-b border-white/5">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={20} className="text-slate-300" />
        </button>
        <h2 className="font-display text-xl font-bold text-white tracking-wide">設定</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-6 max-w-lg mx-auto space-y-8">
          <section>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              時間設定
            </label>
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">分</span>
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
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>0分</span>
                  <span>9分</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">秒</span>
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
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>0秒</span>
                  <span>59秒</span>
                </div>
              </div>

              <div
                className="text-center py-3 rounded-xl border border-orange-500/20 bg-orange-950/20"
              >
                <span className="font-display text-3xl font-bold text-orange-400">
                  {String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:
                  {String(totalSeconds % 60).padStart(2, '0')}
                </span>
                <p className="text-xs text-slate-500 mt-1">合計 {totalSeconds} 秒</p>
              </div>
            </div>
          </section>

          <section>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              料理名（任意）
            </label>
            <div className="relative">
              <input
                type="text"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                placeholder="例: 冷凍チャーハン、お弁当..."
                maxLength={30}
                className="w-full bg-white/3 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-600 text-base focus:outline-none focus:border-orange-500/50 transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                {dishName.length}/30
              </span>
            </div>
          </section>

          <section>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              実況スタイル
            </label>
            <div className="grid grid-cols-2 gap-3">
              {STYLE_CONFIGS.map((s) => {
                const isSelected = selectedStyle === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStyle(s.id)}
                    className={`
                      relative flex flex-col items-center justify-center
                      p-4 rounded-2xl border-2 transition-all duration-200
                      ${isSelected
                        ? 'bg-white/8 scale-[1.02]'
                        : 'bg-white/3 border-white/8 hover:bg-white/5'
                      }
                    `}
                    style={isSelected ? {
                      borderColor: s.accentColor,
                      boxShadow: `0 0 20px ${s.accentColor}30`,
                    } : {
                      borderColor: 'rgba(255,255,255,0.08)',
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
              実況開始！
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
