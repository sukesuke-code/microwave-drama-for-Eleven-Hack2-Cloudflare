import { useEffect, useRef, useState } from 'react';

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

export default function FloatingSpheres() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [spheres, setSpheres] = useState<Sphere[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
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
        duration: Math.floor(Math.random() * 30) + 40,
        delay: Math.floor(Math.random() * 5),
      });
    }

    setSpheres(newSpheres);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        setMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 1 }}
    >
      {spheres.map((sphere) => {
        const repelDistance = 150;
        const dx = (containerRef.current?.offsetWidth || 0) * (sphere.x / 100) - mousePos.x;
        const dy = (containerRef.current?.offsetHeight || 0) * (sphere.y / 100) - mousePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const shouldRepel = distance < repelDistance && distance > 0;

        const repelStrength = shouldRepel ? (1 - distance / repelDistance) * 30 : 0;
        const repelAngle = Math.atan2(dy, dx);
        const repelX = Math.cos(repelAngle) * repelStrength;
        const repelY = Math.sin(repelAngle) * repelStrength;

        return (
          <div
            key={sphere.id}
            style={{
              position: 'absolute',
              left: `${sphere.x}%`,
              top: `${sphere.y}%`,
              width: `${sphere.size}px`,
              height: `${sphere.size}px`,
              borderRadius: '50%',
              backgroundColor: sphere.color,
              willChange: 'transform',
              pointerEvents: 'none',
              filter: `blur(${sphere.size * 0.1}px)`,
              boxShadow: `0 0 ${sphere.size * 0.5}px ${sphere.color.slice(0, -1)}, 0.15)`,
              animation: `floatSphere${sphere.id % 4} ${sphere.duration}s ease-in-out ${sphere.delay}s infinite`,
              transform: shouldRepel
                ? `translate(${repelX}px, ${repelY}px)`
                : 'translate(0, 0)',
              transition: shouldRepel ? 'transform 0.2s ease-out' : 'none',
            }}
          />
        );
      })}

      <style>{`
        @keyframes floatSphere0 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(20px, -30px); }
          50% { transform: translate(-10px, 20px); }
          75% { transform: translate(15px, 25px); }
        }

        @keyframes floatSphere1 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-25px, 15px); }
          50% { transform: translate(20px, -20px); }
          75% { transform: translate(-15px, -25px); }
        }

        @keyframes floatSphere2 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(30px, 10px); }
          50% { transform: translate(-20px, -15px); }
          75% { transform: translate(10px, 30px); }
        }

        @keyframes floatSphere3 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-15px, -20px); }
          50% { transform: translate(25px, 15px); }
          75% { transform: translate(-20px, 20px); }
        }
      `}</style>
    </div>
  );
}
