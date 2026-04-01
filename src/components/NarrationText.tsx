import { useEffect, useState, useRef } from 'react';
import { NarrationStyle } from '../types';

interface NarrationTextProps {
  text: string;
  style: NarrationStyle;
}

const STYLE_TEXT_COLORS: Record<NarrationStyle, string> = {
  sports: 'text-sky-300',
  movie: 'text-yellow-300',
  horror: 'text-red-300',
  nature: 'text-emerald-300',
};

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

export default function NarrationText({ text, style }: NarrationTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [key, setKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTextRef = useRef('');

  useEffect(() => {
    if (text === prevTextRef.current) return;
    prevTextRef.current = text;

    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayedText('');
    setKey((k) => k + 1);

    let i = 0;
    const chars = Array.from(text);

    intervalRef.current = setInterval(() => {
      i++;
      setDisplayedText(chars.slice(0, i).join(''));
      if (i >= chars.length) {
        clearInterval(intervalRef.current!);
      }
    }, 40);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text]);

  const lines = displayedText.split('\n');

  return (
    <div
      key={key}
      className={`
        narration-enter
        rounded-2xl border px-6 py-5
        ${STYLE_BG[style]} ${STYLE_BORDER_COLORS[style]}
        backdrop-blur-sm
        min-h-[100px] flex items-center justify-center
        w-full max-w-sm mx-auto
      `}
    >
      <p
        className={`text-center text-base leading-relaxed font-medium ${STYLE_TEXT_COLORS[style]}`}
        style={{ whiteSpace: 'pre-line' }}
      >
        {lines.map((line, i) => (
          <span key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
        <span className="animate-pulse opacity-70">▌</span>
      </p>
    </div>
  );
}
