import { useEffect, useRef, useState } from "react";
import { tools } from "../data/tools";
import { enLang } from "../utils/lang";
import "./styles/AboutPage.css";

const titles = ["Motion Designer", "Art Director", "Video Editor", "AI Artist"];

const asset = (file: string) => `${import.meta.env.BASE_URL}portfolio/${file}`;

// Frames for the "Kurgu" cuts: covers of existing portfolio videos.
const cutFrames = ["paypal.jpg", "uber-motion.jpg", "lays.jpg", "the-lock.jpg"];

// The CV links are shown only when this file really exists (see the check below).
const CV_URL = `${import.meta.env.BASE_URL}cv/Eray_Omeroglu_CV.pdf`;

/** Adds `is-in` while the element is on screen, so loops and entrances run only when seen. */
const useInView = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => el.classList.toggle("is-in", entry.isIntersecting),
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
};

const BackLink = ({ className = "" }: { className?: string }) => (
  <a className={`ap-back ${className}`.trim()} href="/">
    <span aria-hidden="true">←</span> Ana sayfaya dön
  </a>
);

// ── Opening collage (decorative) ──────────────────────────────────────────
const Collage = () => (
  <div className="ap-collage" aria-hidden="true">
    <span className="ap-collage-frame" />
    <img className="ap-collage-main" src={asset("paypal.jpg")} alt="" decoding="async" draggable={false} />
    <img className="ap-collage-crop" src={asset("the-lock.jpg")} alt="" decoding="async" draggable={false} />
    <span className="ap-collage-tag">Motion · Kurgu</span>
    <span className="ap-collage-code">00:00:12:08</span>
  </div>
);

