import { useEffect, useMemo, useState, type CSSProperties } from 'react';

type ConfettiShape = 'circle' | 'square' | 'triangle';

interface ConfettiPiece {
  id: number;
  x: number;
  drift: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  shape: ConfettiShape;
}

const COLORS = ['#f97316', '#ef4444', '#fbbf24', '#ffffff'];
const SHAPES: ConfettiShape[] = ['circle', 'square', 'triangle'];
const PARTICLE_COUNT = 60;

export default function Confetti() {
  const [visible, setVisible] = useState(true);

  const pieces = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        drift: (Math.random() - 0.5) * 120,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 8,
        delay: Math.random() * 1.2,
        duration: Math.random() * 1.5 + 1.5,
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      })),
    []
  );

  useEffect(() => {
    const timeoutMs = 4300;
    const timer = setTimeout(() => setVisible(false), timeoutMs);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => {
        const baseStyle: CSSProperties = {
          left: `${p.x}%`,
          top: '-8vh',
          width: `${p.size}px`,
          height: `${p.size}px`,
          backgroundColor: p.color,
          transform: `translate3d(0, 0, 0) rotate(0deg)`,
          animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          ['--confetti-drift' as string]: `${p.drift}px`,
        };

        if (p.shape === 'circle') {
          baseStyle.borderRadius = '9999px';
        } else if (p.shape === 'square') {
          baseStyle.borderRadius = '3px';
        } else {
          baseStyle.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
        }

        return <div key={p.id} className="absolute" style={baseStyle} />;
      })}
    </div>
  );
}
