import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../utils/motion";
import "./styles/Cursor.css";

/**
 * A small off-white dot that follows the mouse; over links, buttons and work cards it opens into a thin ring.
 * No glow and no blend mode, so text under it stays readable. Touch screens and "Hareketi azalt" keep the system
 * cursor (this one is not shown at all).
 */
const TARGET = "a, button, [role='button'], .work-card, label, summary";

const Cursor = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine || prefersReducedMotion()) return;
    el.classList.add("is-on");
    const at = { x: -50, y: -50 };
    const now = { x: -50, y: -50 };
    let raf = 0;
    const loop = () => {
      now.x += (at.x - now.x) * 0.35;
      now.y += (at.y - now.y) * 0.35;
      el.style.transform = `translate(${now.x}px, ${now.y}px)`;
      raf = Math.abs(at.x - now.x) + Math.abs(at.y - now.y) > 0.2 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      at.x = e.clientX;
      at.y = e.clientY;
      el.classList.toggle("is-link", !!(e.target as Element | null)?.closest?.(TARGET));
      el.classList.remove("is-out");
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onLeave = () => el.classList.add("is-out");
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  return <div className="cursor-main" ref={ref} aria-hidden="true" />;
};

export default Cursor;
