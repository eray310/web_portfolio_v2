import { useCallback, useEffect, useRef, useState } from "react";
import { behindTheScenes as data } from "../data/behindTheScenes";
import "./styles/Career.css";

const url = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SWAP_MS = 950;

const BehindTheScenes = () => {
  const [reduced] = useState(prefersReducedMotion);
  const [revealed, setRevealed] = useState(reduced);
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  // The clip is requested only once the Kurgu step has been opened.
  const [clipAsked, setClipAsked] = useState(false);
  const [clipReady, setClipReady] = useState(false);
  const [playId, setPlayId] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>(0);

  const [idea, visual, edit] = data.steps;
  const isMissing = (path?: string) => !path || missing.includes(path);
  const markMissing = (path: string) =>
    setMissing((m) => (m.includes(path) ? m : [...m, path]));

  // Steps whose file is missing are hidden on the published site and shown
  // as a labelled placeholder on the dev server.
  const dev = import.meta.env.DEV;
  const steps = [
    { kind: "image" as const, step: idea, ok: !isMissing(idea.image) },
    { kind: "image" as const, step: visual, ok: !isMissing(visual.image) },
    { kind: "edit" as const, step: edit, ok: !isMissing(edit.poster) },
  ];
  const shown = steps
    .map((s, i) => ({ ...s, i }))
    .filter((s) => s.ok || dev);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || reduced || revealed) return;
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setRevealed(true);
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, revealed]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const choose = useCallback(
    (i: number) => {
      if (i === active) return;
      setPrev(active);
      setActive(i);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setPrev(null), reduced ? 0 : SWAP_MS);
      if (i === 2) {
        setClipAsked(true);
        setPlayId((n) => n + 1);
      }
    },
    [active, reduced]
  );

  // Nothing to show at all: leave the column out on the published site.
  if (!dev && shown.every((s) => !s.ok)) return null;

  const current = shown.find((s) => s.i === active) ?? shown[0];
  const activeIndex = current ? current.i : 0;
  const rawOk = !isMissing(edit.raw) && !isMissing(edit.final);

  const layerClass = (i: number) =>
    "bts-layer" +
    (i === activeIndex ? " is-active" : prev === i ? " is-prev" : "") +
    (i === activeIndex && prev !== null && !reduced ? " bts-swap" : "");

  const placeholder = (file: string) => (
    <div className="bts-missing">
      <span>Eklenecek dosya</span>
      <code>public/{file}</code>
    </div>
  );

  const renderImageLayer = (i: number, path: string) => (
    <div className={layerClass(i)} key={path} style={{ ["--bg" as string]: `url("${url(path)}")` }}>
      {isMissing(path) ? (
        placeholder(path)
      ) : (
        <img
          src={url(path)}
          alt=""
          decoding="async"
          draggable={false}
          onError={() => markMissing(path)}
        />
      )}
    </div>
  );

  const editLayer = () => {
    const active2 = activeIndex === 2;
    const base = !isMissing(visual.image) ? visual.image : edit.poster;
    const bg = rawOk && edit.raw ? edit.raw : base;
    return (
      <div className={layerClass(2)} key="edit" style={{ ["--bg" as string]: `url("${url(bg)}")` }}>
        {isMissing(edit.poster) ? (
          placeholder(edit.poster)
        ) : rawOk && edit.raw && edit.final ? (
          <>
            <img src={url(edit.raw)} alt="" draggable={false} onError={() => markMissing(edit.raw!)} />
            <div className={`bts-final${active2 && !reduced ? " wipe" : ""}`} key={`w${playId}`}>
              <img src={url(edit.final)} alt="" draggable={false} onError={() => markMissing(edit.final!)} />
            </div>
            {active2 && !reduced && <span className="bts-scan" key={`s${playId}`} aria-hidden="true" />}
          </>
        ) : (
          <>
            <img
              src={url(base)}
              alt=""
              draggable={false}
              onError={() => markMissing(base)}
            />
            {clipAsked && !reduced && (
              <div
                className={`bts-final${clipReady && active2 ? " wipe" : ""}${clipReady ? "" : " is-waiting"}`}
                key={`c${playId}`}
              >
                <img src={url(edit.poster)} alt="" draggable={false} className="bts-final-poster" />
                <video
                  src={url(edit.clip)}
                  poster={url(edit.poster)}
                  muted
                  loop
                  autoPlay
                  playsInline
                  preload="auto"
                  onPlaying={() => setClipReady(true)}
                />
              </div>
            )}
            {active2 && clipReady && !reduced && (
              <span className="bts-scan" key={`s${playId}`} aria-hidden="true" />
            )}
            {reduced && (
              <img src={url(edit.poster)} alt="" draggable={false} className="bts-final-static" />
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="bts" ref={rootRef} aria-labelledby="bts-title">
      <h2 id="bts-title" className="career-title bts-title">
        Bir İşin <span>Perde</span> Arkası
      </h2>
      <p className="bts-project">{data.project}</p>

      <div className={`bts-stage${revealed ? " is-revealed" : ""}`}>
        {renderImageLayer(0, idea.image)}
        {renderImageLayer(1, visual.image)}
        {editLayer()}
      </div>

      <div className="bts-tabs" role="tablist" aria-label="Süreç adımları">
        {shown.map((s, n) => (
          <button
            key={s.step.id}
            type="button"
            role="tab"
            id={`bts-tab-${s.step.id}`}
            aria-selected={s.i === activeIndex}
            aria-controls="bts-note"
            className="bts-tab"
            onClick={() => choose(s.i)}
            data-cursor="disable"
          >
            <span className="bts-tab-n">{String(n + 1).padStart(2, "0")}</span>
            {s.step.title}
          </button>
        ))}
      </div>
      <p
        className="bts-note"
        id="bts-note"
        role="tabpanel"
        aria-labelledby={current ? `bts-tab-${current.step.id}` : undefined}
      >
        {current?.step.note}
      </p>
    </div>
  );
};

export default BehindTheScenes;
