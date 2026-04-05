import { useMemo } from 'react';
import { NarrationStyle } from '../types';

interface WaveAnimationProps {
  style: NarrationStyle;
  active: boolean;
  narrationText: string;
  beat: number;
}

const STYLE_COLORS: Record<NarrationStyle, string> = {
  sports: '#38bdf8',
  movie: '#f59e0b',
  horror: '#dc2626',
  nature: '#10b981',
  documentary: '#a8a29e',
  anime: '#f43f5e',
};

function getEnergyScore(text: string): number {
  const punctuationHits = (text.match(/[!?！？。、]/g) ?? []).length;
  const lengthScore = Math.min(12, Math.floor(text.length / 8));
  return Math.max(1, Math.min(20, 4 + punctuationHits + lengthScore));
}

export default function WaveAnimation({ style, active, narrationText, beat }: WaveAnimationProps) {
  const color = STYLE_COLORS[style];
  const bars = Array.from({ length: 12 });

  const { seed, energy } = useMemo(() => {
    const baseSeed = narrationText
      .split('')
      .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);

    return {
      seed: baseSeed,
      energy: getEnergyScore(narrationText),
    };
  }, [narrationText]);

  if (!active) return null;

  return (
    <div className="flex h-8 items-end justify-center gap-1">
      {bars.map((_, i) => {
        const motionSeed = seed + i * 31 + beat * 17;
        const heightPercent = 30 + (motionSeed % 58);
        const duration = Math.max(0.5, 1.4 - energy * 0.035 + (i % 3) * 0.08);

        return (
          <div
            key={`${i}-${seed}-${beat}`}
            className={`w-1 rounded-full opacity-85 wave-bar-dynamic [--wave-color:${color}] [--wave-height:${heightPercent}%] [--wave-animation:wave_${duration}s_ease-in-out_infinite] [--wave-delay:${(i % 6) * 0.08}s]`}
          />
        );
      })}
    </div>
  );
}
