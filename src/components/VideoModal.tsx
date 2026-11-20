import { useEffect } from "react";
import { createPortal } from "react-dom";
import { MdClose } from "react-icons/md";
import { smoother } from "./Navbar";

interface Props {
  src: string;
  title: string;
  onClose: () => void;
}

const VideoModal = ({ src, title, onClose }: Props) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    smoother?.paused(true);
    return () => {
      window.removeEventListener("keydown", onKey);
      smoother?.paused(false);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="video-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className="video-modal-inner" onClick={(e) => e.stopPropagation()}>
        <button
          className="video-modal-close"
          onClick={onClose}
          aria-label="Kapat"
          data-cursor="disable"
          autoFocus
        >
          <MdClose />
        </button>
        <video src={src} controls autoPlay playsInline />
      </div>
    </div>,
    document.body
  );
};

export default VideoModal;
