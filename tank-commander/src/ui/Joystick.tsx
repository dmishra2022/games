// Fixed-position touch joystick. SPEC-002 section 7.

import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  side: 'left' | 'right';
  onChange: (ax: number, ay: number) => void;
};

const RADIUS = 60;
const DEAD = 0.12;

export default function Joystick({ side, onChange }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const send = useCallback((x: number, y: number) => {
    const d = Math.hypot(x, y) / RADIUS;
    let ax = x / RADIUS;
    let ay = y / RADIUS;
    if (d < DEAD) {
      ax = 0;
      ay = 0;
    } else {
      // Smooth dead-zone remap.
      const scale = Math.min(1, (d - DEAD) / (1 - DEAD)) / Math.max(d, 1e-6);
      ax = (x / RADIUS) * scale;
      ay = (y / RADIUS) * scale;
    }
    onChangeRef.current(ax, ay);
  }, []);

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS;
      dy = (dy / d) * RADIUS;
    }
    return { x: dx, y: dy };
  }, []);

  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      if (pointerIdRef.current !== ev.pointerId) return;
      const p = toLocal(ev.clientX, ev.clientY);
      setKnob(p);
      send(p.x, p.y);
    };
    const onUp = (ev: PointerEvent) => {
      if (pointerIdRef.current !== ev.pointerId) return;
      pointerIdRef.current = null;
      setActive(false);
      setKnob({ x: 0, y: 0 });
      send(0, 0);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [send, toLocal]);

  const onDown = (ev: React.PointerEvent) => {
    if (pointerIdRef.current !== null) return;
    pointerIdRef.current = ev.pointerId;
    setActive(true);
    const p = toLocal(ev.clientX, ev.clientY);
    setKnob(p);
    send(p.x, p.y);
  };

  return (
    <div
      ref={ref}
      onPointerDown={onDown}
      className={`pointer-events-auto absolute bottom-6 ${
        side === 'left' ? 'left-6' : 'right-6'
      } flex h-[${RADIUS * 2}px] w-[${RADIUS * 2}px] items-center justify-center rounded-full border border-tc-ash bg-tc-panel/50 backdrop-blur touch-none select-none`}
      style={{ width: RADIUS * 2, height: RADIUS * 2 }}
    >
      <div
        className={`h-10 w-10 rounded-full border-2 ${
          active ? 'border-tc-amber bg-tc-amber/20' : 'border-tc-steel/50 bg-tc-dim/60'
        }`}
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}
