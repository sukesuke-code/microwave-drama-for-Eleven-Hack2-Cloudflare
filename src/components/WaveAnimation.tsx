import { NarrationStyle } from '../types';

interface WaveAnimationProps {
  style: NarrationStyle;
  active: boolean;
}

const STYLE_COLORS: Record<NarrationStyle, string> = {
  sports: '#38bdf8',
  movie: '#f59e0b',
  horror: '#dc2626',
  nature: '#10b981',
};

export default function WaveAnimation({ style, active }: WaveAnimationProps) {
  const color = STYLE_COLORS[style];
  const bars = Array.from({ length: 12 });

  if (!active) return null;

  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {bars.map((_, i) => (
        <div
          key={i}
          className="w-1 rounded-full"
          style={{
            backgroundColor: color,
            height: '100%',
            animation: `wave 1.5s ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`,
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  );
}
