import { useEffect, useMemo, useState, type CSSProperties } from 'react';

type ConfettiShape = 'circle' | 'rectangle' | 'triangle';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  shape: ConfettiShape;
}

const COLORS = ['#f97316', '#ef4444', '#fbbf24', '#fb923c', '#fde68a', '#fff'];
const SHAPES: ConfettiShape[] = ['circle', 'rectangle', 'triangle'];
const PARTICLE_COUNT = 60;

export default function Confetti() {
  const [visible, setVisible] = useState(true);

  const pieces = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 6,
        delay: Math.random() * 0.5,
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
          top: '-20px',
          width: `${p.size}px`,
          height: `${p.size}px`,
          backgroundColor: p.color,
          opacity: 0.9,
          transform: 'translateY(-20px) rotate(0deg)',
          animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
        };

        if (p.shape === 'circle') {
          baseStyle.borderRadius = '50%';
        } else if (p.shape === 'rectangle') {
          baseStyle.height = `${p.size * 0.6}px`;
        } else {
          baseStyle.width = '0';
          baseStyle.height = '0';
          baseStyle.backgroundColor = 'transparent';
          baseStyle.borderLeft = `${p.size / 2}px solid transparent`;
          baseStyle.borderRight = `${p.size / 2}px solid transparent`;
          baseStyle.borderBottom = `${p.size}px solid ${p.color}`;
        }

        return <div key={p.id} className="absolute" style={baseStyle} />;
      })}
    </div>
  );
}
