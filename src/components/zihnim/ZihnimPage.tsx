import { useCallback, useEffect, useRef, useState } from "react";
import { MdArrowBack, MdClose, MdOpenInNew, MdPause, MdPlayArrow } from "react-icons/md";
import { prefersReducedMotion } from "../../utils/motion";
import { hasWebGL } from "../../utils/webgl";
import { areaById, readyAreas, stations, workById, worksOf, type StationId, type Work } from "./zihnimWorld";
import type { SceneApi } from "./ZihnimScene";
import "./zihnim.css";

/**
 * /zihnim: "Eray'ın Zihni" (a design preview; no link to it from the site).
 *
 * HTML around one canvas (ZihnimScene.ts): the title and short instructions, the place buttons, a route indicator,
 * a card for the place the camera has reached (with its works as buttons) and a panel for one work. Everything the
 * canvas offers is also reachable without it: buttons work with the keyboard, and without WebGL (or if the world
 * fails to load) a static map and the same works and panels are shown.
 */
const HINT_KEY = "zihnim-hint-seen";
const readHint = () => {
  try {
    return window.localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
};
const MAP_SPOTS: Record<string, [number, number]> = { "gorsel-hafiza": [96, 104], "kurgu-masasi": [304, 118], "deney-alani": [200, 196] };

const StaticMap = () => (
  <svg className="zh-map" viewBox="0 0 400 260" role="img" aria-label="Eray'ın Zihni haritası: iki lob, ortada Fikir Çekirdeği, üç alan">
    <g fill="none" stroke="#dbe8ff" strokeLinecap="round" strokeOpacity="0.7" strokeWidth="2.4" strokeDasharray="0.1 6">
      <ellipse cx="128" cy="120" rx="104" ry="88" />
      <ellipse cx="272" cy="120" rx="104" ry="88" />
      <ellipse cx="200" cy="114" rx="20" ry="18" strokeOpacity="0.95" />
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

const ZihnimPage = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<SceneApi | null>(null);
  const ui = useRef<HTMLDivElement>(null);
  const labelEls = useRef<Record<string, HTMLElement | null>>({});
  const workBtns = useRef<Record<string, HTMLElement | null>>({});
  const opener = useRef<HTMLElement | null>(null);
  const reduced = useRef(prefersReducedMotion()).current;
  const [mode, setMode] = useState<"loading" | "world" | "static">(() => (hasWebGL() ? "loading" : "static"));
  const [station, setStation] = useState<StationId | null>("genel");
  const [progress, setProgress] = useState(0);
  const [work, setWork] = useState<string | null>(null);
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
            const st = stations.find((x) => x.id === id);
            if (st) setSay(`${st.title}.`);
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

  // a panel calms the world; the rest of the page cannot be reached while it is open
  useEffect(() => {
    scene.current?.setCalm(work ? 1 : 0);
    ui.current?.toggleAttribute("inert", !!work);
  }, [work, mode]);
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
  const here = areaById(station);
  const stIndex = stations.findIndex((x) => x.id === station);

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

  return (
    <div className="zh" data-mode={mode}>
      <canvas ref={canvas} className={`zh-canvas${work ? " is-blocked" : ""}`} aria-hidden="true" tabIndex={-1} />
      <div ref={ui} className="zh-ui">
        <header className="zh-top">
          <div className="zh-brand">
            <a className="zh-home" href="/" aria-label="Ana siteye dön">
              <MdArrowBack aria-hidden="true" />
              <span>Ana site</span>
            </a>
            <h1>Eray’ın Zihni</h1>
            <p className="zh-how">{narrow ? "Yukarı kaydırarak ilerle ya da Alanlar menüsünden bir alan seç." : "Tekerlekle zihnin içinde ilerle ya da bir alan seç. Sürükleyerek çevreye bakabilirsin."}</p>
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
              className="zh-label is-core"
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
            {narrow ? "Yukarı kaydırarak ilerle · Alanlar menüsünden seç" : "Tekerlekle keşfet · Bir alan seç"}
          </p>
        )}

        {mode === "world" && station && (
          <section className="zh-card" aria-labelledby="zh-card-h">
            {here ? (
              <>
                <h2 id="zh-card-h">{here.title}</h2>
                <p>{here.tagline}</p>
                <p className="zh-card-hint">{here.hint}</p>
                {worksList(here.id)}
              </>
            ) : station === "giris" ? (
              <>
                <h2 id="zh-card-h">Giriş</h2>
                <p>İki lobun arasından içeri giriyorsun. Ortada Fikir Çekirdeği; sol lobda Görsel Hafıza.</p>
              </>
            ) : (
              <>
                <h2 id="zh-card-h">Genel görünüm</h2>
                <p>İki lob, aralarında bir yarık ve ortada Fikir Çekirdeği. Üç alan: Görsel Hafıza, Kurgu Masası, Deney Alanı.</p>
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
            <ul className="zh-static-list">
              {readyAreas.map((a) => (
                <li key={a.id}>
                  <h2>{a.title}</h2>
                  <p>{a.tagline}</p>
                  {worksList(a.id)}
                </li>
              ))}
            </ul>
            <p className="zh-note">Üç boyutlu dünya bu cihazda açılamadı; aynı alanlar ve çalışmalar burada.</p>
          </main>
        )}
      </div>

      <p className="zh-sr" role="status" aria-live="polite">
        {say}
      </p>
      {w && <WorkPanel work={w} onClose={closePanel} />}
    </div>
  );
};

export default ZihnimPage;
