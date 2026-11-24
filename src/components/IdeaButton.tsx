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

type Status = "idle" | "sending" | "sent" | "error";
type Fields = Partial<Record<"type" | "name" | "email" | "summary" | "reference", string>>;

const ERRORS: Record<string, string> = {
  not_configured: "Gönderim şu an kullanılamıyor. Fikrini İletişim bölümünden bana ulaştırabilirsin.",
  rate_limited: "Kısa sürede çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.",
  provider_rejected: "Mesaj teslim edilemedi. Biraz sonra tekrar dene ya da İletişim bölümünü kullan.",
  provider_unreachable: "Mesaj servisine ulaşılamadı. Biraz sonra tekrar dene ya da İletişim bölümünü kullan.",
  rejected: "Form gönderilemedi. Sayfayı yenileyip tekrar dene.",
};

/**
 * Sends the idea to /api/idea. "Gönderildi" is shown only when the server says the
 * mail service accepted the message; every other outcome is shown as an error.
 */
const IdeaPanel = ({
  onClose,
  onContact,
}: {
  onClose: () => void;
  onContact: () => void;
}) => {
  const sheet = useRef<HTMLDivElement>(null);
  const opened = useRef(Date.now());
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [fields, setFields] = useState<Fields>({});
  const [message, setMessage] = useState("");

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
          'button, input:not([tabindex="-1"]), textarea, [href], [tabindex]:not([tabindex="-1"])'
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

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;
    const f = new FormData(e.currentTarget);
    const data = {
      type,
      name: String(f.get("name") ?? "").trim(),
      email: String(f.get("email") ?? "").trim(),
      summary: String(f.get("summary") ?? "").trim(),
      reference: String(f.get("reference") ?? "").trim(),
      website: String(f.get("website") ?? ""),
      t: Date.now() - opened.current,
    };
    // The same checks run on the server; these only save a round trip.
    const bad: Fields = {};
    if (!type) bad.type = "Proje türünü seç.";
    if (data.name.length < 2) bad.name = "Adını yaz.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) bad.email = "Geçerli bir e-posta yaz.";
    if (data.summary.length < 10) bad.summary = "Fikrini birkaç cümleyle anlat.";
    if (Object.keys(bad).length) {
      setFields(bad);
      setStatus("error");
      setMessage("Formda eksik ya da hatalı alanlar var.");
      sheet.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    setFields({});
    setMessage("");
    setStatus("sending");
    try {
      const res = await fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.ok === true) {
        setStatus("sent");
        return;
      }
      if (out.fields) setFields(out.fields);
      setMessage(ERRORS[out.error] ?? (out.fields ? "Formda eksik ya da hatalı alanlar var." : "Gönderilemedi. Biraz sonra tekrar dene ya da İletişim bölümünü kullan."));
      setStatus("error");
    } catch {
      setMessage("Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.");
      setStatus("error");
    }
  };

  const invalid = (k: keyof Fields) => (fields[k] ? true : undefined);

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

        {status === "sent" ? (
          <div className="idea-sent" role="status">
            <p>Teşekkürler, fikrin bana ulaştı. En kısa sürede e-postayla dönüş yapacağım.</p>
            <button type="button" className="idea-contact" onClick={onClose} data-cursor="disable">
              Kapat
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate aria-busy={status === "sending"}>
            <fieldset className="idea-types" aria-describedby={fields.type ? "idea-type-err" : undefined}>
              <legend>Proje türü</legend>
              {TYPES.map((t) => (
                <label key={t} className={type === t ? "is-on" : ""}>
                  <input
                    type="radio"
                    name="idea-type"
                    value={t}
                    checked={type === t}
                    onChange={() => setType(t)}
                    aria-invalid={invalid("type")}
                  />
                  {t}
                </label>
              ))}
              {fields.type && (
                <span className="idea-err" id="idea-type-err">
                  {fields.type}
                </span>
              )}
            </fieldset>

            <label className="idea-field">
              <span>Ad</span>
              <input type="text" name="name" autoComplete="name" required aria-invalid={invalid("name")} />
              {fields.name && <span className="idea-err">{fields.name}</span>}
            </label>
            <label className="idea-field">
              <span>E-posta</span>
              <input type="email" name="email" autoComplete="email" required aria-invalid={invalid("email")} />
              {fields.email && <span className="idea-err">{fields.email}</span>}
            </label>
            <label className="idea-field">
              <span>Kısa proje özeti</span>
              <textarea name="summary" rows={3} required aria-invalid={invalid("summary")} />
              {fields.summary && <span className="idea-err">{fields.summary}</span>}
            </label>
            <label className="idea-field">
              <span>
                Referans bağlantısı <em>(isteğe bağlı)</em>
              </span>
              <input type="url" name="reference" inputMode="url" aria-invalid={invalid("reference")} />
              {fields.reference && <span className="idea-err">{fields.reference}</span>}
            </label>
            {/* Spam trap: invisible to people, tempting to bots. */}
            <input type="text" name="website" className="idea-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" />

            <p className={"idea-status" + (status === "error" ? " is-error" : "")} role={status === "error" ? "alert" : "status"}>
              {status === "sending" ? "Gönderiliyor…" : status === "error" ? message : ""}
            </p>
            <button type="submit" className="idea-submit" disabled={status === "sending"} data-cursor="disable">
              {status === "sending" ? "Gönderiliyor…" : "Gönder"}
            </button>
            <button type="button" className="idea-contact" onClick={onContact} data-cursor="disable">
              İletişime Geç <MdArrowOutward />
            </button>
          </form>
        )}
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
