// Défilement horizontal des bandeaux (« À la une », rails de produits) :
// - souris : la molette défile de gauche à droite, on peut aussi attraper et glisser ;
// - flèches précédent / suivant, grisées au début et à la fin ;
// - tactile : glissement natif du doigt.
import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "./ui";

export function useHScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [edge, setEdge] = useState({ start: true, end: false, scrollable: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4, scrollable: el.scrollWidth > el.clientWidth + 4 });
    update();
    // Molette verticale → défilement horizontal, tant que le bandeau peut encore défiler dans ce sens
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.ctrlKey) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const next = Math.max(0, Math.min(max, el.scrollLeft + e.deltaY));
      if (next === el.scrollLeft) return; // au bout : on laisse la page défiler
      e.preventDefault();
      el.scrollLeft = next;
    };
    // Attraper-glisser à la souris (le tactile garde son glissement natif)
    let down = false, moved = false, x0 = 0, s0 = 0;
    const onDown = (e: PointerEvent) => { if (e.pointerType !== "mouse" || e.button !== 0) return; down = true; moved = false; x0 = e.clientX; s0 = el.scrollLeft; };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - x0;
      if (!moved && Math.abs(dx) < 6) return;
      if (!moved) { moved = true; el.classList.add("is-dragging"); }
      el.scrollLeft = s0 - dx;
    };
    const onUp = () => { if (!down) return; down = false; el.classList.remove("is-dragging"); };
    const onClick = (e: MouseEvent) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
    el.addEventListener("scroll", update, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClick, true);
    el.addEventListener("dragstart", (e) => e.preventDefault());
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", update); el.removeEventListener("wheel", onWheel); el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); el.removeEventListener("click", onClick, true); ro?.disconnect();
    };
  }, []);
  const by = (dir: number) => { const el = ref.current; if (el) el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" }); };
  return { ref, edge, by };
}

export function HArrows({ edge, by, className }: { edge: { start: boolean; end: boolean; scrollable: boolean }; by: (d: number) => void; className?: string }) {
  if (!edge.scrollable) return null;
  return (
    <div className={cx("harrows", className)}>
      <button type="button" onClick={() => by(-1)} disabled={edge.start} aria-label="Précédent"><ChevronLeft size={18} /></button>
      <button type="button" onClick={() => by(1)} disabled={edge.end} aria-label="Suivant"><ChevronRight size={18} /></button>
    </div>
  );
}
