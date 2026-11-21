import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MdClose } from "react-icons/md";
import { lockScroll, unlockScroll } from "./utils/scrollLock";

interface Props {
  src: string;
  title: string;
  /** Shape of the video (width / height) if already known. */
  ratio?: number;
  onClose: () => void;
}

const VideoModal = ({ src, title, ratio: knownRatio, onClose }: Props) => {
  const [ratio, setRatio] = useState<number | undefined>(knownRatio);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    lockScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [onClose]);

  // The player is as wide as the video's own shape allows: a vertical video
  // gets a narrow player that fits the screen height, a horizontal one a wide one.
  const width = ratio
    ? `min(1100px, 100%, calc((var(--vh, 100vh) - 130px) * ${ratio}))`
    : undefined;

  return createPortal(
    <div
      className="video-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="video-modal-inner"
        style={width ? { width } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="video-modal-close"
          onClick={onClose}
          aria-label="Kapat"
          data-cursor="disable"
          autoFocus
        >
          <MdClose />
        </button>
        <video
          src={src}
          controls
          autoPlay
          playsInline
          onLoadedMetadata={(e) =>
            setRatio(e.currentTarget.videoWidth / e.currentTarget.videoHeight)
          }
        />
      </div>
    </div>,
    document.body
  );
};

export default VideoModal;
