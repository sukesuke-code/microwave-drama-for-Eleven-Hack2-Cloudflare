interface FlashOverlayProps {
  visible: boolean;
}

export default function FlashOverlay({ visible }: FlashOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-none"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(255,200,100,0.9) 0%, rgba(255,100,0,0.6) 50%, transparent 100%)',
        animation: 'flash 0.3s ease-in-out',
      }}
    />
  );
}
