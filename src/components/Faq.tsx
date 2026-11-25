import { lazy, Suspense, useCallback, useId, useRef, useState } from "react";
import { lockScroll, unlockScroll } from "./utils/scrollLock";
import "./styles/Faq.css";

// The brief form is loaded only when a visitor opens it.
const BriefFlow = lazy(() => import("./BriefFlow"));

/**
 * Five short questions before "İletişim". Answers use only the services that are on the site
 * (src/data/services.ts, src/data/brief.ts) and promise no fixed price, number of revisions or
 * delivery time.
 */
const FAQ = [
  {
    q: "Hangi tür projelerde birlikte çalışabiliriz?",
    a: "Motion design, video kurgu, grafik tasarım, art direction ve yapay zekâ destekli görsel ve film üretiminde çalışıyorum. Markalar için web sitesi, reklam filmi ve uygulama prototipi de hazırlıyorum.",
  },
  {
    q: "Başlamak için hangi dosyaları ve bilgileri göndermeliyim?",
    a: "Projenin amacını, kimin için olduğunu ve nerede yayınlanacağını kısaca yaz. Varsa logo, marka renkleri, referans bağlantıları ve ham görüntüleri ekle. Eksik kalan bir şey olursa birlikte netleştiririz.",
  },
  {
    q: "Elimde hazır görüntüler varsa kurgu yapabilir misin?",
    a: "Evet, video kurgu hizmetimin bir parçası bu. Elindeki görüntüleri bir akışa dönüştürür, metin ve geçişlerle tamamlarım. Brief’e görüntülerin ne olduğunu ve nasıl bir video istediğini yazman yeterli.",
  },
  {
    q: "Yapay zekâyı üretim sürecinde nasıl kullanıyorsun?",
    a: "Konsept geliştirme, sahne tasarımı ve video üretiminde kullanıyorum. Sonucu kurgu ve motion tasarımla tamamlıyorum. Hangi aşamada kullanılacağı projeye göre birlikte belirlenir.",
  },
  {
    q: "Bütçe ve teslim süresi nasıl belirleniyor?",
    a: "İşin kapsamına, formatına ve içeriğin ne kadarının hazır olduğuna göre belirleniyor. Brief’te bütçe aralığını ve hedef teslim tarihini yazarsan buna göre konuşuruz.",
  },
] as const;

const Faq = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [brief, setBrief] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const uid = useId();

  const close = useCallback(() => {
    setBrief(false);
    window.requestAnimationFrame(() => opener.current?.focus?.());
  }, []);

  return (
    <section className="faq section-container" id="sss" aria-labelledby="faq-title">
      <div className="faq-grid">
        <div className="faq-intro">
          <p className="faq-eyebrow">SSS · Sık sorulan sorular</p>
          <h3 id="faq-title">
            Aklında <span>kalanlar.</span>
          </h3>
          <p className="faq-lead">Cevabını burada bulamadıysan projeni birkaç cümleyle anlat, oradan devam edelim.</p>
          <button
            type="button"
            className="faq-cta"
            onClick={(e) => {
              opener.current = e.currentTarget;
              setBrief(true);
            }}
            aria-haspopup="dialog"
            data-cursor="disable"
          >
            Projeni anlat <span aria-hidden="true">→</span>
          </button>
        </div>
        <ul className="faq-list">
          {FAQ.map((item, i) => {
            const open = openIdx === i;
            const bid = `${uid}-b${i}`;
            const pid = `${uid}-p${i}`;
            return (
              <li key={item.q} className={`faq-item${open ? " is-open" : ""}`}>
                <h4>
                  <button type="button" id={bid} className="faq-q" aria-expanded={open} aria-controls={pid} onClick={() => setOpenIdx(open ? null : i)} data-cursor="disable">
                    <span className="faq-num" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="faq-text">{item.q}</span>
                    <span className="faq-icon" aria-hidden="true" />
                  </button>
                </h4>
                <div id={pid} role="region" aria-labelledby={bid} className="faq-panel">
                  <div className="faq-clip">
                    <p>{item.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {brief && (
        <Suspense fallback={null}>
          <BriefFlow onClose={close} lock={lockScroll} unlock={unlockScroll} />
        </Suspense>
      )}
    </section>
  );
};

export default Faq;
