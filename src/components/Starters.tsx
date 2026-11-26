import { enLang } from "../utils/lang";
import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { lockScroll, unlockScroll } from "./utils/scrollLock";
import "./styles/Career.css";

// The brief form is loaded only when a visitor opens it.
const BriefFlow = lazy(() => import("./BriefFlow"));

const cover = (file: string) => `${import.meta.env.BASE_URL}portfolio/${file}`;

/**
 * "Birlikte neler üretebiliriz?": three ways to begin. Each opens the same brief flow as
 * "Projeni anlat" with its service already chosen. The pictures are stills from works that
 * are already in Seçili İşler (PayPal, Allvex, Voop).
 */
const STARTERS = [
  { title: "Bir kampanyaya hareket kat", service: "Motion Design", image: "paypal.jpg" },
  { title: "Çekimlerini bir hikâyeye dönüştür", service: "Video Kurgu", image: "Allvex_Reels4.jpg" },
  { title: "Yeni bir görsel dünya kur", service: "AI Artist", image: "voop-karikatur.jpg" },
] as const;

const Starters = () => {
  const [services, setServices] = useState<string[] | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const open = (service: string, el: HTMLElement) => {
    opener.current = el;
    setServices([service]);
  };
  const close = useCallback(() => {
    setServices(null);
    window.requestAnimationFrame(() => opener.current?.focus?.());
  }, []);

  return (
    <section className="starters" aria-labelledby="starters-title">
      <h2 id="starters-title" className="career-title starters-title">
        Birlikte <span>neler</span> üretebiliriz?
      </h2>
      <p className="starters-lead">Bir başlangıç seç; brief formu hizmet seçili olarak açılsın.</p>
      <ul className="starters-list">
        {STARTERS.map((s) => (
          <li key={s.service}>
            <button type="button" className="starter" onClick={(e) => open(s.service, e.currentTarget)} data-cursor="disable">
              <img className="starter-img" src={cover(s.image)} alt="" loading="lazy" decoding="async" draggable={false} />
              <span className="starter-body">
                <span className="starter-service" lang={enLang(s.service)}>
                  {s.service}
                </span>
                <span className="starter-title">{s.title}</span>
              </span>
              <span className="starter-arrow" aria-hidden="true">
                →
              </span>
            </button>
          </li>
        ))}
      </ul>
      {services && (
        <Suspense fallback={null}>
          <BriefFlow initialServices={services} onClose={close} lock={lockScroll} unlock={unlockScroll} />
        </Suspense>
      )}
    </section>
  );
};

export default Starters;
