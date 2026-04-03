import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { NarrationStyle, ThemeMode } from '../types';

interface NarrationTextProps {
  text: string;
  style: NarrationStyle;
  themeMode: ThemeMode;
  isPlaying?: boolean;
}

const STYLE_BORDER_COLORS: Record<NarrationStyle, string> = {
  sports: 'border-sky-500/30',
  movie: 'border-yellow-500/30',
  horror: 'border-red-500/30',
  nature: 'border-emerald-500/30',
};

const STYLE_BG: Record<NarrationStyle, string> = {
  sports: 'bg-blue-950/20',
  movie: 'bg-yellow-950/20',
  horror: 'bg-red-950/20',
  nature: 'bg-emerald-950/20',
};

export default function NarrationText({ text, style, themeMode, isPlaying }: NarrationTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [key, setKey] = useState(0);
  const [fontPx, setFontPx] = useState(24);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTextRef = useRef('');
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (text === prevTextRef.current) return;
    prevTextRef.current = text;

    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayedText('');
    setKey((k) => k + 1);

    let i = 0;
    const chars = Array.from(text);
    const charDuration = isPlaying ? Math.max(20, Math.floor(3000 / chars.length)) : 40;

    intervalRef.current = setInterval(() => {
      i++;
      setDisplayedText(chars.slice(0, i).join(''));
      if (i >= chars.length) {
        clearInterval(intervalRef.current!);
      }
    }, charDuration);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, isPlaying]);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const maxPx = 24;
    const minPx = 12;
    let next = maxPx;
    el.style.fontSize = `${next}px`;

    while (
      next > minPx
      && (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight)
    ) {
      next -= 1;
      el.style.fontSize = `${next}px`;
    }
    setFontPx((prev) => Math.max(prev, next));
  }, [displayedText, key]);

  return (
    <div
      key={key}
      className={`
        narration-enter
        rounded-2xl border px-6 py-5
        ${STYLE_BG[style]} ${STYLE_BORDER_COLORS[style]}
        backdrop-blur-sm
        min-h-[100px] h-full overflow-hidden flex items-center justify-center
        w-full max-w-sm mx-auto
      `}
    >
      <p
        ref={textRef}
        className={`w-full max-h-full overflow-hidden text-center text-base leading-relaxed font-medium break-words ${themeMode === 'light' ? 'text-black' : 'text-white'}`}
        style={{ fontSize: `${fontPx}px`, whiteSpace: 'pre-wrap' }}
      >
        {displayedText}
        <span className="animate-pulse opacity-70">▌</span>
      </p>
    </div>
  );
}
