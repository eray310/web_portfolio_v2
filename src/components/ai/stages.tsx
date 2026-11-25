import { useEffect, useRef, useState } from "react";
import { MdCheck, MdPlayArrow } from "react-icons/md";
import { prefersReducedMotion } from "../../utils/motion";
import type { AiStage } from "../../data/aiWorks";
import { spaceBus } from "./spaceBus";
import { useActive } from "./useActive";
import { videoBudget } from "./videoBudget";
import "../styles/AiStages.css";

/**
 * The live explanations of /ai-isler: one short loop for each service.
 *
 * Every loop has an entrance, a development and a settling moment, then waits long enough to be
 * read and returns softly to the start. A loop runs only while its section is on screen and the tab
 * is visible; with "Hareketi azalt" it does not run at all and shows its finished composition.
 *
 * They are pictures: nothing inside a loop takes the keyboard focus or answers a click (the one real
 * control, "Tam videoyu aç", is an ordinary button). For a screen reader each loop is one figure
 * with a short text that says what it shows.
 */

const url = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

type Web = Extract<AiStage, { kind: "web" }>;
type Vid = Extract<AiStage, { kind: "video" }>;

/** Web Sitesi: a real browser is set up, the page is built block by block, the phone view joins, the page scrolls on. */
export const WebStage = ({ s }: { s: Web }) => {
  const ref = useRef<HTMLDivElement>(null);
  const motion = useRef(!prefersReducedMotion()).current;
  const active = useActive(ref, 0.3);
  return (
    <figure className="st-fig">
      <div ref={ref} className={`st-web${motion ? " is-motion" : ""}${active ? " is-live" : ""}`} aria-hidden="true">
        <div className="st-browser">
          <div className="st-bar">
            <i />
            <i />
            <i />
            <span>erayomeroglu.com</span>
          </div>
          <div className="st-view">
            {s.desktop.map((d, i) => (
              <img key={d.src} className={`st-page st-page-${i + 1}`} src={url(d.src)} alt="" loading="lazy" decoding="async" draggable={false} />
            ))}
            <div className="st-skel">
              <b className="k1" />
              <b className="k2" />
              <b className="k3" />
              <b className="k4" />
            </div>
          </div>
        </div>
        <div className="st-phone">
          <div className="st-pview">
            {s.phone.map((d, i) => (
              <img key={d.src} className={`st-ppage st-ppage-${i + 1}`} src={url(d.src)} alt="" loading="lazy" decoding="async" draggable={false} />
            ))}
          </div>
        </div>
      </div>
      <figcaption>
        <span className="ai-sr">{s.summary}</span>
        {s.caption}
      </figcaption>
    </figure>
  );
};

/**
 * Reklam Filmi ve Video: a short silent preview of a real work, with the three stages of the job as a
 * timeline underneath. "Tam videoyu aç" opens the whole video with its own controls.
 */
