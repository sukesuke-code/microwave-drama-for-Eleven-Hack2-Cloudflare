import { useEffect, useRef } from 'react';
import { NarrationStyle, ThemeMode } from '../types';

interface BackgroundEffectProps {
  style: NarrationStyle;
  isDanger: boolean;
  themeMode: ThemeMode;
}

export default function BackgroundEffect({ style, isDanger, themeMode }: BackgroundEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = [];

    const isLight = themeMode === 'light';

    const configs: Record<NarrationStyle, { color: string; count: number; speed: number }> = {
      sports: { color: isLight ? '#0ea5e9' : '#38bdf8', count: 30, speed: 1.5 },
      movie: { color: isLight ? '#f97316' : '#f59e0b', count: 20, speed: 0.5 },
      horror: { color: isLight ? '#ef4444' : '#dc2626', count: 25, speed: 0.8 },
      nature: { color: isLight ? '#10b981' : '#10b981', count: 35, speed: 0.7 },
      documentary: { color: isLight ? '#71717a' : '#a1a1aa', count: 15, speed: 0.3 },
      anime: { color: isLight ? '#f43f5e' : '#fb7185', count: 40, speed: 2.2 },
    };

    const config = configs[style];

    for (let i = 0; i < config.count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * config.speed,
        vy: (Math.random() - 0.5) * config.speed,
        r: isLight ? Math.random() * 2.8 + 1.4 : Math.random() * 2 + 1,
        alpha: isLight ? Math.random() * 0.35 + 0.55 : Math.random() * 0.4 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (style === 'horror' && isDanger) {
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, canvas.width * 0.8
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(180,0,0,${0.15 + Math.sin(Date.now() * 0.003) * 0.1})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = config.color;
        ctx.globalAlpha = p.alpha * (isDanger ? 1.5 : 1);
        ctx.fill();
        ctx.globalAlpha = 1;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [style, isDanger, themeMode]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: themeMode === 'light' ? 1 : 0.6 }}
    />
  );
}