// ── The five specialities ─────────────────────────────────────────────────
const MotionVisual = () => {
  const ref = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="ap-visual ap-motion" role="img" aria-label="Hareket eden tipografi">
      <div className="ap-motion-word" aria-hidden="true">
        {"MOTION".split("").map((ch, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.12}s` }}>
            {ch}
          </span>
        ))}
      </div>
      <div className="ap-motion-line" aria-hidden="true" />
    </div>
  );
};

const CutVisual = () => {
  const ref = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="ap-visual ap-cut" role="img" aria-label="Ritimli kurgu: kareler değişiyor">
      <div className="ap-cut-frame" aria-hidden="true">
        {cutFrames.map((f, i) => (
          <img
            key={f}
            className={`ap-cut-img ap-cut-img-${i}`}
            src={asset(f)}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ))}
      </div>
      <div className="ap-cut-track" aria-hidden="true">
        <span className="ap-cut-head" />
      </div>
    </div>
  );
};

const ArtVisual = () => {
  const ref = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="ap-visual ap-art"
      role="img"
      aria-label="Görsel, renk paleti ve tipografi önce ayrı durur, sonra tek bir kompozisyonda birleşir"
    >
      <div className="ap-art-stage" aria-hidden="true">
        <img className="ap-art-img" src={asset("uber-motion.jpg")} alt="" loading="lazy" decoding="async" draggable={false} />
        <span className="ap-art-pal">
          <i style={{ background: "#0a0e17" }} />
          <i style={{ background: "#0d9488" }} />
          <i style={{ background: "#5eead4" }} />
          <i style={{ background: "#eae5ec" }} />
        </span>
        <span className="ap-art-type">Aa</span>
        <span className="ap-art-circle" />
        <span className="ap-art-line" />
        <span className="ap-art-cap ap-art-cap-1">Görsel</span>
        <span className="ap-art-cap ap-art-cap-2">Renk</span>
        <span className="ap-art-cap ap-art-cap-3">Tipografi</span>
      </div>
    </div>
  );
};

// Three posters that assemble piece by piece. Covers come from existing work;
// the headlines are plain design words, not client copy.
const posters = [
  { img: "lays.jpg", word: "Form", cls: "ap-poster-1" },
  { img: "siux.jpg", word: "Renk", cls: "ap-poster-2" },
  { img: "regnum-riva.jpg", word: "Denge", cls: "ap-poster-3" },
];

const PosterVisual = () => {
  const ref = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="ap-visual ap-posters" role="img" aria-label="Üç afişin başlık, görsel ve grafik öğelerle sırayla kurulması">
      {posters.map((p) => (
        <div key={p.word} className={`ap-poster ${p.cls}`} aria-hidden="true">
          <img className="ap-poster-img" src={asset(p.img)} alt="" loading="lazy" decoding="async" draggable={false} />
          <span className="ap-poster-shape" />
          <span className="ap-poster-bar" />
          <span className="ap-poster-title">{p.word}</span>
        </div>
      ))}
    </div>
  );
};

// No real "interpretations of one image" exist among the finished works, so this is a
// short abstract transition (clearly not a client project).
const AiVisual = () => {
  const ref = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="ap-visual ap-ai" role="img" aria-label="Soyut bir görselin üç yorumu arasında maske geçişi ve seçilen kare">
      <div className="ap-ai-stage" aria-hidden="true">
        <span className="ap-ai-layer ap-ai-a" />
        <span className="ap-ai-layer ap-ai-b" />
        <span className="ap-ai-layer ap-ai-c" />
        <span className="ap-ai-sel" />
      </div>
    </div>
  );
};

const specialities = [
  { n: "01", id: "ap-s1", title: "Motion Design", text: "Markanın mesajını hareketle anlatıyorum.", visual: <MotionVisual /> },
  { n: "02", id: "ap-s2", title: "Kurgu", text: "Reklam filmlerini ve sosyal medya videolarını ritimle kuruyorum.", visual: <CutVisual /> },
  { n: "03", id: "ap-s3", title: "Art Direction", text: "Renk, tipografi ve kompozisyonu tek bir görsel dilde buluşturuyorum.", visual: <ArtVisual /> },
  { n: "04", id: "ap-s4", title: "Grafik Tasarım", text: "Fikri, farklı mecralarda tutarlı bir görsel dile dönüştürüyorum.", visual: <PosterVisual /> },
  { n: "05", id: "ap-s5", title: "AI Artist", text: "Yapay zekâ destekli görselleri kurgu ve motion tasarımla tamamlıyorum.", visual: <AiVisual /> },
];

const AboutPage = () => {
  const [hasCv, setHasCv] = useState(false);

  useEffect(() => {
    document.title = "Hakkımda — Eray Ömeroğlu";
    // The home page keeps the body locked until its intro is over; this page scrolls freely.
    document.body.style.overflowY = "auto";
    document.body.style.backgroundColor = "#0a0e17";
    window.scrollTo(0, 0);
  }, []);

  // Show the CV links only when a PDF is really there. A missing file is answered
  // with the site's index.html (not a 404), so the content type is checked too.
  useEffect(() => {
    let alive = true;
    if (!__HAS_CV__) return; // no CV file in this build: no request, no 404
    fetch(CV_URL, { method: "HEAD" })
      .then((res) => {
        const type = res.headers.get("content-type") || "";
        if (alive && res.ok && type.includes("pdf")) setHasCv(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="about-page">
      <header className="ap-header">
        <a className="ap-logo" href="/" aria-label="Eray Ömeroğlu, ana sayfa">
          EÖ
        </a>
        <BackLink />
      </header>

      <main className="ap-main">
        <section className="ap-hero">
          <div className="ap-hero-text">
            <h1>
              <span className="ap-line">
                <span className="ap-line-in">Ben Eray</span>
              </span>{" "}
              <span className="ap-line">
                <span className="ap-line-in">Ömeroğlu.</span>
              </span>
            </h1>
            <span className="ap-rule" aria-hidden="true" />
            <p className="ap-lead">
              Markalar için hareketli grafikler, kurgu ve görsel anlatılar
              üretiyorum.
            </p>
            <ul className="ap-titles" lang="en">
              {titles.map((t) => (
                <li key={t} lang="en">
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <Collage />
        </section>

        <ul className="ap-grid" aria-label="Uzmanlık alanlarım">
          {specialities.map((s) => (
            <li key={s.id} className="ap-card">
              <article aria-labelledby={s.id}>
                {s.visual}
                <div className="ap-card-text">
                  <span className="ap-num" aria-hidden="true">
                    {s.n}
                  </span>
                  <h2 id={s.id} lang={enLang(s.title)}>
                    {s.title}
                  </h2>
                  <p>{s.text}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <section className="ap-approach" aria-label="Çalışma yaklaşımım">
          <p>Mesajı netleştir.</p>
          <p>Görsel dili kur.</p>
          <p>Ritmi yakala.</p>
        </section>

        <p className="ap-tools">
          {tools.map((tool) => (
            <span key={tool.name}>{tool.name}</span>
          ))}
        </p>

        {hasCv && (
          <div className="ap-cv">
            <a className="ap-cv-link" href={CV_URL} target="_blank" rel="noopener noreferrer">
              CV’yi Gör <span aria-hidden="true">↗</span>
            </a>
            <a className="ap-cv-link" href={CV_URL} download>
              PDF İndir <span aria-hidden="true">↓</span>
            </a>
          </div>
        )}

        <BackLink className="ap-back-end" />
      </main>
    </div>
  );
};

export default AboutPage;
