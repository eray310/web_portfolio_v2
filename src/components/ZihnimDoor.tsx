import { useEffect, useRef } from "react";
import "./styles/ZihnimDoor.css";

/**
 * A small door to /zihnim on the home page: a still square of points (the abstract "first cover" of the story, the
 * same warm gradient as in the tunnel of /zihnim) and one line. It is drawn once on a plain 2D canvas: no WebGL, no
 * loop, nothing to pause.
 */
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
const coverColor = (u: number, v: number) => {
  const k = Math.min(1, Math.max(0, 0.55 * u + 0.45 * v));
  const a = [250, 184, 92];
  const b = [237, 107, 87];
  const c = [158, 66, 102];
  return k < 0.5 ? mix(a, b, k * 2) : mix(b, c, k * 2 - 1);
};

const ZihnimDoor = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    const g = el?.getContext("2d");
    if (!el || !g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = 220;
    el.width = el.height = size * dpr;
    g.scale(dpr, dpr);
    let s = 20241;
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    // most points sit in the square; a few have not arrived yet (unfinished work)
    for (let i = 0; i < 1500; i++) {
      const stray = r() < 0.12;
      const u = r();
      const v = r();
      const spread = stray ? 46 * (r() - 0.5) : 0;
      const x = 30 + u * 160 + spread;
      const y = 30 + v * 160 + (stray ? 46 * (r() - 0.5) : 0);
      const [cr, cg, cb] = coverColor(u, v);
      g.fillStyle = `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${stray ? 0.35 : 0.3 + 0.6 * r()})`;
      g.beginPath();
      g.arc(x, y, stray ? 0.7 : 0.6 + r() * 0.8, 0, Math.PI * 2);
      g.fill();
    }
  }, []);
  return (
    <section className="zdoor" aria-labelledby="zdoor-h">
      <a className="zdoor-link" href="/zihnim" data-cursor="disable">
        <canvas ref={canvas} className="zdoor-art" aria-hidden="true" />
        <span className="zdoor-text">
          <span className="zdoor-ch">
            <b>00</b> Zihnim
          </span>
          <span className="zdoor-title" id="zdoor-h">
            Her şey bir şarkı kapağıyla başladı.
          </span>
          <span className="zdoor-go">
            Hikâyemi izle <span aria-hidden="true">→</span>
          </span>
        </span>
      </a>
    </section>
  );
};

export default ZihnimDoor;
