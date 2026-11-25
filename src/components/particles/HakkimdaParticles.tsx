import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { WebGLRenderer } from "three";
import { prefersReducedMotion } from "../../utils/motion";
import { characterModel, palette, particleTiers, pickTier } from "./config";
import { ParticleStory, type CameraKey } from "./ParticleStory";
import { describeModel, sampleCloud, samplePictureFrame, sampleModel, sampleText, type Shape } from "./samplers";
import { loadModel } from "./loadModel";
import "./particles.css";

const BriefFlow = lazy(() => import("../BriefFlow"));

/**
 * /hakkimda?prototip=parcacik : the first prototype of the particle story.
 *
 * Order of this trial (not the final scene navigation): character -> "MOTION" -> picture frame.
 * One WebGL canvas, one swarm. The scroll moves the story forward AND back along the same path; each
 * shape holds still for a while (a readable pause) and the swarm flows between them while the camera moves.
 * Stopping the scroll between two shapes keeps that in-between frame.
 *
 * Without WebGL, with "Hareketi azalt", or when the model cannot be loaded, a plain still page with the
 * same texts is shown instead.
 */
const SCENES = [
  { key: "karakter", menu: "Karakter", title: "Ben Eray Ömeroğlu", text: "Markalar için hareketli grafikler, kurgu ve görsel anlatılar üretiyorum.", sr: "Noktalardan oluşan karakter: baş ve omuzlar." },
  { key: "motion", menu: "Motion", title: "Motion Design", text: "Markanın mesajını hareketle anlatıyorum.", sr: "Noktalarla yazılmış MOTION kelimesi." },
  { key: "cerceve", menu: "Görsel çerçeve", title: "Grafik Tasarım", text: "Fikri, farklı mecralarda tutarlı bir görsel dile dönüştürüyorum.", sr: "Noktalardan oluşan bir görsel çerçeve." },
];
const N = SCENES.length;
const HOLD = 0.3; // share of each leg that stays still at both ends
const TRACK_VH = 230; // scroll length of one leg

