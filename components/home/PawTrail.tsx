"use client";

import { useEffect, useRef, useState } from "react";
import { Paw } from "@/components/icons";

type Print = { id: number; x: number; y: number; r: number };

/** Easter egg: moving the mouse quickly leaves 3–4 fading paw prints (desktop, motion allowed — the parent gates it). */
export function PawTrail() {
  const [prints, setPrints] = useState<Print[]>([]);
  const last = useRef({ x: 0, y: 0, t: 0, dropped: 0, side: 1 });
  const id = useRef(0);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const l = last.current;
      const now = performance.now();
      const dist = Math.hypot(e.clientX - l.x, e.clientY - l.y);
      const speed = dist / Math.max(1, now - l.t); // px per ms
      if (l.t && speed > 1.6 && dist > 40 && now - l.dropped > 70) {
        const angle = (Math.atan2(e.clientY - l.y, e.clientX - l.x) * 180) / Math.PI + 90;
        l.side *= -1;
        const offset = 9 * l.side;
        const rad = ((angle - 90) * Math.PI) / 180;
        const print = {
          id: ++id.current,
          x: e.clientX + Math.sin(rad) * offset,
          y: e.clientY - Math.cos(rad) * offset,
          r: angle,
        };
        setPrints((p) => [...p.slice(-3), print]);
        setTimeout(() => setPrints((p) => p.filter((q) => q.id !== print.id)), 900);
        l.dropped = now;
      }
      l.x = e.clientX;
      l.y = e.clientY;
      l.t = now;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
      {prints.map((p) => (
        <Paw
          key={p.id}
          size={22}
          className="absolute text-orange/70"
          style={
            {
              left: p.x,
              top: p.y,
              "--r": `${p.r}deg`,
              animation: "paw-print 900ms var(--ease-out) forwards",
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
