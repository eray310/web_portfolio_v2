import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../utils/motion";
import "./styles/ZihnimDoor.css";

/**
 * The door to /zihnim: a "window" onto a slow field of dots in the colours of the first song cover ("Sabah Olmadan":
 * turquoise, ice blue, deep blue, a little orange). The text stands on a thin frosted-glass plate: the ONLY frosted
 * glass of the site, on purpose. With a mouse over the door the dots gather into the square of the cover and leave
 * again when the pointer goes; on touch screens and with "Hareketi azalt" the gathered square stands still.
 * A plain 2D canvas, drawn only while the door is on screen and something moves.
 */
const PALETTE = ["#5eead4", "#9fd8ff", "#3a6fb5", "#1f3f73", "#e8925a", "#d9eef2"];
const WEIGHTS = [5, 4, 3, 3, 1, 2];

const ZihnimDoor = () => {
  const box = useRef<HTMLAnchorElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const host = box.current;
    const g = el?.getContext("2d");
    if (!el || !host || !g) return;
    const still = prefersReducedMotion() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let w = 0;
    let h = 0;
    let s = 4242;
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    const pool: string[] = [];
    PALETTE.forEach((c, i) => {
      for (let k = 0; k < WEIGHTS[i]; k++) pool.push(c);
    });
    type D = { x: number; y: number; vx: number; vy: number; sx: number; sy: number; r: number; c: string; ph: number };
    let dots: D[] = [];
    const build = () => {
      const r = el.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(900, (w * h) / 260));
      const side = Math.min(h * 0.62, 150);
      const cx = w - side / 2 - Math.min(80, w * 0.08);
      const cy = h / 2;
      const cols = Math.ceil(Math.sqrt(n));
      dots = Array.from({ length: n }, (_, i) => ({
        x: rnd() * w,
        y: rnd() * h,
        vx: (rnd() - 0.5) * 0.12,
        vy: (rnd() - 0.5) * 0.12,
        sx: cx - side / 2 + ((i % cols) + 0.5) * (side / cols),
        sy: cy - side / 2 + (Math.floor(i / cols) + 0.5) * (side / cols),
        r: 0.9 + rnd() * 1.5,
        c: pool[Math.floor(rnd() * pool.length)],
        ph: rnd(),
      }));
    };
    let k = still ? 1 : 0; // 0 scattered, 1 gathered in the square
    let goal = k;
    let inView = false;
    let raf = 0;
    const draw = () => {
      g.clearRect(0, 0, w, h);
      for (const d of dots) {
        const e = Math.min(1, Math.max(0, k * 1.4 - d.ph * 0.4));
        const q = e * e * (3 - 2 * e);
        const x = d.x + (d.sx - d.x) * q;
        const y = d.y + (d.sy - d.y) * q;
        g.globalAlpha = 0.45 + 0.4 * q;
        g.fillStyle = d.c;
        g.beginPath();
        g.arc(x, y, d.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    };
    const frame = () => {
      raf = 0;
      if (!inView) return;
      if (!still) {
        for (const d of dots) {
          d.x += d.vx;
          d.y += d.vy;
          if (d.x < 0 || d.x > w) d.vx *= -1;
          if (d.y < 0 || d.y > h) d.vy *= -1;
        }
        k += (goal - k) * 0.045;
      }
      draw();
      if (!still) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    build();
    draw();
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (inView) kick();
    });
    io.observe(el);
    const ro = new ResizeObserver(() => {
      build();
      draw();
    });
    ro.observe(el);
    const on = () => {
      goal = 1;
      kick();
    };
    const off = () => {
      goal = 0;
      kick();
    };
    if (!still) {
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      host.addEventListener("focus", on);
      host.addEventListener("blur", off);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointerenter", on);
      host.removeEventListener("pointerleave", off);
      host.removeEventListener("focus", on);
      host.removeEventListener("blur", off);
    };
  }, []);

  return (
    <section className="zdoor" aria-labelledby="zdoor-h">
      <a ref={box} className="zdoor-link" href="/zihnim" data-cursor="disable">
        <canvas ref={canvas} className="zdoor-art" aria-hidden="true" />
        <span className="zdoor-glass">
          <span className="zdoor-ch">
            <b>00</b> · Zihnim
          </span>
          <span className="zdoor-title" id="zdoor-h">
            Her şey bir şarkı kapağıyla başladı.
          </span>
          <span className="zdoor-sub">Etkileşimli hikâyem, yaklaşık bir dakika.</span>
          <span className="zdoor-go">
            Hikâyemi izle <span aria-hidden="true">→</span>
          </span>
        </span>
      </a>
    </section>
  );
};

export default ZihnimDoor;
