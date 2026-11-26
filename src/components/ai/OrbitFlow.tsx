import { useEffect, useRef } from "react";
import { createFlowField, type FlowSample } from "./flowField";
import { prefersReducedMotion } from "../../utils/motion";
import { orbitWave } from "./orbitWaveConfig";

/**
 * /hakkimda: the pointer's "local particle wave" in the sky, with one small 2D canvas (no WebGL canvas).
 *
 * - The existing CSS stars stay as they are; the three still star layers and the two star fields
 *   only slide a few pixels with the flow (`translate`, at different depths), so the whole sky
 *   leans the way the pointer went and settles back when it rests.
 * - On the canvas: a field of small stars (a few brighter near ones, many faint ones), each with its own depth.
 *   Where the pointer passes, the stars close to it are pushed apart along the flow, rise out of the sky a
 *   little (they grow, brighten and shift with their depth, so the surface seems to swell) and take a
 *   faint turquoise / ice blue tint. The push reaches the neighbours through the flow field's own
 *   smoothing; a speed cap (tanh in the flow field) keeps a fast stroke from going further than a slow one.
 *   About 0.6 to 1 s after the pointer leaves, every star is back in its place, without a bounce.
 *   There are no lines, tails, rings or connections.
 * - It draws only while something is moving (the loop sleeps when the field and all stars are at rest, and
 *   starts again on the next pointer move), never when the tab is hidden, never on a touch screen. With
 *   "Hareketi azalt" only the resting picture is drawn.
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

type Star = { u: number; v: number; r: number; a: number; depth: number; tint: number; near: boolean; ox: number; oy: number; oz: number };

const OrbitFlow = ({ rootRef }: { rootRef: React.RefObject<HTMLElement> }) => {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const root = rootRef.current;
    if (!el || !root) return;
    const ctx = el.getContext("2d", { alpha: true });
    if (!ctx) return;
    const reduced = prefersReducedMotion();
    const light = window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches;
    const yr = el.closest<HTMLElement>(".yr");
    const sky = root.querySelector<HTMLElement>(".yr-sky");
    const layers = Array.from(root.querySelectorAll<HTMLElement>(".yr-sky i, .yr-stars"));
    const depth = [1.5, 3.2, 6.4, 2.2, 3.6]; // px per unit of the mean push, per layer
    let raf = 0;
    let W = 1;
    let H = 1;
    const r = rng(907);
    const C = orbitWave;
    const total = (light ? C.count.light : C.count.desktop) + C.near;
    const stars: Star[] = Array.from({ length: total }, (_, i) => {
      const near = i < C.near;
      return near
        ? { u: r(), v: r(), r: 0.5 + r() * 1.3, a: 0.35 + r() * 0.55, depth: 0.3 + r() * 0.9, tint: r(), near, ox: 0, oy: 0, oz: 0 }
        : { u: r(), v: r(), r: 0.45 + r() * 0.65, a: 0.14 + r() * 0.34, depth: 0.25 + r() * 0.75, tint: r(), near, ox: 0, oy: 0, oz: 0 };
    });
    const smooth = (a: number, b: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    const out: FlowSample = { vx: 0, vy: 0, t: 0 };
    let last = 0;
    let lastMove = 0; // when the pointer last moved (ms): the loop runs a little beyond it, then sleeps

    const field =
      reduced || light
        ? null
        : createFlowField({
            enabled: () => yr?.dataset.bg !== "paused" && !document.hidden,
          });
    const kick = (e: PointerEvent) => {
      if (!field || e.pointerType === "touch" || yr?.dataset.bg === "paused" || document.hidden) return;
      lastMove = performance.now();
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const resize = () => {
      W = Math.max(1, el.clientWidth);
      H = Math.max(1, el.clientHeight);
      el.width = W;
      el.height = H;
      draw(); // the resting picture
    };

    /** Moves every star toward where the flow wants it; returns the largest remaining offset (0 = all at rest). */
    const step = (dt: number) => {
      const kf = 1 - Math.exp(-dt * C.follow);
      const ks = 1 - Math.exp(-dt * C.settle);
      let moving = 0;
      for (const s of stars) {
        let tx = 0;
        let ty = 0;
        let tz = 0;
        if (field && field.energy > 0) {
          field.sample(s.u, 1 - s.v, out);
          const calm = 0.35 + 0.65 * smooth(0.1, 0.5, s.u); // a little calmer over the writing on the left
          const sp = Math.hypot(out.vx, out.vy);
          // the push follows the square of the local speed: the flow field's speed dies out within a third of a
          // second, and squaring it makes the stars let go about twice as fast (back in place in about a second)
          const k = sp > 0.0001 ? (C.push * s.depth * calm * Math.min(1, sp)) : 0;
          tx = out.vx * k;
          ty = -out.vy * k;
          const rise = Math.min(1, sp * 1.7);
          tz = rise * rise * s.depth * calm;
        }
        // follow quickly while pushed, settle without overshoot when the flow is gone
        const rate = tz > s.oz ? kf : ks;
        s.ox += (tx - s.ox) * rate;
        s.oy += (ty - s.oy) * rate;
        s.oz += (tz - s.oz) * rate;
        moving = Math.max(moving, Math.abs(s.ox), Math.abs(s.oy), s.oz * 10);
      }
      return moving;
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      const cx = W / 2;
      const cy = H / 2;
      for (const s of stars) {
        const lift = s.oz;
        const x = s.u * W + s.ox + (s.u * W - cx) * C.parallax * lift * s.depth * 6;
        const y = s.v * H + s.oy + (s.v * H - cy) * C.parallax * lift * s.depth * 6;
        const a = Math.min(1, s.a * (1 + lift * C.glow));
        const rad = s.r * (1 + lift * C.grow);
        const q = Math.min(C.tint, lift * 1.1);
        let cr = 219;
        let cg = 232;
        let cb = 255;
        if (s.near && s.tint > 0.93) {
          cr = 94;
          cg = 234;
          cb = 212;
        }
        if (q > 0.01) {
          // toward ice blue, and toward turquoise a little more for stars with a high tint value
          const [tr, tg, tb] = s.tint > 0.55 ? C.teal : C.ice;
          cr += (tr - cr) * q;
          cg += (tg - cg) * q;
          cb += (tb - cb) * q;
        }
        ctx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016);
      last = now;
      field?.update(dt);
      const moving = step(dt);
      // the star layers lean with the flow, each at its own depth
      if (field) {
        const mx = field.mean.x;
        const my = field.mean.y;
        layers.forEach((l, i) => {
          l.style.translate = `${(mx * (depth[i] ?? 3)).toFixed(2)}px ${(-my * (depth[i] ?? 3)).toFixed(2)}px`;
        });
      }
      draw();
      if (!document.hidden && (moving > 0.15 || (field && now - lastMove < 600))) raf = requestAnimationFrame(frame);
      else {
        // settled: put every star exactly back and draw the resting picture once, then sleep
        for (const s of stars) s.ox = s.oy = s.oz = 0;
        draw();
        last = 0;
      }
    };

    resize();
    window.addEventListener("resize", resize);
    if (field) window.addEventListener("pointermove", kick, { passive: true });
    return () => {
      window.removeEventListener("pointermove", kick);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      field?.dispose();
      layers.forEach((l) => (l.style.translate = ""));
      if (sky) sky.style.translate = "";
    };
  }, [rootRef]);

  return <canvas ref={canvas} className="yr-flow" aria-hidden="true" tabIndex={-1} />;
};

export default OrbitFlow;
