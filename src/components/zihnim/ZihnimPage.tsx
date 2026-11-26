import { useCallback, useEffect, useRef, useState } from "react";
import { MdClose, MdOpenInNew, MdPause, MdPlayArrow, MdArrowBack } from "react-icons/md";
import { prefersReducedMotion } from "../../utils/motion";
import { hasWebGL } from "../../utils/webgl";
import { areaById, readyAreas, type Area, type AreaId } from "./zihnimWorld";
import type { SceneApi } from "./ZihnimScene";
import "./zihnim.css";

/**
 * /zihnim: "Eray'ın Zihni", the first working prototype (a design preview; no link to it from the site).
 *
 * The page is HTML: title, short instructions, the place buttons, the panels. The world is one canvas
 * (ZihnimScene.ts). Everything the canvas offers is also reachable without it: the place buttons work with the
 * keyboard, and without WebGL (or if the world fails to load) a static map and the same panels are shown.
 */
const MAP_SPOTS: Record<string, [number, number]> = { "gorsel-hafiza": [92, 86], "kurgu-masasi": [308, 120], "deney-alani": [200, 190] };

const StaticMap = ({ selected, onPick }: { selected: AreaId | null; onPick: (id: AreaId) => void }) => (
  <svg className="zh-map" viewBox="0 0 400 260" role="group" aria-label="Eray'ın Zihni haritası: iki lob, ortada Fikir Çekirdeği, üç alan">
    <g fill="none" stroke="#dbe8ff" strokeLinecap="round" strokeOpacity="0.7" strokeWidth="2.4" strokeDasharray="0.1 6">
      <ellipse cx="128" cy="116" rx="104" ry="86" />
      <ellipse cx="272" cy="116" rx="104" ry="86" />
      <ellipse cx="200" cy="112" rx="22" ry="20" strokeOpacity="0.95" />
      <path d="M200 132 Q 200 160 200 188" strokeOpacity="0.5" />
      <path d="M186 106 Q 140 96 98 90" strokeOpacity="0.5" />
      <path d="M214 106 Q 262 112 302 118" strokeOpacity="0.5" />
    </g>
    {readyAreas.map((a) => {
      const [x, y] = MAP_SPOTS[a.id];
      return (
        <g key={a.id} className={selected === a.id ? "is-on" : ""}>
          <circle cx={x} cy={y} r="8" fill={selected === a.id ? "#5eead4" : "#dbe8ff"} />
          <text x={x} y={y + 26} textAnchor="middle" fill="#eae5ec" fontSize="13">
            {a.title}
          </text>
          <rect x={x - 54} y={y - 14} width="108" height="48" fill="transparent" onClick={() => onPick(a.id)} style={{ cursor: "pointer" }} />
        </g>
      );
    })}
    <text x="200" y="146" textAnchor="middle" fill="#eae5ec" fontSize="11" opacity="0.8">
      Fikir Çekirdeği
    </text>
  </svg>
);

