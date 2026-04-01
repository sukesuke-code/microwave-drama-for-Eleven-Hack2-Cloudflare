import { CSSProperties, useMemo } from 'react';

interface AudioWaveVisualizerProps {
  color?: string;
  barCount?: number;
  intensity?: 'low' | 'medium' | 'high';
}

type WavePattern = {
  keyframe: 'eqBar' | 'eqBarWide' | 'eqBarStaccato';
  durationMin: number;
  durationMax: number;
  minHeight: number;
  maxHeight: number;
  opacityMin: number;
  opacityMax: number;
};

const WAVE_PATTERNS: WavePattern[] = [
  {
    keyframe: 'eqBar',
    durationMin: 0.82,
    durationMax: 1.02,
    minHeight: 6,
    maxHeight: 32,
    opacityMin: 0.4,
    opacityMax: 0.92,
  },
  {
    keyframe: 'eqBarWide',
    durationMin: 1.05,
    durationMax: 1.35,
    minHeight: 10,
    maxHeight: 42,
    opacityMin: 0.36,
    opacityMax: 0.95,
  },
  {
    keyframe: 'eqBarStaccato',
    durationMin: 0.55,
    durationMax: 0.84,
    minHeight: 4,
    maxHeight: 26,
    opacityMin: 0.45,
    opacityMax: 0.9,
  },
];

export default function AudioWaveVisualizer({
  color = '#f97316',
  barCount = 8,
  intensity = 'medium'
}: AudioWaveVisualizerProps) {
  const bars = Array.from({ length: barCount });
  const delayMultiplier = intensity === 'high' ? 0.06 : intensity === 'low' ? 0.12 : 0.08;
  const pattern = useMemo(
    () => WAVE_PATTERNS[Math.floor(Math.random() * WAVE_PATTERNS.length)],
    []
  );

  return (
    <div
      className="flex items-end justify-center gap-1 h-12 px-2"
      style={{ transform: 'scaleY(-1)' }}
    >
      {bars.map((_, i) => {
        const randomDuration =
          pattern.durationMin + Math.random() * (pattern.durationMax - pattern.durationMin);
        const barStyle: CSSProperties & Record<string, string | number> = {
          backgroundColor: color,
          animationDelay: `${i * delayMultiplier}s`,
          boxShadow: `0 0 4px ${color}40`,
          animationName: pattern.keyframe,
          animationDuration: `${randomDuration}s`,
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationDirection: 'alternate',
          '--eq-min-height': `${pattern.minHeight}px`,
          '--eq-max-height': `${pattern.maxHeight}px`,
          '--eq-opacity-min': pattern.opacityMin,
          '--eq-opacity-max': pattern.opacityMax,
        };

        return <div key={i} className="w-1 rounded-full" style={barStyle} />;
      })}
    </div>
  );
}
