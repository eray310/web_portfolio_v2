import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { MdArrowBack, MdArrowForward, MdClose, MdExpandLess, MdExpandMore, MdOpenInNew, MdPause, MdPlayArrow } from "react-icons/md";
import { prefersReducedMotion } from "../../utils/motion";
import { hasWebGL } from "../../utils/webgl";
import { areaById, readyAreas, stations, story, workById, worksOf, type StationId, type Work } from "./zihnimWorld";
import type { SceneApi } from "./ZihnimScene";
import "./zihnim.css";

// The same three-step brief form as the rest of the site (loaded on first use; nothing is preselected here).
const BriefFlow = lazy(() => import("../BriefFlow"));

/**
 * /zihnim: "Eray'ın Zihni" (a design preview; no link to it from the site).
 *
 * "Bir fikrin yolculuğu": one canvas (ZihnimScene.ts) and around it only what the journey needs: the place's name, one
 * short line of the story and where the route goes next; the works of a place open on request ("Çalışmaları gör");
 * the final opens the site's brief form. Everything the canvas offers is also reachable without it: buttons work with
 * the keyboard, and without WebGL (or if the world fails to load) a static map tells the same story with the same
 * works, panels and brief.
 */
const HINT_KEY = "zihnim-hint-seen";
const readHint = () => {
  try {
    return window.localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
};
const MAP_SPOTS: Record<string, [number, number]> = { "gorsel-hafiza": [96, 104], "kurgu-masasi": [304, 118], "deney-alani": [200, 196], "birlikte-uretelim": [200, 40] };
const placeStations = stations.filter((s) => s.id !== "genel");

const StaticMap = () => (
  <svg className="zh-map" viewBox="0 0 400 260" role="img" aria-label="Eray'ın Zihni haritası: iki lob, ortada Fikir Çekirdeği, üç alan ve Birlikte Üretelim">
    <g fill="none" stroke="#dbe8ff" strokeLinecap="round" strokeOpacity="0.7" strokeWidth="2.4" strokeDasharray="0.1 6">
      <ellipse cx="128" cy="130" rx="104" ry="84" />
      <ellipse cx="272" cy="130" rx="104" ry="84" />
      <ellipse cx="200" cy="124" rx="20" ry="18" strokeOpacity="0.95" />
    </g>
    {readyAreas.map((a) => {
      const [x, y] = MAP_SPOTS[a.id];
      return (
        <g key={a.id}>
          <circle cx={x} cy={y} r="7" fill="#5eead4" />
          <text x={x} y={y + 24} textAnchor="middle" fill="#eae5ec" fontSize="13">
            {a.title}
          </text>
        </g>
      );
    })}
  </svg>
);

const WorkPanel = ({ work, onClose }: { work: Work; onClose: () => void }) => {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    const onVis = () => {
      if (document.hidden) vid.current?.pause();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [onClose]);
  const area = areaById(work.area);
  return (
    <div className="zh-panel-wrap">
      <section className="zh-panel" role="dialog" aria-modal="true" aria-labelledby="zh-panel-h">
        <header>
          <div>
            <p className="zh-panel-area">{area?.title}</p>
            <h2 id="zh-panel-h">{work.title}</h2>
            {work.tag && <p className="zh-panel-tag">{work.tag}</p>}
          </div>
          <button ref={closeBtn} type="button" className="zh-close" onClick={onClose} aria-label={`${work.title} panelini kapat`}>
            <MdClose aria-hidden="true" />
            <span>Kapat</span>
          </button>
        </header>
        <div className="zh-panel-body">
          <div className={`zh-media${work.image.includes("masaustu") ? " is-wide" : ""}`}>
            {work.video && playing ? (
              <video ref={vid} src={work.video} poster={work.image} controls autoPlay playsInline aria-label={work.title} />
            ) : (
              <>
                <img src={work.image} alt={`${work.title}: görsel`} decoding="async" />
                {work.video && (
                  <button type="button" className="zh-play" onClick={() => setPlaying(true)}>
                    <MdPlayArrow aria-hidden="true" />
                    <span>Videoyu oynat</span>
                  </button>
                )}
              </>
            )}
          </div>
          <p>{work.text}</p>
          {work.video && <p className="zh-note">Video sesli; yalnızca “Videoyu oynat” düğmesine basınca başlar.</p>}
          {work.link && (
            <a className="zh-link" href={work.link.href}>
              {work.link.label} <MdOpenInNew aria-hidden="true" />
            </a>
          )}
        </div>
      </section>
    </div>
  );
};

/** The next station ahead of a route position. */
const nextOnRoute = (s: number) => stations.find((x) => x.t > s + 1e-6) ?? stations[stations.length - 1];

const ZihnimPage = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<SceneApi | null>(null);
  const ui = useRef<HTMLDivElement>(null);
  const labelEls = useRef<Record<string, HTMLElement | null>>({});
  const workBtns = useRef<Record<string, HTMLElement | null>>({});
  const opener = useRef<HTMLElement | null>(null);
  const briefOpener = useRef<HTMLElement | null>(null);
  const reduced = useRef(prefersReducedMotion()).current;
  const [mode, setMode] = useState<"loading" | "world" | "static">(() => (hasWebGL() ? "loading" : "static"));
  const [station, setStation] = useState<StationId | null>("genel");
  const [progress, setProgress] = useState(0);
  const [work, setWork] = useState<string | null>(null);
  const [showWorks, setShowWorks] = useState(false);
  const [brief, setBrief] = useState(false);
  const [paused, setPaused] = useState(false);
  const [menu, setMenu] = useState(false);
  const [hint, setHint] = useState(() => !readHint());
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches);
  const [say, setSay] = useState("");
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const hideHint = useCallback(() => {
    setHint(false);
    try {
      window.localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* private mode: the hint simply shows again next time */
    }
  }, []);

  const openWork = useCallback((id: string, from: HTMLElement | null) => {
    opener.current = from ?? workBtns.current[id] ?? null;
    setWork(id);
  }, []);
  const openBrief = useCallback((from: HTMLElement | null) => {
    briefOpener.current = from;
    setBrief(true);
  }, []);
  // while the brief is open the world holds still (nothing moves or draws); it continues from the same place
  const holdWorld = useCallback(() => scene.current?.setHold(true), []);
  const releaseWorld = useCallback(() => scene.current?.setHold(false), []);
  const closeBrief = useCallback(() => {
    setBrief(false);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => briefOpener.current?.focus()));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (modeRef.current === "static") return;
    const el = canvas.current;
    if (!el) return;
    let alive = true;
    const light = window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches;
    const timer = window.setTimeout(() => {
      if (alive && modeRef.current === "loading") setMode("static");
    }, 15000);
    import("./ZihnimScene")
      .then(({ createScene }) =>
        createScene({
          canvas: el,
          light,
          reduced,
          alive: () => alive,
          labels: () => labelEls.current,
          onProgress: (s) => setProgress(s),
          onStation: (id) => {
            setStation(id);
            setShowWorks(false);
            const st = stations.find((x) => x.id === id);
            if (st) setSay(`${st.title}. ${story[st.id]}`);
          },
          onPickWork: (id) => openWork(id, null),
          onFirstInput: hideHint,
        })
      )
      .then((api) => {
        if (!alive) {
          api.dispose();
          return;
        }
        window.clearTimeout(timer);
        scene.current = api;
        setMode("world");
      })
      .catch((err) => {
        if (!alive) return;
        console.warn("zihnim: the world could not start, showing the static map", err);
        setMode("static");
      });
    return () => {
      alive = false;
      window.clearTimeout(timer);
      scene.current?.dispose();
      scene.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const prev = { o: document.body.style.overflow, b: document.body.style.backgroundColor };
    document.body.style.overflow = "hidden";
    document.body.style.backgroundColor = "#0c0a0b";
    document.title = "Eray’ın Zihni — Eray Ömeroğlu (önizleme)";
    return () => {
      document.body.style.overflow = prev.o;
      document.body.style.backgroundColor = prev.b;
    };
  }, []);

  // a panel calms the world; the rest of the page cannot be reached while a panel or the brief is open
  useEffect(() => {
    scene.current?.setCalm(work ? 1 : 0);
    ui.current?.toggleAttribute("inert", !!work || brief);
  }, [work, brief, mode]);
  useEffect(() => {
    scene.current?.setPaused(paused);
  }, [paused, mode]);

  const go = useCallback((id: StationId) => {
    setMenu(false);
    scene.current?.goTo(id);
  }, []);
  const closePanel = useCallback(() => {
    setWork(null);
    const o = opener.current;
    if (o && o.closest("nav") && window.matchMedia("(max-width: 760px)").matches) setMenu(true);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => opener.current?.focus()));
  }, []);

  const w = workById(work);
  const stIndex = stations.findIndex((x) => x.id === station);
  const here = station ? stations[stIndex] : null;
  const ahead = nextOnRoute(progress);
  const hereWorks = here ? worksOf(here.id) : [];

  const worksList = (areaId: string) => (
    <ul className="zh-works">
      {worksOf(areaId).map((x) => (
        <li key={x.id}>
          <button
            type="button"
            ref={(e) => {
              workBtns.current[x.id] = e;
            }}
            onClick={(e) => openWork(x.id, e.currentTarget)}
          >
            {x.title.replace(/^Konsept prototip: /, "Uygulama: ")}
            {x.video ? <span className="zh-vid-mark"> · video</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
  const briefButton = () => (
    <button type="button" className="zh-cta" onClick={(e) => openBrief(e.currentTarget)}>
      Projeni anlat <MdArrowForward aria-hidden="true" />
    </button>
  );

  return (
    <div className="zh" data-mode={mode}>
      <canvas ref={canvas} className={`zh-canvas${work || brief ? " is-blocked" : ""}`} aria-hidden="true" tabIndex={-1} />
      <div ref={ui} className="zh-ui">
        <header className="zh-top">
          <div className="zh-brand">
            <a className="zh-home" href="/" aria-label="Ana siteye dön">
              <MdArrowBack aria-hidden="true" />
              <span>Ana site</span>
            </a>
            <h1>Eray’ın Zihni</h1>
          </div>
          {mode === "world" && (
            <>
              <button type="button" className="zh-menu-btn" aria-expanded={menu} aria-controls="zh-nav" onClick={() => setMenu((m) => !m)}>
                Alanlar
              </button>
              <nav id="zh-nav" className={menu ? "is-open" : ""} aria-label="Alanlar">
                <ul>
                  {readyAreas.map((a) => (
                    <li key={a.id}>
                      <button type="button" className={`zh-area-btn${station === a.id ? " is-on" : ""}`} aria-pressed={station === a.id} onClick={() => go(a.id)}>
                        {a.title}
                      </button>
                    </li>
                  ))}
                  <li>
                    <button type="button" className="zh-area-btn zh-overview" onClick={() => go("genel")} disabled={station === "genel"}>
                      Genel görünüm
                    </button>
                  </li>
                </ul>
              </nav>
              <button type="button" className="zh-motion" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
                {paused ? <MdPlayArrow aria-hidden="true" /> : <MdPause aria-hidden="true" />}
                <span>{paused ? "Hareketi başlat" : "Hareketi durdur"}</span>
              </button>
            </>
          )}
        </header>

        {mode !== "static" && (
          <div className="zh-labels" aria-hidden="true">
            {readyAreas.map((a) => (
              <button
                key={a.id}
                type="button"
                tabIndex={-1}
                className={`zh-label${station === a.id ? " is-on" : ""}`}
                ref={(e) => {
                  labelEls.current[a.id] = e;
                }}
                onClick={() => go(a.id)}
              >
                {a.title}
              </button>
            ))}
            <span
              className={`zh-label is-core${station === "giris" ? " is-on" : ""}`}
              ref={(e) => {
                labelEls.current.core = e;
              }}
            >
              Fikir Çekirdeği
            </span>
          </div>
        )}

        {mode === "world" && (
          <nav className="zh-route" aria-label="Rota">
            <div className="zh-route-track" aria-hidden="true">
              <span className="zh-route-fill" style={{ transform: `scale${narrow ? "X" : "Y"}(${progress.toFixed(3)})` }} />
            </div>
            <ol>
              {stations.map((st, k) => (
                <li key={st.id} style={{ [narrow ? "left" : "top"]: `${st.t * 100}%` }}>
                  <button type="button" className={k === stIndex ? "is-on" : progress >= st.t - 0.001 ? "is-past" : ""} aria-current={k === stIndex ? "location" : undefined} onClick={() => go(st.id)}>
                    <i aria-hidden="true" />
                    <span>{st.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {mode === "world" && hint && (
          <p className="zh-hint" role="note">
            {narrow ? "Yukarı kaydırarak ilerle · Alanlar’dan seç" : "Tekerlekle keşfet · Bir alan seç"}
          </p>
        )}

        {mode === "world" && (
          <section className={`zh-card${here ? " is-here" : " is-between"}${here?.id === "birlikte-uretelim" ? " is-final" : ""}`} aria-labelledby="zh-card-h">
            {here ? (
              <>
                <h2 id="zh-card-h">{here.title}</h2>
                <p className="zh-line">{story[here.id]}</p>
                {here.id === "birlikte-uretelim" && briefButton()}
                {hereWorks.length > 0 && (
                  <>
                    <button type="button" className="zh-more" aria-expanded={showWorks} aria-controls="zh-card-works" onClick={() => setShowWorks((v) => !v)}>
                      {showWorks ? "Çalışmaları gizle" : `Çalışmaları gör (${hereWorks.length})`}
                      {showWorks ? <MdExpandLess aria-hidden="true" /> : <MdExpandMore aria-hidden="true" />}
                    </button>
                    {showWorks && <div id="zh-card-works">{worksList(here.id)}</div>}
                  </>
                )}
                {stIndex < stations.length - 1 && (
                  <p className="zh-next">
                    <MdArrowForward aria-hidden="true" /> Sıradaki: {stations[stIndex + 1].title}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="zh-next zh-next-top">
                  <MdArrowForward aria-hidden="true" /> {ahead.title}
                </p>
                <h2 id="zh-card-h" className="zh-line">
                  {story[ahead.id]}
                </h2>
              </>
            )}
          </section>
        )}

        {mode === "loading" && (
          <div className="zh-loading" role="status">
            <p>Dünya yükleniyor…</p>
            <button type="button" onClick={() => setMode("static")}>
              Beklemeden alanları listele
            </button>
          </div>
        )}

        {mode === "static" && (
          <main className="zh-static">
            <StaticMap />
            <p className="zh-static-lead">Bir fikrin yolculuğu. {story.giris}</p>
            <ol className="zh-static-list">
              {placeStations.map((st) => {
                const a = areaById(st.id);
                return (
                  <li key={st.id}>
                    <h2>{st.title}</h2>
                    <p className="zh-line">{story[st.id]}</p>
                    {a && st.id !== "birlikte-uretelim" && <p>{a.tagline}</p>}
                    {worksOf(st.id).length > 0 && worksList(st.id)}
                    {st.id === "birlikte-uretelim" && briefButton()}
                  </li>
                );
              })}
            </ol>
            <p className="zh-note">Üç boyutlu dünya bu cihazda açılamadı; aynı yolculuk, çalışmalar ve brief burada.</p>
          </main>
        )}
      </div>

      <p className="zh-sr" role="status" aria-live="polite">
        {say}
      </p>
      {w && <WorkPanel work={w} onClose={closePanel} />}
      {brief && (
        <Suspense fallback={null}>
          <BriefFlow onClose={closeBrief} lock={holdWorld} unlock={releaseWorld} />
        </Suspense>
      )}
    </div>
  );
};

export default ZihnimPage;
