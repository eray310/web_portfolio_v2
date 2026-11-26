import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { MdArrowForward, MdPause, MdPlayArrow } from "react-icons/md";
import SiteHeader from "../SiteHeader";
import ViewMenu from "../ViewMenu";
import DotPortrait from "./DotPortrait";
import { useCalmView } from "../../utils/viewMode";
import { experience } from "../../data/career";
import { tools } from "../../data/tools";
import { brands } from "../../data/brands";
import { services } from "../../data/services";
import { fileUrl, previewUrl, projects } from "../../data/projects";
import { allestaFrames, covers, principles, quote, roles, tracks } from "./albumConfig";
import "./album.css";

const BriefFlow = lazy(() => import("../BriefFlow"));

/**
 * /hakkimda: "Albüm iç kapağı" (the inner sleeve of a record).
 *
 * The quick, readable, honest version of the story that /zihnim tells as a show: who I am, where I come from, how I
 * work, what I did, how to reach me. The cover is Eray himself, a portrait made of dots. Ordinary scrolling, no pinned
 * stretches, no WebGL. Pictures appear as a print screen (halftone) first and turn sharp once, when they come into
 * view; the portrait never turns into a photograph.
 */
const base = import.meta.env.BASE_URL;
const pub = (p: string) => `${base}${p}`;

let savedOverflow = "";
const lockPage = () => {
  savedOverflow = document.body.style.overflowY;
  document.body.style.overflowY = "hidden";
};
const unlockPage = () => {
  document.body.style.overflowY = savedOverflow || "auto";
};

/** A picture that is a print screen of dots until it is seen, then sharp (once). Calm view: sharp at once. */
const Halftone = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const calm = useCalmView();
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`alb-ht${seen || calm ? " is-sharp" : ""}${calm ? " is-calm" : ""} ${className}`}>
      {children}
    </div>
  );
};

const Pic = ({ name, alt, w, h }: { name: string; alt: string; w: number; h: number }) => (
  <picture>
    <source srcSet={pub(`${name}.webp`)} type="image/webp" />
    <img src={pub(`${name}.jpg`)} alt={alt} width={w} height={h} loading="lazy" decoding="async" />
  </picture>
);

/** Voop: silent, no loop; it plays while it is in view (not in the calm view) and has a visible play / pause button. */
const MotionWork = () => {
  const p = projects.find((x) => x.title.startsWith("Voop"))!;
  const vid = useRef<HTMLVideoElement>(null);
  const calm = useCalmView();
  const [playing, setPlaying] = useState(false);
  const chosen = useRef(false);
  useEffect(() => {
    const v = vid.current;
    if (!v || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) v.pause();
        else if (!chosen.current && !calm) void v.play().catch(() => {});
      },
      { threshold: 0.6 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, [calm]);
  useEffect(() => {
    if (calm) vid.current?.pause();
  }, [calm]);
  const toggle = () => {
    const v = vid.current;
    if (!v) return;
    chosen.current = true;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  };
  return (
    <figure className="alb-fig alb-motion">
      <Halftone>
        <video ref={vid} src={previewUrl(p)} poster={fileUrl(p.poster!)} muted playsInline preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} aria-label={`${p.title}: sessiz önizleme`} />
      </Halftone>
      <button type="button" className="alb-play" onClick={toggle} aria-pressed={playing}>
        {playing ? <MdPause aria-hidden="true" /> : <MdPlayArrow aria-hidden="true" />}
        <span>{playing ? "Durdur" : "Oynat"}</span>
      </button>
      <figcaption>
        {p.title} <span>· Motion</span>
      </figcaption>
    </figure>
  );
};