const Panel = ({ area, onClose }: { area: Area; onClose: () => void }) => {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(false);
  const vid = useRef<HTMLVideoElement>(null);
  const c = area.content;
  // a hidden tab pauses the video (it is not resumed by itself)
  useEffect(() => {
    const on = () => {
      if (document.hidden) vid.current?.pause();
    };
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="zh-panel-wrap">
      <section className="zh-panel" role="dialog" aria-modal="true" aria-labelledby="zh-panel-h">
        <header>
          <div>
            <h2 id="zh-panel-h">{area.title}</h2>
            <p>{area.tagline}</p>
          </div>
          <button ref={closeBtn} type="button" className="zh-close" onClick={onClose} aria-label={`${area.title} panelini kapat`}>
            <MdClose aria-hidden="true" />
            <span>Kapat</span>
          </button>
        </header>
        <div className="zh-panel-body">
          {c?.kind === "gallery" && (
            <>
              <p className="zh-intro">{c.intro}</p>
              <ul className="zh-grid">
                {c.items.map((it) => (
                  <li key={it.title}>
                    {it.image && <img src={it.image} alt={`${it.title}: kapak karesi`} loading="lazy" decoding="async" />}
                    <strong>{it.title}</strong>
                    {it.tag && <small>{it.tag}</small>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {c?.kind === "video" && (
            <>
              <p className="zh-intro">{c.intro}</p>
              <div className="zh-video">
                {playing ? (
                  <video ref={vid} src={c.src} poster={c.poster} controls autoPlay playsInline aria-label={c.title} />
                ) : (
                  <>
                    <img src={c.poster} alt={`${c.title}: kapak karesi`} decoding="async" />
                    <button type="button" className="zh-play" onClick={() => setPlaying(true)}>
                      <MdPlayArrow aria-hidden="true" />
                      <span>Videoyu oynat</span>
                    </button>
                  </>
                )}
              </div>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
              <p className="zh-note">{c.note}</p>
            </>
          )}
          {c?.kind === "links" && (
            <>
              <p className="zh-intro">{c.intro}</p>
              <ul className="zh-links">
                {c.items.map((it) => (
                  <li key={it.title}>
                    <h3>{it.title}</h3>
                    <p>{it.text}</p>
                    <a href={it.href}>
                      {it.label} <MdOpenInNew aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </>
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
  const areaBtns = useRef<Record<string, HTMLElement | null>>({});
  const opener = useRef<HTMLElement | null>(null);
  const reduced = useRef(prefersReducedMotion()).current;
  const [mode, setMode] = useState<"loading" | "world" | "static">(() => (hasWebGL() ? "loading" : "static"));
  const [selected, setSelected] = useState<AreaId | null>(null);
  const [panel, setPanel] = useState<AreaId | null>(null);
  const [paused, setPaused] = useState(false);
  const [menu, setMenu] = useState(false);
  const [say, setSay] = useState("");
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // the world: loaded here, in this page's own chunk; any failure leaves the static map and the same panels
  useEffect(() => {
    if (modeRef.current === "static") return;
    const el = canvas.current;
    if (!el) return;
    let alive = true;
    const light = window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches;
    const timer = window.setTimeout(() => {
      if (alive && modeRef.current === "loading") setMode("static");
    }, 12000);
    import("./ZihnimScene")
      .then(({ createScene }) =>
        createScene({
          canvas: el,
          light,
          reduced,
          alive: () => alive,
          labels: () => labelEls.current,
          onArrive: (id) => {
            if (id) {
              setPanel(id);
              setSay(`${areaById(id)?.title} açıldı.`);
            } else setSay("Genel görünüm.");
          },
          onPick: (id) => pick(id, null),
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
        if (alive) setMode("static");
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

  // a panel (or the video in it) calms the world; the rest of the page cannot be reached while it is open
  useEffect(() => {
    scene.current?.setCalm(panel ? 1 : 0);
    ui.current?.toggleAttribute("inert", !!panel);
  }, [panel, mode]);
  useEffect(() => {
    scene.current?.setPaused(paused);
  }, [paused, mode]);

  const pick = useCallback((id: AreaId, from: HTMLElement | null) => {
    opener.current = from ?? areaBtns.current[id] ?? (document.activeElement as HTMLElement | null);
    setSelected(id);
    setMenu(false);
    if (modeRef.current === "world") {
      setPanel(null);
      setSay(`${areaById(id)?.title} alanına yaklaşılıyor.`);
      scene.current?.flyTo(id);
    } else {
      setPanel(id);
    }
  }, []);
  const overview = useCallback(() => {
    setSelected(null);
    setPanel(null);
    setMenu(false);
    setSay("Genel görünüme dönülüyor.");
    scene.current?.flyTo(null);
  }, []);
  const closePanel = useCallback(() => {
    setPanel(null);
    // on a phone the place buttons live in the menu: open it again so the focus can go back to the button that opened the panel
    const o = opener.current;
    if (o && o.closest("nav") && window.matchMedia("(max-width: 760px)").matches) setMenu(true);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => opener.current?.focus()));
  }, []);

  const area = areaById(panel);

  return (
    <div className="zh" data-mode={mode}>
      <canvas ref={canvas} className={`zh-canvas${panel ? " is-blocked" : ""}`} aria-hidden="true" tabIndex={-1} />
      <div ref={ui} className="zh-ui">
        <header className="zh-top">
          <div className="zh-brand">
            <a className="zh-home" href="/" aria-label="Ana siteye dön">
              <MdArrowBack aria-hidden="true" />
              <span>Ana site</span>
            </a>
            <h1>Eray’ın Zihni</h1>
            <p className="zh-how">Bir alan seç: kamera ona yaklaşır ve içeriği açılır. Fareyle ya da parmağınla sürükleyerek çevreye bakabilirsin.</p>
          </div>
          <button type="button" className="zh-menu-btn" aria-expanded={menu} aria-controls="zh-nav" onClick={() => setMenu((m) => !m)}>
            Alanlar
          </button>
          <nav id="zh-nav" className={menu ? "is-open" : ""} aria-label="Alanlar">
            <ul>
              {readyAreas.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    ref={(e) => {
                      areaBtns.current[a.id] = e;
                    }}
                    className={`zh-area-btn${selected === a.id ? " is-on" : ""}`}
                    aria-pressed={selected === a.id}
                    onClick={(e) => pick(a.id, e.currentTarget)}
                  >
                    {a.title}
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className="zh-area-btn zh-overview" onClick={overview} disabled={!selected && !panel}>
                  Genel görünüm
                </button>
              </li>
            </ul>
          </nav>
          {mode === "world" && (
            <button type="button" className="zh-motion" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
              {paused ? <MdPlayArrow aria-hidden="true" /> : <MdPause aria-hidden="true" />}
              <span>{paused ? "Hareketi başlat" : "Hareketi durdur"}</span>
            </button>
          )}
        </header>

        {mode !== "static" && (
          <div className="zh-labels" aria-hidden="true">
            {readyAreas.map((a) => (
              <button
                key={a.id}
                type="button"
                tabIndex={-1}
                className={`zh-label${selected === a.id ? " is-on" : ""}`}
                ref={(e) => {
                  labelEls.current[a.id] = e;
                }}
                onClick={() => pick(a.id, null)}
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
            <StaticMap selected={selected} onPick={(id) => pick(id, areaBtns.current[id])} />
            <ul className="zh-static-list">
              {readyAreas.map((a) => (
                <li key={a.id}>
                  <h2>{a.title}</h2>
                  <p>{a.tagline}</p>
                  <button type="button" className="zh-area-btn" onClick={(e) => pick(a.id, e.currentTarget)}>
                    Aç
                  </button>
                </li>
              ))}
            </ul>
            <p className="zh-note">Üç boyutlu dünya bu cihazda açılamadı; aynı alanlar ve içerikler burada.</p>
          </main>
        )}

        <footer className="zh-foot">
          {mode === "world" && <span>{selected ? areaById(selected)?.tagline : "Genel görünüm: iki lob, ortada Fikir Çekirdeği ve üç alan."}</span>}
        </footer>
      </div>

      <p className="zh-sr" role="status" aria-live="polite">
        {say}
      </p>
      {area && <Panel area={area} onClose={closePanel} />}
    </div>
  );
};

export default ZihnimPage;
