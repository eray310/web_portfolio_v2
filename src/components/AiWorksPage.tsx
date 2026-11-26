import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MdArrowForward, MdPause, MdPlayArrow } from "react-icons/md";
import { aiHero, aiWorks, type AiWork } from "../data/aiWorks";
import { prefersReducedMotion } from "../utils/motion";
import SpaceBackground from "./ai/SpaceBackground";
import ViewMenu from "./ViewMenu";
import { useCalmView } from "../utils/viewMode";
import { spaceBus } from "./ai/spaceBus";
import { VideoStage, WebStage } from "./ai/stages";
import AppDemo from "./ai/AppDemo";
import { AiWebParticles } from "./ai/AiWebParticles";
import ProcessStory from "./ai/ProcessStory";

// ?prototip=parcacik: the particle version of the Web Sitesi loop (design prototype)
const particlePrototype = new URLSearchParams(window.location.search).get("prototip") === "parcacik";
import { videoBudget } from "./ai/videoBudget";
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
  const calm = useCalmView();
  const calmRef = useRef(calm);
  calmRef.current = calm;
  // "Sakin görünüm": the looping showreel waits for the visitor's own Play
  useEffect(() => {
    const el = ref.current;
    if (!el || chosen.current) return;
    if (calm) el.pause();
    else {
      videoBudget.claim("hero");
      void el.play().catch(() => {});
    }
  }, [calm]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (chosen.current) return;
        if (e.isIntersecting && !calmRef.current) {
          videoBudget.claim("hero");
          void el.play().catch(() => {});
        } else el.pause();
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // one video decodes at a time (the preview further down pauses this one, and the other way round)
  useEffect(() => {
    const el = ref.current;
    return el ? videoBudget.register("hero", () => el.pause()) : undefined;
  }, []);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    chosen.current = true;
    if (el.paused) {
      videoBudget.claim("hero");
      void el.play().catch(() => {});
    } else el.pause();
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

/** The live loop of a section (see ai/stages.tsx). */
const Stage = ({ work }: { work: AiWork }) => {
  const st = work.stage;
  if (st.kind === "web") return particlePrototype ? <AiWebParticles s={st} /> : <WebStage s={st} />;
  if (st.kind === "video") return <VideoStage s={st} id={work.id} />;
  return <AppDemo s={st} />;
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
    document.body.style.backgroundColor = "#0c0a0b";
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
              <a href="/zihnim">Zihnim</a>
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
        <ViewMenu className="ai-view" />
      </header>

      <main id="main" tabIndex={-1}>
        <section className="ai-hero" aria-labelledby="ai-title">
          <div className="ai-hero-text">
            <h1 id="ai-title">
              AI İşler
            </h1>
            <p className="ai-lead">{aiHero.lead}</p>
          </div>
          <HeroVideo />
          <div className="ai-hero-cta">
            <button type="button" className="ai-cta ai-cta-big" onClick={(e) => open([], e.currentTarget)}>
              Projeni anlat <MdArrowForward aria-hidden="true" />
            </button>
          </div>
        </section>

        {aiWorks.map((work, i) => (
          <section key={work.id} id={work.id} className={`ai-sec ai-sec-${work.stage.kind}${i % 2 ? " ai-sec-flip" : ""}`} aria-labelledby={`${work.id}-h`}>
            <div className="ai-sec-head ai-reveal">
              <h2 id={`${work.id}-h`}>{work.title}</h2>
              <p className="ai-sec-sum">{work.summary}</p>
            </div>
            <div className="ai-sec-stage ai-reveal">
              <Stage work={work} />
            </div>
            <div className="ai-sec-scope ai-reveal">
              <ul className="ai-outputs">
                {work.outputs.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
              <button type="button" className="ai-cta ai-cta-quiet" onClick={(e) => open([work.service], e.currentTarget)}>
                Projeni anlat <MdArrowForward aria-hidden="true" />
              </button>
              <details className="ai-details">
                <summary>Kapsam ayrıntıları</summary>
                <ul>
                  {work.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </details>
            </div>
          </section>
        ))}

        <ProcessStory onBrief={(el) => open([], el)} />
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
