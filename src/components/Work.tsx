import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { MdPlayArrow, MdChevronLeft, MdChevronRight } from "react-icons/md";
import ProjectPanel from "./ProjectPanel";
import { scrollToSection } from "./utils/scrollToSection";
import {
  CATEGORIES,
  fileUrl,
  previewUrl,
  projects,
  type Category,
} from "../data/projects";
import "./styles/Work.css";

type Filter = "all" | Category;

/** Distance between neighbouring cards, as a share of the card width. */
const STEP = 0.82;

const pad = (n: number) => String(n).padStart(2, "0");
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Silent hover previews only for a real mouse and when motion is welcome.
const canPreview = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const Work = () => {
  const [filter, setFilter] = useState<Filter>("all");
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0); // drag distance in card steps
  const [dragging, setDragging] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hot, setHot] = useState<number | null>(null); // card under the mouse
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [previewOk] = useState(canPreview);

  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useRef(false);
  const gesture = useRef({
    id: -1,
    startX: 0,
    lastX: 0,
    lastT: 0,
    vel: 0,
    moved: false,
    suppressClick: false,
  });

  const visible = useMemo(
    () =>
      filter === "all"
        ? projects
        : projects.filter((p) => p.categories.includes(filter)),
    [filter]
  );
  const count = visible.length;
  const current = visible[index];

  const goTo = useCallback(
    (i: number) => setIndex(clamp(i, 0, Math.max(0, count - 1))),
    [count]
  );
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setIndex((i) => Math.min(count - 1, i + 1)),
    [count]
  );

  const chooseFilter = (f: Filter) => {
    setFilter(f);
    setIndex(0);
    setDrag(0);
    setPreviewKey(null);
    setHot(null);
  };

  // Left / right arrow keys move the gallery while it is on screen and nothing is open.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => (inView.current = entry.isIntersecting),
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panelOpen || !inView.current) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen, prev, next]);

  // ── Horizontal drag. Vertical moves are left to the browser (touch-action: pan-y).
  const stepPx = () => {
    const card = stageRef.current?.querySelector<HTMLElement>(".work-card");
    return (card ? card.offsetWidth : 240) * STEP;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const g = gesture.current;
    g.id = e.pointerId;
    g.startX = g.lastX = e.clientX;
    g.lastT = e.timeStamp;
    g.vel = 0;
    g.moved = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (e.pointerId !== g.id) return;
    const dx = e.clientX - g.startX;
    if (!g.moved) {
      if (Math.abs(dx) < 6) return;
      g.moved = true;
      setDragging(true);
      setPreviewKey(null);
      setHot(null);
      stageRef.current?.setPointerCapture(e.pointerId);
    }
    const dt = Math.max(1, e.timeStamp - g.lastT);
    g.vel = (e.clientX - g.lastX) / dt;
    g.lastX = e.clientX;
    g.lastT = e.timeStamp;
    // The finger moves the cards; a little resistance past either end.
    const pos = clamp(index - dx / stepPx(), -0.35, count - 0.65);
    setDrag(index - pos);
  };

  const endDrag = (e: React.PointerEvent, cancelled: boolean) => {
    const g = gesture.current;
    if (e.pointerId !== g.id) return;
    g.id = -1;
    if (!g.moved) return;
    const pos = index - drag;
    const flick = cancelled ? 0 : clamp((-g.vel / stepPx()) * 180, -0.8, 0.8);
    setIndex(clamp(Math.round(pos + flick), 0, count - 1));
    setDrag(0);
    setDragging(false);
    // The card under the cursor comes forward once the drag is over (mouse only).
    if (e.pointerType === "mouse" && !cancelled) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const idx = el?.closest<HTMLElement>(".work-card")?.dataset.i;
      setHot(idx === undefined ? null : Number(idx));
    }
    // The click that follows a drag must not open a card.
    g.suppressClick = true;
    window.setTimeout(() => (g.suppressClick = false), 0);
  };

  const openCard = (i: number) => {
    if (gesture.current.suppressClick) return;
    goTo(i);
    setPreviewKey(null);
    setPanelOpen(true);
  };

  const closePanel = useCallback(() => setPanelOpen(false), []);
  const contact = () => {
    setPanelOpen(false);
    // Let the panel release the scroll lock before the page moves.
    window.setTimeout(() => scrollToSection("#contact"), 60);
  };

  return (
    <div className="work-section" id="work" ref={sectionRef}>
      <div className="work-container section-container">
        <h2>
          Seçili <span>İşler</span>
        </h2>

        <div className="work-gallery">
          <div className="work-filters" role="group" aria-label="Proje kategorileri">
            {(["all", ...CATEGORIES] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                className="work-filter"
                aria-pressed={filter === f}
                onClick={() => chooseFilter(f)}
                data-cursor="disable"
              >
                {f === "all" ? "Tümü" : f}
              </button>
            ))}
          </div>

          <div className="work-stage-wrap">
            {count === 0 ? (
              <p className="work-empty">Bu kategoride henüz proje yok.</p>
            ) : (
              <div
                key={filter}
                ref={stageRef}
                className={"work-stage" + (dragging ? " dragging" : "")}
                tabIndex={0}
                role="group"
                aria-roledescription="galeri"
                aria-label="Seçili işler"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={(e) => endDrag(e, false)}
                onPointerCancel={(e) => endDrag(e, true)}
              >
                {visible.map((project, i) => {
                  const o = i - index + drag;
                  const a = Math.abs(o);
                  const side = clamp(o, -1, 1);
                  const far = clamp(a - 1, 0, 1);
                  const isHot = hot === i && !dragging;
                  const scale =
                    1 - Math.min(a, 1) * 0.13 - far * 0.07 + (isHot ? 0.035 : 0);
                  const isActive = a < 0.5;
                  const poster = project.poster && fileUrl(project.poster);
                  const showPreview =
                    previewOk && isActive && !dragging && previewKey === project.video;
                  return (
                    <button
                      key={project.video}
                      type="button"
                      className={
                        "work-card" + (isActive ? " is-active" : "") + (isHot ? " is-hot" : "")
                      }
                      data-i={i}
                      style={
                        {
                          transform: `translateX(-50%) translateX(${o * STEP * 100}%) rotateY(${-side * 17}deg) scale(${scale})`,
                          zIndex: isHot ? 30 : 20 - Math.round(a * 4),
                          opacity: a > 2.7 ? 0 : 1 - far * 0.2,
                          pointerEvents: a > 2.7 ? "none" : undefined,
                          "--dim":
                            Math.min(a, 1) * 0.38 +
                            (hot !== null && !isHot && !dragging ? 0.14 : 0),
                          "--poster": poster ? `url("${poster}")` : "none",
                        } as React.CSSProperties
                      }
                      tabIndex={isActive ? 0 : -1}
                      aria-label={`${project.title} proje detayını aç`}
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => openCard(i)}
                      onPointerEnter={(e) => {
                        if (e.pointerType === "mouse" && e.buttons === 0 && !dragging) setHot(i);
                        if (previewOk && isActive && e.buttons === 0) setPreviewKey(project.video);
                      }}
                      onPointerMove={(e) =>
                        previewOk &&
                        isActive &&
                        !dragging &&
                        e.buttons === 0 &&
                        setPreviewKey(project.video)
                      }
                      onPointerLeave={() => {
                        setPreviewKey(null);
                        setHot((h) => (h === i ? null : h));
                      }}
                      data-cursor="disable"
                    >
                      {poster ? (
                        <img
                          src={poster}
                          alt=""
                          loading={i < 3 ? "eager" : "lazy"}
                          decoding="async"
                          draggable={false}
                        />
                      ) : (
                        <video
                          src={`${fileUrl(project.video)}#t=0.1`}
                          preload="metadata"
                          muted
                          playsInline
                          draggable={false}
                        />
                      )}
                      {showPreview && (
                        <video
                          className="work-preview"
                          src={previewUrl(project)}
                          muted
                          loop
                          autoPlay
                          playsInline
                          preload="auto"
                          draggable={false}
                          onPlaying={(e) => e.currentTarget.classList.add("on")}
                        />
                      )}
                      <span className="work-card-info">
                        <span className="work-card-cats">
                          {project.categories.join(" · ")}
                        </span>
                        <span className="work-card-title">{project.title}</span>
                      </span>
                      <span className="work-play" aria-hidden="true">
                        <MdPlayArrow />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="work-controls">
            <span className="work-counter" aria-live="polite">
              {count ? `${pad(index + 1)} / ${pad(count)}` : "00 / 00"}
            </span>
            <div className="work-arrows">
              <button
                type="button"
                onClick={prev}
                disabled={index <= 0}
                aria-label="Önceki proje"
                data-cursor="disable"
              >
                <MdChevronLeft />
              </button>
              <button
                type="button"
                onClick={next}
                disabled={index >= count - 1}
                aria-label="Sonraki proje"
                data-cursor="disable"
              >
                <MdChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>

      {panelOpen && current && (
        <ProjectPanel
          project={current}
          position={index + 1}
          total={count}
          onPrev={index > 0 ? prev : undefined}
          onNext={index < count - 1 ? next : undefined}
          onContact={contact}
          onClose={closePanel}
        />
      )}
    </div>
  );
};

export default Work;
