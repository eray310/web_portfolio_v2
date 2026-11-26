import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { MdArrowBack, MdArrowForward, MdClose, MdExpandLess, MdExpandMore, MdOpenInNew, MdPlayArrow } from "react-icons/md";
import { prefersReducedMotion } from "../../utils/motion";
import { hasWebGL } from "../../utils/webgl";
import { useCalmView } from "../../utils/viewMode";
import ViewMenu from "../ViewMenu";
import { areaById, isPortrait, readyAreas, stations, workById, worksOf, type StationId, type Work } from "./zihnimWorld";
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
/** The door screen is shown once per visit (session): "Hikâyeyi izle" or "Doğrudan alanlara git". */
const GATE_KEY = "zihnim-kapi";
const readGate = () => {
  try {
    return window.sessionStorage.getItem(GATE_KEY) === "1";
  } catch {
    return false;
  }
};
const readHint = () => {
  try {
    return window.localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
};
const MAP_SPOTS: Record<string, [number, number]> = { "gorsel-hafiza": [96, 104], "kurgu-masasi": [304, 118], "deney-alani": [200, 196], "birlikte-uretelim": [200, 40] };

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
  const calmView = useCalmView();
  const [menu, setMenu] = useState(false);
  const [gate, setGate] = useState<"open" | "list" | "done">(() => (readGate() ? "done" : "open"));
  const gateBtn = useRef<HTMLButtonElement>(null);
  const closeGate = useCallback(() => {
    setGate("done");
    try {
      window.sessionStorage.setItem(GATE_KEY, "1");
    } catch {
      /* private mode: the door shows again next time */
    }
  }, []);
  useEffect(() => {
    if (gate === "open") gateBtn.current?.focus();
  }, [gate, mode]);
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
    if (new URLSearchParams(window.location.search).get("is") !== id) window.history.pushState({ zhWork: id }, "", `${window.location.pathname}?is=${encodeURIComponent(id)}`);
  }, []);
  // Back and Forward open and close the panel
  useEffect(() => {
    const onPop = () => setWork(workById(new URLSearchParams(window.location.search).get("is"))?.id ?? null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // a phone that is turned gets the hall laid out for its new shape (the page reloads at the same place of the journey)
  useEffect(() => {
    const was = isPortrait();
    const on = () => {
      if (isPortrait() === was) return;
      try {
        window.sessionStorage.setItem("zihnim-s", canvas.current?.dataset.s ?? "0");
      } catch {
        /* no storage: the journey starts again */
      }
      window.location.reload();
    };
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
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
            if (st) setSay(`${st.n} ${st.label}. ${st.title} ${st.line}`);
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
        // opened with the address of a work: go to its chapter and show its panel
        const linked = workById(new URLSearchParams(window.location.search).get("is"));
        if (linked) {
          closeGate();
          api.goTo(linked.area);
          setWork(linked.id);
        }
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
    document.title = "Zihnim: Her şey bir şarkı kapağıyla başladı — Eray Ömeroğlu";
    return () => {
      document.body.style.overflow = prev.o;
      document.body.style.backgroundColor = prev.b;
    };
  }, []);

  // a panel calms the world; the rest of the page cannot be reached while a panel or the brief is open
  useEffect(() => {
    scene.current?.setCalm(work ? 1 : 0);
    ui.current?.toggleAttribute("inert", !!work || brief || (gate !== "done" && mode === "world"));
  }, [work, brief, mode, gate]);
  useEffect(() => {
    scene.current?.setPaused(calmView);
  }, [calmView, mode]);

  const go = useCallback((id: StationId) => {
    setMenu(false);
    scene.current?.goTo(id);
  }, []);
  const closePanel = useCallback(() => {
    setWork(null);
    if (new URLSearchParams(window.location.search).get("is")) window.history.replaceState(null, "", window.location.pathname);
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
            {x.tag === "Kişisel çalışma · Kolaj" ? <span className="zh-vid-mark"> · kişisel çalışma</span> : null}
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
      <div className="zh-veil" aria-hidden="true" />
      <div ref={ui} className="zh-ui">
        <header className="zh-top">
          <div className="zh-brand">
            <a className="zh-home" href="/">
              <MdArrowBack aria-hidden="true" />
              <span>Siteye geç</span>
            </a>
            <h1>Zihnim</h1>
          </div>
          {mode === "world" && (
            <>
              <button type="button" className="zh-menu-btn" aria-expanded={menu} aria-controls="zh-nav" onClick={() => setMenu((m) => !m)}>
                Bölümler
              </button>
              <nav id="zh-nav" className={menu ? "is-open" : ""} aria-label="Bölümler">
                <ul>
                  {stations.map((st) => (
                    <li key={st.id}>
                      <button type="button" className={`zh-area-btn${station === st.id ? " is-on" : ""}`} aria-current={station === st.id ? "location" : undefined} onClick={() => go(st.id)}>
                        <b>{st.n}</b> {st.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
              <ViewMenu className="zh-view" />
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
                    <span>
                      <b>{st.n}</b>
                      <em>{st.label}</em>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}



        {mode === "world" && (
          <section
            key={here?.id ?? "yol"}
            className={`zh-card${here ? " is-here" : " is-between"}${here?.id === "birlikte-uretelim" ? " is-final" : ""}${here?.quote ? " is-quote" : ""}${calmView ? " is-calm" : ""}`}
            aria-labelledby="zh-card-h"
          >
            {here ? (
              <>
                <p className="zh-ch">
                  <b>{here.n}</b>
                  <span>{here.label}</span>
                  {here.meta && <span className="zh-meta">{here.meta}</span>}
                </p>
                {here.quote ? (
                  <blockquote className="zh-quote" id="zh-card-h">
                    <p>“{here.quote.text}”</p>
                    <footer>
                      — {here.quote.by} · {here.quote.note}
                    </footer>
                  </blockquote>
                ) : (
                  <>
                    <h2 id="zh-card-h">{here.title}</h2>
                    <p className="zh-line" lang={here.id === "birlikte-uretelim" ? "en" : undefined}>
                      {here.line}
                    </p>
                  </>
                )}
                {here.facts && (
                  <ul className="zh-facts">
                    {here.facts.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                )}
                {here.id === "birlikte-uretelim" && (
                  <>
                    <p className="zh-sign">Dünyayı görebilmek için tırmanıyorum.</p>
                    <p className="zh-line zh-yours">Sıradaki hikâye senin.</p>
                    <div className="zh-acts">
                      {briefButton()}
                      <a className="zh-back" href="/">
                        Siteye dön
                      </a>
                    </div>
                  </>
                )}
                {hereWorks.length > 0 && (
                  <>
                    <button type="button" className="zh-more" aria-expanded={showWorks} aria-controls="zh-card-works" onClick={() => setShowWorks((v) => !v)}>
                      {showWorks ? "İşleri gizle" : `İşleri gör (${hereWorks.length})`}
                      {showWorks ? <MdExpandLess aria-hidden="true" /> : <MdExpandMore aria-hidden="true" />}
                    </button>
                    {showWorks && <div id="zh-card-works">{worksList(here.id)}</div>}
                  </>
                )}
                {here.link && (
                  <a className="zh-link" href={here.link.href}>
                    {here.link.label} <MdOpenInNew aria-hidden="true" />
                  </a>
                )}
                {here.hint && (here.id !== "genel" || hint) && <p className="zh-tip">{here.id === "genel" && narrow ? "Kaydırarak ilerle" : here.hint}</p>}
              </>
            ) : (
              <p className="zh-ch zh-ch-next" id="zh-card-h">
                <MdArrowForward aria-hidden="true" /> <b>{ahead.n}</b> {ahead.label}
              </p>
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
            <p className="zh-static-lead">Bu işe kendi şarkılarıma kapak yaparak başladım. Yedi kısa bölümde yolum:</p>
            <ol className="zh-static-list">
              {stations.map((st) => (
                <li key={st.id}>
                  <p className="zh-ch">
                    <b>{st.n}</b> {st.label}
                  </p>
                  <h2>{st.title}</h2>
                  {st.quote ? (
                    <blockquote className="zh-quote">
                      <p>“{st.quote.text}”</p>
                      <footer>
                        — {st.quote.by} · {st.quote.note}
                      </footer>
                    </blockquote>
                  ) : (
                    <p className="zh-line" lang={st.id === "birlikte-uretelim" ? "en" : undefined}>
                      {st.line}
                    </p>
                  )}
                  {st.facts && (
                    <ul className="zh-facts">
                      {st.facts.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  )}
                  {worksOf(st.id).length > 0 && worksList(st.id)}
                  {st.id === "birlikte-uretelim" && briefButton()}
                </li>
              ))}
            </ol>
            <p className="zh-note">Üç boyutlu dünya bu cihazda açılamadı; aynı yolculuk, çalışmalar ve brief burada.</p>
          </main>
        )}
      </div>

      {mode === "world" && gate !== "done" && (
        <div className="zh-gate" role="dialog" aria-modal="true" aria-labelledby="zh-gate-h">
          <div className="zh-gate-in">
            <p className="zh-ch">
              <b>00</b> Kapı
            </p>
            <h2 id="zh-gate-h">Her şey bir şarkı kapağıyla başladı.</h2>
            <p className="zh-line">Yedi kısa bölümde yolum. Gerçek işlerimle.</p>
            {gate === "open" ? (
              <div className="zh-gate-acts">
                <button ref={gateBtn} type="button" className="zh-cta" onClick={closeGate}>
                  Hikâyeyi izle <MdArrowForward aria-hidden="true" />
                </button>
                <button type="button" className="zh-more" onClick={() => setGate("list")}>
                  Doğrudan alanlara git
                </button>
              </div>
            ) : (
              <ul className="zh-gate-list">
                {stations.map((st) => (
                  <li key={st.id}>
                    <button
                      type="button"
                      className="zh-area-btn"
                      onClick={() => {
                        closeGate();
                        go(st.id);
                      }}
                    >
                      <b>{st.n}</b> {st.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <a className="zh-gate-site" href="/">
              Siteye geç
            </a>
          </div>
        </div>
      )}

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
