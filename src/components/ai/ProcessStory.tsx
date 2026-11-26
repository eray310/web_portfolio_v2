import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MdArrowForward } from "react-icons/md";
import { aiSteps } from "../../data/aiWorks";
import { useCalmView } from "../../utils/viewMode";
import { spaceBus, spaceControl } from "./spaceBus";
import { storyConfig } from "./storyConfig";
import StoryArt from "./StoryArt";
import "../styles/AiStory.css";

/**
 * "Birlikte nasıl çalışırız?": the four steps of the real working process (aiSteps) told by one set of
 * particles (see storyLayer.ts). This component only reads the scroll and tells the scene where to draw
 * and how far the story is (spaceBus.story); it draws nothing itself.
 *
 *  - Wide screens: two columns. The text is on the left, the picture on the right; both stay pinned while the
 *    page scrolls through the section (native scrolling, no wheel capture, no snapping). The scroll position
 *    inside the section sets the story position and the highlighted step, so it runs backwards the same way.
 *  - Narrow screens: no pinning. Every step has its own picture box under its text; the one set of particles
 *    travels from box to box as the page scrolls.
 *  - The four steps are plain HTML text in a list, readable without any animation or WebGL. The step titles are
 *    buttons: they scroll to that step (keyboard works) and the picture follows.
 */
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

type Box = { x: number; y: number; w: number; h: number };
const rectOf = (e: Element | null): Box | null => {
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

const ProcessStory = ({ onBrief }: { onBrief: (el: HTMLElement) => void }) => {
  const sec = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const figs = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = useCalmView();
  const [active, setActive] = useState(0);
  const [wide, setWide] = useState(() => (typeof window === "undefined" ? true : window.matchMedia("(min-width: 1001px)").matches));
  const gl = useSyncExternalStore(spaceControl.subscribe, () => spaceControl.get().gl, () => false);
  const stepRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1001px)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const compute = useCallback(() => {
    const el = sec.current;
    if (!el) return;
    const vh = window.innerHeight;
    const r = el.getBoundingClientRect();
    const d = storyConfig.dwell;
    let u = 0;
    let box: Box | null = null;
    if (wide) {
      const total = Math.max(1, r.height - vh);
      const p = clamp(-r.top / total, 0, 1);
      const seg = p * 4;
      const i = Math.min(3, Math.floor(seg));
      u = p >= 1 ? 4 : i + smooth(d, 1 - d, seg - i);
      box = rectOf(stage.current);
    } else {
      const rects = figs.current.map((f) => rectOf(f));
      const cs = rects.map((b) => (b ? b.y + b.h / 2 : 0));
      const vc = vh * 0.55;
      let fi = -1;
      if (vc < cs[0]) fi = clamp((vc - cs[0]) / (vh * 0.6), -1, 0);
      else if (vc >= cs[3]) fi = 3;
      else {
        for (let k = 0; k < 3; k++) {
          if (vc >= cs[k] && vc < cs[k + 1]) {
            fi = k + (vc - cs[k]) / Math.max(1, cs[k + 1] - cs[k]);
            break;
          }
        }
      }
      if (fi < 0) u = smooth(-1, -0.1, fi);
      else {
        const k = Math.min(3, Math.floor(fi));
        u = 1 + k + (fi >= 3 ? 0 : smooth(d, 1 - d, fi - k));
      }
      // the box travels from one card to the next
      const k0 = clamp(Math.floor(Math.max(0, fi)), 0, 3);
      const k1 = Math.min(3, k0 + 1);
      const t = fi >= 3 || fi < 0 ? 0 : smooth(d, 1 - d, fi - k0);
      const a = rects[k0];
      const b = rects[k1];
      if (a && b) box = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t };
      else box = a ?? b;
    }
    if (reduced) u = Math.max(1, Math.round(u)); // still scenes: each step shows its own settled shape
    const show = smooth(0, 0.35 * vh, vh * 0.92 - r.top) * smooth(0, 0.35 * vh, r.bottom - vh * 0.08);
    spaceBus.story.u = u;
    spaceBus.story.box = box;
    spaceBus.story.show = show;
    const step = clamp(Math.round(u) - 1, 0, 3);
    if (step !== stepRef.current) {
      stepRef.current = step;
      setActive(step);
    }
  }, [wide, reduced]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      compute();
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    compute();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    window.addEventListener("load", on);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(on) : null;
    if (sec.current) ro?.observe(sec.current);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      window.removeEventListener("load", on);
      ro?.disconnect();
      spaceBus.story.show = 0;
      spaceBus.story.box = null;
    };
  }, [compute]);

  const goTo = (k: number) => {
    const el = sec.current;
    if (!el) return;
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
    if (wide) {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const total = Math.max(1, el.offsetHeight - window.innerHeight);
      const p = (k + 1) / 4 - storyConfig.dwell / 8; // inside the dwell at the end of step k's stretch
      window.scrollTo({ top: top + total * Math.min(1, p), behavior });
    } else {
      figs.current[k]?.scrollIntoView({ block: "center", behavior });
    }
  };

  return (
    <section ref={sec} className="ai-flow" aria-labelledby="ai-flow-h" data-wide={wide ? "1" : "0"}>
      <div className="ai-flow-pin">
        <div className="ai-flow-text">
          <h2 id="ai-flow-h">Birlikte nasıl çalışırız?</h2>
          <p className="ai-flow-intro">Fikirden teslime dört adım.</p>
          <ol className="ai-flow-steps">
            {aiSteps.map((s, i) => (
              <li key={s.title} className={i === active ? "is-active" : ""}>
                <button type="button" className="ai-flow-btn" aria-current={i === active ? "step" : undefined} onClick={() => goTo(i)} data-cursor="disable">
                  <span className="ai-step-n" aria-hidden="true">
                    {i + 1}
                  </span>
                  <strong>{s.title}</strong>
                  <span className="ai-flow-txt">{s.text}</span>
                </button>
                <div className="ai-flow-fig" ref={(e) => {
                    figs.current[i] = e;
                  }} aria-hidden="true">
                  {!gl && <StoryArt step={i} />}
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className={`ai-cta ai-cta-big ai-flow-cta${active === 3 ? " is-ready" : ""}`} onClick={(e) => onBrief(e.currentTarget)}>
            Projeni anlat <MdArrowForward aria-hidden="true" />
          </button>
        </div>
        <div className="ai-flow-stage" ref={stage} aria-hidden="true">
          {!gl && <StoryArt step={active} />}
        </div>
      </div>
    </section>
  );
};

export default ProcessStory;