const AlbumPage = () => {
  const [brief, setBrief] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const og = new URLSearchParams(window.location.search).has("og");
  const closeBrief = useCallback(() => {
    setBrief(false);
    window.requestAnimationFrame(() => opener.current?.focus());
  }, []);

  useEffect(() => {
    document.body.style.overflowY = "auto";
    document.body.style.backgroundColor = "#0c0a0b";
    document.title = "Hakkımda — Eray Ömeroğlu";
    document.documentElement.classList.add("alb-root");
    return () => document.documentElement.classList.remove("alb-root");
  }, []);

  if (og) {
    // the picture for sharing (1200 x 630): the portrait and the name; made from this view, see docs/hakkimda-album.md
    return (
      <div className="alb alb-og">
        <DotPortrait />
        <div>
          <p className="alb-og-name">
            Eray
            <br />
            Ömeroğlu
          </p>
          <p className="alb-og-roles" lang="en">
            {roles.join(" · ")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="alb">
      <a className="skip-link" href="#icerik">
        İçeriğe geç
      </a>
      <SiteHeader active="hakkimda" />
      <main id="icerik" tabIndex={-1}>
        <section className="alb-cover" aria-labelledby="alb-name">
          <div className="alb-cover-art">
            <DotPortrait />
          </div>
          <div className="alb-cover-text">
            <p className="alb-kicker">Hakkımda</p>
            <h1 id="alb-name">
              Eray
              <br />
              Ömeroğlu
            </h1>
            <p className="alb-roles" lang="en">
              {roles.join(" · ")}
            </p>
            <p className="alb-lead">Markalar için hareketli grafik, reklam filmi, kurgu ve yapay zekâ destekli görsel üretiyorum.</p>
            <nav aria-label="Parça listesi" className="alb-tracks">
              <ol>
                {tracks.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`}>
                      <b>{t.n}</b>
                      <span>{t.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <ViewMenu className="alb-view" />
          </div>
        </section>

        <section id="baslangic" className="alb-track" aria-labelledby="alb-h1">
          <header>
            <p className="alb-no">01</p>
            <h2 id="alb-h1">Kendi şarkılarıma kapak yaparak başladım.</h2>
          </header>
          <ul className="alb-covers">
            {covers.map((c) => (
              <li key={c.file}>
                <figure className="alb-fig">
                  <Halftone>
                    <Pic name={`kapaklar/${c.file}`} alt={`${c.title}: şarkı kapağı`} w={c.w} h={c.h} />
                  </Halftone>
                  <figcaption>{c.title}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>

        <section id="donum-noktasi" className="alb-track" aria-labelledby="alb-h2">
          <header>
            <p className="alb-no">02</p>
            <h2 id="alb-h2">Grafik tasarım bana yetmedi. Hareket daha dinamik, daha etkili geldi.</h2>
          </header>
          <div className="alb-turn">
            <figure className="alb-fig">
              <Halftone>
                <Pic name="grafik/novak-sinner-kolaj" alt="Novak × Sinner: tenis temalı kolaj" w={860} h={756} />
              </Halftone>
              <figcaption>
                Novak × Sinner <span>· Kişisel çalışma · Kolaj</span>
              </figcaption>
            </figure>
            <MotionWork />
          </div>
        </section>

        <section id="yapay-zeka" className="alb-track" aria-labelledby="alb-h3">
          <header>
            <p className="alb-no">03</p>
            <h2 id="alb-h3">İşimi geliştirmek isterken yapay zekâ geldi.</h2>
          </header>
          <ol className="alb-strip" aria-label="Allesta reklamının yapım sürecinden kareler">
            {allestaFrames.map((f, i) => (
              <li key={f.file}>
                <figure className="alb-fig">
                  <Halftone>
                    <img src={pub(`process/allesta/${f.file}.jpg`)} alt={`Allesta reklamı: ${f.label.toLowerCase()}`} loading="lazy" decoding="async" />
                  </Halftone>
                  <figcaption>
                    <b>{String(i + 1).padStart(2, "0")}</b> {f.label}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ol>
          <p className="alb-note">Allesta · yapay zekâ destekli reklam. Görsel ve video üretiminde güncel yapay zekâ araçları.</p>
          <a className="alb-link" href="/ai-isler">
            AI İşler’i gör <MdArrowForward aria-hidden="true" />
          </a>
        </section>

        <section id="nasil-calisirim" className="alb-track" aria-labelledby="alb-h4">
          <header>
            <p className="alb-no">04</p>
            <h2 id="alb-h4">Nasıl çalışırım</h2>
          </header>
          <ol className="alb-rules">
            {principles.map((p) => (
              <li key={p.title}>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="kariyer" className="alb-track" aria-labelledby="alb-h5">
          <header>
            <p className="alb-no">05</p>
            <h2 id="alb-h5">Kariyer</h2>
          </header>
          <ol className="alb-career">
            {experience.map((e) => (
              <li key={e.id}>
                <p className="alb-when">{e.date}</p>
                <div>
                  <h3>
                    {e.company} <span lang={/Designer/.test(e.role) ? "en" : undefined}>· {e.role}</span>
                  </h3>
                  <p>{e.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="kunye" className="alb-track alb-credits" aria-labelledby="alb-h6">
          <header>
            <p className="alb-no">06</p>
            <h2 id="alb-h6">Künye</h2>
          </header>
          <dl>
            <div>
              <dt>Roller</dt>
              <dd lang="en">{roles.join(" · ")}</dd>
            </div>
            <div>
              <dt>Hizmetler</dt>
              <dd>
                {services.map((s, i) => (
                  <span key={s.title} lang={/^(ART DIRECTION|AI ARTIST)$/.test(s.title) ? "en" : undefined}>
                    {i > 0 && " · "}
                    {s.title}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt>Araçlar</dt>
              <dd>{tools.map((t) => t.note ?? t.name).join(" · ")}</dd>
            </div>
            <div>
              <dt>Çalıştığım markalar</dt>
              <dd>{brands.map((b) => b.name).join(" · ")}</dd>
            </div>
          </dl>
        </section>

        <section className="alb-quote" aria-label="Sevdiğim söz">
          <blockquote>
            <p>“{quote.text}”</p>
            <footer>
              — {quote.by} · {quote.note}
            </footer>
          </blockquote>
        </section>

        <section className="alb-end" aria-labelledby="alb-end-h">
          <h2 id="alb-end-h">İlk kareyi birlikte kuralım.</h2>
          <div className="alb-acts">
            <button
              type="button"
              className="alb-cta"
              onClick={(e) => {
                opener.current = e.currentTarget;
                setBrief(true);
              }}
            >
              Projeni anlat <MdArrowForward aria-hidden="true" />
            </button>
            <a className="alb-link" href="/zihnim">
              Hikâyemi deneyim olarak izle <MdArrowForward aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>
      {brief && (
        <Suspense fallback={null}>
          <BriefFlow onClose={closeBrief} lock={lockPage} unlock={unlockPage} />
        </Suspense>
      )}
    </div>
  );
};

export default AlbumPage;
