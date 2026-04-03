import { CSSProperties } from 'react';

interface AudioWaveVisualizerProps {
  color?: string;
  barCount?: number;
  intensity?: 'low' | 'medium' | 'high';
  syncSeed?: number;
  audioLevel?: number;
  audioSpectrum?: number[];
  inverted?: boolean;
}

function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export default function AudioWaveVisualizer({
  color = '#f97316',
  barCount = 8,
  intensity = 'medium',
  syncSeed,
  audioLevel,
  audioSpectrum,
  inverted = false,
}: AudioWaveVisualizerProps) {
  const bars = Array.from({ length: barCount });
  const hasSpectrum = Array.isArray(audioSpectrum) && audioSpectrum.length > 0;
  const level = typeof audioLevel === 'number' ? Math.max(0, Math.min(1, audioLevel)) : 0;

  const computeBarHeight = (index: number): number => {
    if (!hasSpectrum) {
      const baseHeight = 20 + seededUnit(syncSeed ?? 0 + index * 17) * 40;
      return baseHeight + level * 60;
    }

    const spectrumIndex = (index / Math.max(1, barCount - 1)) * (audioSpectrum.length - 1);
    const leftIndex = Math.floor(spectrumIndex);
    const spectrumMaxIndex = audioSpectrum.length - 1;
    const rightIndex = Math.min(spectrumMaxIndex, leftIndex + 1);
    const blend = spectrumIndex - leftIndex;

    const leftEnergy = audioSpectrum?.[leftIndex] ?? 0;
    const rightEnergy = audioSpectrum?.[rightIndex] ?? 0;
    const interpolatedEnergy = leftEnergy + (rightEnergy - leftEnergy) * blend;

    const ripple = 0.08 + Math.abs(Math.sin((syncSeed ?? 0) * 0.1 + index * 0.72)) * 0.18;
    const mixedLevel = Math.min(1, interpolatedEnergy * 0.9 + level * 0.65 + ripple * level);
    const floorLevel = 0.14 + level * 0.42;
    const activeLevel = Math.max(floorLevel, mixedLevel);

    const minHeight = 8;
    const maxHeight = 42;
    return minHeight + activeLevel * (maxHeight - minHeight);
  };

  const computeOpacity = (index: number): number => {
    if (!hasSpectrum) {
      return 0.4 + level * 0.55;
    }

    const spectrumIndex = (index / Math.max(1, barCount - 1)) * (audioSpectrum.length - 1);
    const leftIndex = Math.floor(spectrumIndex);
    const spectrumMaxIndex = audioSpectrum.length - 1;
    const rightIndex = Math.min(spectrumMaxIndex, leftIndex + 1);
    const blend = spectrumIndex - leftIndex;

    const leftEnergy = audioSpectrum?.[leftIndex] ?? 0;
    const rightEnergy = audioSpectrum?.[rightIndex] ?? 0;
    const interpolatedEnergy = leftEnergy + (rightEnergy - leftEnergy) * blend;

    const ripple = 0.08 + Math.abs(Math.sin((syncSeed ?? 0) * 0.1 + index * 0.72)) * 0.18;
    const mixedLevel = Math.min(1, interpolatedEnergy * 0.9 + level * 0.65 + ripple * level);
    const floorLevel = 0.14 + level * 0.42;
    const activeLevel = Math.max(floorLevel, mixedLevel);

    return Math.min(1, 0.35 + activeLevel * 0.95);
  };

  return (
    <div
      className={`flex justify-center gap-1 h-12 px-2 ${inverted ? 'items-start' : 'items-end'}`}
    >
      {bars.map((_, i) => {
        const height = computeBarHeight(i);
        const opacity = computeOpacity(i);
        const delayMs = intensity === 'high' ? 40 : intensity === 'low' ? 80 : 60;
        const delay = `${i * delayMs}ms`;

        const barStyle: CSSProperties = {
          backgroundColor: color,
          height: `${height}px`,
          opacity,
          boxShadow: `0 0 4px ${color}40`,
          willChange: 'height, opacity',
          transitionProperty: 'height, opacity',
          transitionDuration: '75ms',
          transitionTimingFunction: 'ease-out',
          transitionDelay: delay,
        };

        return <div key={i} className="w-1 rounded-full" style={barStyle} />;
      })}
    </div>
  );
}
