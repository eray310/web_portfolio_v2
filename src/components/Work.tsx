import { lazy, Suspense, useState, useCallback, useEffect, useMemo, useRef } from "react";
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
import { projectInteractions } from "../data/interactive";
import type { CreativeRequest } from "./creative/CreativeHost";
import GraphicGrid from "./GraphicGrid";
import "./styles/Work.css";

// Loaded only when a visitor opens an interaction.
const CreativeHost = lazy(() => import("./creative/CreativeHost"));

/** A press that moves less than this (mouse) still counts as a click: hands jitter. */
const DRAG_START_MOUSE = 12;
const DRAG_START_TOUCH = 8;

type Filter = "all" | Category;

/** Distance between neighbouring cards, as a share of the card width. */
const STEP = 0.82;
/** Wheel travel (in pixels) that counts as one deliberate step. */
const WHEEL_STEP = 50;
/** After a card change the wheel is ignored this long, so a fast spin cannot skip cards. */
const WHEEL_LOCK_MS = 450;
/** Wheel events closer together than this belong to one gesture (spin or trackpad swipe). */
const WHEEL_GESTURE_GAP_MS = 180;
/** Inside one gesture, another card needs at least this much travel in a single event. */
const WHEEL_FRESH_DELTA = 60;

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
  // "Grafik Tasarım": image-only works without video, shown as a plain grid instead of the gallery
  const [graphic, setGraphic] = useState(false);
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0); // drag distance in card steps
  const [dragging, setDragging] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hot, setHot] = useState<number | null>(null); // card under the mouse
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [previewOk] = useState(canPreview);
  // Card transforms captured at the moment of a press, so nothing moves under the pointer.
  const [frozen, setFrozen] = useState<string[] | null>(null);
  const [creative, setCreative] = useState<CreativeRequest | null>(null);
  const closeCreative = useCallback(() => setCreative(null), []);
  const wasOpen = useRef(false);

  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0); // index - drag, kept current between renders
  const gesture = useRef({
    id: -1,
    startX: 0,
    startPos: 0,
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
  posRef.current = index - drag;
  const current = visible[index];
  const exploreSpec = current ? projectInteractions[current.title]?.gravity : undefined;

  // Keep the keyboard focus on the card that is in the middle. Without this, after the
  // arrow keys the focus stays on the card that moved away and Enter opens that one.
  useEffect(() => {
    const st = stageRef.current;
    const ae = document.activeElement as HTMLElement | null;
    if (!st || !ae || !st.contains(ae) || !ae.classList.contains("work-card")) return;
    const active = st.querySelector<HTMLElement>(".work-card.is-active");
    if (active && active !== ae) active.focus({ preventScroll: true });
  }, [index]);

  // When the detail panel closes, the focus goes back to the card in the middle.
  useEffect(() => {
    if (wasOpen.current && !panelOpen) {
      stageRef.current?.querySelector<HTMLElement>(".work-card.is-active")?.focus({ preventScroll: true });
    }
    wasOpen.current = panelOpen;
  }, [panelOpen]);

  // Latest values for the native wheel listener below.
  const live = useRef({ index: 0, count: 0, panelOpen: false });
  live.current = { index, count, panelOpen };

  const goTo = useCallback(
    (i: number) => setIndex(clamp(i, 0, Math.max(0, count - 1))),
    [count]
  );
  const prev = useCallback(() => {
    setDrag(0);
    setIndex((i) => Math.max(0, i - 1));
  }, []);
  const next = useCallback(() => {
    setDrag(0);
    setIndex((i) => Math.min(count - 1, i + 1));
  }, [count]);

  const chooseFilter = (f: Filter) => {
    setGraphic(false);
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
      if (panelOpen || creative || !inView.current) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      // Keys typed inside a dialog belong to the dialog.
      if (t?.closest('[role="dialog"]')) return;
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if ((e.key === "Home" || e.key === "End") && stageRef.current?.contains(t)) {
        // First / last card, only while the gallery itself has the focus.
        e.preventDefault();
        setIndex(e.key === "Home" ? 0 : count - 1);
        setDrag(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen, creative, prev, next, count]);

  // Mouse wheel over the gallery: down = next card, up = previous card. One card
  // per step, whatever the spin speed. At either end the wheel goes to the page.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const w = {
      lastT: -1e9, // time of the previous wheel event
      lockUntil: 0, // no card change before this time
      acc: 0, // travel gathered towards the next step
      dir: 0,
      owned: false, // this gesture belongs to the gallery
      passThrough: false, // this gesture belongs to the page
      fresh: true, // the next step needs no extra push
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return; // pinch zoom etc.
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX) || e.deltaY === 0) return;
      const { index: i, count: n, panelOpen: open } = live.current;
      if (open || n < 2) return;

      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const dy = e.deltaY * unit;
      const dir = dy > 0 ? 1 : -1;
      const now = e.timeStamp;
      const sameGesture = now - w.lastT < WHEEL_GESTURE_GAP_MS;
      w.lastT = now;
      if (!sameGesture) {
        w.owned = false;
        w.passThrough = false;
        w.fresh = true;
        w.acc = 0;
      }
      if (dir !== w.dir) {
        w.acc = 0;
        w.dir = dir;
      }

      // A gesture that started on the page keeps scrolling the page.
      if (w.passThrough) return;

      const canMove = dir > 0 ? i < n - 1 : i > 0;
      if (!canMove) {
        // At the end: the page scrolls, unless this very gesture was just moving the
        // gallery (then its remaining spin is absorbed so the page does not lurch).
        if (w.owned || now < w.lockUntil) e.preventDefault();
        else w.passThrough = true;
        return;
      }

      e.preventDefault();
      w.owned = true;
      if (now < w.lockUntil) return;
      w.acc += dy;
      if (Math.abs(w.acc) < WHEEL_STEP) return;
      if (!w.fresh && Math.abs(dy) < WHEEL_FRESH_DELTA) return;
      w.acc = 0;
      w.fresh = false;
      w.lockUntil = now + WHEEL_LOCK_MS;
      setDrag(0);
      setIndex(dir > 0 ? i + 1 : i - 1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Horizontal drag. Vertical moves are left to the browser (touch-action: pan-y).
  const stepPx = () => {
    const card = stageRef.current?.querySelector<HTMLElement>(".work-card");
    return (card ? card.offsetWidth : 240) * STEP;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Pressing stops any slide or settle at once: the cards stay exactly where
    // they are drawn, so the card that was pressed is the card that is clicked.
    const cards = stageRef.current?.querySelectorAll<HTMLElement>(".work-card");
    if (cards) setFrozen(Array.from(cards, (c) => getComputedStyle(c).transform));
    const g = gesture.current;
    g.startPos = posRef.current;
    g.id = e.pointerId;
    g.startX = g.lastX = e.clientX;
    g.lastT = e.timeStamp;
    g.vel = 0;
    g.moved = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    // Moving the mouse over the gallery without pressing does nothing.
    if (e.pointerId !== g.id) return;
    const dx = e.clientX - g.startX;
    if (!g.moved) {
      if (Math.abs(dx) < (e.pointerType === "mouse" ? DRAG_START_MOUSE : DRAG_START_TOUCH)) return;
      g.moved = true;
      setFrozen(null);
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
    const pos = clamp(g.startPos - dx / stepPx(), -0.35, count - 0.65);
    setDrag(index - pos);
  };

  const endDrag = (e: React.PointerEvent, cancelled: boolean) => {
    const g = gesture.current;
    if (e.pointerId !== g.id) return;
    g.id = -1;
    if (!g.moved) {
      // A plain press: let the click go through first, then release the freeze.
      window.setTimeout(() => setFrozen(null), 0);
      return;
    }
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
    setDrag(0);
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
                aria-pressed={!graphic && filter === f}
                onClick={() => chooseFilter(f)}
                data-cursor="disable"
              >
                {f === "all" ? "Tümü" : f}
              </button>
            ))}
            <button type="button" className="work-filter" aria-pressed={graphic} onClick={() => setGraphic(true)} data-cursor="disable">
              Grafik Tasarım
            </button>
          </div>

          {graphic ? (
            <GraphicGrid />
          ) : (
          <>
          <div className="work-stage-wrap" ref={wrapRef}>
            {count === 0 ? (
              <p className="work-empty">Bu kategoride henüz proje yok.</p>
            ) : (
              <div
                key={filter}
                ref={stageRef}
                className={
                  "work-stage" + (dragging ? " dragging" : "") + (frozen ? " frozen" : "")
                }
                tabIndex={0}
                role="group"
                aria-roledescription="galeri"
                aria-label="Seçili işler"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerLeave={() => {
                  // A press that slid out of the gallery without dragging is over.
                  if (gesture.current.id !== -1 && !gesture.current.moved) {
                    gesture.current.id = -1;
                    setFrozen(null);
                  }
                  if (gesture.current.id === -1) setDrag(0);
                }}
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
                          transform:
                            frozen?.[i] ??
                            `translateX(-50%) translateX(${o * STEP * 100}%) rotateY(${-side * 17}deg) scale(${scale})`,
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
            {exploreSpec && (
              <button
                type="button"
                className="work-explore"
                onClick={() => setCreative({ kind: "gravity", spec: exploreSpec })}
                data-cursor="disable"
              >
                Projeyi keşfet
              </button>
            )}
          </div>
          </>
          )}
        </div>
      </div>

      {creative && !panelOpen && (
        <Suspense fallback={null}>
          <CreativeHost request={creative} onClose={closeCreative} />
        </Suspense>
      )}

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
