import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  shape: 'rect' | 'circle';
}

const COLORS = [
  '#f97316', '#fbbf24', '#ef4444', '#10b981',
  '#60a5fa', '#a78bfa', '#f472b6', '#ffffff',
];

export default function Confetti() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const newPieces: ConfettiPiece[] = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 10 + 6,
      delay: Math.random() * 1.5,
      duration: Math.random() * 1.5 + 2,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }));
    setPieces(newPieces);

    const t = setTimeout(() => setPieces([]), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            width: p.shape === 'rect' ? p.size : p.size,
            height: p.shape === 'rect' ? p.size * 0.5 : p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
