import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { allesta } from "../data/interactive";
import type { CreativeRequest } from "./creative/CreativeHost";
import { tools } from "../data/tools";
import "./styles/OrbitPage.css";

const BASE = import.meta.env.BASE_URL;
const asset = (file: string) => `${BASE}portfolio/${file}`;

// One work carries the whole story: the Allesta ad (an AI-assisted film).
const POSTER = asset("Allesta_YZReklam.jpg");
// Kurgu is shown by one still from the finished edit (kurgu-final.mp4 at 1.3 s). It is a plain
// image on purpose: a hidden <video> can stay black until the browser has decoded it. Towards
// the end of the scene it dissolves into the poster, which then opens into the AI Artist scene.
const KURGU_STILL = `${BASE}process/allesta/kurgu-kesit-2.jpg`;

// The CV links are shown only when this file really exists (see the check below).
const CV_URL = `${BASE}cv/Eray_Omeroglu_CV.pdf`;

// ── Maths helpers ─────────────────────────────────────────────────────────
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Scroll windows (0..1 over the whole track) for each beat of the story. */
type Win = readonly [number, number];
type Timeline = {
  W: { approach: Win; art: Win; grid: Win; motion: Win; fly1: Win; cut: Win; fly2: Win; ai: Win; fin: Win };
  heroFade: Win;
  follow: Win;
  /** Caption window per scene: it fades in, stays while the composition is finished, fades out. */
  caps: Win[];
  capFade: number;
  cta: Win;
  /** Spring speed limit, as a share of the whole story per second. */
  vmax: number;
  /** Where each scene is readable (title, sentence and finished picture together). */
  scenes: number[];
};

// Phones: the short story that was tuned for the finger (unchanged).
const PHONE_TL: Timeline = {
  W: {
    approach: [0.09, 0.19],
    art: [0.19, 0.35],
    grid: [0.35, 0.49],
    motion: [0.49, 0.6],
    fly1: [0.58, 0.66],
    cut: [0.66, 0.77],
    fly2: [0.75, 0.83],
    ai: [0.82, 0.9],
    fin: [0.9, 1],
  },
  heroFade: [0.04, 0.13],
  follow: [0.49, 0.53],
  caps: [[0.19, 0.35], [0.35, 0.49], [0.49, 0.62], [0.66, 0.78], [0.82, 0.9]],
  capFade: 0.025,
  cta: [0.955, 0.985],
  vmax: 2,
  scenes: [0.27, 0.42, 0.55, 0.72, 0.86],
};

// Desktop: the story is laid out in "units" of scroll (34 in all, about 410 px each at a
// 900 px window). Every scene gets three stretches: approach (the pieces come together),
// reading (title, sentence and finished composition stay together, with nothing moving
// but the camera settling) and hand-over (one element carries into the next scene).
const UNITS = 34;
const u = (a: number, b: number): Win => [a / UNITS, b / UNITS];
const DESK_TL: Timeline = {
  W: {
    approach: u(0.6, 1.7), // the hanging frame comes to the middle
    art: u(1.7, 3.0), // Art Direction: pieces gather (approach); 3.0 - 5.9 is the reading stretch
    grid: u(5.9, 11.9), // hand-over: the frame and the pieces travel into the grid (6 units, about 24 notches); 11.9 - 14.4 is Grafik Tasarım reading stretch
    motion: u(14.4, 18.9), // the circle leaves the grid and moves (reading), then opens
    fly1: u(18.2, 21.6), // hand-over: the circle opens into a ring, the camera flies through
    cut: u(21.6, 24.6), // Kurgu: cuts (reading)
    fly2: u(24.3, 27.5), // hand-over: the last cut becomes the AI frame
    ai: u(27.5, 30.1), // AI Artist: colour tests, then the chosen frame; 30.1 - 31.4 is its reading stretch
    fin: u(31.4, 34.0), // the camera pulls back
  },
  heroFade: u(0.3, 1.2),
  follow: u(14.4, 16.9),
  caps: [u(1.7, 8.9), u(9.7, 15.0), u(14.8, 20.4), u(21.0, 26.5), u(27.1, 32.0)],
  capFade: 0.6 / UNITS,
  cta: u(33.4, 34.0),
  vmax: 0.125, // about 1500 px/s: only a hard flick reaches it
  scenes: [4.45, 13.15, 16.65, 23.1, 30.75].map((x) => x / UNITS),
};

const CAM_STEP = 1500; // distance between the three sets
const CAM_BACK = 5600; // how far the camera pulls back in the finale

