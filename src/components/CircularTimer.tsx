import { useMemo } from 'react';
import { NarrationStyle } from '../types';

interface CircularTimerProps {
  timeLeft: number;
  totalTime: number;
  style: NarrationStyle;
  isDanger: boolean;
  isFinished?: boolean;
  nearingCompletionLabel: string;
}

const STYLE_COLORS: Record<NarrationStyle, { stroke: string; glow: string; text: string }> = {
  sports: { stroke: '#38bdf8', glow: 'rgba(56,189,248,0.6)', text: '#7dd3fc' },
  movie: { stroke: '#f59e0b', glow: 'rgba(245,158,11,0.6)', text: '#fbbf24' },
  horror: { stroke: '#dc2626', glow: 'rgba(220,38,38,0.6)', text: '#ef4444' },
  nature: { stroke: '#10b981', glow: 'rgba(16,185,129,0.6)', text: '#34d399' },
};

export default function CircularTimer({
  timeLeft,
  totalTime,
  style,
  isDanger,
  isFinished = false,
  nearingCompletionLabel,
}: CircularTimerProps) {
  const size = 240;
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = isFinished ? 1 : totalTime > 0 ? timeLeft / totalTime : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const colors = STYLE_COLORS[style];

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const minuteStr = String(minutes).padStart(2, '0');
  const secondStr = String(seconds).padStart(2, '0');
  const showMinutePrefix = timeLeft >= 60;
  const isSecondsDanger = timeLeft <= 10;

  const gradientId = useMemo(() => `timer-gradient-${style}`, [style]);
  const filterId = useMemo(() => `timer-glow-${style}`, [style]);
  const auraOpacity = isFinished ? 0.9 : isDanger ? 0.78 : 0.55;
  const auraShadow = isFinished
    ? `0 0 36px ${colors.glow}, 0 0 86px ${colors.glow}`
    : `0 0 28px ${colors.glow}, 0 0 62px ${colors.glow}`;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size - 36,
          height: size - 36,
          boxShadow: auraShadow,
          opacity: auraOpacity,
          transition: 'opacity 0.3s ease',
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute top-0 left-0 -rotate-90"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity="1" />
            <stop offset="100%" stopColor={colors.stroke} stopOpacity={isFinished ? '0.85' : '0.4'} />
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
            filter: isFinished
              ? `drop-shadow(0 0 14px ${colors.stroke}) drop-shadow(0 0 26px ${colors.glow}) drop-shadow(0 0 40px ${colors.glow})`
              : `drop-shadow(0 0 10px ${colors.stroke}) drop-shadow(0 0 18px ${colors.glow}) drop-shadow(0 0 30px ${colors.glow})`,
          }}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius - strokeWidth - 2}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="1"
          strokeOpacity={isFinished ? '0.24' : '0.1'}
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
          {showMinutePrefix && <span>{minuteStr}:</span>}
          <span
            className={isSecondsDanger ? 'timer-seconds-shake' : ''}
            style={{
              color: isSecondsDanger ? '#ef4444' : colors.text,
              textShadow: isSecondsDanger
                ? '0 0 20px rgba(239,68,68,0.8), 0 0 40px rgba(239,68,68,0.7)'
                : `0 0 20px ${colors.glow}, 0 0 40px ${colors.glow}`,
            }}
          >
            {secondStr}
          </span>
        </span>
        {isDanger && (
          <span
            className="text-xs font-bold tracking-widest mt-1 uppercase"
            style={{ color: colors.text, opacity: 0.8 }}
          >
            {nearingCompletionLabel}
          </span>
        )}
      </div>
    </div>
  );
}
