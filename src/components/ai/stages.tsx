import { useEffect, useRef, useState } from "react";
import { MdPlayArrow } from "react-icons/md";
import { prefersReducedMotion } from "../../utils/motion";
import type { AiStage } from "../../data/aiWorks";
import { spaceBus } from "./spaceBus";
import { useActive } from "./useActive";
import { videoBudget } from "./videoBudget";
import "../styles/AiStages.css";

/**
 * The live explanations of /ai-isler: one short loop for each service.
 *
 * Every loop has an entrance, a development and a settling moment, then waits long enough to be
 * read and returns softly to the start. A loop runs only while its section is on screen and the tab
 * is visible; with "Hareketi azalt" it does not run at all and shows its finished composition.
 *
 * They are pictures: nothing inside a loop takes the keyboard focus or answers a click (the one real
 * control, "Tam videoyu aç", is an ordinary button). For a screen reader each loop is one figure
 * with a short text that says what it shows.
 */

const url = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

type Web = Extract<AiStage, { kind: "web" }>;
type Vid = Extract<AiStage, { kind: "video" }>;

/** Web Sitesi: a short demonstration of the real site (see the comment in AiStages.css). */
export const WebStage = ({ s }: { s: Web }) => {
  const ref = useRef<HTMLDivElement>(null);
  const motion = useRef(!prefersReducedMotion()).current;
  const active = useActive(ref, 0.3);
  return (
    <figure className="st-fig">
      <div ref={ref} className={`st-web${motion ? " is-motion" : ""}${active ? " is-live" : ""}`} aria-hidden="true">
        <div className="st-browser">
          <div className="st-bar">
            <i />
            <i />
            <i />
            <span>erayomeroglu.com</span>
          </div>
          <div className="st-view">
            {s.desktop.map((d, i) => (
              <img key={d.src} className={`st-page st-page-${i + 1}`} src={url(d.src)} alt="" loading="lazy" decoding="async" draggable={false} />
            ))}
            <i className="st-cur" />
            <i className="st-rip r1" />
            <i className="st-rip r2" />
          </div>
        </div>
        <div className="st-phone">
          <div className="st-pview">
            {s.phone.map((d, i) => (
              <img key={d.src} className={`st-ppage st-ppage-${i + 1}`} src={url(d.src)} alt="" loading="lazy" decoding="async" draggable={false} />
            ))}
          </div>
        </div>
      </div>
      <figcaption>
        <span className="ai-sr">{s.summary}</span>
        {s.caption}
      </figcaption>
    </figure>
  );
};

/**
 * Reklam Filmi ve Video: a short silent preview of a real work, with the three stages of the job as a
 * timeline underneath. "Tam videoyu aç" opens the whole video with its own controls.
 */
export const VideoStage = ({ s, id }: { s: Vid; id: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const full = useRef<HTMLVideoElement>(null);
  const head = useRef<HTMLSpanElement>(null);
  const motion = useRef(!prefersReducedMotion()).current;
  const active = useActive(ref, 0.35);
  const [open, setOpen] = useState(false);

  // The preview plays only while it is on screen, the tab is visible and no full video is open.
  useEffect(() => {
    const v = vid.current;
    if (!v || !motion || open) return;
    if (!active) {
      v.pause();
      return;
    }
    videoBudget.claim(id);
    void v.play().catch(() => {});
    return () => v.pause();
  }, [active, motion, open, id]);

  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    return videoBudget.register(id, () => v.pause());
  }, [id]);

  // The playhead follows the preview (one cheap frame callback, only while it plays).
  useEffect(() => {
    const v = vid.current;
    const h = head.current;
    if (!v || !h || !motion || !active || open) return;
    let raf = 0;
    const tick = () => {
      const p = v.duration ? v.currentTime / v.duration : 0;
      h.style.left = `${(p * 100).toFixed(2)}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, motion, open]);

  // An open player calms the space background and takes the keyboard focus into its own controls.
  useEffect(() => {
    if (open) full.current?.focus();
    spaceBus.playerOpen = open;
    return () => {
      spaceBus.playerOpen = false;
    };
  }, [open]);

  return (
    <figure className="st-fig">
      <div ref={ref} className="st-video">
        <div className="st-vframe" style={{ aspectRatio: String(s.ratio) }}>
          {open ? (
            <video ref={full} src={url(s.src)} poster={url(s.poster)} controls autoPlay playsInline preload="none" aria-label={s.caption} />
          ) : (
            <video ref={vid} src={url(s.preview)} poster={url(s.poster)} muted loop playsInline preload={motion ? "metadata" : "none"} aria-hidden="true" tabIndex={-1} />
          )}
        </div>
        {/* The button sits under the picture, so it never covers the words inside the clip */}
        {!open && (
          <button
            type="button"
            className="st-open"
            onClick={() => {
              videoBudget.claim(id + "-full");
              setOpen(true);
            }}
            data-cursor="disable"
          >
            <MdPlayArrow aria-hidden="true" />
            <span>Tam videoyu aç</span>
            <span className="ai-sr">: {s.caption}</span>
          </button>
        )}
        <div className="st-timeline" aria-hidden="true">
          <div className="st-track">
            <b>Konsept</b>
            <b>Görsel</b>
            <b>Kurgu</b>
            {motion && !open && <span ref={head} className="st-head" />}
          </div>
        </div>
      </div>
      <figcaption>
        <span className="ai-sr">{s.summary}</span>
        {s.caption}
      </figcaption>
    </figure>
  );
};
