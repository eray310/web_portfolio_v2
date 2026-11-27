import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdArrowBack, MdClose, MdPlayArrow } from "react-icons/md";
import type { Brand } from "../data/brands";
import type { BrandVideo } from "../data/brandVideos";
import { lockScroll, unlockScroll } from "./utils/scrollLock";

const url = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

// Silent hover previews only for a real mouse and when motion is welcome.
const canHoverPreview = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const FOCUSABLE = "button, video[controls]";

type Props = { brand: Brand; videos: BrandVideo[]; onClose: () => void };

const BrandGallery = ({ brand, videos, onClose }: Props) => {
  // One video: it is shown at once (no list, no way back to a list). Several: covers first.
  const single = videos.length === 1;
  const [playing, setPlaying] = useState<BrandVideo | null>(single ? videos[0] : null);
  const [hover, setHover] = useState<number | null>(null);
  // Shapes read from the cover images when the data file gives no ratio.
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [playerRatio, setPlayerRatio] = useState<number | undefined>();
  const [previewOk] = useState(canHoverPreview);
  const dialog = useRef<HTMLDivElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  // The card whose video is playing, so the focus can go back to it from the player.
  const lastCard = useRef<number | null>(null);

  useEffect(() => {
    lockScroll();
    return unlockScroll;
  }, []);

  // A video that leaves the window (another video, back to the list, window closed) stops at
  // once, sound included, and stops downloading. Opened again, it starts from the beginning.
  useEffect(() => {
    const v = player.current;
    if (!v) return;
    return () => {
      v.pause();
      v.removeAttribute("src");
      v.load();
    };
  }, [playing]);

  // Back from the player: the focus returns to the cover that was opened.
  useEffect(() => {
    if (playing || lastCard.current === null) return;
    dialog.current?.querySelectorAll<HTMLElement>(".bg-card")[lastCard.current]?.focus();
  }, [playing]);

  // Esc closes the window; Tab stays inside it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Tab" && dialog.current) {
        const items = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        const outside = !dialog.current.contains(active);
        if (e.shiftKey && (active === first || outside)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || outside)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ratioOf = (v: BrandVideo) => v.ratio ?? ratios[v.poster] ?? 9 / 16;

  const open = (v: BrandVideo, i: number) => {
    lastCard.current = i;
    setHover(null);
    setPlayerRatio(v.ratio ?? ratios[v.poster]);
    setPlaying(v);
  };

  const playerWidth = playerRatio
    ? `min(100%, calc((var(--vh, 100vh) - 190px) * ${playerRatio}))`
    : undefined;

  return createPortal(
    <div
      className="bg-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`${brand.name} videoları`}
      onClick={onClose}
    >
      <div className="bg-panel" ref={dialog} onClick={(e) => e.stopPropagation()}>
        <div className="bg-head">
          {playing && !single ? (
            <button
              className="bg-back"
              onClick={() => setPlaying(null)}
              data-cursor="disable"
              autoFocus
            >
              <MdArrowBack /> {brand.name}
            </button>
          ) : (
            <h3>{brand.name}</h3>
          )}
          <button
            className="bg-close"
            onClick={onClose}
            aria-label="Kapat"
            data-cursor="disable"
            autoFocus={!playing || single}
          >
            <MdClose />
          </button>
        </div>

        {playing ? (
          <div className="bg-player" style={playerWidth ? { width: playerWidth } : undefined}>
            <video
              key={playing.video}
              ref={player}
              src={url(playing.video)}
              poster={url(playing.poster)}
              controls
              autoPlay
              playsInline
              onLoadedMetadata={(e) =>
                setPlayerRatio(e.currentTarget.videoWidth / e.currentTarget.videoHeight)
              }
            />
            <p className="bg-player-title">{playing.title}</p>
          </div>
        ) : videos.length === 0 ? (
          <p className="bg-empty">Bu markaya ait videolar yakında eklenecek</p>
        ) : (
          <ul className="bg-grid">
            {videos.map((v, i) => {
              const showPreview = previewOk && hover === i && !!v.preview;
              return (
                <li key={v.video} style={{ aspectRatio: ratioOf(v) }}>
                  <button
                    className="bg-card"
                    onClick={() => open(v, i)}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                    aria-label={`${v.title} videosunu oynat`}
                    data-cursor="disable"
                  >
                    <img
                      src={url(v.poster)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      onLoad={(e) => {
                        const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                        if (w && h)
                          setRatios((r) => (r[v.poster] ? r : { ...r, [v.poster]: w / h }));
                      }}
                    />
                    {showPreview && (
                      <video
                        className="bg-preview"
                        src={url(v.preview!)}
                        muted
                        loop
                        playsInline
                        autoPlay
                        preload="auto"
                        aria-hidden="true"
                      />
                    )}
                    <span className="bg-play" aria-hidden="true">
                      <MdPlayArrow />
                    </span>
                    <span className="bg-title">{v.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>,
    document.body
  );
};

export default BrandGallery;