type Vars = Record<string, string | number>;
const vars = (v: Vars) => v as React.CSSProperties;

/** Position of the moving circle (Motion Design) for progress m, 0..1. */
const motionPose = (m: number) => {
  const w = ease(seg(m, 0.55, 0.85));
  const open = ease(seg(m, 0.85, 1));
  return {
    mx: (1 - w) * 120 * Math.sin(2 * Math.PI * m) + w * -115,
    my: (1 - w) * 90 * (Math.cos(2 * Math.PI * m) - 1) + w * 60,
    ms: 1 + w * 0.5 + open * 10,
    mo: 1 - ease(seg(m, 0.4, 0.8)),
    open,
  };
};

// ── Scenes (text) ─────────────────────────────────────────────────────────
const scenes = [
  { n: "01", title: "Art Direction", text: "Renk, tipografi ve görsel referansları tek bir görsel yönde topluyorum." },
  { n: "02", title: "Grafik Tasarım", text: "Fikri, farklı mecralarda tutarlı bir görsel dile dönüştürüyorum." },
  { n: "03", title: "Motion Design", text: "Markanın mesajını hareketle anlatıyorum." },
  { n: "04", title: "Kurgu", text: "Reklam filmlerini ve sosyal medya videolarını ritimle kuruyorum." },
  { n: "05", title: "AI Artist", text: "Yapay zekâ destekli görselleri kurgu ve motion tasarımla tamamlıyorum." },
];

// Palette sampled from the Allesta poster.
const PALETTE = ["#0c1a18", "#748a8d", "#d7c8a3", "#e4ab65"];

// ── Depth: stars, dust and particles ──────────────────────────────────────
const rng = (seed: number) => {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

const useIsPhone = () => useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);

/** Far stars: many, tiny and dim, almost still. */
const makeFarStars = (n: number) => {
  const r = rng(7);
  return Array.from({ length: n }, () => ({ x: r() * 100, y: r() * 100, s: 0.8 + r() * 0.9, d: r() * 8, o: 0.12 + r() * 0.3 }));
};

/**
 * The still sky: many fine points of light of different sizes and brightness, drawn as
 * box-shadows of three empty elements (one paint each, no per-star element, nothing
 * animated). Positions are in vw / vh so the sky fills any window.
 */
const makeSky = (faint: number, mid: number, bright: number) => {
  const r = rng(101);
  const tints = ["232,255,251", "207,227,255", "255,241,214", "255,255,255"];
  const build = (n: number, spread: () => number, blur: () => number, alpha: () => number) =>
    Array.from({ length: n }, () => {
      const t = tints[Math.floor(r() * tints.length)];
      return `${(r() * 100).toFixed(2)}vw ${(r() * 100).toFixed(2)}vh ${blur().toFixed(1)}px ${spread().toFixed(2)}px rgba(${t},${alpha().toFixed(2)})`;
    }).join(",");
  return {
    faint: build(faint, () => 0.3 + r() * 0.35, () => 0, () => 0.3 + r() * 0.4),
    mid: build(mid, () => 0.55 + r() * 0.5, () => 0.4, () => 0.5 + r() * 0.4),
    bright: build(bright, () => 1.1 + r() * 0.9, () => 3 + r() * 3, () => 0.8 + r() * 0.2),
  };
};

/** Mid layer: star dust that drifts slowly and moves a little with the scroll. */
const makeMidStars = (n: number) => {
  const r = rng(19);
  return Array.from({ length: n }, () => ({ x: r() * 100, y: r() * 100, s: 1.4 + r() * 1.6, d: r() * 10, o: 0.22 + r() * 0.3 }));
};

/** Dust and particles live in the same 3D space as the scenes, so the camera passes them. */
const makeField = (mid: number, near: number) => {
  const r = rng(31);
  const side = () => (r() < 0.5 ? -1 : 1);
  const dust = Array.from({ length: mid }, () => ({
    x: side() * (160 + r() * 950),
    y: (r() - 0.5) * 1300,
    z: -3700 + r() * 4000,
    s: 2 + r() * 2.4,
    o: 0.25 + r() * 0.3,
  }));
  const close = Array.from({ length: near }, () => ({
    x: side() * (420 + r() * 600),
    y: (r() - 0.5) * 1000,
    z: -3300 + r() * 3900,
    s: 5 + r() * 4,
    o: 0.28 + r() * 0.2,
  }));
  return { dust, close };
};

