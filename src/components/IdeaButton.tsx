import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdArrowOutward, MdClose } from "react-icons/md";
import { useLoading } from "../context/LoadingProvider";
import { lockScroll, unlockScroll } from "./utils/scrollLock";
import { scrollToSection } from "./utils/scrollToSection";
import "./styles/IdeaButton.css";

const TYPES = ["Reklam Videosu", "Motion Design", "Video Kurgu", "Henüz Net Değil"];

/** Controls the floating button must never sit on top of. */
const AVOID =
  ".work-arrows button, .work-filter, .bts-tab, .career-head, .contact-social, .landing-cta";

/**
 * There is no form service behind this panel (no endpoint, no keys), so it
 * does not send anything and never claims it did. The way to reach me is the
 * İletişim section, which the panel links to.
 */
const IdeaPanel = ({
  onClose,
  onContact,
}: {
  onClose: () => void;
  onContact: () => void;
}) => {
  const sheet = useRef<HTMLDivElement>(null);
  const [type, setType] = useState<string>("");

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
        sheet.current.querySelectorAll<HTMLElement>(
          'button, input, textarea, [href], [tabindex]:not([tabindex="-1"])'
        )
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

  return createPortal(
    <div className="idea-backdrop" onClick={onClose}>
      <div
        className="idea-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="idea-title"
        ref={sheet}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="idea-close"
          onClick={onClose}
          aria-label="Kapat"
          data-cursor="disable"
          autoFocus
        >
          <MdClose />
        </button>
        <h3 id="idea-title">Ne yapmak istiyorsun?</h3>

        <form onSubmit={(e) => e.preventDefault()} noValidate>
          <fieldset className="idea-types">
            <legend>Proje türü</legend>
            {TYPES.map((t) => (
              <label key={t} className={type === t ? "is-on" : ""}>
                <input
                  type="radio"
                  name="idea-type"
                  value={t}
                  checked={type === t}
                  onChange={() => setType(t)}
                />
                {t}
              </label>
            ))}
          </fieldset>

          <label className="idea-field">
            <span>Ad</span>
            <input type="text" name="name" autoComplete="name" />
          </label>
          <label className="idea-field">
            <span>E-posta</span>
            <input type="email" name="email" autoComplete="email" />
          </label>
          <label className="idea-field">
            <span>Kısa proje özeti</span>
            <textarea name="summary" rows={3} />
          </label>
          <label className="idea-field">
            <span>
              Referans bağlantısı <em>(isteğe bağlı)</em>
            </span>
            <input type="url" name="reference" inputMode="url" />
          </label>

          <p className="idea-note">
            Bu form şu an bir yere gönderilmiyor. Fikrini İletişim bölümünden
            bana ulaştırabilirsin.
          </p>
          <button
            type="button"
            className="idea-contact"
            onClick={onContact}
            data-cursor="disable"
          >
            İletişime Geç <MdArrowOutward />
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

const IdeaButton = () => {
  const { isLoading } = useLoading();
  const [open, setOpen] = useState(false);
  const [tucked, setTucked] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);

  // Out of the way of the controls beneath it, and gone while a project
  // panel or the video player is open.
  useEffect(() => {
    if (isLoading) return;
    const check = () => {
      const b = btn.current?.getBoundingClientRect();
      if (!b) return;
      if (document.querySelector(".project-panel-backdrop, .video-modal")) {
        setTucked(true);
        return;
      }
      const hit = Array.from(document.querySelectorAll(AVOID)).some((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.width > 0 &&
          r.height > 0 &&
          r.left < b.right + 10 &&
          r.right > b.left - 10 &&
          r.top < b.bottom + 10 &&
          r.bottom > b.top - 10
        );
      });
      setTucked(hit);
    };
    check();
    const id = window.setInterval(check, 150);
    window.addEventListener("resize", check);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", check);
    };
  }, [isLoading]);

  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => btn.current?.focus());
  }, []);

  const contact = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => scrollToSection("#contact"), 60);
  }, []);

  if (isLoading) return null;

  return (
    <>
      <button
        type="button"
        ref={btn}
        className={`idea-button${tucked && !open ? " is-tucked" : ""}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        data-cursor="disable"
      >
        Bir fikrim var <MdArrowOutward aria-hidden="true" />
      </button>
      {open && <IdeaPanel onClose={close} onContact={contact} />}
    </>
  );
};

export default IdeaButton;
