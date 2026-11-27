import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdClose, MdPlayArrow, MdArrowBack, MdArrowForward } from "react-icons/md";
import { completeStory, fileUrl, FRAME_POINTS, type Project } from "../data/projects";
import { projectInteractions } from "../data/interactive";
import type { CreativeRequest } from "./creative/CreativeHost";
import { lockScroll, unlockScroll } from "./utils/scrollLock";

// Loaded only when a visitor opens an interaction.
const CreativeHost = lazy(() => import("./creative/CreativeHost"));

interface Props {
  project: Project;
  position: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  onContact: () => void;
  onClose: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (s: number) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;

const ProjectPanel = ({
  project,
  position,
  total,
  onPrev,
  onNext,
  onContact,
  onClose,
}: Props) => {
  const sheet = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  // Length of the video in seconds, once the file has told it (for the times on the stills).
  const [length, setLength] = useState(0);
  // Width / height of the video; vertical until the file says otherwise.
  const [ratio, setRatio] = useState(9 / 16);
  // True while the browser has not let the video start by itself.
  const [needsPlay, setNeedsPlay] = useState(false);
  const [creative, setCreative] = useState<CreativeRequest | null>(null);
  const closeCreative = useCallback(() => setCreative(null), []);
  const extra = projectInteractions[project.title];

  useEffect(() => {
    lockScroll();
    return unlockScroll;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !sheet.current) return;
      // Keep Tab inside the panel.
      const items = Array.from(
        sheet.current.querySelectorAll<HTMLElement>('button, [href], video[controls], [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.hasAttribute("disabled"));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // A new project starts at the top of the panel and tries to play at once.
  useEffect(() => {
    sheet.current?.scrollTo(0, 0);
    body.current?.scrollTo(0, 0);
    setNeedsPlay(false);
    setLength(0);
    const v = video.current;
    if (!v) return;
    v.play().catch(() => setNeedsPlay(true));
  }, [project]);

  const poster = project.poster && fileUrl(project.poster);

  // Only the facts that are known; an empty one has no row.
  const facts = (
    [
      ["Müşteri", project.client],
      ["Süre", project.duration],
      ["Format", project.format],
      ["Yıl", project.year],
    ] as const
  ).filter(([, value]) => value && value.trim());

  // A still was clicked: the video jumps to that moment and plays from there.
  const seek = (share: number) => {
    const v = video.current;
    if (!v) return;
    const go = () => {
      v.currentTime = v.duration * share;
      v.play().catch(() => setNeedsPlay(true));
    };
    if (Number.isFinite(v.duration) && v.duration > 0) go();
    else v.addEventListener("loadedmetadata", go, { once: true });
  };

  return createPortal(
    <div className="project-panel-backdrop" onClick={onClose}>
      <div
        className="project-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-panel-title"
        ref={sheet}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="project-panel-close"
          onClick={onClose}
          aria-label="Kapat"
          data-cursor="disable"
          autoFocus
        >
          <MdClose />
        </button>

        <div
          className="project-panel-player"
          style={
            {
              "--ratio": ratio,
              "--poster": poster ? `url("${poster}")` : "none",
            } as React.CSSProperties
          }
        >
          <video
            key={project.video}
            ref={video}
            src={fileUrl(project.video)}
            poster={poster || undefined}
            controls
            playsInline
            preload="auto"
            controlsList="nodownload"
            onLoadedMetadata={(e) => {
              const { videoWidth: w, videoHeight: h, duration } = e.currentTarget;
              if (w && h) setRatio(w / h);
              if (Number.isFinite(duration)) setLength(duration);
            }}
            onPlay={() => setNeedsPlay(false)}
          />
          {needsPlay && (
            <button
              type="button"
              className="project-panel-play"
              aria-label="Videoyu oynat"
              onClick={() => video.current?.play().catch(() => {})}
              data-cursor="disable"
            >
              <MdPlayArrow />
            </button>
          )}
        </div>

        <div className="project-panel-body" ref={body}>
          <p className="project-panel-meta">
            {pad(position)} / {pad(total)} · {project.categories.join(" · ")}
          </p>
          <h3 id="project-panel-title">{project.title}</h3>

          {facts.length > 0 && (
            <dl className="project-panel-facts">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {project.frames && project.frames.length > 0 && (
            <ul className="project-panel-frames" aria-label="Videodan kareler">
              {project.frames.map((frame, i) => {
                const share = FRAME_POINTS[i] ?? 0;
                const at = length ? clock(length * share) : null;
                return (
                  <li key={frame}>
                    <button
                      type="button"
                      onClick={() => seek(share)}
                      aria-label={at ? `Videoyu ${at} anından oynat` : `Videoyu ${i + 1}. kareden oynat`}
                      data-cursor="disable"
                    >
                      <img src={fileUrl(frame)} alt="" loading="lazy" decoding="async" draggable={false} />
                      {at && (
                        <span className="project-panel-frame-time" aria-hidden="true">
                          {at}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <section>
            <h4>Proje Özeti</h4>
            <p>{project.description}</p>
          </section>

          {completeStory(project) && (
            <section className="project-panel-story">
              <h4>Proje Hikâyesi</h4>
              <dl>
                <dt>Projenin odağı</dt>
                <dd>{completeStory(project)!.focus}</dd>
                <dt>Katkım</dt>
                <dd>{completeStory(project)!.did}</dd>
                <dt>Teslim</dt>
                <dd>{completeStory(project)!.delivered}</dd>
              </dl>
            </section>
          )}

          {project.contribution && project.contribution.length > 0 && (
            <section>
              <h4>Benim Katkım</h4>
              <ul>
                {project.contribution.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {extra && (
            <div className="project-panel-play-with">
              {extra.layers && (
                <button type="button" onClick={() => setCreative({ kind: "layers", spec: extra.layers! })} data-cursor="disable">
                  Kareyi aç
                </button>
              )}
              {extra.gravity && (
                <button type="button" onClick={() => setCreative({ kind: "gravity", spec: extra.gravity! })} data-cursor="disable">
                  Projeyi keşfet
                </button>
              )}
            </div>
          )}

          <div className="project-panel-actions">
            <button
              type="button"
              className="project-panel-contact"
              onClick={onContact}
              data-cursor="disable"
            >
              Benzer bir proje konuşalım
            </button>
          </div>

          <div className="project-panel-nav">
            <button type="button" onClick={onPrev} disabled={!onPrev} data-cursor="disable">
              <MdArrowBack /> Önceki Proje
            </button>
            <button type="button" onClick={onNext} disabled={!onNext} data-cursor="disable">
              Sonraki Proje <MdArrowForward />
            </button>
          </div>
        </div>
      </div>
      {creative && (
        <Suspense fallback={null}>
          <CreativeHost request={creative} onClose={closeCreative} />
        </Suspense>
      )}
    </div>,
    document.body
  );
};

export default ProjectPanel;
