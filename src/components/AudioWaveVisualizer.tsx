import { CSSProperties, useEffect, useMemo, useState } from 'react';

interface AudioWaveVisualizerProps {
  color?: string;
  barCount?: number;
  intensity?: 'low' | 'medium' | 'high';
  syncSeed?: number;
  audioLevel?: number;
  audioSpectrum?: number[];
  inverted?: boolean;
  mode?: 'bars' | 'morph';
  motionProfile?: 'classic' | 'dynamic';
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
  mode = 'bars',
  motionProfile = 'dynamic',
}: AudioWaveVisualizerProps) {
  const bars = Array.from({ length: barCount });
  const [motionTick, setMotionTick] = useState(0);
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
  const spectrumAverage = useMemo(() => {
    if (!hasSpectrum || !audioSpectrum?.length) return 0;
    const total = audioSpectrum.reduce((sum, current) => sum + Math.max(0, current), 0);
    return Math.min(1, total / audioSpectrum.length);
  }, [hasSpectrum, audioSpectrum]);
  const motionIntensity = Math.min(1, Math.max(level, spectrumAverage));
  const isDynamicProfile = motionProfile === 'dynamic';
  const swayX = Math.sin((syncSeed ?? 0) * 0.09 + motionTick * 0.85) * (2 + motionIntensity * 6);
  const swayY = Math.cos((syncSeed ?? 0) * 0.06 + motionTick * 0.9) * (0.6 + motionIntensity * 2.4);
  const tilt = Math.sin((syncSeed ?? 0) * 0.03 + motionTick * 0.65) * (1.8 + motionIntensity * 4.2);
  const shellScaleY = 0.95 + motionIntensity * 0.35 + Math.abs(Math.sin((syncSeed ?? 0) * 0.08 + motionTick * 0.58)) * 0.16;

  useEffect(() => {
    const cadenceMs = isDynamicProfile
      ? Math.max(38, Math.floor((intensity === 'high' ? 52 : intensity === 'medium' ? 66 : 78) - motionIntensity * 22))
      : 90;
    const timer = window.setInterval(() => {
      setMotionTick((prev) => prev + 1);
    }, cadenceMs);
    return () => window.clearInterval(timer);
  }, [intensity, motionIntensity, isDynamicProfile]);

  const waveformPath = useMemo(() => {
    if (mode !== 'morph') return '';

    const points = 36;
    const width = 100;
    const centerY = 50;
    const phase = (syncSeed ?? 0) * 0.17 + motionTick * 0.52;
    const baseAmplitude = 8 + level * 12;
    const smoothing = 0.65 + level * 0.2;
    const yPoints: number[] = [];

    for (let i = 0; i <= points; i += 1) {
      const xRatio = i / points;
      const spectrumIndex = xRatio * Math.max(0, (audioSpectrum?.length ?? 1) - 1);
      const leftIndex = Math.floor(spectrumIndex);
      const rightIndex = Math.min((audioSpectrum?.length ?? 1) - 1, leftIndex + 1);
      const blend = spectrumIndex - leftIndex;
      const leftEnergy = hasSpectrum ? (audioSpectrum?.[leftIndex] ?? 0) : 0;
      const rightEnergy = hasSpectrum ? (audioSpectrum?.[rightIndex] ?? 0) : 0;
      const bandEnergy = hasSpectrum ? leftEnergy + (rightEnergy - leftEnergy) * blend : 0;
      const envelope = 0.72 + Math.sin((xRatio - 0.5) * Math.PI) * 0.38;
      const wobbleA = Math.sin(phase + i * 0.43) * (baseAmplitude * 0.35);
      const wobbleB = Math.sin(phase * 0.68 + i * 0.21) * (baseAmplitude * 0.22);
      const spectrumLift = bandEnergy * (16 + level * 12);
      const y = centerY - (wobbleA + wobbleB + spectrumLift) * envelope * smoothing;
      yPoints.push(Math.max(7, Math.min(93, y)));
    }

    return yPoints.reduce((path, y, i) => {
      const x = (i / points) * width;
      if (i === 0) return `M ${x.toFixed(2)} ${y.toFixed(2)}`;
      return `${path} L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }, '');
  }, [mode, level, syncSeed, motionTick, audioSpectrum, hasSpectrum]);

  if (mode === 'morph') {
    const glowOpacity = Math.min(0.92, 0.35 + level * 0.7);
    return (
      <div className="w-full max-w-sm px-2">
        <svg viewBox="0 0 100 100" className="h-16 w-full overflow-visible">
          <defs>
            <filter id="waveGlow">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={waveformPath}
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            fill="none"
            opacity={glowOpacity}
            filter="url(#waveGlow)"
          />
          <path
            d={waveformPath}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
            opacity={0.95}
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`flex justify-center gap-1 h-12 px-2 ${isDynamicProfile ? 'transition-transform duration-75' : ''} ${inverted ? 'items-start' : 'items-end'}`}
      style={isDynamicProfile
        ? {
          transform: `translate3d(${swayX.toFixed(2)}px, ${swayY.toFixed(2)}px, 0) skewX(${tilt.toFixed(2)}deg) scaleY(${shellScaleY.toFixed(3)})`,
        }
        : undefined}
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
        const dynamicScale = isDynamicProfile
          ? 0.34
            + activeLevel * 2.25
            + Math.sin((syncSeed ?? 0) * 0.16 + i * 0.95 + motionTick * 0.33) * 0.28
          : 0.34 + activeLevel * 1.85 + Math.sin((syncSeed ?? 0) * 0.16 + i * 0.95) * 0.18;
        const jitterX = Math.sin((syncSeed ?? 0) * 0.07 + i * 1.17 + motionTick * 0.52) * (0.08 + activeLevel * 0.32);
        const rotate = Math.sin((syncSeed ?? 0) * 0.05 + i * 0.41 + motionTick * 0.4) * (2 + activeLevel * 5.5);
        const barStyle: CSSProperties & Record<string, string | number> = {
          backgroundColor: color,
          animationDelay: `${i * delayMultiplier}s`,
          boxShadow: isDynamicProfile ? `0 0 ${4 + activeLevel * 9}px ${color}66` : `0 0 4px ${color}40`,
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
              transform: isDynamicProfile
                ? `translateX(${jitterX.toFixed(2)}px) rotate(${rotate.toFixed(2)}deg) scaleY(${Math.max(0.28, dynamicScale).toFixed(3)})`
                : `scaleY(${Math.max(0.2, dynamicScale).toFixed(3)})`,
              willChange: 'transform, opacity',
              opacity: isDynamicProfile
                ? Math.min(1, 0.42 + activeLevel * 1.08)
                : Math.min(1, 0.35 + activeLevel * 0.95),
            }
            : {}),
        };

        return <div key={i} className="w-1 rounded-full" style={barStyle} />;
      })}
    </div>
  );
}
