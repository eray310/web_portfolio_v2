import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { MdArrowForward, MdArrowOutward, MdContentCopy } from "react-icons/md";
import { lockScroll, unlockScroll } from "./utils/scrollLock";
import "./styles/Contact.css";

const BriefFlow = lazy(() => import("./BriefFlow"));
const EMAIL = "omerogluuerayy@gmail.com";

const Contact = () => {
  const [brief, setBrief] = useState(false);
  const [copied, setCopied] = useState("");
  const opener = useRef<HTMLElement | null>(null);
  const close = useCallback(() => {
    setBrief(false);
    window.requestAnimationFrame(() => opener.current?.focus?.());
  }, []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied("Kopyalandı");
    } catch {
      setCopied("Kopyalanamadı; adresi seçip kopyalayabilirsin");
    }
    window.setTimeout(() => setCopied(""), 2600);
  };
  return (
    <div className="contact-section section-container" id="contact">
      <div className="contact-container">
        <p className="home-no">İletişim</p>
        <h2 className="contact-close">İlk kareyi birlikte kuralım.</h2>
        <div className="contact-mail">
          <a href={`mailto:${EMAIL}`} className="contact-email" data-cursor="disable">
            {EMAIL}
          </a>
          <button type="button" className="contact-copy-btn" onClick={copy} data-cursor="disable">
            <MdContentCopy aria-hidden="true" /> Kopyala
          </button>
          <span className="contact-copied" role="status" aria-live="polite">
            {copied}
          </span>
        </div>
        <div className="contact-actions">
          <button
            type="button"
            className="contact-brief"
            onClick={(e) => {
              opener.current = e.currentTarget;
              setBrief(true);
            }}
            aria-haspopup="dialog"
            data-cursor="disable"
          >
            Projeni anlat <MdArrowForward aria-hidden="true" />
          </button>
          <a href="https://www.behance.net/erayomeroglu" target="_blank" rel="noreferrer" data-cursor="disable" className="contact-social">
            Behance <MdArrowOutward aria-hidden="true" />
          </a>
          <a href="https://www.linkedin.com/in/erayomeroglu" target="_blank" rel="noreferrer" data-cursor="disable" className="contact-social">
            LinkedIn <MdArrowOutward aria-hidden="true" />
          </a>
        </div>
        <footer className="contact-foot">
          <p className="contact-signature">
            <span lang="en">Motion Designer · Art Director · Video Editor · AI Artist</span> — Eray Ömeroğlu
          </p>
          <nav className="contact-legal" aria-label="Yasal sayfalar">
            <a href="/kvkk">KVKK Aydınlatma Metni</a>
            <span aria-hidden="true"> · </span>
            <a href="/gizlilik">Gizlilik</a>
            <span aria-hidden="true"> · </span>
            <a href="/cerez-tercihleri">Çerez Tercihleri</a>
          </nav>
          <p className="contact-copyright">© {new Date().getFullYear()} Eray Ömeroğlu. Tüm hakları saklıdır.</p>
        </footer>
      </div>
      {brief && (
        <Suspense fallback={null}>
          <BriefFlow onClose={close} lock={lockScroll} unlock={unlockScroll} />
        </Suspense>
      )}
    </div>
  );
};

export default Contact;
