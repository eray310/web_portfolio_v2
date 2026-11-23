import { useEffect, useMemo, useRef, useState } from "react";
import { tools } from "../data/tools";
import "./styles/OrbitPage.css";

const BASE = import.meta.env.BASE_URL;
const asset = (file: string) => `${BASE}portfolio/${file}`;

// One work carries the whole story: the Allesta ad (an AI-assisted film).
const POSTER = asset("Allesta_YZReklam.jpg");
const CUT_VIDEO = `${BASE}process/allesta/kurgu-final.mp4`; // the finished edit, 4 s
// Moments of the edit shown as cuts; the last cut is the poster, which then
// opens into the AI Artist scene.
const CUTS = [
  { kind: "video", t: 0.3 },
  { kind: "video", t: 1.3 },
  { kind: "video", t: 2.6 },
  { kind: "poster", t: 0 },
] as const;

// The CV links are shown only when this file really exists (see the check below).
const CV_URL = `${BASE}cv/Eray_Omeroglu_CV.pdf`;

// ── Maths helpers ─────────────────────────────────────────────────────────
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Scroll windows (0..1 over the whole track) for each beat of the story. */
const W = {
  approach: [0.09, 0.19],
  art: [0.19, 0.35],
  grid: [0.35, 0.49],
  motion: [0.49, 0.6],
  fly1: [0.58, 0.66],
  cut: [0.66, 0.77],
  fly2: [0.75, 0.83],
  ai: [0.82, 0.9],
  fin: [0.9, 1],
} as const;

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

const CutFrame = ({ i, thumb = false }: { i: number; thumb?: boolean }) => {
  const c = CUTS[i];
  const cls = thumb ? `yr-thumb yr-thumb-${i}` : `yr-cut-img yr-cut-${i}`;
  return c.kind === "video" ? (
    <video className={cls} src={`${CUT_VIDEO}#t=${c.t}`} muted playsInline preload="auto" tabIndex={-1} />
  ) : (
    <img className={cls} src={POSTER} alt="" decoding="async" draggable={false} />
  );
};

