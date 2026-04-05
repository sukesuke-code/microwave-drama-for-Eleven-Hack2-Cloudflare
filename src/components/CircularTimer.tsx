import { useMemo } from 'react';
import { Locale, NarrationStyle } from '../types';

interface CircularTimerProps {
  remaining: number;
  total: number;
  size?: number;
  style: NarrationStyle;
  locale: Locale;
}

const STYLE_COLORS: Record<NarrationStyle, { stroke: string; track: string; glow: string }> = {
  sports: { stroke: '#38bdf8', track: '#0c4a6e', glow: 'rgba(56,189,248,0.6)' },
  movie: { stroke: '#fbbf24', track: '#451a03', glow: 'rgba(251,191,36,0.6)' },
  horror: { stroke: '#ef4444', track: '#450a0a', glow: 'rgba(239,68,68,0.6)' },
  nature: { stroke: '#34d399', track: '#064e3b', glow: 'rgba(52,211,153,0.6)' },
  documentary: { stroke: '#a8a29e', track: '#292524', glow: 'rgba(168,162,158,0.6)' },
  anime: { stroke: '#f43f5e', track: '#4c0519', glow: 'rgba(244,63,94,0.6)' },
};

export default function CircularTimer({ remaining, total, size = 240, style, locale }: CircularTimerProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const isFinished = remaining <= 0;
  const isUrgent = remaining <= 10 && remaining > 0;
  const progress = isFinished ? 1 : total > 0 ? remaining / total : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const colors = STYLE_COLORS[style];

  const minutes = Math.floor(Math.max(remaining, 0) / 60);
  const seconds = Math.max(remaining, 0) % 60;
  const minuteStr = String(minutes).padStart(2, '0');
  const secondStr = seconds <= 10 ? String(seconds) : String(seconds).padStart(2, '0');
  const showMinutePrefix = remaining >= 60;

  const gradientId = useMemo(() => `timer-gradient-${style}`, [style]);
  const auraOpacity = isFinished ? 0.9 : 0.62;
  const finishedLabelSize = Math.min(size * 0.22, 48);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size + 36,
          height: size + 36,
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 68%)`,
          filter: isFinished ? 'blur(10px)' : 'blur(8px)',
          opacity: auraOpacity,
          transition: 'opacity 0.3s ease',
        }}
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute top-0 left-0 -rotate-90 overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity="1" />
            <stop offset="100%" stopColor={colors.stroke} stopOpacity={isFinished ? '0.95' : '0.5'} />
          </linearGradient>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.track}
          strokeWidth={strokeWidth}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.3s ease',
            filter: isFinished
              ? `drop-shadow(0 0 16px ${colors.stroke}) drop-shadow(0 0 30px ${colors.glow}) drop-shadow(0 0 50px ${colors.glow})`
              : `drop-shadow(0 0 10px ${colors.stroke}) drop-shadow(0 0 18px ${colors.glow}) drop-shadow(0 0 30px ${colors.glow})`,
          }}
        />
      </svg>

      <div className="z-10 flex flex-col items-center">
        {isFinished ? (
          <span
            className="font-display font-black leading-none"
            style={{
              fontSize: finishedLabelSize,
              color: colors.stroke,
              textShadow: `0 0 18px ${colors.glow}, 0 0 42px ${colors.glow}`,
              filter: `drop-shadow(0 0 14px ${colors.glow})`,
            }}
          >
            {locale === 'ja' ? 'チーン！' : 'DING!'}
          </span>
        ) : (
          <span className="font-display font-black tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {showMinutePrefix && (
              <span style={{ fontSize: 52, color: '#ffffff' }}>
                {minuteStr}:
              </span>
            )}
            <span
              className={isUrgent ? 'timer-urgent-pulse' : ''}
              style={{
                fontSize: showMinutePrefix ? 52 : 64,
                color: isUrgent ? '#ef4444' : '#ffffff',
                textShadow: isUrgent
                  ? '0 0 14px rgba(239,68,68,0.75), 0 0 32px rgba(239,68,68,0.6)'
                  : 'none',
              }}
            >
              {secondStr}
            </span>
          </span>
        )}
        {!isFinished && (
          <span className="mt-1 text-sm font-bold" style={{ color: '#94a3b8' }}>
            {showMinutePrefix ? (locale === 'ja' ? '分:秒' : 'Min:Sec') : locale === 'ja' ? '秒' : 'Sec'}
          </span>
        )}
      </div>
    </div>
  );
}
