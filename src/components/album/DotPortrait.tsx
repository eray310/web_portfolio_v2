import { useEffect, useRef } from "react";
import { viewMode } from "../../utils/viewMode";
import { portraitConfig as C } from "./albumConfig";

/**
 * Eray's portrait, made of dots (never shown as a plain photograph).
 *
 * The source is a small, masked, grayscale picture without metadata (public/hakkimda/portre-kaynak.jpg). It is read
 * once into a grid; each cell becomes one dot whose size follows the brightness (bright: large, shadow: small and
 * sparse), so the hard side light stays: one half of the face is clear, the other is lost among the dots.
 *
 * Motion: when the portrait comes into view the scattered dots gather ONCE. With a mouse, dots near the pointer give
 * way a very little and come back. Touch screens, "Hareketi azalt" and the calm view get the finished portrait.
 * A plain 2D canvas (no WebGL); nothing is drawn while it is off screen or at rest.
 */
type Dot = { x: number; y: number; r: number; sx: number; sy: number; d: number; teal: boolean; ox: number; oy: number };

const base = import.meta.env.BASE_URL;

const DotPortrait = ({ className = "" }: { className?: string }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current;
    const g = el?.getContext("2d");
    if (!el || !g) return;
    let dots: Dot[] = [];
    let size = 0;
    let raf = 0;
    let t0 = 0;
    let gathered = false;
    let inView = false;
    let alive = true;
    const pointer = { x: -9, y: -9, on: 0, last: 0 };
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const still = () => viewMode.calm() || !fine;
    const img = new Image();

    const build = () => {
      size = Math.max(120, Math.round(el.clientWidth));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = el.height = Math.round(size * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cols = Math.round(Math.min(C.maxCols, Math.max(C.minCols, size / C.cell)));
      const c = document.createElement("canvas");
      c.width = c.height = cols;
      const cg = c.getContext("2d", { willReadFrequently: true });
      if (!cg) return;
      cg.drawImage(img, 0, 0, cols, cols);
      const px = cg.getImageData(0, 0, cols, cols).data;
      const step = size / cols;
      let s = 7331;
      const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
      dots = [];
      for (let y = 0; y < cols; y++)
        for (let x = 0; x < cols; x++) {
          const l = px[(y * cols + x) * 4] / 255;
          const v = Math.pow(Math.max(0, (l - C.black) / (1 - C.black)), C.gamma);
          // shadows are sparse: a dark cell often has no dot at all
          if (v < 0.02 || (v < C.sparseBelow && rnd() > v / C.sparseBelow)) {
            rnd();
            continue;
          }
          const a = rnd() * Math.PI * 2;
          const far = size * (0.5 + rnd() * 0.5);
          dots.push({
            x: (x + 0.5 + (rnd() - 0.5) * C.jitter) * step,
            y: (y + 0.5 + (rnd() - 0.5) * C.jitter) * step,
            r: Math.max(C.minR, step * 0.5 * C.maxFill * Math.pow(v, 0.72)),
            sx: size / 2 + Math.cos(a) * far,
            sy: size / 2 + Math.sin(a) * far,
            d: rnd() * C.stagger,
            teal: rnd() < C.teal && v > 0.25,
            ox: 0,
            oy: 0,
          });
        }
    };

    const draw = (k: number, now: number) => {
      g.clearRect(0, 0, size, size);
      const R = size * C.pointer.radius;
      let moving = false;
      for (const d of dots) {
        const e = k >= 1 ? 1 : Math.min(1, Math.max(0, (k * (1 + C.stagger) - d.d)));
        const q = 1 - Math.pow(1 - e, 3);
        let x = d.sx + (d.x - d.sx) * q;
        let y = d.sy + (d.y - d.sy) * q;
        if (pointer.on > 0.01 && k >= 1) {
          const dx = d.x - pointer.x;
          const dy = d.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          const f = dist < R ? (1 - dist / R) * (1 - dist / R) * C.pointer.push * size * pointer.on : 0;
          const wave = Math.sin(dist * 0.09 - now * 0.006) * 0.35 + 0.65;
          d.ox += ((dist > 0.01 ? (dx / dist) * f * wave : 0) - d.ox) * 0.2;
          d.oy += ((dist > 0.01 ? (dy / dist) * f * wave : 0) - d.oy) * 0.2;
        } else {
          d.ox *= 0.86;
          d.oy *= 0.86;
        }
        if (Math.abs(d.ox) + Math.abs(d.oy) > 0.02) moving = true;
        x += d.ox;
        y += d.oy;
        g.globalAlpha = 0.25 + 0.75 * q;
        g.fillStyle = d.teal ? C.tealColor : C.ink;
        g.beginPath();
        g.arc(x, y, d.r * (0.6 + 0.4 * q), 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      return moving;
    };

    const frame = (now: number) => {
      raf = 0;
      if (!alive || !inView) return;
      if (!t0) t0 = now;
      const k = gathered ? 1 : Math.min(1, (now - t0) / C.gatherMs);
      if (k >= 1) gathered = true;
      const idle = now - pointer.last > 600;
      pointer.on += ((idle ? 0 : 1) - pointer.on) * 0.12;
      const moving = draw(k, now);
      if (!gathered || pointer.on > 0.01 || moving) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && alive && inView) raf = requestAnimationFrame(frame);
    };
    const finish = () => {
      gathered = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      draw(1, 0);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || still() || !gathered) return;
      const r = el.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.last = performance.now();
      kick();
    };
    const io = new IntersectionObserver(
      ([en]) => {
        inView = en.isIntersecting;
        if (!inView || !dots.length) return;
        if (viewMode.calm()) finish();
        else kick();
      },
      { threshold: 0.25 }
    );
    let rt = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(rt);
      rt = window.setTimeout(() => {
        if (!img.complete || !img.naturalWidth || Math.abs(el.clientWidth - size) < 2) return;
        build();
        if (gathered || viewMode.calm()) finish();
      }, 120);
    });
    const unsub = viewMode.subscribe(() => {
      if (viewMode.calm() && dots.length) finish();
    });
    img.onload = () => {
      if (!alive) return;
      build();
      el.dataset.ready = "1";
      // the finished portrait is there at once when nothing may move; otherwise the dots wait scattered and gather in view
      if (viewMode.calm()) finish();
      else draw(0, 0);
      io.observe(el);
      ro.observe(el);
    };
    img.src = `${base}hakkimda/portre-kaynak.jpg`;
    el.addEventListener("pointermove", onMove);
    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(rt);
      io.disconnect();
      ro.disconnect();
      unsub();
      el.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} className={`alb-portrait ${className}`} role="img" aria-label="Eray Ömeroğlu, noktalardan oluşan portre" />;
};

export default DotPortrait;