export const VideoStage = ({ s, id }: { s: Vid; id: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const full = useRef<HTMLVideoElement>(null);
  const head = useRef<HTMLSpanElement>(null);
  const motion = useRef(!prefersReducedMotion()).current;
  const active = useActive(ref, 0.35);
  const [open, setOpen] = useState(false);

  // The preview plays only while it is on screen, the tab is visible and no full video is open.
  useEffect(() => {
    const v = vid.current;
    if (!v || !motion || open) return;
    if (!active) {
      v.pause();
      return;
    }
    videoBudget.claim(id);
    void v.play().catch(() => {});
    return () => v.pause();
  }, [active, motion, open, id]);

  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    return videoBudget.register(id, () => v.pause());
  }, [id]);

  // The playhead follows the preview (one cheap frame callback, only while it plays).
  useEffect(() => {
    const v = vid.current;
    const h = head.current;
    if (!v || !h || !motion || !active || open) return;
    let raf = 0;
    const tick = () => {
      const p = v.duration ? v.currentTime / v.duration : 0;
      h.style.left = `${(p * 100).toFixed(2)}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, motion, open]);

  // An open player calms the space background and takes the keyboard focus into its own controls.
  useEffect(() => {
    if (open) full.current?.focus();
    spaceBus.playerOpen = open;
    return () => {
      spaceBus.playerOpen = false;
    };
  }, [open]);

  return (
    <figure className="st-fig">
      <div ref={ref} className="st-video">
        <div className="st-vframe" style={{ aspectRatio: String(s.ratio) }}>
          {open ? (
            <video ref={full} src={url(s.src)} poster={url(s.poster)} controls autoPlay playsInline preload="none" aria-label={s.caption} />
          ) : (
            <>
              <video ref={vid} src={url(s.preview)} poster={url(s.poster)} muted loop playsInline preload={motion ? "metadata" : "none"} aria-hidden="true" tabIndex={-1} />
              <button
                type="button"
                className="st-open"
                onClick={() => {
                  videoBudget.claim(id + "-full");
                  setOpen(true);
                }}
                data-cursor="disable"
              >
                <MdPlayArrow aria-hidden="true" />
                <span>Tam videoyu aç</span>
                <span className="ai-sr">: {s.caption}</span>
              </button>
            </>
          )}
        </div>
        <div className="st-timeline" aria-hidden="true">
          <div className="st-track">
            <b>Konsept</b>
            <b>Görsel</b>
            <b>Kurgu</b>
            {motion && !open && <span ref={head} className="st-head" />}
          </div>
        </div>
      </div>
      <figcaption>
        <span className="ai-sr">{s.summary}</span>
        {s.caption}
      </figcaption>
    </figure>
  );
};

// ── Uygulama Prototipleri ─────────────────────────────────────────────────────────────────────
// One loop of about twelve seconds. `step` tells how far it is; everything on screen is drawn from it.
const STEPS = [900, 500, 800, 450, 800, 800, 900, 450, 800, 1200, 500, 3400, 700];
const DONE = 11; // the finished composition (also what "Hareketi azalt" shows)
const OPTIONS = [
  { n: "Hizmet 1", d: "30 dk" },
  { n: "Hizmet 2", d: "45 dk" },
  { n: "Hizmet 3", d: "60 dk" },
];
const DAYS = ["Pzt", "Sal", "Çar"];
const TIMES = ["10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

/** Konsept prototip: choose a service, the choice travels to the next screen, choose a time, confirm. */
export const AppStage = ({ s }: { s: Extract<AiStage, { kind: "app" }> }) => {
  const ref = useRef<HTMLDivElement>(null);
  const motion = useRef(!prefersReducedMotion()).current;
  const active = useActive(ref, 0.35);
  const [step, setStep] = useState(DONE);

  useEffect(() => {
    if (!motion) {
      setStep(DONE);
      return;
    }
    if (!active) return;
    let i = step >= 12 ? 0 : step;
    let t = 0;
    const go = (n: number) => {
      setStep(n);
      t = window.setTimeout(() => go(n + 1 > 12 ? 0 : n + 1), STEPS[n] ?? 800);
    };
    // a section coming into view starts from the beginning, unless it was left in the middle
    go(i === DONE ? 0 : i);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, motion]);

  const screen = step < 4 ? 0 : step < 8 ? 1 : 2;
  const sel = step >= 2 ? 1 : -1;
  const aim = step === 1 ? 1 : -1;
  const day = step >= 5 ? 2 : -1;
  const time = step >= 6 ? 1 : -1;
  const reset = step === 12;
  const chosen = sel >= 0 ? `${OPTIONS[sel].n}${day >= 0 ? ` · ${DAYS[day] === "Çar" ? "Çarşamba" : DAYS[day]}` : ""}${time >= 0 ? ` ${TIMES[time]}` : ""}` : "Henüz seçim yok";

  return (
    <figure className="st-fig">
      <div ref={ref} className={`st-app${reset ? " is-reset" : ""}${motion ? "" : " is-still"}`} data-screen={screen} aria-hidden="true">
        <span className="st-concept">Konsept prototip</span>
        <div className="st-phones">
          <div className={`st-screen${screen === 0 ? " is-active" : ""}`}>
            <div className="st-ph">
              <b>Hizmet seç</b>
              {OPTIONS.map((o, i) => (
                <div key={o.n} className={`st-opt${sel === i ? " is-on" : ""}${aim === i ? " is-aim" : ""}`}>
                  <span>{o.n}</span>
                  <small>{o.d}</small>
                  {sel === i && <MdCheck />}
                </div>
              ))}
              <div className={`st-btn${step === 3 ? " is-press" : ""}`}>Devam</div>
            </div>
            <span className="st-cap">1. Hizmet seç</span>
          </div>
          <span className={`st-link${step >= 4 ? " is-on" : ""}`}>
            <i />
            <em>{sel >= 0 ? OPTIONS[sel].n : ""}</em>
          </span>
          <div className={`st-screen${screen === 1 ? " is-active" : ""}`}>
            <div className="st-ph">
              <b>Gün ve saat</b>
              <div className="st-days">
                {DAYS.map((d, i) => (
                  <span key={d} className={day === i ? "is-on" : ""}>
                    {d}
                  </span>
                ))}
              </div>
              <div className="st-times">
                {TIMES.map((t, i) => (
                  <span key={t} className={time === i ? "is-on" : ""}>
                    {t}
                  </span>
                ))}
              </div>
              <div className={`st-btn${step === 7 ? " is-press" : ""}`}>Devam</div>
            </div>
            <span className="st-cap">2. Gün ve saat</span>
          </div>
          <span className={`st-link${step >= 8 ? " is-on" : ""}`}>
            <i />
            <em>{day >= 0 && time >= 0 ? `${DAYS[day]} ${TIMES[time]}` : ""}</em>
          </span>
          <div className={`st-screen${screen === 2 ? " is-active" : ""}`}>
            <div className="st-ph">
              <b>Onayla</b>
              <div className={`st-sum${step >= 9 ? " is-on" : ""}`}>
                <span>{OPTIONS[1].n}</span>
                <span>Çarşamba</span>
                <span>{TIMES[1]}</span>
              </div>
              <div className={`st-ok${step >= 11 ? " is-on" : ""}`}>
                <MdCheck />
              </div>
              <div className={`st-btn is-main${step === 10 ? " is-press" : ""}`}>Onayla</div>
            </div>
            <span className="st-cap">3. Onayla</span>
          </div>
        </div>
        <p className="st-chosen">{chosen}</p>
      </div>
      <figcaption>
        <span className="ai-sr">{s.summary}</span>
        {s.caption}
      </figcaption>
    </figure>
  );
};
