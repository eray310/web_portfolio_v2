import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MdArrowForward, MdPlayArrow } from "react-icons/md";
import { aiIntro, aiSteps, aiWorks, type AiMedia, type AiWork } from "../data/aiWorks";
import { prefersReducedMotion } from "../utils/motion";
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

/** A screenshot in a browser or phone frame. */
const Shot = ({ m }: { m: AiMedia }) => (
  <figure className={`ai-shot ai-shot-${m.kind}`}>
    <div className="ai-frame">
      {m.kind === "desktop" && (
        <div className="ai-browser" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      )}
      <img src={url(m.src ?? "")} alt={m.alt} loading="lazy" decoding="async" draggable={false} />
    </div>
    {m.caption && <figcaption>{m.caption}</figcaption>}
  </figure>
);

/** A cover picture; the video itself is fetched only when it is played. */
const VideoCover = ({ m }: { m: AiMedia }) => {
  const [playing, setPlaying] = useState(false);
  const ratio = m.ratio ?? 9 / 16;
  return (
    <figure className="ai-video">
      <div className="ai-video-box" style={{ aspectRatio: String(ratio) }}>
        {playing ? (
          <video src={url(m.src ?? "")} poster={m.poster ? url(m.poster) : undefined} controls autoPlay playsInline preload="none" aria-label={m.caption || m.alt} />
        ) : (
          <button type="button" className="ai-video-play" onClick={() => setPlaying(true)}>
            {m.poster && <img src={url(m.poster)} alt="" loading="lazy" decoding="async" draggable={false} />}
            <span className="ai-play-icon" aria-hidden="true">
              <MdPlayArrow />
            </span>
            <span className="ai-sr">Videoyu oynat: {m.caption || m.alt}</span>
          </button>
        )}
      </div>
      {m.caption && <figcaption>{m.caption}</figcaption>}
    </figure>
  );
};

/** A drawn sketch (no picture file), always marked as a concept. */
const Concept = ({ m }: { m: AiMedia }) => (
  <figure className="ai-concept">
    <div className="ai-phone-sketch" role="img" aria-label={m.alt} style={{ aspectRatio: String(m.ratio ?? 9 / 18) }}>
      {m.label && <span className="ai-badge">{m.label}</span>}
      <div className="sk-bar" />
      <div className="sk-card sk-wide" />
      <div className="sk-row">
        <div className="sk-card" />
        <div className="sk-card" />
      </div>
      <div className="sk-line" />
      <div className="sk-line sk-short" />
      <div className="sk-tabs">
        <i />
        <i />
        <i />
      </div>
    </div>
    {m.caption && <figcaption>{m.caption}</figcaption>}
  </figure>
);

const Media = ({ work }: { work: AiWork }) => {
  const shots = work.media.filter((m) => m.kind === "desktop" || m.kind === "phone");
  return (
    <>
      {shots.length > 0 && (
        <div className="ai-devices">
          {shots.map((m) => (
            <Shot key={m.src} m={m} />
          ))}
        </div>
      )}
      {work.media.filter((m) => m.kind === "video").map((m) => <VideoCover key={m.src} m={m} />)}
      {work.media.filter((m) => m.kind === "concept").map((m, i) => <Concept key={i} m={m} />)}
      {work.mediaNote && <p className="ai-media-note">{work.mediaNote}</p>}
    </>
  );
};

const AiWorksPage = () => {
  const [brief, setBrief] = useState<string[] | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The home page keeps the body locked until its intro is over; this page scrolls freely.
    document.body.style.overflowY = "auto";
    document.body.style.backgroundColor = "#080b11";
    window.scrollTo(0, 0);
  }, []);

  // Sections rise into place as they come into view. Everything is visible without this: it is
  // only switched on when the visitor has not asked for less motion, and a timer shows anything
  // that has not appeared after a few seconds.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    const items = Array.from(el.querySelectorAll<HTMLElement>(".ai-reveal"));
    el.dataset.motion = "on";
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    items.forEach((i) => io.observe(i));
    const t = window.setTimeout(() => items.forEach((i) => i.classList.add("in")), 4000);
    return () => {
      window.clearTimeout(t);
      io.disconnect();
      delete el.dataset.motion;
    };
  }, []);

  const open = (services: string[], el: HTMLElement) => {
    opener.current = el;
    setBrief(services);
  };
  const close = useCallback(() => {
    setBrief(null);
    window.requestAnimationFrame(() => opener.current?.focus?.());
  }, []);

  const skip = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("main")?.focus({ preventScroll: false });
  };

  return (
    <div className="ai" ref={root}>
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
          <p className="ai-lead">{aiIntro}</p>
          <nav className="ai-jump" aria-label="Bu sayfada">
            <ul>
              {aiWorks.map((w) => (
                <li key={w.id}>
                  <a href={`#${w.id}`}>{w.title}</a>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        {aiWorks.map((work, i) => (
          <section key={work.id} id={work.id} className={`ai-sec${i % 2 ? " ai-sec-flip" : ""}`} aria-labelledby={`${work.id}-h`}>
            <div className="ai-sec-text ai-reveal">
              <p className="ai-sec-kicker">
                <span>{String(i + 1).padStart(2, "0")}</span> {work.kicker}
              </p>
              <h2 id={`${work.id}-h`}>{work.title}</h2>
              <p className="ai-sec-sum">{work.summary}</p>

              <h3 className="ai-h3">{work.id === "web-sitesi" ? "Örnek kapsamlar" : "Somut çıktılar"}</h3>
              <ul className="ai-outputs">
                {work.outputs.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>

              {work.stages && (
                <ol className="ai-stages" aria-label={`${work.title} aşamaları`}>
                  {work.stages.map((s) => (
                    <li key={s.title}>
                      <strong>{s.title}</strong>
                      <span>{s.text}</span>
                    </li>
                  ))}
                </ol>
              )}

              <details className="ai-details">
                <summary>Kapsam ayrıntıları</summary>
                <ul>
                  {work.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </details>

              <button type="button" className="ai-cta" onClick={(e) => open([work.service], e.currentTarget)}>
                Projeni anlat <MdArrowForward aria-hidden="true" />
              </button>
            </div>
            <div className="ai-sec-media ai-reveal">
              <Media work={work} />
            </div>
          </section>
        ))}

        <section className="ai-flow" aria-labelledby="ai-flow-h">
          <div className="ai-reveal">
            <h2 id="ai-flow-h">Birlikte nasıl çalışırız?</h2>
            <ol className="ai-steps">
              {aiSteps.map((s, i) => (
                <li key={s.title}>
                  <span className="ai-step-n" aria-hidden="true">
                    {i + 1}
                  </span>
                  <strong>{s.title}</strong>
                  <span>{s.text}</span>
                </li>
              ))}
            </ol>
            <button type="button" className="ai-cta ai-cta-big" onClick={(e) => open([], e.currentTarget)}>
              Projeni anlat <MdArrowForward aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>

      <footer className="ai-foot">
        <p>
          Tasarım ve motion — <span>Eray Ömeroğlu</span>
        </p>
      </footer>

      {brief && (
        <Suspense fallback={null}>
          <BriefFlow initialServices={brief} onClose={close} lock={lockPage} unlock={unlockPage} />
        </Suspense>
      )}
    </div>
  );
};

export default AiWorksPage;