let saved = "";
const lockPage = () => {
  saved = document.body.style.overflowY;
  document.body.style.overflowY = "hidden";
};
const unlockPage = () => {
  document.body.style.overflowY = saved || "auto";
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Scroll progress 0..1 over the track -> where the story is (0 = first scene ... N-1 = last), with a still hold at every scene. */
const sceneAt = (p: number) => {
  const u = Math.min(N - 1 - 1e-6, Math.max(0, p * (N - 1)));
  const i = Math.floor(u);
  const t = u - i;
  return i + Math.min(1, Math.max(0, (t - HOLD) / (1 - 2 * HOLD)));
};

const makeCameras = (narrow: boolean): CameraKey[] => {
  const k = narrow ? 1.55 : 1;
  // Wide screens: the swarm sits right of the centre, so the writing at the left stays calm.
  // Phones: the swarm sits in the upper part, the writing is at the bottom.
  const sx = narrow ? 0 : 2.9;
  const sy = narrow ? 1.9 : 0.5;
  const wy = narrow ? -2.4 : sy; // word and frame height on a phone: in the upper half, clear of the writing
  const cy = narrow ? -2.6 : sy; // the character's own height on a phone (the head sits in the upper half)
  return [
    { pos: [-sx * 0.6, sy, 26 * k], look: [-sx * 0.6, sy, 0], fov: 32 }, // the loose cloud
    { pos: [-sx - 0.6 + 1.5, cy + 0.3, 24 * k * (narrow ? 1.25 : 1)], look: [-sx - 0.6, cy, 0], fov: 30 }, // the character, a little from the side
    { pos: [-sx - 0.6, wy, 19 * k], look: [-sx * 0.8, wy + (narrow ? 0 : 0.6), 0], fov: 30 }, // the word, seen straight
    { pos: [-sx, wy - 0.2, (narrow ? 22 : 28) * k], look: [-sx * 0.9, wy + (narrow ? 0 : 0.9), 0], fov: 30 }, // the frame, pulled back
  ];
};

const StillStory = () => (
  <div className="pp-still">
    {SCENES.map((s, i) => (
      <section key={s.key} className="pp-still-sec" aria-labelledby={`pps-${s.key}`}>
        {i === 0 ? <h1 id={`pps-${s.key}`}>{s.title}</h1> : <h2 id={`pps-${s.key}`}>{s.title}</h2>}
        <p>{s.text}</p>
      </section>
    ))}
  </div>
);

const HakkimdaParticles = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const copy = useRef<(HTMLElement | null)[]>([]);
  const briefOpen = useRef(false);
  const [mode, setMode] = useState<"loading" | "live" | "still">(prefersReducedMotion() ? "still" : "loading");
  const [current, setCurrent] = useState(0);
  const [brief, setBrief] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    document.body.style.overflowY = "auto";
    document.body.style.backgroundColor = "#05070c";
    window.scrollTo(0, 0);
    document.title = "Hakkımda — Eray Ömeroğlu (parçacık prototipi)";
  }, []);

  useEffect(() => {
    briefOpen.current = brief;
  }, [brief]);

  useEffect(() => {
    if (mode === "still") return;
    const el = canvas.current;
    const tr = track.current;
    if (!el || !tr) return;
    let cancelled = false;
    let raf = 0;
    let renderer: WebGLRenderer | null = null;
    let story: ParticleStory | null = null;
    const cleanups: (() => void)[] = [];

    const tier = particleTiers[pickTier()];
    const narrow = window.innerWidth < 768;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    (async () => {
      try {
        renderer = new WebGLRenderer({ canvas: el, antialias: false, alpha: false, powerPreference: narrow ? "low-power" : "high-performance" });
      } catch {
        if (!cancelled) setMode("still");
        return;
      }
      renderer.setClearColor(palette.ground, 1);
      const count = tier.count;
      const cameras = makeCameras(narrow);
      // the visible width of the word / frame at their camera distance, so they fit on a phone too
      const visW = (z: number, fov: number, aspect: number) => 2 * z * Math.tan((fov * Math.PI) / 360) * aspect;
      const aspect = window.innerWidth / Math.max(1, window.innerHeight);
      let shapes: Shape[];
      try {
        const gltf = await loadModel(characterModel);
        if (new URLSearchParams(location.search).get("model") === "debug") console.log("MESHES " + JSON.stringify(describeModel(gltf, characterModel)));
        const character = sampleModel(gltf, count, characterModel);
        const word = await sampleText("MOTION", count, { width: Math.min(10.5, visW(cameras[2].pos[2], 30, aspect) * (narrow ? 0.84 : 0.62)), weight: 800, depth: 1.1 });
        const frame = samplePictureFrame(count, Math.min(9, visW(cameras[3].pos[2], 30, aspect) * (narrow ? 0.8 : 0.5)));
        shapes = [sampleCloud(count), character, word, frame];
      } catch (e) {
        console.error("Particle story: the shapes could not be built", e);
        if (!cancelled) setMode("still");
        return;
      }
      if (cancelled) return;
      story = new ParticleStory({ count, shapes, camera: cameras, size: tier.size, teal: [0.4, 0.45, 0.3, 0.6] });
      const resize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, tier.dpr * quality.res);
        renderer!.setPixelRatio(dpr);
        renderer!.setSize(w, h, false);
        story!.resize(w, h, dpr);
      };
      const quality = { res: 1, frac: 1 };
      resize();
      window.addEventListener("resize", resize);
      cleanups.push(() => window.removeEventListener("resize", resize));
      setMode("live");

      // the pointer: only a mouse; it pushes the nearby particles aside and lets go when it rests or leaves
      let lastMove = 0;
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse" || coarse) return;
        story!.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1), 1);
        lastMove = performance.now();
      };
      const onLeave = () => story!.setPointer(9, 9, 0);
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerleave", onLeave);
      });

      // the loop
      let segCur = 0;
      let last = 0;
      let startAt = performance.now();
      let ema = 16;
      let frames = 0;
      let shown = -1;
      let lastDraw = 0;
      const frame = (t: number) => {
        raf = 0;
        if (cancelled) return;
        const dt = Math.min(0.1, last ? (t - last) / 1000 : 0.016);
        last = t;
        // scroll -> scene (1..N is the character .. the frame; 0 is the loose cloud of the opening)
        const max = Math.max(1, tr.offsetHeight - window.innerHeight);
        const p = Math.min(1, Math.max(0, window.scrollY / max));
        const target = 1 + sceneAt(p);
        const intro = performance.now() - startAt < 3200;
        const k = 1 - Math.exp(-dt * (intro ? 1.5 : 6.5));
        segCur += (target - segCur) * k;
        const settled = Math.abs(target - segCur) < 0.0008;
        if (settled) segCur = target;
        if (performance.now() - lastMove > 140) story!.setPointer(9, 9, 0);
        const pointerBusy = story!.update(dt);
        story!.setProgress(segCur);
        // which scene is nearest (texts and the menu)
        const near = Math.round(segCur - 1);
        const nearC = Math.min(N - 1, Math.max(0, near));
        if (nearC !== shown) {
          shown = nearC;
          setCurrent(nearC);
        }
        copy.current.forEach((c, i) => {
          if (!c) return;
          const o = 1 - smooth(0.1, 0.3, Math.abs(segCur - 1 - i));
          c.style.opacity = String(o);
          c.style.visibility = o < 0.02 ? "hidden" : "visible";
          c.style.transform = `translateY(${((1 - o) * 14).toFixed(1)}px)`;
        });
        // a settled, still frame is drawn at about 20 fps; anything moving at full rate
        const busy = !settled || pointerBusy || intro;
        if (busy || t - lastDraw > 48) {
          lastDraw = t;
          story!.render(renderer!);
        }
        // quality: slow machines get a smaller picture first, then fewer particles
        const raw = Math.min(100, dt * 1000);
        ema += (raw - ema) * 0.06;
        frames++;
        if (busy && frames > 70 && frames % 45 === 0 && ema > (narrow ? 30 : 24)) {
          if (quality.res > 0.7) {
            quality.res = Math.max(0.7, quality.res - 0.1);
            resize();
          } else if (quality.frac > 0.5) {
            quality.frac = Math.max(0.5, quality.frac - 0.15);
            story!.setDrawFraction(quality.frac);
          }
        }
        canvas.current && (canvas.current.dataset.q = `${quality.res.toFixed(1)}/${quality.frac.toFixed(2)}`);
        run();
      };
      const run = () => {
        if (cancelled || raf) return;
        if (document.hidden || briefOpen.current) {
          last = 0;
          return;
        }
        raf = requestAnimationFrame(frame);
      };
      const onVis = () => {
        if (!document.hidden) run();
      };
      document.addEventListener("visibilitychange", onVis);
      cleanups.push(() => document.removeEventListener("visibilitychange", onVis));
      // the brief form covers the page: the loop stops; it starts again when the form closes
      const bus = window.setInterval(() => run(), 300);
      cleanups.push(() => window.clearInterval(bus));
      startAt = performance.now();
      run();
    })();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      cleanups.forEach((c) => c());
      story?.dispose();
      renderer?.dispose();
    };
  }, [mode === "still"]);

  const go = useCallback((i: number) => {
    const tr = track.current;
    if (!tr) return;
    const max = Math.max(1, tr.offsetHeight - window.innerHeight);
    window.scrollTo({ top: (i / (N - 1)) * max, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  return (
    <div className="pp" data-mode={mode}>
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
      <header className="pp-top">
        <a className="pp-logo" href="/" aria-label="Eray Ömeroğlu, ana sayfa">
          EÖ
        </a>
        <nav aria-label="Ana menü">
          <a href="/ai-isler">AI İşler</a>
          <a href="/">← Ana sayfaya dön</a>
        </nav>
      </header>

      {mode !== "still" && (
        <>
          <canvas ref={canvas} className="pp-canvas" aria-hidden="true" tabIndex={-1} />
          <main id="main" tabIndex={-1}>
            <div ref={track} className="pp-track" style={{ height: `${(N - 1) * TRACK_VH + 100}vh` }}>
              <div className="pp-stage">
                {SCENES.map((s, i) => (
                  <section key={s.key} ref={(e) => (copy.current[i] = e)} className="pp-copy" aria-labelledby={`pp-${s.key}`} style={{ opacity: i === 0 ? 1 : 0, visibility: i === 0 ? "visible" : "hidden" }}>
                    {i === 0 ? <h1 id={`pp-${s.key}`}>{s.title}</h1> : <h2 id={`pp-${s.key}`}>{s.title}</h2>}
                    <p>{s.text}</p>
                    <p className="ai-sr">{s.sr}</p>
                  </section>
                ))}
                <nav className="pp-scenes" aria-label="Sahneler">
                  <ul>
                    {SCENES.map((s, i) => (
                      <li key={s.key}>
                        <button type="button" aria-current={current === i ? "true" : undefined} onClick={() => go(i)}>
                          {s.menu}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
                <button
                  type="button"
                  className="pp-cta"
                  onClick={(e) => {
                    opener.current = e.currentTarget;
                    setBrief(true);
                  }}
                >
                  Projeni anlat
                </button>
              </div>
            </div>
          </main>
        </>
      )}
      {mode === "still" && (
        <main id="main" tabIndex={-1}>
          <StillStory />
          <button
            type="button"
            className="pp-cta pp-cta-still"
            onClick={(e) => {
              opener.current = e.currentTarget;
              setBrief(true);
            }}
          >
            Projeni anlat
          </button>
        </main>
      )}
      {brief && (
        <Suspense fallback={null}>
          <BriefFlow
            onClose={() => {
              setBrief(false);
              window.requestAnimationFrame(() => opener.current?.focus?.());
            }}
            lock={lockPage}
            unlock={unlockPage}
          />
        </Suspense>
      )}
    </div>
  );
};

export default HakkimdaParticles;
