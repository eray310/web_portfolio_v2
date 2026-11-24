import { useEffect, useState } from "react";
import { copyright, DRAFT, docs, Todo, type LegalKey } from "./legalDocs";
import "./styles/AiWorksPage.css";
import "./styles/LegalPage.css";

const DRAFT_STORAGE_KEY = "brief-draft-v1"; // same key as BriefFlow.tsx

/** What the site really stores or loads; see the notes in legalDocs.tsx. */
const CookiePrefs = () => {
  const [cleared, setCleared] = useState(false);
  const [has, setHas] = useState(false);
  useEffect(() => {
    try {
      setHas(window.sessionStorage.getItem(DRAFT_STORAGE_KEY) !== null);
    } catch {
      setHas(false);
    }
  }, [cleared]);

  const clear = () => {
    try {
      window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      /* storage blocked: nothing to clear */
    }
    setCleared(true);
  };

  return (
    <>
      <section>
        <h2>Şu anki durum</h2>
        <p>
          Bu sitede <strong>çerez kullanılmıyor</strong>; reklam, analitik veya ziyaretçi takibi için izleyici de yok. Rıza gerektiren isteğe bağlı bir teknoloji olmadığı için çerez bandı göstermiyoruz ve açıp kapatabileceğin bir seçenek yok. İleride böyle bir teknoloji eklenirse varsayılan olarak kapalı gelir ve tercihini buradan değiştirebilirsin.
        </p>
      </section>

      <section>
        <h2>Kullanılan teknolojiler</h2>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <caption className="sr-only">Sitede kullanılan teknolojiler</caption>
            <thead>
              <tr>
                <th scope="col">Teknoloji</th>
                <th scope="col">Amaç</th>
                <th scope="col">Süre</th>
                <th scope="col">Kimin</th>
                <th scope="col">Rıza gerekir mi?</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Çerez</th>
                <td>Kullanılmıyor.</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
              </tr>
              <tr>
                <th scope="row">Oturum depolaması (brief-draft-v1)</th>
                <td>Brief formunu yazarken sayfa yenilense bile taslağının kaybolmaması. Sunucuya gönderilmez.</td>
                <td>Sekme kapanana kadar</td>
                <td>Bu site (birinci taraf)</td>
                <td>
                  Hayır, istediğin hizmetin (formun) çalışması için gerekli.
                </td>
              </tr>
              <tr>
                <th scope="row">Google yazı tipleri (fonts.googleapis.com, fonts.gstatic.com)</th>
                <td>Sayfaların yazı tipini yüklemek. Çerez değildir; ama istek sırasında IP adresin ve tarayıcı bilgin Google'a ulaşır.</td>
                <td>Her sayfa yüklemesinde</td>
                <td>Google (üçüncü taraf)</td>
                <td>
                  <Todo>[Rıza gerekip gerekmediği ve yazı tiplerini kendi sunucumuza alma kararı: sizden gerekli]</Todo>
                </td>
              </tr>
              <tr>
                <th scope="row">Analitik, reklam, sosyal medya izleyicileri</th>
                <td>Kullanılmıyor.</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Tercihin</h2>
        <p>Değiştirebileceğin tek şey, tarayıcında kalan brief taslağıdır.</p>
        <button type="button" className="legal-btn" onClick={clear} disabled={!has && !cleared}>
          Kayıtlı brief taslağını sil
        </button>
        <p className="legal-status" role="status">
          {cleared ? "Kayıtlı brief taslağı silindi." : has ? "Bu tarayıcıda kayıtlı bir brief taslağı var." : "Bu tarayıcıda kayıtlı bir brief taslağı yok."}
        </p>
      </section>

      <section>
        <h2>Daha fazla bilgi</h2>
        <p>
          Verilerinin nasıl işlendiği için <a href="/gizlilik">Gizlilik Politikası</a> ve <a href="/kvkk">KVKK Aydınlatma Metni</a> sayfalarına bak.
        </p>
      </section>
    </>
  );
};

const LegalPage = ({ doc }: { doc: LegalKey }) => {
  const d = docs[doc];

  useEffect(() => {
    document.body.style.overflowY = "auto";
    document.body.style.backgroundColor = "#080b11";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="ai legal">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
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
              <a href="/ai-isler">AI İşler</a>
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

      <main id="main" tabIndex={-1} className="legal-main">
        <h1>{d.title}</h1>
        {DRAFT && (
          <p className="legal-draft" role="note">
            <strong>Taslak.</strong> Bu metin yayından önce gözden geçirilmeli. Sarı işaretli yerler doğrulanamadı ya da senden bilgi bekliyor.
          </p>
        )}
        <p className="legal-lead">{d.lead}</p>
        {doc === "cerez-tercihleri" ? <CookiePrefs /> : d.body}
      </main>

      <footer className="ai-foot legal-foot">
        <nav aria-label="Yasal sayfalar">
          <a href="/gizlilik">Gizlilik</a>
          <a href="/kvkk">KVKK Aydınlatma Metni</a>
          <a href="/cerez-tercihleri">Çerez Tercihleri</a>
        </nav>
        <p>{copyright}</p>
      </footer>
    </div>
  );
};

export default LegalPage;
