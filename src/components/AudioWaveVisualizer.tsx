import { CSSProperties, useMemo } from 'react';

interface AudioWaveVisualizerProps {
  color?: string;
  barCount?: number;
  intensity?: 'low' | 'medium' | 'high';
  syncSeed?: number;
  audioLevel?: number;
  audioSpectrum?: number[];
  inverted?: boolean;
}

type WavePattern = {
  keyframe: 'eqBar' | 'eqBarWide' | 'eqBarStaccato' | 'eqBarClassic';
  durationMin: number;
  durationMax: number;
  minHeight: number;
  maxHeight: number;
  opacityMin: number;
  opacityMax: number;
};

const WAVE_PATTERNS: WavePattern[] = [
  {
    keyframe: 'eqBarClassic',
    durationMin: 0.9,
    durationMax: 0.9,
    minHeight: 8,
    maxHeight: 30,
    opacityMin: 0.45,
    opacityMax: 0.88,
  },
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
  const delayMultiplier = intensity === 'high' ? 0.06 : intensity === 'low' ? 0.12 : 0.08;
  const pattern = useMemo(() => {
    if (typeof syncSeed === 'number') {
      return WAVE_PATTERNS[Math.abs(syncSeed) % WAVE_PATTERNS.length];
    }
    return WAVE_PATTERNS[Math.floor(Math.random() * WAVE_PATTERNS.length)];
  }, [syncSeed]);
  const hasSpectrum = Array.isArray(audioSpectrum) && audioSpectrum.length > 0;
  const level = typeof audioLevel === 'number' ? Math.max(0, Math.min(1, audioLevel)) : 0;
  const isAudioReactive = typeof audioLevel === 'number' || hasSpectrum;

  return (
    <div
      className={`flex justify-center gap-1 h-12 px-2 ${inverted ? 'items-start' : 'items-end'}`}
    >
      {bars.map((_, i) => {
        const randomUnit = typeof syncSeed === 'number' ? seededUnit(syncSeed + i * 17) : Math.random();
        const randomDuration =
          pattern.durationMin + randomUnit * (pattern.durationMax - pattern.durationMin);
        const spectrumIndex = hasSpectrum
          ? (i / Math.max(1, barCount - 1)) * (audioSpectrum.length - 1)
          : 0;
        const leftIndex = Math.floor(spectrumIndex);
        const spectrumMaxIndex = hasSpectrum ? (audioSpectrum.length - 1) : 0;
        const rightIndex = Math.min(spectrumMaxIndex, leftIndex + 1);
        const blend = spectrumIndex - leftIndex;
        const leftEnergy = hasSpectrum ? (audioSpectrum?.[leftIndex] ?? 0) : 0;
        const rightEnergy = hasSpectrum ? (audioSpectrum?.[rightIndex] ?? 0) : 0;
        const interpolatedEnergy = leftEnergy + (rightEnergy - leftEnergy) * blend;
        const ripple = 0.08 + Math.abs(Math.sin((syncSeed ?? 0) * 0.1 + i * 0.72)) * 0.18;
        const mixedLevel = hasSpectrum
          ? Math.min(1, interpolatedEnergy * 0.9 + level * 0.65 + ripple * level)
          : level;
        const floorLevel = 0.14 + level * 0.42;
        const activeLevel = Math.max(floorLevel, mixedLevel);
        const dynamicScale = 0.34 + activeLevel * 1.85 + Math.sin((syncSeed ?? 0) * 0.16 + i * 0.95) * 0.18;
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
          ...(isAudioReactive
            ? {
              transform: `scaleY(${Math.max(0.2, dynamicScale)})`,
              willChange: 'transform, opacity',
              opacity: Math.min(1, 0.35 + activeLevel * 0.95),
            }
            : {}),
        };

        return <div key={i} className="w-1 rounded-full" style={barStyle} />;
      })}
    </div>
  );
}
