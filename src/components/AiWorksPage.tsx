import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MdArrowForward, MdCheck, MdPause, MdPlayArrow } from "react-icons/md";
import { aiHero, aiSteps, aiWorks, type AiMedia, type AiWork } from "../data/aiWorks";
import { prefersReducedMotion } from "../utils/motion";
import SpaceBackground from "./ai/SpaceBackground";
import SpaceToggle from "./ai/SpaceToggle";
import { spaceBus } from "./ai/spaceBus";
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

/**
 * The opening video: the showreel in a vertical frame, silent, in a loop. The cover (a small
 * picture) is there from the first paint. With "Hareketi azalt" nothing moves until the visitor
 * presses Play. A visible button pauses and plays it; it is a normal button, so the keyboard works.
 * The video pauses by itself while it is off screen.
 */
const HeroVideo = () => {
  const v = aiHero.video;
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useRef(prefersReducedMotion()).current;
  const [playing, setPlaying] = useState(false);
  // True once the visitor has chosen: from then on the page leaves the video as it is.
  const chosen = useRef(reduced);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (chosen.current) return;
        if (e.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    chosen.current = true;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  };

  return (
    <figure className="ai-hero-video" aria-label={v.label}>
      <div className="ai-hero-frame" style={{ aspectRatio: String(v.ratio) }}>
        <video
          ref={ref}
          src={url(v.src)}
          poster={url(v.poster)}
          muted
          loop
          playsInline
          autoPlay={!reduced}
          preload={reduced ? "none" : "auto"}
          aria-hidden="true"
          tabIndex={-1}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        <button type="button" className="ai-hero-ctl" onClick={toggle} aria-label={playing ? "Videoyu duraklat" : "Videoyu oynat"} data-cursor="disable">
          {playing ? <MdPause aria-hidden="true" /> : <MdPlayArrow aria-hidden="true" />}
          <span className="ai-hero-ctl-text" aria-hidden="true">
            {playing ? "Duraklat" : "Oynat"}
          </span>
        </button>
      </div>
    </figure>
  );
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

/**
 * A cover picture; the video itself is fetched only when it is played. When the player opens, the
 * keyboard focus moves into it (its own controls), so a keyboard user does not have to look for it.
 */
const VideoCover = ({ m }: { m: AiMedia }) => {
  const [playing, setPlaying] = useState(false);
  const player = useRef<HTMLVideoElement>(null);
  const ratio = m.ratio ?? 9 / 16;
  useEffect(() => {
    if (playing) player.current?.focus();
    // an open player calms the space background so it does not compete with the video
    spaceBus.playerOpen = playing;
    return () => {
      spaceBus.playerOpen = false;
    };
  }, [playing]);
  return (
    <figure className="ai-video">
      <div className="ai-video-box" style={{ aspectRatio: String(ratio) }}>
        {playing ? (
          <video ref={player} src={url(m.src ?? "")} poster={m.poster ? url(m.poster) : undefined} controls autoPlay playsInline preload="none" aria-label={m.caption || m.alt} />
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

/** Three drawn phone screens: choose a service, choose a time, confirm. Always marked as a concept. */
const AppFlow = ({ m }: { m: AiMedia }) => (
  <figure className="ai-flow3" role="group" aria-label={m.alt}>
    <span className="ai-badge">Konsept prototip</span>
    <div className="ai-flow3-row" role="region" aria-label="Konsept prototipin üç ekranı, yana kaydırılır" tabIndex={0}>
      <div className="ai-screen">
        <div className="ai-phone" aria-hidden="true">
          <b>Hizmet seç</b>
          <div className="ai-opt is-on">
            <span>Hizmet 1</span>
            <small>30 dk</small>
            <MdCheck />
          </div>
          <div className="ai-opt">
            <span>Hizmet 2</span>
            <small>45 dk</small>
          </div>
          <div className="ai-opt">
            <span>Hizmet 3</span>
            <small>60 dk</small>
          </div>
          <div className="ai-btn">Devam</div>
        </div>
        <span className="ai-step-cap">
          <i>1</i> Hizmet seç
        </span>
      </div>
      <div className="ai-screen">
        <div className="ai-phone" aria-hidden="true">
          <b>Saat seç</b>
          <div className="ai-days">
            <span>Pzt</span>
            <span className="is-on">Sal</span>
            <span>Çar</span>
          </div>
          <div className="ai-times">
            <span>10:00</span>
            <span>11:00</span>
            <span>13:00</span>
            <span className="is-on">14:00</span>
            <span>15:00</span>
            <span>16:00</span>
          </div>
          <div className="ai-btn">Devam</div>
        </div>
        <span className="ai-step-cap">
          <i>2</i> Saat seç
        </span>
      </div>
      <div className="ai-screen">
        <div className="ai-phone" aria-hidden="true">
          <b>Onayla</b>
          <div className="ai-sum">
            <span>Hizmet 1</span>
            <span>Salı</span>
            <span>14:00</span>
          </div>
          <div className="ai-ok">
            <MdCheck />
          </div>
          <div className="ai-btn is-main">Onayla</div>
        </div>
        <span className="ai-step-cap">
          <i>3</i> Onayla
        </span>
      </div>
    </div>
  </figure>
);

const Example = ({ work }: { work: AiWork }) => {
  const shots = work.media.filter((m) => m.kind === "desktop" || m.kind === "phone");
  return (
    <>
      <p className="ai-ex-label">{work.exampleLabel}</p>
      {shots.length > 0 && (
        <div className="ai-devices">
          {shots.map((m) => (
            <Shot key={m.src} m={m} />
          ))}
        </div>
      )}
      {work.media.filter((m) => m.kind === "video").map((m) => <VideoCover key={m.src} m={m} />)}
      {work.media.filter((m) => m.kind === "flow").map((m, i) => <AppFlow key={i} m={m} />)}
      {work.facts && (
        <dl className="ai-facts">
          {work.facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {work.mediaNote && <p className="ai-media-note">{work.mediaNote}</p>}
    </>
  );
};

const AiWorksPage = () => {
  const [brief, setBrief] = useState<string[] | null>(null);
  const [menu, setMenu] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    // The home page keeps the body locked until its intro is over; this page scrolls freely.
    document.body.style.overflowY = "auto";
    document.body.style.backgroundColor = "#080b11";
    window.scrollTo(0, 0);
  }, []);

  // The narrow-screen menu closes with Escape (focus goes back to its button) and with a tap elsewhere.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        menuBtn.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (nav.current && !nav.current.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [menu]);

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

  // The brief form covers the page: the space background stops drawing while it is open.
  useEffect(() => {
    spaceBus.briefOpen = brief !== null;
    return () => {
      spaceBus.briefOpen = false;
    };
  }, [brief]);

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
      <SpaceBackground rootRef={root} />
      <a className="skip-link" href="#main" onClick={skip}>
        İçeriğe geç
      </a>
      <header className="ai-top">
        <a className="ai-logo" href="/" aria-label="Eray Ömeroğlu, ana sayfa">
          EÖ
        </a>
        <nav aria-label="Ana menü" ref={nav} className={menu ? "is-open" : ""}>
          <button ref={menuBtn} type="button" className="ai-menu-btn" aria-expanded={menu} aria-controls="ai-menu" onClick={() => setMenu((m) => !m)}>
            Menü
          </button>
          <ul id="ai-menu" onClick={(e) => (e.target as HTMLElement).closest("a") && setMenu(false)}>
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
            {aiWorks.map((w) => (
              <li key={w.id} className="ai-menu-sec">
                <a href={`#${w.id}`}>{w.title}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" tabIndex={-1}>
        <section className="ai-hero" aria-labelledby="ai-title">
          <div className="ai-hero-text">
            <h1 id="ai-title">
              AI <span>İşler</span>
            </h1>
            <p className="ai-lead">{aiHero.lead}</p>
          </div>
          <HeroVideo />
          <div className="ai-hero-cta">
            <button type="button" className="ai-cta ai-cta-big" onClick={(e) => open([], e.currentTarget)}>
              Projeni anlat <MdArrowForward aria-hidden="true" />
            </button>
            <SpaceToggle className="ai-space-ctl-hero" />
          </div>
        </section>

        {aiWorks.map((work, i) => (
          <section key={work.id} id={work.id} className={`ai-sec${i % 2 ? " ai-sec-flip" : ""}`} aria-labelledby={`${work.id}-h`}>
            <div className="ai-sec-head ai-reveal">
              <p className="ai-sec-kicker">
                <span>{String(i + 1).padStart(2, "0")}</span> {work.kicker}
              </p>
              <h2 id={`${work.id}-h`}>{work.title}</h2>
              <p className="ai-sec-sum">{work.summary}</p>
            </div>

            <div className="ai-sec-media ai-reveal">
              <Example work={work} />
            </div>

            <div className="ai-sec-scope ai-reveal">
              <h3 className="ai-h3">{work.id === "web-sitesi" ? "Örnek kapsamlar" : "Kapsam"}</h3>
              <ul className="ai-outputs">
                {work.outputs.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
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
        <SpaceToggle className="ai-space-ctl-foot" />
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
