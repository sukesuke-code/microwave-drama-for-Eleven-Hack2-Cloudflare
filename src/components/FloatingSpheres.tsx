import { memo, useEffect, useMemo, useRef, useState } from 'react';

interface Sphere {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  vx: number;
  vy: number;
  duration: number;
  delay: number;
}

function FloatingSpheres() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const frameRef = useRef<number | null>(null);
  const latestMouseRef = useRef({ x: 0, y: 0 });
  const lastCommittedRef = useRef({ x: 0, y: 0 });

  const spheres = useMemo(() => {
    const orangeRed = [
      'rgba(249, 115, 22, ',
      'rgba(239, 68, 68, ',
      'rgba(236, 72, 55, ',
      'rgba(251, 146, 60, ',
      'rgba(255, 87, 34, ',
    ];

    const newSpheres: Sphere[] = [];
    const count = Math.floor(Math.random() * 5) + 8;

    for (let i = 0; i < count; i++) {
      const size = Math.floor(Math.random() * 61) + 20;
      const colorBase = orangeRed[Math.floor(Math.random() * orangeRed.length)];
      const opacity = (Math.floor(Math.random() * 16) + 10) / 100;
      const color = `${colorBase}${opacity})`;

      newSpheres.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size,
        color,
        opacity,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        duration: Math.floor(Math.random() * 10) + 12,
        delay: Math.random() * 2,
      });
    }

    return newSpheres;
  }, []);

  useEffect(() => {
    const updateSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      setContainerSize({
        width: rect?.width ?? 0,
        height: rect?.height ?? 0,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const scheduleUpdate = (x: number, y: number) => {
      latestMouseRef.current = { x, y };
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        const next = latestMouseRef.current;
        const prev = lastCommittedRef.current;
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        if (Math.hypot(dx, dy) < 12) return;
        lastCommittedRef.current = next;
        setMousePos(next);
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      scheduleUpdate(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        scheduleUpdate(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden z-[1]"
    >
      {spheres.map((sphere) => {
        const repelDistance = 150;
        const dx = containerSize.width * (sphere.x / 100) - mousePos.x;
        const dy = containerSize.height * (sphere.y / 100) - mousePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const shouldRepel = distance < repelDistance && distance > 0;

        const repelStrength = shouldRepel ? (1 - distance / repelDistance) * 30 : 0;
        const repelAngle = Math.atan2(dy, dx);
        const repelX = Math.cos(repelAngle) * repelStrength;
        const repelY = Math.sin(repelAngle) * repelStrength;

        return (
          <div
            key={sphere.id}
            className={`absolute rounded-full pointer-events-none [left:${sphere.x}%] [top:${sphere.y}%] [width:${sphere.size}px] [height:${sphere.size}px] [background-color:${sphere.color.replace(/ /g, '_')}] [will-change:transform] [filter:blur(${sphere.size * 0.1}px)] [box-shadow:0_0_${sphere.size * 0.5}px_${sphere.color.slice(0, -1).replace(/ /g, '_')},_0.15)] [animation:floatSphere${sphere.id % 4}_${sphere.duration}s_ease-in-out_${sphere.delay}s_infinite] ${shouldRepel ? `[transform:translate(${repelX}px,_${repelY}px)] transition-transform duration-200 ease-out` : '[transform:translate(0,0)] transition-none'}`}
          />
        );
      })}
    </div>
  );
}

export default memo(FloatingSpheres);
