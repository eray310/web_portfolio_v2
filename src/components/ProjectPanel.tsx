import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdClose, MdPlayArrow, MdArrowBack, MdArrowForward } from "react-icons/md";
import { fileUrl, type Project } from "../data/projects";
import { lockScroll, unlockScroll } from "./utils/scrollLock";

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
  const video = useRef<HTMLVideoElement>(null);
  // Width / height of the video; vertical until the file says otherwise.
  const [ratio, setRatio] = useState(9 / 16);
  // True while the browser has not let the video start by itself.
  const [needsPlay, setNeedsPlay] = useState(false);

  useEffect(() => {
    lockScroll();
    return unlockScroll;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // A new project starts at the top of the panel and tries to play at once.
  useEffect(() => {
    sheet.current?.scrollTo(0, 0);
    setNeedsPlay(false);
    const v = video.current;
    if (!v) return;
    v.play().catch(() => setNeedsPlay(true));
  }, [project]);

  const poster = project.poster && fileUrl(project.poster);

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
              const { videoWidth: w, videoHeight: h } = e.currentTarget;
              if (w && h) setRatio(w / h);
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

        <div className="project-panel-body">
          <p className="project-panel-meta">
            {pad(position)} / {pad(total)} · {project.categories.join(" · ")}
          </p>
          <h3 id="project-panel-title">{project.title}</h3>

          <section>
            <h4>Proje Özeti</h4>
            <p>{project.description}</p>
          </section>

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
    </div>,
    document.body
  );
};

export default ProjectPanel;