const SetCut = () => (
  <div className="yr-content yr-k" aria-hidden="true">
    <div className="yr-monitor yr-k-monitor">
      {CUTS.map((_, i) => (
        <CutFrame key={i} i={i} />
      ))}
    </div>
    <div className="yr-strip">
      {CUTS.map((_, i) => (
        <CutFrame key={i} i={i} thumb />
      ))}
    </div>
    <div className="yr-timeline">
      <span className="yr-playhead" />
    </div>
    <span className="yr-cutno" />
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

const CtaLinks = ({ hasCv }: { hasCv: boolean }) => (
  <div className="yr-cta-links">
    <a className="yr-cta-link" href="/#work">
      Seçili İşler <span aria-hidden="true">→</span>
    </a>
    <a className="yr-cta-link" href="/#contact">
      İletişim <span aria-hidden="true">→</span>
    </a>
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

// ── Still version (reduced motion): the same scenes, finished, in a column ─
const finalVars = (scene: number): Vars => {
  const base: Vars = { "--app": 1, "--a": 1, "--g": 0, "--m": 0, "--mx": 0, "--my": 0, "--ms": 1, "--mo": 1, "--open": 0, "--kc": 0.9, "--ai": 1 };
  if (scene === 0) return base;
  if (scene === 1) return { ...base, "--g": 1 };
  const mp = motionPose(0.45);
  if (scene === 2) return { ...base, "--g": 1, "--m": 0.45, "--mx": `${mp.mx}px`, "--my": `${mp.my}px`, "--ms": mp.ms, "--mo": 1 };
  return base;
};

const StillOrbit = ({ hasCv }: { hasCv: boolean }) => {
  const [sc, setSc] = useState(1);
  useEffect(() => {
    const on = () => setSc(Math.min(1, (window.innerWidth - 40) / 560));
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const visuals = [<SetArt />, <SetArt />, <SetArt />, <SetCut />, <SetAi />];
  return (
    <main className="yr-still">
      <section className="yr-still-hero">
        <h1>
          <span>Ben Eray</span> <span className="yr-grad">Ömeroğlu.</span>
        </h1>
        <p>Markalar için hareketli grafikler, kurgu ve görsel anlatılar üretiyorum.</p>
      </section>
      {scenes.map((s, i) => (
        <section key={s.title} className="yr-still-scene" aria-labelledby={`yr-st-${i}`}>
          <div className="yr-still-box" style={{ height: 560 * sc }}>
            <div className="yr-still-set" style={vars({ ...finalVars(i), "--sc": sc })} data-cut="3" data-ai="3">
              {visuals[i]}
            </div>
          </div>
          <span className="yr-num">{s.n}</span>
          <h2 id={`yr-st-${i}`}>{s.title}</h2>
          <p>{s.text}</p>
        </section>
      ))}
      <section className="yr-still-end">
        <h2>Bir sonraki kareyi birlikte tasarlayalım.</h2>
        <CtaLinks hasCv={hasCv} />
        <ToolsLine />
      </section>
    </main>
  );
};

// ── Live version: a camera moving through one world as the page scrolls ────
const LiveOrbit = ({ hasCv }: { hasCv: boolean }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const phone = useIsPhone();
  const farStars = useMemo(() => makeFarStars(phone ? 56 : 130), [phone]);
  const midStars = useMemo(() => makeMidStars(phone ? 16 : 40), [phone]);
  const field = useMemo(() => (phone ? makeField(12, 3) : makeField(30, 9)), [phone]);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;
    let target = 0;
    let cur = -1;
    let vel = 0;
    let raf = 0;
    let last = 0;
    let lastCut = -1;
    let lastAi = -1;
    let camA0 = 260; // how far the camera has moved in once the frame has become scene one
    let shxPx = 0;
    let scale = 1;
    let blurOn = true;
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
      const follow = seg(P, 0.49, 0.53) * (1 - ease(seg(P, W.fly1[0], W.fly1[1]))) * (1 - finGate);
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
      set("--hero", (1 - seg(P, 0.04, 0.13)).toFixed(3));
      set("--cta", seg(P, 0.955, 0.985).toFixed(3));

      const cap = (s: number, e: number) => seg(P, s, s + 0.025) * (1 - seg(P, e - 0.025, e));
      set("--c0", cap(0.19, 0.35).toFixed(3));
      set("--c1", cap(0.35, 0.49).toFixed(3));
      set("--c2", cap(0.49, 0.62).toFixed(3));
      set("--c3", cap(0.66, 0.78).toFixed(3));
      set("--c4", cap(0.82, 0.9).toFixed(3));

      // Kurgu: hard cuts at uneven moments of the scroll.
      const cut = kc < 0.2 ? 0 : kc < 0.45 ? 1 : kc < 0.7 ? 2 : 3;
      if (cut !== lastCut) {
        lastCut = cut;
        stage.dataset.cut = String(cut);
      }
      // AI Artist: which reading is on screen (for the small label).
      const aiState = ai < 0.1 ? 0 : ai < 0.36 ? 1 : ai < 0.62 ? 2 : 3;
      if (aiState !== lastAi) {
        lastAi = aiState;
        stage.dataset.ai = String(aiState);
      }
      stage.classList.toggle("is-cta", seg(P, 0.955, 0.985) > 0.5);
    };

    const read = () => {
      const r = track.getBoundingClientRect();
      const max = Math.max(1, track.offsetHeight - window.innerHeight);
      target = clamp(-r.top / max);
    };

    // A critically damped spring with a speed limit: soft start, soft stop,
    // heavy and slow for slow scrolling, and no sudden jump for a fast flick.
    const OMEGA = 6.2;
    const VMAX = 0.4; // fraction of the whole story per second (a flick takes about 2.5 s end to end)
    const tick = (t: number) => {
      const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
      last = t;
      const x = cur - target;
      vel += (-OMEGA * OMEGA * x - 2 * OMEGA * vel) * dt;
      vel = clamp(vel, -VMAX, VMAX);
      cur += vel * dt;
      if (Math.abs(cur - target) < 0.0002 && Math.abs(vel) < 0.001) {
        cur = target;
        vel = 0;
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
  }, [phone]);

  return (
    <div className="yr-track" ref={trackRef}>
      <div className="yr-stage" ref={stageRef} data-cut="0" data-ai="0">
        <div className="yr-bg" aria-hidden="true">
          <div className="yr-nebula" />
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
              <span className="yr-num">{s.n} / 05</span>
              <h2>{s.title}</h2>
              <p>{s.text}</p>
            </div>
          ))}
        </div>

        <div className="yr-hint" aria-hidden="true">
          Kaydır <span>↓</span>
        </div>

        <div className="yr-cta">
          <h2>Bir sonraki kareyi birlikte tasarlayalım.</h2>
          <CtaLinks hasCv={hasCv} />
          <ToolsLine />
        </div>
      </div>
    </div>
  );
};

const OrbitPage = () => {
  const reduced = useReducedMotion();
  const [hasCv, setHasCv] = useState(false);

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
    <div className="yr" data-mode={reduced ? "still" : "live"} style={vars({ "--poster": `url("${POSTER}")` })}>
      <header className="yr-top">
        <a className="yr-logo" href="/" aria-label="Eray Ömeroğlu, ana sayfa">
          EÖ
        </a>
        <BackLink />
      </header>
      {reduced ? <StillOrbit hasCv={hasCv} /> : <LiveOrbit hasCv={hasCv} />}
    </div>
  );
};

export default OrbitPage;
