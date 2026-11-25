import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../utils/motion";
import type { AiStage } from "../../data/aiWorks";
import { particleTiers, pickTier } from "../particles/config";
import { ParticleStory, type CameraKey } from "../particles/ParticleStory";
import { browserFrame, sampleBrowserFrame, sampleCloud, sampleText } from "../particles/samplers";
import { spaceBus, spaceControl } from "./spaceBus";
import { useActive } from "./useActive";
import { WebStage } from "./stages";
import "../styles/AiParticles.css";

/**
 * Web Sitesi, particle version (prototype, /ai-isler?prototip=parcacik):
 *   scattered points → the word WEB → a browser frame → the real portfolio picture appears inside it.
 *
 * The points are drawn by the page's own space renderer into the box of this stage (no second WebGL
 * context). The picture is an ordinary <img>, laid over the frame's content area with the frame's own
 * measures, so the real work is sharp and readable. One loop is about 10.5 s, it waits on the finished
 * picture for a few seconds, and it only runs while the box is on screen (the scene stops it otherwise).
 *
 * Until the scene is ready, without WebGL, and with "Hareketi azalt", the CSS version of the stage
 * (WebStage) is shown instead.
 */

type Web = Extract<AiStage, { kind: "web" }>;
const url = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

const LOOP = 10.5;
const FRAME_W = 10;
const PAD = 1.16; // the frame fills 1/PAD of the box, so the points have room to move around it
const smooth = (t: number) => t * t * (3 - 2 * t);
const span = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

export const AiWebParticles = ({ s }: { s: Web }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const active = useActive(wrap, 0.2);
  const [ready, setReady] = useState(false);
  const reduced = useRef(prefersReducedMotion()).current;

  useEffect(() => {
    spaceBus.stageLive = ready && active;
    return () => {
      spaceBus.stageLive = false;
    };
  }, [ready, active]);

  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    let story: ParticleStory | null = null;
    let off: (() => void) | null = null;

    const build = async () => {
      const tier = particleTiers[pickTier()];
      const count = Math.round(tier.count * 0.55);
      const cams: CameraKey[] = [
        { pos: [0, 0, 20], look: [0, 0, 0] },
        { pos: [0, 0, 14], look: [0, 0, 0] },
        { pos: [0, 0, 14], look: [0, 0, 0] },
      ];
      try {
        const word = await sampleText("WEB", count, { width: 6.2, weight: 800, depth: 1.2 });
        if (cancelled) return;
        const shapes = [sampleCloud(count, 23, 6.5), word, sampleBrowserFrame(count, FRAME_W)];
        story = new ParticleStory({ count, shapes, camera: cams, size: tier.size * 0.95, teal: [0.4, 0.5, 0.35] });
      } catch {
        return; // the CSS version stays
      }
      if (cancelled) return;
      const st = story;
      let w = 0;
      let h = 0;
      let t = 0;
      const pointer = { x: 9, y: 9, on: false };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const r = box.current?.getBoundingClientRect();
        if (!r) return;
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        pointer.on = inside;
        if (inside) {
          pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
          pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
        }
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      spaceBus.stage = {
        rect: () => {
          const r = box.current?.getBoundingClientRect();
          if (!r || r.width < 8) return null;
          if (Math.abs(r.width - w) > 0.5 || Math.abs(r.height - h) > 0.5) {
            w = r.width;
            h = r.height;
            st.resize(w, h, Math.min(window.devicePixelRatio || 1, 2));
            // the camera sees the frame with the margin PAD, whatever the size of the box
            const z = (FRAME_W / browserFrame.aspect * PAD) / (2 * Math.tan((30 * Math.PI) / 360));
            cams[0].pos[2] = z * 1.45;
            cams[1].pos[2] = z;
            cams[2].pos[2] = z;
            st.setProgress(0);
          }
          return r;
        },
        step: (dt) => {
          t = (t + dt) % LOOP;
          // 0–1.4 s the points find the word; it rests until 3.4; the frame forms until 5.2; the picture
          // arrives 5.0–6.2 and stays (the finished moment) until 9.4; then everything lets go softly
          const form = smooth(span(t, 0, 1.4)) + smooth(span(t, 3.4, 5.2));
          const leave = smooth(span(t, 9.4, 10.5));
          st.setProgress(Math.max(0, form * (1 - leave)));
          const pic = smooth(span(t, 5.0, 6.2)) * (1 - smooth(span(t, 9.4, 10.1)));
          if (img.current) img.current.style.opacity = pic.toFixed(3);
          st.setPointer(pointer.x, pointer.y, pointer.on ? 1 : 0);
          st.update(dt);
        },
        render: (renderer) => st.render(renderer),
      };
      off = () => {
        window.removeEventListener("pointermove", onMove);
        if (spaceBus.stage) spaceBus.stage = null;
      };
      setReady(true);
    };

    // the space scene creates the renderer shortly after the first paint; wait for it
    const start = () => {
      if (cancelled || story) return;
      void build();
    };
    let unsub: (() => void) | null = null;
    if (spaceControl.get().live) start();
    else unsub = spaceControl.subscribe(() => spaceControl.get().live && (unsub?.(), (unsub = null), start()));

    return () => {
      cancelled = true;
      unsub?.();
      off?.();
      story?.dispose();
      setReady(false);
    };
  }, [reduced]);

  const fallback = reduced || !ready;

  const f = 1 / PAD;
  const c = browserFrame.content;
  const left = ((1 - f) / 2 + f * c.l) * 100;
  const top = ((1 - f) / 2 + f * c.t) * 100;
  return (
    <div ref={wrap}>
      {fallback ? (
        <WebStage s={s} />
      ) : (
    <figure className="st-fig">
      <div ref={box} className="stp" aria-hidden="true" style={{ aspectRatio: String(browserFrame.aspect) }}>
        <img
          ref={img}
          className="stp-img"
          src={url(s.desktop[0].src)}
          alt=""
          draggable={false}
          style={{ left: `${left}%`, top: `${top}%`, width: `${f * (c.r - c.l) * 100}%`, height: `${f * (c.b - c.t) * 100}%`, opacity: 0 }}
        />
      </div>
      <figcaption>
        <span className="ai-sr">{s.summary}</span>
        {s.caption}
      </figcaption>
    </figure>
      )}
    </div>
  );
};
