import { Zap } from 'lucide-react';
import AudioWaveVisualizer from '../components/AudioWaveVisualizer';
import FloatingSpheres from '../components/FloatingSpheres';

interface TopPageProps {
  onStart: () => void;
}

export default function TopPage({ onStart }: TopPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#00031a] noise-bg">
      <FloatingSpheres />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(249,115,22,0.08) 0%, transparent 70%)',
        }}
      />

      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          border: '1px solid rgba(249,115,22,0.06)',
          boxShadow: '0 0 80px rgba(249,115,22,0.04)',
        }}
      />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          border: '1px solid rgba(249,115,22,0.08)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 max-w-md w-full">
        <div className="flex items-center gap-2 mb-6">
          <Zap size={20} className="text-orange-500 animate-pulse" />
          <span className="text-orange-500/70 text-xs font-bold tracking-widest uppercase">
            Microwave Drama
          </span>
          <Zap size={20} className="text-orange-500 animate-pulse" />
        </div>

        <h1
          className="font-display text-7xl font-bold text-center mb-2 tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #ff6b35 0%, #f97316 40%, #fbbf24 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            filter: 'drop-shadow(0 0 20px rgba(249,115,22,0.5))',
          }}
        >
          チンドラマ
        </h1>

        <p className="text-sm text-orange-400/60 tracking-widest font-bold mb-2 uppercase">
          Ching Drama
        </p>

        <div
          className="h-px w-24 mb-8"
          style={{
            background: 'linear-gradient(90deg, transparent, #f97316, transparent)',
          }}
        />

        <p className="text-center text-slate-300/80 text-base leading-relaxed mb-2 font-medium">
          世界で最も退屈な待ち時間を
        </p>
        <p className="text-center text-white text-lg font-bold mb-10">
          人生で最もドラマチックな瞬間に変える
        </p>

        <button
          onClick={onStart}
          className="relative group w-full max-w-xs py-5 rounded-2xl font-display text-2xl font-bold tracking-widest text-white uppercase overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #ea580c, #f97316, #fb923c)',
            boxShadow: '0 0 30px rgba(249,115,22,0.5), 0 0 60px rgba(249,115,22,0.2)',
          }}
        >
          <span className="relative z-10">START</span>
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(135deg, #c2410c, #ea580c, #f97316)',
            }}
          />
          <div className="absolute inset-0 group-hover:animate-glow-pulse" />
        </button>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
          <span>🏟️ スポーツ</span>
          <span className="text-slate-600">·</span>
          <span>🎬 映画</span>
          <span className="text-slate-600">·</span>
          <span>😱 ホラー</span>
          <span className="text-slate-600">·</span>
          <span>🌍 自然</span>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-600 text-xs text-center w-full max-w-xs">
        <div className="flex flex-col items-center gap-3">
          <AudioWaveVisualizer color="#f97316" barCount={16} />
          <span className="text-xs text-slate-500">電子レンジのドラマが今始まる</span>
        </div>
      </div>
    </div>
  );
}