// ── Set contents (shared by the live scroll story and the still version) ───
const SetArt = () => (
  <div className="yr-content yr-a" aria-hidden="true">
    <span className="yr-art-ring" />
    <span className="yr-cell yr-cell-title" />
    <span className="yr-cell yr-cell-img" />
    <span className="yr-cell yr-cell-gfx" />
    <span className="yr-cell yr-cell-info" />
    <span className="yr-grid-title">Form &amp; Ritim</span>
    <span className="yr-grid-info">
      <i />
      <i />
      <i />
    </span>
    <div className="yr-frame-wrap">
      <img className="yr-frame" src={POSTER} alt="" decoding="async" draggable={false} />
    </div>
    {PALETTE.map((c, i) => (
      <span key={c} className={`yr-chip yr-chip-${i + 1}`} style={{ background: c }} />
    ))}
    <span className="yr-type" />
    <span className="yr-ref yr-ref-1" />
    <span className="yr-ref yr-ref-2" />
    <span className="yr-circle" />
  </div>
);

const SetCut = () => (
  <div className="yr-content yr-k" aria-hidden="true">
    <div className="yr-monitor yr-k-monitor">
      <img className="yr-k-still" src={KURGU_STILL} alt="" loading="eager" decoding="async" draggable={false} />
      <img className="yr-k-poster" src={POSTER} alt="" loading="eager" decoding="async" draggable={false} />
    </div>
  </div>
);

const SetAi = () => (
  <div className="yr-content yr-i" aria-hidden="true">
    <div className="yr-monitor yr-ai-monitor">
      <img className="yr-ai-layer yr-ai-0" src={POSTER} alt="" decoding="async" draggable={false} />
      <img className="yr-ai-layer yr-ai-1" src={POSTER} alt="" decoding="async" draggable={false} />
      <img className="yr-ai-layer yr-ai-2" src={POSTER} alt="" decoding="async" draggable={false} />
      <img className="yr-ai-layer yr-ai-3" src={POSTER} alt="" decoding="async" draggable={false} />
      <span className="yr-ai-sel" />
    </div>
    <span className="yr-ai-tag" />
    <div className="yr-ai-thumbs">
      <img className="yr-ai-thumb yr-ai-thumb-0" src={POSTER} alt="" decoding="async" draggable={false} />
      <img className="yr-ai-thumb yr-ai-thumb-1" src={POSTER} alt="" decoding="async" draggable={false} />
      <img className="yr-ai-thumb yr-ai-thumb-2" src={POSTER} alt="" decoding="async" draggable={false} />
    </div>
    <span className="yr-ai-credit">Allesta · yapay zekâ destekli reklam. Renk denemeleri.</span>
  </div>
);

const Dot = () => <span className="yr-dot" aria-hidden="true" />;

const BackLink = () => (
  <a className="yr-back" href="/">
    <span aria-hidden="true">←</span> Ana sayfaya dön
  </a>
);

/** The final call: the brief opens on this page (BriefFlow); the CV links appear only when the PDF exists. */
const CtaLinks = ({ hasCv, onBrief }: { hasCv: boolean; onBrief: () => void }) => (
  <div className="yr-cta-links">
    <button type="button" className="yr-cta-link" onClick={onBrief}>
      Projeni anlat <span aria-hidden="true">→</span>
    </button>
    {hasCv && (
      <>
        <a className="yr-cta-link" href={CV_URL} target="_blank" rel="noopener noreferrer">
          CV’yi Gör <span aria-hidden="true">↗</span>
        </a>
        <a className="yr-cta-link" href={CV_URL} download>
          PDF İndir <span aria-hidden="true">↓</span>
        </a>
      </>
    )}
  </div>
);

const ToolsLine = () => (
  <p className="yr-tools">
    {tools.map((t) => (
      <span key={t.name}>{t.name}</span>
    ))}
  </p>
);

// ── Hook: user asked for less motion ──────────────────────────────────────
const useReducedMotion = () => {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
};

// The interactions are loaded only when a visitor opens one.
const CreativeHost = lazy(() => import("./creative/CreativeHost"));
const BriefFlow = lazy(() => import("./BriefFlow"));

// The page scrolls natively here (no smooth scroller), so stopping it is one style. The
// scrollbar gutter stays reserved (see OrbitPage.css), so the page does not shift.
let savedOverflow = "";
const lockPage = () => {
  savedOverflow = document.body.style.overflowY;
  document.body.style.overflowY = "hidden";
};
const unlockPage = () => {
  document.body.style.overflowY = savedOverflow || "auto";
};

