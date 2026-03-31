import { useMemo } from 'react';
import { NarrationStyle } from '../types';

interface CircularTimerProps {
  timeLeft: number;
  totalTime: number;
  style: NarrationStyle;
  isDanger: boolean;
}

const STYLE_COLORS: Record<NarrationStyle, { stroke: string; glow: string; text: string }> = {
  sports: { stroke: '#f97316', glow: 'rgba(249,115,22,0.6)', text: '#fb923c' },
  movie: { stroke: '#f59e0b', glow: 'rgba(245,158,11,0.6)', text: '#fbbf24' },
  horror: { stroke: '#dc2626', glow: 'rgba(220,38,38,0.6)', text: '#ef4444' },
  nature: { stroke: '#10b981', glow: 'rgba(16,185,129,0.6)', text: '#34d399' },
};

export default function CircularTimer({ timeLeft, totalTime, style, isDanger }: CircularTimerProps) {
  const size = 240;
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const colors = STYLE_COLORS[style];

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const gradientId = useMemo(() => `timer-gradient-${style}`, [style]);
  const filterId = useMemo(() => `timer-glow-${style}`, [style]);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${isDanger ? 'danger-pulse' : 'timer-pulse'}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute top-0 left-0 -rotate-90"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity="1" />
            <stop offset="100%" stopColor={colors.stroke} stopOpacity="0.4" />
          </linearGradient>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
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
            transition: 'stroke-dashoffset 0.8s ease-in-out',
            filter: `drop-shadow(0 0 8px ${colors.glow})`,
          }}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius - strokeWidth - 2}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="1"
          strokeOpacity="0.1"
        />
      </svg>

      <div className="flex flex-col items-center z-10">
        <span
          className="font-display text-5xl font-bold tracking-wider"
          style={{
            color: colors.text,
            textShadow: `0 0 20px ${colors.glow}, 0 0 40px ${colors.glow}`,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {timeStr}
        </span>
        {isDanger && (
          <span
            className="text-xs font-bold tracking-widest mt-1 uppercase"
            style={{ color: colors.text, opacity: 0.8 }}
          >
            間もなく完成
          </span>
        )}
      </div>
    </div>
  );
}
