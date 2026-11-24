import type { ReactNode } from "react";

/**
 * Texts of the legal pages (/kvkk, /gizlilik, /cerez-tercihleri).
 *
 * DRAFT: these are drafts written from what the site really does. Anything that could not be
 * checked from the code is wrapped in <Todo> and shows as a highlighted "to be confirmed" note
 * on the page. When every <Todo> is settled: replace each one with the real text, then set
 * DRAFT to false (that also hides the draft notice on the pages).
 */
export const DRAFT = true;

/** A fact that could not be verified: shown highlighted while DRAFT is on. */
export const Todo = ({ children }: { children: ReactNode }) =>
  DRAFT ? (
    <mark className="legal-todo" title="Doğrulanmadı: yayından önce onaylanmalı">
      {children}
    </mark>
  ) : (
    <>{children}</>
  );

export type LegalKey = "kvkk" | "gizlilik" | "cerez-tercihleri";

export type LegalDoc = {
  title: string;
  lead: string;
  body: ReactNode;
};

const year = new Date().getFullYear();
export const copyright = `© ${year} Eray Ömeroğlu. Tüm hakları saklıdır.`;

const Rights = () => (
  <ul>
    <li>Kişisel verilerinin işlenip işlenmediğini öğrenme,</li>
    <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
    <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
    <li>Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme,</li>
    <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
    <li>Kanunda öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme,</li>
    <li>Düzeltme, silme ve yok etme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
    <li>İşlenen verilerin münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhine bir sonuç çıkmasına itiraz etme,</li>
    <li>Kanuna aykırı işlenmesi nedeniyle zarara uğraman hâlinde zararın giderilmesini talep etme.</li>
  </ul>
);

