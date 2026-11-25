import type { ReactNode } from "react";

/**
 * Texts of the legal pages (/kvkk, /gizlilik, /cerez-tercihleri).
 *
 * DRAFT: these are drafts written from what the site really does and from what the owner has
 * stated. Anything that could not be checked (from the code, from an account setting or from an
 * official source) is wrapped in <Todo> and shows as a highlighted "to be confirmed" note on the
 * page. When every <Todo> is settled: replace each one with the real text, then set DRAFT to
 * false (that also hides the draft notice on the pages).
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

/** The owner's contact address (also where the briefs arrive). */
export const CONTACT_EMAIL = "omerogluuerayy@gmail.com";

const year = new Date().getFullYear();
export const copyright = `© ${year} Eray Ömeroğlu. Tüm hakları saklıdır.`;

const Mail = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

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
          <h2>1. Veri sorumlusu ve iletişim</h2>
          <p>
            Siteyi kendi adıma işletiyorum; veri sorumlusu <strong>Eray Ömeroğlu</strong>'dur.
          </p>
          <ul>
            <li>
              E-posta: <Mail />
            </li>
            <li>KVKK başvuruları: sitedeki KVKK Başvuru Formu (ayrıntı 8. bölümde).</li>
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
              Barındırma sağlayıcısının (Vercel) sunucu kayıtlarında tutulabilen teknik bilgiler: IP adresi, tarayıcı ve cihaz bilgisi, istek zamanı ve istenen adres.{" "}
              <Todo>[Kayıtların tam kapsamı bu projenin ayarlarında doğrulanmadı]</Todo>
            </li>
          </ul>
          <p>Site yazı tiplerini bir yazı tipi sunucusundan değil, senin cihazındaki sistem yazı tiplerinden alır; bu yüzden böyle bir sunucuya istek gitmez.</p>
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
          <p>Brief bilgilerin pazarlama, bülten veya kampanya için kullanılmaz ve bu amaçla bir listeye eklenmez.</p>
        </section>

        <section>
          <h2>4. Toplama yöntemi ve hukuki sebep</h2>
          <p>Veriler, sitedeki formu doldurman ve tarayıcının sunucuya yaptığı istekler yoluyla elektronik ortamda toplanır.</p>
          <p>
            <Todo>[Aşağıdaki hukuki sebepler taslaktır; yayından önce onayınız gerekli]</Todo>
          </p>
          <ul>
            <li>Brief'in değerlendirilmesi ve sana dönülmesi: bir sözleşmenin kurulmasına yönelik talebin gereği olarak (KVKK m.5/2-c).</li>
            <li>Form güvenliği, kötüye kullanımın önlenmesi ve sunucu kayıtları: veri sorumlusunun meşru menfaati (KVKK m.5/2-f).</li>
            <li>Kanunda açıkça öngörülen ve hukuki yükümlülüğün gerektirdiği işlemler (KVKK m.5/2-a ve 5/2-ç).</li>
          </ul>
        </section>

        <section>
          <h2>5. Verilerin kimlere ve hangi amaçla aktarılabileceği</h2>
          <ul>
            <li>
              <strong>Vercel Inc.:</strong> siteyi ve form uç noktasını barındıran hizmet sağlayıcı. Amaç: sitenin yayında tutulması ve formun çalışması. Form gönderimi Vercel'in sunucusuz fonksiyonu (/api/idea) üzerinden geçer; yani brief'in içeriği iletim sırasında Vercel altyapısından geçer. Fonksiyon brief'in içeriğini kendisi kaydetmez veya günlüğe yazmaz; Vercel'in kendi istek ve çalışma günlüklerinin kapsamı ise doğrulanmamıştır.
            </li>
            <li>
              <strong>Resend:</strong> brief'in e-posta olarak bana iletilmesini sağlayan e-posta gönderim hizmeti. Amaç: gönderdiğin brief'in tarafıma ulaşması.
            </li>
            <li>
              <strong>Google (Gmail):</strong> brief'in ulaştığı <Mail /> posta kutusunu işleten e-posta sağlayıcısı. Amaç: brief'i okuyup yanıtlayabilmem.
            </li>
            <li>Yasal bir yükümlülük doğarsa yetkili kamu kurum ve kuruluşları, yalnızca talep edilen kapsamda.</li>
          </ul>
          <p>
            Bu hizmet sağlayıcıların sunucuları yurt dışındadır. Vercel kendi sözleşme metninde birincil işleme tesislerinin ABD'de olduğunu belirtir; yeni projelerde fonksiyonlar varsayılan olarak ABD'de Washington, D.C. bölgesinde (iad1) çalışır. Resend, işlemenin ABD'de yapıldığını ve gönderim için AWS'yi (ABD) kullandığını belirtir. Bu nedenle brief bilgilerin yurt dışına aktarılır ve aktarım KVKK m.9 kapsamındadır.
          </p>
          <p>
            <Todo>
              [Doğrulanamadı: (1) bu projenin Vercel fonksiyon bölgesi ve hesabın planı; (2) Resend hesabının veri bölgesi; (3) KVKK m.9'a göre bu aktarımın dayanağı (yeterlilik kararı, uygun güvenceler veya arızi hâl) ve 2024 değişikliğinin yürürlük tarihi. Sağlayıcıların kendi metinlerinde Avrupa Komisyonu'nun standart sözleşme maddelerine ve (Resend için) AB-ABD Veri Gizliliği Çerçevesi'ne atıf vardır; bunlar Türkiye'deki aktarım dayanağının yerine geçmez.]
            </Todo>
          </p>
        </section>

        <section>
          <h2>6. Saklama süresi</h2>
          <ul>
            <li>
              <strong>Brief e-postaları:</strong>{" "}
              <Todo>[Saklama süresi taslakta bekleyen bilgi: belirlenip doğrulanınca yazılacak. Gmail çöp kutusu, Google'ın sağlayıcı kayıtları ve yedekler için süre de doğrulanmadı]</Todo>
            </li>
            <li>
              <strong>Vercel sunucu kayıtları:</strong> süre Vercel hesabının planına göre değişir (Vercel belgelerinde Hobby için 1 saat, Pro için 1 gün, Observability Plus ile 30 güne kadar).{" "}
              <Todo>[Bu sitenin planı ve gerçek süre doğrulanmadı]</Todo>
            </li>
            <li>
              <strong>Resend:</strong> <Todo>[Resend'de gönderilen e-postanın içeriğinin ve kayıtlarının ne kadar süre tutulduğu doğrulanmadı]</Todo>
            </li>
            <li>
              <strong>Form hız sınırı:</strong> IP adresin yalnızca sunucu fonksiyonunun belleğinde, birkaç dakikalık bir pencere için sayılır; ayrı bir kayıt tutulmaz.
            </li>
          </ul>
          <p>Amaç ortadan kalktığında veriler silinir, yok edilir veya anonim hâle getirilir.</p>
        </section>

        <section>
          <h2>7. İlgili kişi olarak haklarınız</h2>
          <p>KVKK'nın 11. maddesi uyarınca veri sorumlusuna başvurarak şunları isteyebilirsin:</p>
          <Rights />
        </section>

        <section>
          <h2>8. Başvuru usulü</h2>
          <p>
            Başvuru, “Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ”in 5. maddesinde sayılan yollarla yapılır. Tebliğ, başvurunun başvuru amacına yönelik geliştirilmiş bir yazılım ya da uygulama vasıtasıyla yapılmasına da izin verir; bu sitede başvuru için ayrı bir <strong>KVKK Başvuru Formu</strong> hazırlanmaktadır. Başvuruyu şu iki yoldan yapabilirsin:
          </p>
          <ul>
            <li>
              <strong>KVKK Başvuru Formu:</strong> kimliğini ve talebini form üzerinden gönderirsin. Form, başvurunu brief formundan ayrı tutar; başvuru bilgilerin Türkiye'deki bir sunucuya iletilir ve şifrelenerek saklanır; başvurunu aldığımda sana bir başvuru numarası gösterilir.{" "}
              <Todo>[KVKK Başvuru Formu henüz yapılmadı; hazır olunca bağlantısı buraya eklenecek. Türkiye'deki sunucu ve şifreli saklama cümlesi de kurulum yapılınca doğrulanacak]</Todo>
            </li>
            <li>
              <strong>Normal e-posta:</strong> daha önce veri sorumlusuna bildirdiğin ve sistemde kayıtlı e-posta adresinden <Mail /> adresine yazarak başvurabilirsin. Tebliğ'e göre bu yol, adresin veri sorumlusunun sisteminde kayıtlı olmasına bağlıdır; adresin kayıtlı değilse KVKK Başvuru Formu'nu kullan veya kimliğini doğrulamak için ek bilgi isteyebilirim.{" "}
              <Todo>[Bu yorum yayından önce sizin tarafınızdan ve gerekirse bir hukukçu tarafından doğrulanmalı]</Todo>
            </li>
          </ul>
          <p>
            Başvuruda şunlar bulunmalıdır: adın ve soyadın; T.C. kimlik numaran (yabancıysan uyruğun ve pasaport ya da kimlik numaran); yanıtın gönderileceği yerleşim yeri veya iş yeri adresin; varsa e-posta, telefon ve faks bilgilerin; talebinin konusu. İstersen belge de ekleyebilirsin.
          </p>
          <p>
            Başvurun, talebin niteliğine göre en geç otuz gün içinde ve ücretsiz olarak sonuçlandırılır; işlemin ayrı bir maliyeti varsa Kurul'un belirlediği tarifedeki ücret istenebilir. Yanıt yazılı veya elektronik ortamda verilir. Başvurun reddedilirse, yanıtı yetersiz bulursan ya da süresinde yanıt alamazsan, yanıtı öğrendiğin tarihten itibaren otuz gün içinde ve her hâlde başvuru tarihinden itibaren altmış gün içinde Kişisel Verileri Koruma Kurulu'na şikâyette bulunabilirsin (KVKK m.13 ve m.14).
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
            <li>Sitede çerez, reklam veya ziyaretçi takip aracı kullanılmıyor.</li>
            <li>Sayfalar hiçbir yazı tipi sunucusuna istek göndermez; senin cihazındaki sistem yazı tipleri kullanılır.</li>
            <li>Yalnızca brief formunu gönderirsen adını, e-postanı ve projeni anlatan bilgileri alıyorum.</li>
            <li>Brief bilgilerin pazarlama, bülten veya kampanya için kullanılmaz.</li>
            <li>Formu yazarken girdiklerin gönderene kadar yalnızca tarayıcında durur.</li>
          </ul>
        </section>

        <section>
          <h2>Siteyi gezerken</h2>
          <ul>
            <li>
              <strong>Sunucu kayıtları.</strong> Siteyi barındıran Vercel, her istekte IP adresi, tarayıcı bilgisi ve istenen adres gibi teknik bilgileri sunucu kayıtlarında tutabilir.{" "}
              <Todo>[Kapsam ve süre bu projenin ayarlarında doğrulanmadı]</Todo>
            </li>
            <li>
              <strong>Yazı tipleri.</strong> Dış bir yazı tipi hizmeti kullanılmaz; metinler cihazındaki sistem yazı tipleriyle gösterilir.
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
          <p>Bu bilgileri seninle iletişime geçmek, projeni değerlendirmek ve teklif hazırlamak için kullanırım; başka bir amaçla kullanmam.</p>
        </section>

        <section>
          <h2>Bilgiler kimlerle paylaşılır?</h2>
          <p>
            Siteyi ve form uç noktasını barındıran Vercel, e-postayı ileten Resend ve brief'in ulaştığı Gmail kutusunu işleten Google bu bilgilere teknik olarak erişebilir. Bu sağlayıcıların sunucuları yurt dışındadır (ayrıntı için KVKK Aydınlatma Metni, 5. bölüm). Bunun dışında bilgilerin kimseyle paylaşılmaz; yasal bir zorunluluk doğarsa yetkili kurumlar bunun istisnasıdır.
          </p>
        </section>

        <section>
          <h2>Ne kadar süre saklanır?</h2>
          <p>
            <Todo>[Saklama süresi taslakta bekleyen bilgi: belirlenip doğrulanınca yazılacak. Gmail, Vercel ve Resend kayıtları için süre doğrulanmadı]</Todo>
          </p>
        </section>

        <section>
          <h2>Haklarınız ve başvuru</h2>
          <p>
            Verilerine erişmek, düzeltilmesini ya da silinmesini istemek veya bir sorunu bildirmek için bana yazabilirsin: <Mail />. Haklarının tam listesi ve resmî başvuru usulü <a href="/kvkk">KVKK Aydınlatma Metni</a>'nde yer alır. Kişisel Verileri Koruma Kurulu'na şikâyet hakkın da saklıdır.
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
