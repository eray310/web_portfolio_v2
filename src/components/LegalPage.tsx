import { useEffect, useState } from "react";
import "./styles/AiWorksPage.css";
import "./styles/LegalPage.css";

const DRAFT_STORAGE_KEY = "brief-draft-v1"; // same key as BriefFlow.tsx
const copyright = `© ${new Date().getFullYear()} Eray Ömeroğlu. Tüm hakları saklıdır.`;

/** What the site really stores or loads (checked in the code and in the production build). */
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
          Bu sitede <strong>çerez kullanılmıyor</strong>; reklam, analitik veya ziyaretçi takibi için izleyici de yok. Sayfalar üçüncü taraf bir yazı tipi sunucusuna da istek göndermez: yazı tipleri senin cihazında kurulu sistem yazı tipleridir. Rıza gerektiren isteğe bağlı bir teknoloji kullanılmadığı için çerez bandı göstermiyorum ve açıp kapatabileceğin bir seçenek yok. İleride böyle bir teknoloji eklenirse bu sayfa önce güncellenir.
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
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Çerez</th>
                <td data-label="Amaç">Kullanılmıyor.</td>
                <td data-label="Süre">—</td>
                <td data-label="Kimin">—</td>
              </tr>
              <tr>
                <th scope="row">Oturum depolaması (brief-draft-v1)</th>
                <td data-label="Amaç">Brief formunu yazarken sayfa yenilense bile taslağının kaybolmaması. Sunucuya gönderilmez; form gönderilince silinir.</td>
                <td data-label="Süre">Sekme kapanana kadar</td>
                <td data-label="Kimin">Bu site (birinci taraf)</td>
              </tr>
              <tr>
                <th scope="row">Yazı tipi sunucusu</th>
                <td data-label="Amaç">Kullanılmıyor; sistem yazı tipleri gösterilir.</td>
                <td data-label="Süre">—</td>
                <td data-label="Kimin">—</td>
              </tr>
              <tr>
                <th scope="row">Analitik, reklam, sosyal medya izleyicileri</th>
                <td data-label="Amaç">Kullanılmıyor.</td>
                <td data-label="Süre">—</td>
                <td data-label="Kimin">—</td>
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
    </>
  );
};

const LegalPage = () => {
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
        <h1>Çerez Tercihleri</h1>
        <p className="legal-lead">Bu sayfa, sitede çerez veya benzeri teknolojilerin kullanılıp kullanılmadığını ve neleri değiştirebileceğini gösterir.</p>
        <CookiePrefs />
      </main>

      <footer className="ai-foot legal-foot">
        <p>{copyright}</p>
      </footer>
    </div>
  );
};

export default LegalPage;
