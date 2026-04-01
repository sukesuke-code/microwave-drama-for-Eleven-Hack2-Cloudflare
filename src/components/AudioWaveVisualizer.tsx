import { useMemo } from 'react';

interface AudioWaveVisualizerProps {
  color?: string;
  barCount?: number;
  intensity?: 'low' | 'medium' | 'high';
}

type WavePattern = 'ripple' | 'symmetric' | 'chaotic';

const WAVE_PATTERNS: WavePattern[] = ['ripple', 'symmetric', 'chaotic'];

export default function AudioWaveVisualizer({
  color = '#f97316',
  barCount = 8,
  intensity = 'medium'
}: AudioWaveVisualizerProps) {
  const bars = Array.from({ length: barCount });
  const delayMultiplier = intensity === 'high' ? 0.06 : intensity === 'low' ? 0.12 : 0.08;
  const wavePattern = useMemo(
    () => WAVE_PATTERNS[Math.floor(Math.random() * WAVE_PATTERNS.length)],
    []
  );

  const getAnimationDelay = (index: number): string => {
    if (wavePattern === 'ripple') return `${index * delayMultiplier}s`;
    if (wavePattern === 'symmetric') {
      const center = (barCount - 1) / 2;
      return `${Math.abs(index - center) * delayMultiplier}s`;
    }
    return `${((index * 7) % barCount) * delayMultiplier * 0.7}s`;
  };

  const getAnimationDuration = (index: number): string => {
    if (wavePattern === 'ripple') return `${0.85 + (index % 3) * 0.12}s`;
    if (wavePattern === 'symmetric') return `${1.05 + Math.abs(index - (barCount - 1) / 2) * 0.06}s`;
    return `${0.8 + ((index * 5) % 6) * 0.09}s`;
  };

  const getAnimationTiming = (index: number): string => {
    if (wavePattern === 'ripple') return 'ease-in-out';
    if (wavePattern === 'symmetric') return 'cubic-bezier(0.4, 0, 0.2, 1)';
    return index % 2 === 0 ? 'ease-in' : 'ease-out';
  };

  return (
    <div
      className="flex items-end justify-center gap-1 h-12 px-2"
      style={{ transform: 'scaleY(-1)' }}
    >
      {bars.map((_, i) => (
        <div
          key={i}
          className="w-1 rounded-full animate-eq-bar"
          style={{
            backgroundColor: color,
            animationDelay: getAnimationDelay(i),
            animationDuration: getAnimationDuration(i),
            animationTimingFunction: getAnimationTiming(i),
            boxShadow: `0 0 4px ${color}40`,
          }}
        />
      ))}
    </div>
  );
}
