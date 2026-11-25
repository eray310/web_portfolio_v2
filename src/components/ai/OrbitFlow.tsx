import { useEffect, useRef } from "react";
import { createFlowField, type FlowSample } from "./flowField";

/**
 * /hakkimda: the pointer's flow in the sky, with one small 2D canvas (no second WebGL canvas).
 *
 * - The existing CSS stars stay as they are; the three still star layers and the two star fields
 *   only slide a few pixels with the flow (`translate`, at different depths), so the whole sky
 *   leans the way the pointer went and settles back when it rests.
 * - On the canvas: some brighter near stars that are pushed aside and bent along the way, and thin
 *   threads of light that show only where the pointer has just been (the wake) and fade out.
 * - It draws only while there is something moving (the loop sleeps when the field is at rest, and
 *   starts again on the next pointer move), never when the tab is hidden, never on a touch screen.
 * - Decorative: aria-hidden, no pointer events, no focus. The scene menu and the scroll-driven
 *   camera are not touched.
 */
const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

type Near = { u: number; v: number; r: number; a: number; depth: number; tint: number };
type Thread = { u: number; v: number; ang: number; len: number; depth: number; seed: number };

const OrbitFlow = ({ rootRef }: { rootRef: React.RefObject<HTMLElement> }) => {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const root = rootRef.current;
    if (!el || !root) return;
    const ctx = el.getContext("2d", { alpha: true });
    if (!ctx) return;
    const yr = el.closest<HTMLElement>(".yr");
    const sky = root.querySelector<HTMLElement>(".yr-sky");
    const layers = Array.from(root.querySelectorAll<HTMLElement>(".yr-sky i, .yr-stars"));
    const depth = [1.5, 3.2, 6.4, 2.2, 3.6]; // px per unit of the mean push, per layer
    let raf = 0;
    let W = 1;
    let H = 1;
    const r = rng(907);
    const nears: Near[] = Array.from({ length: 64 }, () => ({ u: r(), v: r(), r: 0.5 + r() * 1.3, a: 0.35 + r() * 0.55, depth: 0.3 + r() * 0.9, tint: r() }));
    const threads: Thread[] = Array.from({ length: 110 }, () => ({ u: r(), v: r(), ang: r() * Math.PI * 2, len: 40 + r() * 90, depth: 0.5 + r() * 0.8, seed: r() }));
    const smooth = (a: number, b: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    const out: FlowSample = { vx: 0, vy: 0, t: 0 };
    let last = 0;

    const field = createFlowField({
      enabled: () => yr?.dataset.bg !== "paused" && !document.hidden,
      onWake: () => {
        if (!raf) {
          last = 0;
          raf = requestAnimationFrame(frame);
        }
      },
    });

    const resize = () => {
      W = Math.max(1, el.clientWidth);
      H = Math.max(1, el.clientHeight);
      el.width = W;
      el.height = H;
      draw(); // the rest picture (near stars)
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      const calm = (u: number) => 0.3 + 0.7 * smooth(0.12, 0.5, u);
      // near stars: at rest where they are, pushed and brightened inside the flow
      for (const s of nears) {
        field.sample(s.u, 1 - s.v, out);
        const k = calm(s.u) * s.depth * 34;
        const x = s.u * W + out.vx * k;
        const y = s.v * H - out.vy * k;
        const a = Math.min(1, s.a * (1 + out.t * 0.9));
        ctx.fillStyle = s.tint > 0.93 ? `rgba(94,234,212,${a})` : `rgba(219,232,255,${a})`;
        ctx.beginPath();
        ctx.arc(x, y, s.r * (1 + out.t * 0.35), 0, 6.2832);
        ctx.fill();
      }
      // threads of light in the wake: a short curve each, bent by the flow along its length
      if (field.energy > 0.004) {
        ctx.lineCap = "round";
        for (const t of threads) {
          field.sample(t.u, 1 - t.v, out);
          const wake = out.t * calm(t.u);
          if (wake < 0.04) continue;
          const sx = t.u * W;
          const sy = t.v * H;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          let x = sx;
          let y = sy;
          let ang = t.ang;
          const steps = 10;
          for (let i = 1; i <= steps; i++) {
            const seg = t.len / steps;
            field.sample(Math.min(0.999, Math.max(0, x / W)), Math.min(0.999, Math.max(0, 1 - y / H)), out);
            // steer the thread along the flow (screen space: y is down)
            const fa = Math.atan2(-out.vy, out.vx);
            const fm = Math.min(1, Math.hypot(out.vx, out.vy) * 2.2);
            let d = fa - ang;
            d = Math.atan2(Math.sin(d), Math.cos(d));
            ang += d * 0.35 * fm + Math.sin(i * 0.7 + t.seed * 9) * 0.07;
            x += Math.cos(ang) * seg;
            y += Math.sin(ang) * seg;
            ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `rgba(${t.seed > 0.7 ? "150,235,225" : "110,190,230"},${Math.min(0.34, wake * 0.4)})`;
          ctx.lineWidth = 0.5 + t.depth * 0.5;
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016);
      last = now;
      field.update(dt);
      // the star layers lean with the flow, each at its own depth
      const mx = field.mean.x;
      const my = field.mean.y;
      layers.forEach((l, i) => {
        l.style.translate = `${(mx * (depth[i] ?? 3)).toFixed(2)}px ${(-my * (depth[i] ?? 3)).toFixed(2)}px`;
      });
      draw();
      if (field.energy > 0 && !document.hidden) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    resize();
    window.addEventListener("resize", resize);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      field.dispose();
      layers.forEach((l) => (l.style.translate = ""));
      if (sky) sky.style.translate = "";
    };
  }, [rootRef]);

  return <canvas ref={canvas} className="yr-flow" aria-hidden="true" tabIndex={-1} />;
};

export default OrbitFlow;
