interface AudioWaveVisualizerProps {
  color?: string;
  barCount?: number;
  intensity?: 'low' | 'medium' | 'high';
}

export default function AudioWaveVisualizer({
  color = '#f97316',
  barCount = 8,
  intensity = 'medium'
}: AudioWaveVisualizerProps) {
  const bars = Array.from({ length: barCount });
  const delayMultiplier = intensity === 'high' ? 0.06 : intensity === 'low' ? 0.12 : 0.08;

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
            animationDelay: `${i * delayMultiplier}s`,
            boxShadow: `0 0 4px ${color}40`,
          }}
        />
      ))}
    </div>
  );
}
