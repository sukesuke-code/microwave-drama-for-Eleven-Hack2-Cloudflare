import { useMemo, memo, useRef, useEffect } from 'react';
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

export default memo(function CircularTimer({ remaining, total, size = 240, style, locale }: CircularTimerProps) {
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
  const finishedLabelSize = Math.min(size * 0.22, 48);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty('--size', `${size}px`);
      containerRef.current.style.setProperty('--stroke', colors.stroke);
      containerRef.current.style.setProperty('--track', colors.track);
      containerRef.current.style.setProperty('--glow', colors.glow);
      containerRef.current.style.setProperty('--offset', `${strokeDashoffset}`);
      containerRef.current.style.setProperty('--label-size', `${finishedLabelSize}px`);
      containerRef.current.style.setProperty('--stroke-url', `url(#${gradientId})`);
    }
  }, [size, colors, strokeDashoffset, finishedLabelSize, gradientId]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center justify-center timer-root" data-finished={isFinished}>
      <div className="absolute rounded-full pointer-events-none timer-aura" />
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
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="timer-circle-progress"
        />
      </svg>

      <div className="z-10 flex flex-col items-center">
        {isFinished ? (
          <span className="font-display font-black leading-none timer-finished-label">
            {locale === 'ja' ? 'チーン！' : 'DING!'}
          </span>
        ) : (
          <span className="font-display font-black tracking-tight tabular-nums">
            {showMinutePrefix && (
              <span className="text-[52px] text-white">
                {minuteStr}:
              </span>
            )}
            <span
              className={`${isUrgent ? 'timer-urgent-pulse timer-value-urgent' : ''} ${showMinutePrefix ? 'text-[52px]' : 'text-[64px]'} ${isUrgent ? 'text-[#ef4444]' : 'text-white'}`}
            >
              {secondStr}
            </span>
          </span>
        )}
        {!isFinished && (
          <span className="mt-1 text-sm font-bold text-[#94a3b8]">
            {showMinutePrefix ? (locale === 'ja' ? '分:秒' : 'Min:Sec') : locale === 'ja' ? '秒' : 'Sec'}
          </span>
        )}
      </div>
    </div>
  );
});
