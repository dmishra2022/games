// Simple virtual joystick for touch input. Emits a unit vector via
// onChange whenever the finger moves; zeros on release.

import { useEffect, useRef, useState } from 'react';

type Props = {
  onChange: (axis: { ax: number; ay: number }) => void;
  // When false, the joystick is hidden (e.g. during menus).
  visible: boolean;
};

const BASE_RADIUS = 56;
const KNOB_RADIUS = 28;
const DEADZONE = 0.15;

export default function Joystick({ onChange, visible }: Props) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [isCoarse, setIsCoarse] = useState(false);

  // Only show on coarse pointers.
  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)');
    const update = () => setIsCoarse(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!visible || !isCoarse) {
      onChange({ ax: 0, ay: 0 });
      setKnob({ x: 0, y: 0 });
    }
  }, [visible, isCoarse, onChange]);

  const centerFromEvent = (ev: PointerEvent) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = ev.clientX - cx;
    let dy = ev.clientY - cy;
    const len = Math.hypot(dx, dy);
    const max = BASE_RADIUS;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    setKnob({ x: dx, y: dy });
    const nx = dx / max;
    const ny = dy / max;
    const m = Math.hypot(nx, ny);
    if (m < DEADZONE) {
      onChange({ ax: 0, ay: 0 });
    } else {
      onChange({ ax: nx, ay: ny });
    }
  };

  const onPointerDown = (ev: React.PointerEvent) => {
    if (activePointerRef.current !== null) return;
    activePointerRef.current = ev.pointerId;
    (ev.target as Element).setPointerCapture(ev.pointerId);
    centerFromEvent(ev.nativeEvent);
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    if (activePointerRef.current !== ev.pointerId) return;
    centerFromEvent(ev.nativeEvent);
  };

  const onPointerEnd = (ev: React.PointerEvent) => {
    if (activePointerRef.current !== ev.pointerId) return;
    activePointerRef.current = null;
    setKnob({ x: 0, y: 0 });
    onChange({ ax: 0, ay: 0 });
  };

  if (!visible || !isCoarse) return null;

  return (
    <div
      ref={baseRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      className="pointer-events-auto absolute bottom-6 left-6 z-20 flex items-center justify-center rounded-full border border-ns-cyan/40 bg-ns-panel/50 backdrop-blur-sm"
      style={{
        width: BASE_RADIUS * 2,
        height: BASE_RADIUS * 2,
        touchAction: 'none',
      }}
      aria-label="Move joystick"
    >
      <div
        className="rounded-full bg-ns-cyan/70 shadow-ns-cyan"
        style={{
          width: KNOB_RADIUS * 2,
          height: KNOB_RADIUS * 2,
          transform: `translate(${knob.x}px, ${knob.y}px)`,
          transition: activePointerRef.current === null ? 'transform 120ms ease-out' : 'none',
        }}
      />
    </div>
  );
}