const ACTIONS: Record<number, { label: string; request: CreativeRequest }> = {
  1: { label: "Kareyi aç", request: { kind: "layers", spec: allesta.layers } },
};

/** Where the five stars of the final constellation hang (percent of the screen). */
const STARS = [
  { x: 20, y: 24, k: "art" },
  { x: 36, y: 37, k: "grid" },
  { x: 52, y: 21, k: "motion" },
  { x: 68, y: 36, k: "cut" },
  { x: 84, y: 23, k: "ai" },
];

// ── Still version (reduced motion): the same scenes, finished, in a column ─
const finalVars = (scene: number): Vars => {
  const base: Vars = { "--app": 1, "--a": 1, "--g": 0, "--m": 0, "--mx": 0, "--my": 0, "--ms": 1, "--mo": 1, "--open": 0, "--kc": 0.9, "--ai": 1 };
  if (scene === 0) return base;
  if (scene === 1) return { ...base, "--g": 1 };
  if (scene === 3) return { ...base, "--kc": 0.3 };
  const mp = motionPose(0.45);
  if (scene === 2) return { ...base, "--g": 1, "--m": 0.45, "--mx": `${mp.mx}px`, "--my": `${mp.my}px`, "--ms": mp.ms, "--mo": 1 };
  return base;
};

