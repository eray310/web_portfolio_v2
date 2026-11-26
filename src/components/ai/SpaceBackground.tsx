import { useEffect, useMemo, useRef, useState } from "react";
import { prefersReducedMotion } from "../../utils/motion";
import type { SpaceApi, StopInfo } from "./spaceScene";
import { spaceControl } from "./spaceBus";
import { viewMode } from "../../utils/viewMode";

/**
 * The AI İşler background. A decorative canvas (no click, no keyboard focus) behind the page:
 * `ai-space`. Until the 3D scene has drawn its first frame, and if WebGL is not available, a
 * dark starry still picture is shown instead (plain CSS, no request).
 *
 * The "Arka planı durdur" control (SpaceToggle, in the normal page flow) lets the visitor stop the
 * movement. With "Hareketi azalt" one still frame is drawn and there is nothing to stop.
 */

/** A static starry picture as an inline SVG (drawn once, no request): the fallback and the first paint. */
const starsDataUrl = () => {
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  let dots = "";
  for (let i = 0; i < 150; i++) {
    const x = (r() * 900).toFixed(1);
    const y = (r() * 900).toFixed(1);
    const big = r() > 0.94;
    const rad = big ? 1.5 : 0.5 + r() * 0.7;
    const a = big ? 0.85 : 0.2 + r() * 0.35;
    const fill = big && r() > 0.7 ? "#5eead4" : "#dbe8ff";
    dots += `<circle cx="${x}" cy="${y}" r="${rad.toFixed(2)}" fill="${fill}" fill-opacity="${a.toFixed(2)}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900">${dots}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const SpaceBackground = ({ rootRef }: { rootRef: React.RefObject<HTMLElement> }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const api = useRef<SpaceApi | null>(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const [live, setLive] = useState(false); // the canvas has drawn its first frame
  const [, setFailed] = useState(false); // no WebGL: the still picture stays
  const stars = useMemo(starsDataUrl, []);

  useEffect(() => {
    const el = canvas.current;
    const root = rootRef.current;
    if (!el || !root) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    const light = window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches;

    // The stops the scene follows: the opening, the three sections, the closing call.
    const stops = (): StopInfo[] => {
      const sy = window.scrollY;
      const pick = (sel: string, media: string | null): StopInfo | null => {
        const e = root.querySelector<HTMLElement>(sel);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        let box: StopInfo["box"] = null;
        if (media) {
          const m = e.querySelector<HTMLElement>(media);
          if (m) {
            const mr = m.getBoundingClientRect();
            box = { x: mr.left, y: mr.top, w: mr.width, h: mr.height };
          }
        }
        return { y: r.top + sy + r.height / 2, box };
      };
      return [
        pick(".ai-hero", ".ai-hero-video"),
        pick("#web-sitesi", ".ai-sec-stage"),
        pick("#reklam-filmi", ".ai-sec-stage"),
        pick("#uygulama", ".ai-sec-stage"),
        pick(".ai-flow", null),
      ].filter(Boolean) as StopInfo[];
    };

    // Starts right after the first paint, so the page and the still picture are not held back.
    const start = () => {
      import("./spaceScene")
        .then(({ createSpaceScene }) => {
          if (cancelled) return;
          try {
            const scene = createSpaceScene({ canvas: el, light, still: reduced, stops });
            api.current = scene;
            scene.setCalm(viewMode.calm());
            spaceControl.set({ gl: true });
            // boxes move with the scroll: the scene reads them again when they can have changed
            const refresh = () => scene.refresh();
            ro = new ResizeObserver(refresh);
            ro.observe(root);
            window.addEventListener("load", refresh);
            window.requestAnimationFrame(() =>
              window.requestAnimationFrame(() => {
                if (cancelled) return;
                setLive(true);
                if (!reduced) spaceControl.set({ live: true, paused: false });
              })
            );
            el.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              setLive(false);
              setFailed(true);
              spaceControl.set({ live: false, gl: false });
            });
          } catch {
            spaceControl.set({ gl: false });
            setFailed(true);
          }
        })
        .catch(() => setFailed(true));
    };
    const t = window.setTimeout(start, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      ro?.disconnect();
      api.current?.dispose();
      api.current = null;
      spaceControl.set({ live: false, paused: false, gl: false });
    };
  }, [rootRef, reduced]);

  // the control (in the page flow) starts and stops the scene
  useEffect(
    () =>
      spaceControl.subscribe(() => {
        const a = api.current;
        const want = spaceControl.get().paused;
        if (a && a.isPaused() !== want) a.setPaused(want);
      }),
    []
  );

  // "Sakin görünüm" (the Görünüm menu): the ambient motion stops, the scene still follows the scroll
  useEffect(() => viewMode.subscribe(() => api.current?.setCalm(viewMode.calm())), []);

  return (
    <>
      <div className="ai-space" aria-hidden="true">
        <div className="ai-space-still" style={{ backgroundImage: `${stars}, radial-gradient(55% 50% at 72% 45%, rgba(13, 148, 136, 0.1), transparent 70%), linear-gradient(180deg, #0c0a0b, #0b0d12 70%, #0c0a0b)` }} />
        <canvas ref={canvas} className={`ai-space-canvas${live ? " is-live" : ""}`} tabIndex={-1} />
        <div className="ai-space-shade" />
      </div>
    </>
  );
};

export default SpaceBackground;
