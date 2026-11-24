import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { MdArrowForward, MdLanguage, MdMovieCreation, MdPhoneIphone } from "react-icons/md";
import { aiWorks, type AiWork } from "../data/aiWorks";
import "./styles/AiWorksPage.css";

// The brief form is loaded only when a visitor opens it.
const BriefFlow = lazy(() => import("./BriefFlow"));

const url = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

// The page scrolls natively, so stopping it while the brief is open is one style. The scrollbar's
// space stays reserved (see AiWorksPage.css) so nothing shifts.
let savedOverflow = "";
const lockPage = () => {
  savedOverflow = document.body.style.overflowY;
  document.body.style.overflowY = "hidden";
};
const unlockPage = () => {
  document.body.style.overflowY = savedOverflow || "auto";
};

const ICONS: Record<string, JSX.Element> = {
  "web-sitesi": <MdLanguage />,
  "reklam-filmi": <MdMovieCreation />,
  uygulama: <MdPhoneIphone />,
};

/** The picture, the video or - until real material is added - a quiet placeholder panel. */
const Media = ({ work }: { work: AiWork }) => {
  const ratio = work.ratio ?? 4 / 3;
  return (
    <div className="ai-media" style={{ aspectRatio: String(ratio) }}>
      {work.video ? (
        <video
          src={url(work.video)}
          poster={work.image ? url(work.image) : undefined}
          controls
          playsInline
          preload="none"
          aria-label={work.imageAlt || `${work.title} videosu`}
        />
      ) : work.image ? (
        <img src={url(work.image)} alt={work.imageAlt ?? ""} loading="lazy" decoding="async" draggable={false} />
      ) : (
        <div className="ai-media-empty" aria-hidden="true">
          <span>{ICONS[work.id] ?? <MdLanguage />}</span>
        </div>
      )}
    </div>
  );
};

const AiWorksPage = () => {
  const [services, setServices] = useState<string[] | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // The home page keeps the body locked until its intro is over; this page scrolls freely.
    document.body.style.overflowY = "auto";
    document.body.style.backgroundColor = "#080b11";
    window.scrollTo(0, 0);
  }, []);

  const open = (service: string, el: HTMLElement) => {
    opener.current = el;
    setServices([service]);
  };
  const close = useCallback(() => {
    setServices(null);
    window.requestAnimationFrame(() => opener.current?.focus?.());
  }, []);

  const skip = (e: React.MouseEvent) => {
    e.preventDefault();
    const main = document.getElementById("main");
    main?.focus({ preventScroll: false });
  };

  return (
    <div className="ai">
      <a className="skip-link" href="#main" onClick={skip}>
        İçeriğe geç
      </a>
      <header className="ai-top">
        <a className="ai-logo" href="/" aria-label="Eray Ömeroğlu, ana sayfa">
          EÖ
        </a>
        <nav aria-label="Ana menü">
          <ul>
            <li>
              <a href="/#work">Seçili İşler</a>
            </li>
            <li>
              <a href="/ai-isler" aria-current="page">
                AI İşler
              </a>
            </li>
            <li>
              <a href="/hakkimda">Hakkımda</a>
            </li>
            <li>
              <a href="/#contact">İletişim</a>
            </li>
          </ul>
        </nav>
      </header>

      <main id="main" tabIndex={-1}>
        <section className="ai-hero">
          <p className="ai-kicker">Yapay zekâ destekli</p>
          <h1>
            AI <span>İşler</span>
          </h1>
          <p className="ai-lead">
            Web siteleri, reklam filmleri ve uygulamalar. Aşağıdan bir alan seç, projeni anlat; brief formu o hizmet
            seçili olarak açılsın.
          </p>
        </section>

        <ul className="ai-grid">
          {aiWorks.map((work) => (
            <li key={work.id} className="ai-card">
              <Media work={work} />
              <div className="ai-card-body">
                <h2>{work.title}</h2>
                <p>{work.text}</p>
                <button type="button" className="ai-cta" onClick={(e) => open(work.service, e.currentTarget)}>
                  Projeni anlat <MdArrowForward aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>

      <footer className="ai-foot">
        <p>
          Tasarım ve motion — <span>Eray Ömeroğlu</span>
        </p>
      </footer>

      {services && (
        <Suspense fallback={null}>
          <BriefFlow initialServices={services} onClose={close} lock={lockPage} unlock={unlockPage} />
        </Suspense>
      )}
    </div>
  );
};

export default AiWorksPage;