const StillOrbit = ({ hasCv, onBrief }: { hasCv: boolean; onBrief: () => void }) => {
  const [sc, setSc] = useState(1);
  useEffect(() => {
    const on = () => setSc(Math.min(1, (window.innerWidth - 40) / 560));
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const visuals = [<SetArt />, <SetArt />, <SetArt />, <SetCut />, <SetAi />];
  return (
    <div className="yr-still">
      <nav className="yr-still-nav" aria-label="Sahneler">
        <ul>
          {scenes.map((s, i) => (
            <li key={s.title}>
              <a href={`#sahne-${i + 1}`}>
                {s.n} {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <section className="yr-still-hero">
        <h1>
          <span>Ben Eray</span> <span className="yr-grad">Ömeroğlu.</span>
        </h1>
        <p>Markalar için hareketli grafikler, kurgu ve görsel anlatılar üretiyorum.</p>
      </section>
      {scenes.map((s, i) => (
        <section key={s.title} id={`sahne-${i + 1}`} className="yr-still-scene" aria-labelledby={`yr-st-${i}`}>
          <div className="yr-still-box" style={{ height: 560 * sc }}>
            <div className="yr-still-set" style={vars({ ...finalVars(i), "--sc": sc })} data-ai="3">
              {visuals[i]}
            </div>
          </div>
          <span className="yr-num">{s.n}</span>
          <h2 id={`yr-st-${i}`}>{s.title}</h2>
          <p>{s.text}</p>
        </section>
      ))}
      <section className="yr-still-end">
        <h2>İlk kareyi birlikte kuralım.</h2>
        <CtaLinks hasCv={hasCv} onBrief={onBrief} />
        <ToolsLine />
      </section>
    </div>
  );
};

// ── Live version: a camera moving through one world as the page scrolls ────
const LiveOrbit = ({ hasCv, onBrief }: { hasCv: boolean; onBrief: () => void }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const phone = useIsPhone();
  const farStars = useMemo(() => makeFarStars(phone ? 56 : 130), [phone]);
  const sky = useMemo(() => (phone ? makeSky(260, 70, 6) : makeSky(900, 260, 14)), [phone]);
  const midStars = useMemo(() => makeMidStars(phone ? 16 : 40), [phone]);
  const field = useMemo(() => (phone ? makeField(12, 3) : makeField(30, 9)), [phone]);
  const TL = phone ? PHONE_TL : DESK_TL;
  const [scene, setScene] = useState(-1);
  const sceneRef = useRef(-1);
  // Set when the page jumps a long way (scene list, stars, End key): the camera then flies
  // instead of crawling at the reading speed.
  const jumpRef = useRef(false);
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const [creative, setCreative] = useState<CreativeRequest | null>(null);
  const closeCreative = useCallback(() => setCreative(null), []);

  // One way to reach a scene, used by the list and by the stars: scroll to the point
  // where the scene reads best. The camera follows by itself.
  const goScene = useCallback(
    (i: number) => {
      const t = trackRef.current;
      if (!t) return;
      const range = Math.max(1, t.offsetHeight - window.innerHeight);
      const y = t.getBoundingClientRect().top + window.scrollY + TL.scenes[i] * range;
      // Jump at once; the camera does the travelling. A browser-animated scroll would drag
      // the target along slowly and the camera would follow it for many seconds.
      jumpRef.current = true;
      window.scrollTo({ top: Math.round(y), behavior: "auto" });
      setNavOpen(false);
    },
    [TL]
  );

  // The scene list closes with Escape or a tap outside it.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNavOpen(false);
        navRef.current?.querySelector<HTMLElement>("button")?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [navOpen]);

  // Nothing animates while the stage is off screen or the tab is hidden.
  useEffect(() => {
    const stage = stageRef.current;
    const track = trackRef.current;
    if (!stage || !track) return;
    let io: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(([e]) => stage.classList.toggle("is-off", !e.isIntersecting));
      io.observe(track);
    }
    const vis = () => stage.classList.toggle("is-hidden", document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;
    let target = 0;
    let cur = -1;
    let vel = 0;
    let raf = 0;
    let last = 0;
    let lastAi = -1;
    let camA0 = 260; // how far the camera has moved in once the frame has become scene one
    let shxPx = 0;
    let scale = 1;
    let blurOn = true;
    const W = TL.W;
    const set = (k: string, v: number | string) => stage.style.setProperty(k, String(v));

    const layout = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mobile = w < 768;
      blurOn = !mobile;
      camA0 = mobile ? 120 : 260;
      const dolly = 1000 / (1000 - camA0); // the scenes are drawn this much bigger than the set
      scale = mobile
        ? Math.min(1, (w * 0.9) / 560 / dolly, (h * 0.5) / 560 / dolly)
        : Math.min(1, (h * 0.8) / 560 / dolly, (w * 0.46) / 560 / dolly);
      shxPx = mobile ? 0 : Math.round(w * 0.15);
      set("--sc", scale.toFixed(3));
      set("--shx", `${shxPx}px`);
      set("--shy", `${mobile ? -Math.round(h * 0.04) : 0}px`);
    };

    // Content is faint and soft far away, sharp and solid when it arrives. A scene
    // is never fully gone in the distance: a dim, soft ghost of it hangs there, so the
    // next scene is seen ahead and nothing pops in from an empty frame.
    const GHOST = phone ? 0.28 : 0.5;
    const arrive = (z: number) => seg(z, -1300, -500);
    const ghost = (z: number) => GHOST * seg(z, -3600, -2800);
    const shown = (z: number) => Math.max(ghost(z), arrive(z));
    const leave = (z: number) => 1 - seg(z, 560, 960);
    // How far a scene has swung aside after the camera has passed it.
    const passed = (z: number) => ease(seg(z, 120, 900));

    const apply = (P: number) => {
      const app = ease(seg(P, W.approach[0], W.approach[1]));
      const a = ease(seg(P, W.art[0], W.art[1]));
      const g = seg(P, W.grid[0], W.grid[1]);
      const m = seg(P, W.motion[0], W.motion[1]);
      const fly1 = ease(seg(P, W.fly1[0], W.fly1[1]));
      const fly2 = ease(seg(P, W.fly2[0], W.fly2[1]));
      const kc = seg(P, W.cut[0], W.cut[1]);
      const ai = seg(P, W.ai[0], W.ai[1]);
      const fin = ease(seg(P, W.fin[0], W.fin[1]));
      const finGate = seg(fin, 0, 0.2);
      const cam = camA0 * app + CAM_STEP * fly1 + CAM_STEP * fly2 - CAM_BACK * fin;

      const mp = motionPose(m);
      const mx = lerp(mp.mx, 0, finGate);
      const my = lerp(mp.my, 0, finGate);
      set("--p", P.toFixed(4));
      set("--app", app.toFixed(4));
      set("--a", a.toFixed(4));
      set("--g", g.toFixed(4));
      // Hand-over Art -> Grafik: the frame and the pieces travel (gt) while the Art pieces
      // fade out only on the way (gf), so the middle frames show the turn into the grid.
      set("--gt", ease(seg(g, 0.02, 0.85)).toFixed(4));
      set("--gf", seg(g, 0.08, 0.72).toFixed(4));
      set("--m", m.toFixed(4));
      set("--mx", `${mx.toFixed(2)}px`);
      set("--my", `${my.toFixed(2)}px`);
      set("--ms", lerp(mp.ms, 1, finGate).toFixed(3));
      set("--mo", lerp(mp.mo, 1, finGate).toFixed(3));
      set("--open", (mp.open * (1 - finGate)).toFixed(3));
      set("--kc", kc.toFixed(4));
      set("--ai", ai.toFixed(4));
      set("--fin", fin.toFixed(4));
      set("--cam", cam.toFixed(1));

      // The camera follows the moving circle, then lets go as it flies through.
      const follow = seg(P, TL.follow[0], TL.follow[1]) * (1 - ease(seg(P, W.fly1[0], W.fly1[1]))) * (1 - finGate);
      set("--panx", `${(-(115 + mx) * 0.5 * scale * follow).toFixed(1)}px`);
      set("--pany", `${(-(-70 + my) * 0.5 * scale * follow).toFixed(1)}px`);

      const fade = 1 - seg(fin, 0.35, 0.8);
      // The camera has already moved in by camA0 when the scenes start; measure from there.
      const zA = cam - camA0;
      const zK = cam - CAM_STEP - camA0;
      const zI = cam - 2 * CAM_STEP - camA0;
      const content = (z: number) => lerp(shown(z) * leave(z), 1, finGate) * fade;
      set("--oA", content(zA).toFixed(3));
      set("--oK", content(zK).toFixed(3));
      set("--oI", content(zI).toFixed(3));
      const soft = (z: number) => (blurOn && finGate < 0.5 ? Math.max(0, (1 - arrive(z)) * 6) : 0);
      const bk = soft(zK);
      const bi = soft(zI);
      set("--fK", bk > 0.2 ? `blur(${bk.toFixed(1)}px)` : "none");
      set("--fI", bi > 0.2 ? `blur(${bi.toFixed(1)}px)` : "none");
      // Each scene waits off to one side and glides to the middle as the camera comes
      // up to it; once passed it swings aside again, turned a little, instead of just
      // dissolving in place. Phones get a smaller sweep.
      const sw = (phone ? 0.3 : 1) * (1 - finGate);
      const glide = (z: number) => (1 - arrive(z)) * sw;
      const away = (z: number) => passed(z) * sw;
      const side = (name: string, dx: number, dy: number, ry: number) => {
        set("--dx" + name, dx.toFixed(1) + "px");
        set("--dy" + name, dy.toFixed(1) + "px");
        set("--ry" + name, ry.toFixed(2) + "deg");
      };
      side("A", -away(zA) * 520, -away(zA) * 150, -away(zA) * 16);
      side("K", glide(zK) * 760 - away(zK) * 520, glide(zK) * 330 - away(zK) * 150, -glide(zK) * 14 - away(zK) * 16);
      side("I", glide(zI) * 1000, -glide(zI) * 420, -glide(zI) * 16);
      set("--dot", seg(fin, 0.35, 0.85).toFixed(3));
      set("--hero", (1 - seg(P, TL.heroFade[0], TL.heroFade[1])).toFixed(3));
      set("--cta", seg(P, TL.cta[0], TL.cta[1]).toFixed(3));

      const f = TL.capFade;
      let sc = -1;
      let best = 0.5;
      TL.caps.forEach(([s, e], i) => {
        const v = seg(P, s, s + f) * (1 - seg(P, e - f, e));
        set("--c" + i, v.toFixed(3));
        if (v > best) {
          best = v;
          sc = i;
        }
      });
      if (sc !== sceneRef.current) {
        sceneRef.current = sc;
        setScene(sc);
      }
      stage.dataset.nav = P > TL.heroFade[1] && P < W.fin[0] ? "1" : "0";
      stage.classList.toggle("is-const", seg(fin, 0.35, 0.85) > 0.6);

      // AI Artist: which reading is on screen (for the small label).
      const aiState = ai < 0.1 ? 0 : ai < 0.36 ? 1 : ai < 0.62 ? 2 : 3;
      if (aiState !== lastAi) {
        lastAi = aiState;
        stage.dataset.ai = String(aiState);
      }
      stage.classList.toggle("is-cta", seg(P, TL.cta[0], TL.cta[1]) > 0.5);
    };

    const read = () => {
      const r = track.getBoundingClientRect();
      const max = Math.max(1, track.offsetHeight - window.innerHeight);
      target = clamp(-r.top / max);
    };

    // A critically damped spring with a speed limit: soft start, soft stop,
    // heavy and slow for slow scrolling, and no sudden jump for a fast flick.
    // On a phone the finger and the browser's own momentum already give the scroll its
    // softness, so the scene follows almost directly: it reacts at once to the finger
    // and stops with it instead of gliding on.
    const OMEGA = phone ? 24 : 10;
    const VMAX = TL.vmax; // fraction of the whole story per second
    const JUMP_VMAX = phone ? VMAX : 1.8; // desktop long jumps: about a second for the whole story; phones already follow the finger
    const tick = (t: number) => {
      const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
      last = t;
      // Small steps keep the stiff phone spring from overshooting on a long frame.
      const steps = Math.ceil(dt / (1 / 120));
      const h = dt / steps;
      for (let k = 0; k < steps; k++) {
        const x = cur - target;
        vel += (-OMEGA * OMEGA * x - 2 * OMEGA * vel) * h;
        const lim = jumpRef.current ? JUMP_VMAX : VMAX;
        vel = clamp(vel, -lim, lim);
        cur += vel * h;
      }
      cur = clamp(cur, 0, 1);
      if (Math.abs(cur - target) < 0.0002 && Math.abs(vel) < 0.001) {
        cur = target;
        vel = 0;
        jumpRef.current = false;
        apply(cur);
        raf = 0;
        last = 0;
        return;
      }
      apply(cur);
      raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      read();
      if (Math.abs(cur - target) > 0.3) jumpRef.current = true; // End / Home key, scrollbar drag
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onResize = () => {
      layout();
      onScroll();
    };

    layout();
    read();
    cur = target;
    apply(cur);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [phone, TL]);

  return (
    <div className="yr-track" ref={trackRef}>
      <div className="yr-stage" ref={stageRef} data-ai="0">
        <div className="yr-bg" aria-hidden="true">
          <div className="yr-nebula" />
          <div className="yr-sky">
            <i style={{ boxShadow: sky.faint }} />
            <i style={{ boxShadow: sky.mid }} />
            <i style={{ boxShadow: sky.bright }} />
          </div>
          <div className="yr-stars yr-far">
            {farStars.map((s, i) => (
              <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, opacity: s.o, animationDelay: `${s.d}s` }} />
            ))}
          </div>
          <div className="yr-stars yr-mid">
            <div className="yr-drift">
              {midStars.map((s, i) => (
                <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, opacity: s.o, animationDelay: `${s.d}s` }} />
              ))}
            </div>
          </div>
          <svg className="yr-orbits" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
            <g>
              <ellipse cx="500" cy="300" rx="430" ry="150" />
              <ellipse cx="500" cy="300" rx="330" ry="230" />
              <ellipse cx="500" cy="300" rx="560" ry="110" />
            </g>
          </svg>
          <i className="yr-shoot yr-shoot-1" />
          <i className="yr-shoot yr-shoot-2" />
          <i className="yr-shoot yr-shoot-3" />
          <i className="yr-shoot yr-shoot-4" />
          <i className="yr-shoot yr-shoot-5" />
          <div className="yr-vignette" />
        </div>

        {/* Dust and particles in the same space as the scenes: the camera moves past them. */}
        <div className="yr-field" aria-hidden="true">
          {field.dust.map((d, i) => (
            <i key={`d${i}`} className="yr-dust" style={{ width: d.s, height: d.s, opacity: d.o, transform: `translate3d(${d.x}px, ${d.y}px, ${d.z}px)` }} />
          ))}
          {field.close.map((d, i) => (
            <i key={`c${i}`} className="yr-near" style={{ width: d.s, height: d.s, opacity: d.o, transform: `translate3d(${d.x}px, ${d.y}px, ${d.z}px)` }} />
          ))}
        </div>

        <div className="yr-hero">
          <h1>
            <span className="yr-line">
              <span className="yr-line-in">Ben Eray</span>
            </span>{" "}
            <span className="yr-line">
              <span className="yr-line-in yr-grad">Ömeroğlu.</span>
            </span>
          </h1>
          <p>Markalar için hareketli grafikler, kurgu ve görsel anlatılar üretiyorum.</p>
        </div>

        <div className="yr-world">
          <section className="yr-set yr-set-a" aria-hidden="true">
            <SetArt />
            <Dot />
          </section>
          <section className="yr-set yr-set-k" aria-hidden="true">
            <SetCut />
            <Dot />
          </section>
          <section className="yr-set yr-set-i" aria-hidden="true">
            <SetAi />
            <Dot />
          </section>
        </div>

        <div className="yr-caps">
          {scenes.map((s, i) => (
            <div key={s.title} className="yr-cap" style={vars({ "--ci": `var(--c${i})` })}>
              <h2>{s.title}</h2>
              <p>{s.text}</p>
              {ACTIONS[i] && (
                <button type="button" className="yr-cap-btn" disabled={scene !== i} onClick={() => setCreative(ACTIONS[i].request)}>
                  {ACTIONS[i].label}
                </button>
              )}
            </div>
          ))}
        </div>

        <nav className="yr-nav" ref={navRef} aria-label="Sahneler">
          <button type="button" className="yr-nav-btn" aria-expanded={navOpen} aria-controls="yr-nav-list" onClick={() => setNavOpen((o) => !o)}>
            <span>{scene >= 0 ? `Sahneler · ${scenes[scene].n} / 05` : "Sahneler"}</span>
            <span aria-hidden="true">{navOpen ? "▴" : "▾"}</span>
          </button>
          <ul id="yr-nav-list" hidden={!navOpen}>
            {scenes.map((s, i) => (
              <li key={s.title}>
                <button type="button" aria-current={scene === i ? "true" : undefined} onClick={() => goScene(i)}>
                  <span>{s.n}</span> {s.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* The final constellation: one star per scene, each takes you back to its scene. */}
        <div className="yr-const">
          <svg className="yr-const-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={STARS.map((s) => `${s.x},${s.y}`).join(" ")} />
          </svg>
          {STARS.map((s, i) => (
            <button key={s.k} type="button" className={`yr-star yr-star-${s.k}`} style={{ left: `${s.x}%`, top: `${s.y}%` }} onClick={() => goScene(i)} aria-label={`${scenes[i].title} sahnesine dön`}>
              <span className="yr-star-label" aria-hidden="true">
                {scenes[i].title}
              </span>
            </button>
          ))}
        </div>

        {creative && (
          <Suspense fallback={null}>
            <CreativeHost request={creative} onClose={closeCreative} />
          </Suspense>
        )}

        <div className="yr-hint" aria-hidden="true">
          Kaydır <span>↓</span>
        </div>

        <div className="yr-cta">
          <h2>İlk kareyi birlikte kuralım.</h2>
          <CtaLinks hasCv={hasCv} onBrief={onBrief} />
          <ToolsLine />
        </div>
      </div>
    </div>
  );
};

const OrbitPage = () => {
  const reduced = useReducedMotion();
  const [hasCv, setHasCv] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  // The animated sky can be stopped (WCAG 2.2.2); the choice is kept for this visit only.
  const [bgPaused, setBgPaused] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const openBrief = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null;
    setBriefOpen(true);
  }, []);
  const closeBrief = useCallback(() => {
    setBriefOpen(false);
    window.requestAnimationFrame(() => opener.current?.focus?.());
  }, []);

  useEffect(() => {
    document.title = "Hakkımda — Eray Ömeroğlu";
    // The home page keeps the body locked until its intro is over; this page scrolls freely.
    document.body.style.overflowY = "auto";
    document.body.style.backgroundColor = "#080b11";
    window.scrollTo(0, 0);
  }, []);

  // Show the CV links only when a PDF is really there. A missing file is answered
  // with the site's index.html (not a 404), so the content type is checked too.
  useEffect(() => {
    let alive = true;
    fetch(CV_URL, { method: "HEAD" })
      .then((res) => {
        const type = res.headers.get("content-type") || "";
        if (alive && res.ok && type.includes("pdf")) setHasCv(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="yr" data-mode={reduced ? "still" : "live"} data-bg={bgPaused ? "paused" : undefined} style={vars({ "--poster": `url("${POSTER}")` })}>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        İçeriğe geç
      </a>
      <header className="yr-top">
        <a className="yr-logo" href="/" aria-label="Eray Ömeroğlu, ana sayfa">
          EÖ
        </a>
        <nav className="yr-topnav" aria-label="Ana menü">
          {!reduced && (
            <button type="button" className="yr-bgtoggle" aria-pressed={bgPaused} onClick={() => setBgPaused((p) => !p)}>
              {bgPaused ? "Arka planı oynat" : "Arka planı durdur"}
            </button>
          )}
          <a className="yr-toplink" href="/ai-isler">
            AI İşler
          </a>
          <BackLink />
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        {reduced ? <StillOrbit hasCv={hasCv} onBrief={openBrief} /> : <LiveOrbit hasCv={hasCv} onBrief={openBrief} />}
      </main>
      {briefOpen && (
        <Suspense fallback={null}>
          <BriefFlow onClose={closeBrief} lock={lockPage} unlock={unlockPage} />
        </Suspense>
      )}
    </div>
  );
};

export default OrbitPage;
