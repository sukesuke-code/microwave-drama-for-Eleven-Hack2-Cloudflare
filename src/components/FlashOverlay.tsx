interface FlashOverlayProps {
  visible: boolean;
}

export default function FlashOverlay({ visible }: FlashOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-none [background:radial-gradient(ellipse_at_center,_rgba(255,200,100,0.9)_0%,_rgba(255,100,0,0.6)_50%,_transparent_100%)] [animation:flash_0.3s_ease-in-out]"
    />
  );
}