export const docs: Record<LegalKey, LegalDoc> = {
  kvkk: {
    title: "KVKK Aydınlatma Metni",
    lead: "6698 sayılı Kişisel Verilerin Korunması Kanunu'nun (KVKK) 10. maddesi uyarınca, bu sitede kişisel verilerinin nasıl işlendiğini sana anlatıyorum. Bu metin bir bilgilendirmedir; onaylaman gereken bir kutu ya da verdiğin bir rıza değildir.",
    body: (
      <>
        <section>
          <h2>1. Veri sorumlusu</h2>
          <p>
            Veri sorumlusu <strong>Eray Ömeroğlu</strong>'dur. <Todo>[Unvan: gerçek kişi mi şirket mi, doğrulanmadı]</Todo>
          </p>
          <ul>
            <li>
              Adres: <Todo>[adres: sizden gerekli]</Todo>
            </li>
            <li>
              Başvuru kanalı: <Todo>[e-posta adresi ve varsa KEP adresi: sizden gerekli]</Todo>
            </li>
          </ul>
        </section>

        <section>
          <h2>2. İşlenen kişisel veriler</h2>
          <p>Proje brief formunu (“Projeni anlat”, “Bir fikrim var”) gönderirsen:</p>
          <ul>
            <li>Kimlik ve iletişim: ad, e-posta adresi, varsa marka veya şirket adı.</li>
            <li>Talep bilgisi: seçtiğin hizmetler, proje tarifi (metne yazdığın her bilgi), varsa hedef teslim tarihi, bütçe aralığı ve referans bağlantısı.</li>
            <li>Form güvenliği: formu doldurma süresi, gizli kontrol alanının boş olup olmadığı ve gönderimin yapıldığı IP adresi (kısa süreli hız sınırı için).</li>
          </ul>
          <p>Siteyi yalnızca ziyaret edersen:</p>
          <ul>
            <li>
              Barındırma sağlayıcısının sunucu kayıtlarında tutulabilen teknik bilgiler: IP adresi, tarayıcı ve cihaz bilgisi, istek zamanı ve istenen adres.{" "}
              <Todo>[Kayıtların tam kapsamı ve süresi üretim ayarlarında doğrulanmadı]</Todo>
            </li>
            <li>Yazı tiplerini yüklemek için tarayıcın Google'ın sunucularına istek gönderir; bu istekte IP adresin ve tarayıcı bilgin Google'a ulaşır.</li>
          </ul>
          <p>Lütfen proje tarifine özel nitelikli kişisel veri (sağlık, din, dernek üyeliği gibi) yazma; projen için gerekmiyor.</p>
        </section>

        <section>
          <h2>3. İşleme amaçları</h2>
          <ul>
            <li>Gönderdiğin brief'i değerlendirmek, sana yanıt vermek ve proje görüşmesini yürütmek.</li>
            <li>Formun kötüye kullanılmasını (otomatik gönderimler, istenmeyen mesajlar) önlemek ve siteyi güvenli tutmak.</li>
            <li>Sitenin çalışması için gerekli teknik işlemleri yürütmek.</li>
            <li>Hukuki yükümlülükleri yerine getirmek.</li>
          </ul>
          <p>
            Verilerin pazarlama listesi oluşturmak ya da brief dışı bir amaçla kullanılmaz.{" "}
            <Todo>[Bu cümle sizin uygulamanıza göre doğrulanmalı]</Todo>
          </p>
        </section>

        <section>
          <h2>4. Toplama yöntemi ve hukuki sebep</h2>
          <p>
            <Todo>[Hukuki sebepler taslaktır, onayınız gerekli]</Todo>
          </p>
          <p>Veriler, sitedeki formu doldurman ve tarayıcının sunucuya yaptığı istekler yoluyla elektronik ortamda toplanır.</p>
          <ul>
            <li>
              Brief'in değerlendirilmesi ve sana dönülmesi: bir sözleşmenin kurulmasına yönelik talebin gereği olarak (KVKK m.5/2-c).</li>
            <li>
              Form güvenliği, kötüye kullanımın önlenmesi ve sunucu kayıtları: veri sorumlusunun meşru menfaati (KVKK m.5/2-f).
            </li>
            <li>Kanunda açıkça öngörülen ve hukuki yükümlülüğün gerektirdiği işlemler (KVKK m.5/2-a ve 5/2-ç).</li>
          </ul>
        </section>

        <section>
          <h2>5. Verilerin kimlere ve hangi amaçla aktarılabileceği</h2>
          <ul>
            <li>
              <strong>Vercel Inc.:</strong> siteyi ve form uç noktasını barındıran hizmet sağlayıcı. Amaç: sitenin yayında tutulması ve formun çalışması.
            </li>
            <li>
              <strong>Resend:</strong> brief'in e-posta olarak bana iletilmesini sağlayan e-posta gönderim hizmeti. Amaç: gönderdiğin brief'in tarafıma ulaşması.
            </li>
            <li>
              <strong>E-posta kutusu sağlayıcım:</strong> brief'in ulaştığı posta kutusunu işleten hizmet. <Todo>[Sağlayıcı: sizden gerekli]</Todo>
            </li>
            <li>
              <strong>Google:</strong> yazı tiplerinin sunulması (IP adresi ve tarayıcı bilgisi).
            </li>
            <li>Yasal bir yükümlülük doğarsa yetkili kamu kurum ve kuruluşları, yalnızca talep edilen kapsamda.</li>
          </ul>
          <p>
            Bu hizmet sağlayıcıların sunucuları yurt dışında olabilir; bu durumda aktarım KVKK m.9 çerçevesinde yapılır.{" "}
            <Todo>[Vercel ve Resend hesap bölgesi ile aktarımın dayanağı (yeterlilik kararı, uygun güvenceler vb.): üretim ayarlarında doğrulanmadı]</Todo>
          </p>
        </section>

        <section>
          <h2>6. Saklama süresi</h2>
          <p>
            <Todo>[Brief e-postalarının ve sunucu kayıtlarının saklama süresi: sizden gerekli]</Todo> Amaç ortadan kalktığında veriler silinir, yok edilir veya anonim hâle getirilir.
          </p>
        </section>

        <section>
          <h2>7. İlgili kişi olarak haklarınız</h2>
          <p>KVKK'nın 11. maddesi uyarınca veri sorumlusuna başvurarak şunları isteyebilirsin:</p>
          <Rights />
          <p>
            Başvurunu, yukarıdaki başvuru kanalından yazılı olarak veya (varsa) KEP adresi ya da daha önce bildirdiğin e-posta adresi üzerinden iletebilirsin. Başvurunda kimliğini, talebini ve yanıtın nereye gönderileceğini açıkça yazman gerekir. Başvuruların, talebin niteliğine göre en geç otuz gün içinde sonuçlandırılır. Yanıttan memnun kalmazsan ya da yanıt alamazsan Kişisel Verileri Koruma Kurulu'na şikâyette bulunma hakkın saklıdır (KVKK m.13 ve m.14).
          </p>
        </section>
      </>
    ),
  },

  gizlilik: {
    title: "Gizlilik Politikası",
    lead: "Bu sayfa, siteyi gezerken ve proje brief'i gönderirken hangi bilgilerin kullanıldığını, ne için kullanıldığını ve nereye başvurabileceğini sade bir dille anlatır. Ayrıntılı hukuki bilgilendirme için KVKK Aydınlatma Metni'ne bak.",
    body: (
      <>
        <section>
          <h2>Kısaca</h2>
          <ul>
            <li>
              Sitede çerez, reklam veya ziyaretçi takip aracı kullanılmıyor.
            </li>
            <li>Yalnızca brief formunu gönderirsen adını, e-postanı ve projeni anlatan bilgileri alıyorum.</li>
            <li>Formu yazarken girdiklerin gönderene kadar yalnızca tarayıcında durur.</li>
          </ul>
        </section>

        <section>
          <h2>Siteyi gezerken</h2>
          <ul>
            <li>
              <strong>Sunucu kayıtları.</strong> Siteyi barındıran Vercel, her istekte IP adresi, tarayıcı bilgisi ve istenen adres gibi teknik bilgileri sunucu kayıtlarında tutabilir.</li>
            <li>
              <strong>Yazı tipleri.</strong> Sayfalar Google'ın yazı tipi hizmetinden yazı tiplerini yükler. Bu sırada IP adresin ve tarayıcı bilgin Google'a ulaşır. Google'ın bu verileri nasıl kullandığı kendi politikasına bağlıdır.
            </li>
            <li>
              <strong>Videolar, görseller ve 3D sahne</strong> sitenin kendi sunucusundan gelir.
            </li>
            <li>Behance ve LinkedIn bağlantıları seni bu hizmetlerin sitelerine götürür; orada onların politikaları geçerlidir.</li>
          </ul>
        </section>

        <section>
          <h2>Proje brief'i gönderirken</h2>
          <p>Formda şunlar istenir: yapmak istediğin iş türü, projenin kısa tarifi, adın, e-postan. Hedef tarih, bütçe aralığı, referans bağlantısı ve marka adı isteğe bağlıdır.</p>
          <ul>
            <li>Üç adım boyunca yazdıkların, sayfayı yenilesen kaybolmasın diye tarayıcının geçici belleğinde (oturum depolaması) taslak olarak tutulur. Bu taslak sunucuya gönderilmez ve sekmeyi kapatınca silinir.</li>
            <li>“Gönder”e basınca bilgilerin sitenin form uç noktasına (/api/idea) gider. Orada kontrol edilir ve e-posta servisi (Resend) aracılığıyla bana iletilir. “Gönderildi” mesajı yalnızca e-posta servisi gönderimi kabul ettiğinde görünür.</li>
            <li>Spam'i ayıklamak için formun doldurulma süresine ve gizli bir kontrol alanına bakılır. Kısa süreli hız sınırı için IP adresin geçici olarak sunucunun belleğinde sayılır.</li>
          </ul>
          <p>
            Bu bilgileri seninle iletişime geçmek, projeni değerlendirmek ve teklif hazırlamak için kullanırım.
          </p>
        </section>

        <section>
          <h2>Bilgiler kimlerle paylaşılır?</h2>
          <p>
            Siteyi ve form uç noktasını barındıran Vercel, e-postayı ileten Resend ve brief'in ulaştığı e-posta kutusunu işleten sağlayıcı bu bilgilere teknik olarak erişebilir. Bunun dışında bilgilerin kimseyle paylaşılmaz; yasal bir zorunluluk doğarsa yetkili kurumlar bunun istisnasıdır.
          </p>
        </section>

        <section>
          <h2>Ne kadar süre saklanır?</h2>
          <p>
            <Todo>[Saklama süresi: sizden gerekli]</Todo>
          </p>
        </section>

        <section>
          <h2>Haklarınız ve başvuru</h2>
          <p>
            Verilerine erişmek, düzeltilmesini ya da silinmesini istemek veya bir sorunu bildirmek için bana yazabilirsin: <Todo>[e-posta adresi: sizden gerekli]</Todo>. Haklarının tam listesi ve başvuru usulü <a href="/kvkk">KVKK Aydınlatma Metni</a>'nde yer alır. Kişisel Verileri Koruma Kurulu'na şikâyet hakkın da saklıdır.
          </p>
        </section>

        <section>
          <h2>Bu politika değişirse</h2>
          <p>Sitede yeni bir veri işleme türü eklenirse bu sayfa ve KVKK Aydınlatma Metni önce güncellenir.</p>
        </section>
      </>
    ),
  },

  "cerez-tercihleri": {
    title: "Çerez Tercihleri",
    lead: "Bu sitede kullanılan çerezleri ve benzeri teknolojileri, ne için kullanıldıklarını ve neleri değiştirebileceğini buradan görebilirsin.",
    body: null, // drawn by CookiePrefs in LegalPage.tsx (it has a working control)
  },
};
