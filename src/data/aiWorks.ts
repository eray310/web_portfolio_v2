/**
 * Content of /ai-isler ("AI İşler"): the opening, one section for each of the three services, and
 * the way of working that closes the page.
 *
 * Each section reads in this order: a big title, one sentence, the service shown as a short live loop
 * (see src/components/ai/stages.tsx), the scope. "Projeni anlat" opens the brief form with `service`
 * already chosen (`service` must be one of the labels in src/data/brief.ts).
 *
 * ADDING REAL WORK LATER - everything happens in this file:
 *   - Web Sitesi: put screenshots in public/ai-works/web-sitesi/ and list them in `stage.desktop`
 *     (browser, 16:9) and `stage.phone` (phone, tall). The first picture is the one that is built up;
 *     the second one is scrolled to. One picture each is enough.
 *   - Reklam Filmi ve Video: a short silent preview (6-10 s, about 400 px wide, no sound) as `preview`, the
 *     cover as `poster`, the whole video as `src` (it is fetched only when "Tam videoyu aç" is pressed).
 *   - Uygulama Prototipleri: the loop is drawn in code (a concept); real screens would replace it.
 * Paths for files that already live in the portfolio (public/portfolio/...) work the same way.
 *
 * Only things that really exist belong here: no invented clients, results, scores or finished work.
 * Things that are a sketch or an idea carry the label "Konsept prototip".
 */
export type AiStage =
  | {
      kind: "web";
      /** Browser pictures (the second one is scrolled to). */
      desktop: { src: string; alt: string }[];
      /** Phone pictures (the second one is scrolled to). */
      phone: { src: string; alt: string }[];
      caption: string;
      /** Read out by a screen reader instead of the moving picture. */
      summary: string;
    }
  | {
      kind: "video";
      /** Short silent clip (a real cut of the work). */
      preview: string;
      /** The whole video, played with its own controls on request. */
      src: string;
      poster: string;
      /** Width / height. */
      ratio: number;
      caption: string;
      summary: string;
    }
  | {
      kind: "app";
      caption: string;
      summary: string;
    };

export type AiWork = {
  id: string;
  title: string;
  /** Label of the brief service that "Projeni anlat" chooses (see src/data/brief.ts). */
  service: string;
  summary: string;
  /** At most three concrete outputs. */
  outputs: string[];
  /** Second level ("Kapsam ayrıntıları"): the fuller scope and what is confirmed about the example. */
  details: string[];
  stage: AiStage;
};

/** The opening: title, one line, and the showreel in a vertical frame. */
export const aiHero = {
  title: "AI İşler",
  lead: "Markalar için web siteleri, reklam filmleri ve dijital prototipler.",
  video: {
    src: "ai-works/showreel/ai-isler-showreel.mp4",
    poster: "ai-works/showreel/ai-isler-showreel.jpg",
    label: "AI İşler seçkisi: sessiz, döngüde oynayan kısa video",
    ratio: 9 / 16,
  },
};

export const aiWorks: AiWork[] = [
  {
    id: "web-sitesi",
    title: "Web Sitesi",
    service: "Web Sitesi",
    summary: "Markanın dilini taşıyan, hızlı açılan, telefonda rahat kullanılan siteler: tasarımdan yayına tek elden.",
    outputs: ["Portfolyo sitesi", "Marka tanıtım sitesi", "Kampanya sayfası"],
    details: [
      "Süreç: tasarım (sayfa yapısı, görsel dil, masaüstü ve mobil ekranlar), geliştirme (duyarlı arayüz, hareket, iletişim formu) ve yayına alma (alan adı, hız ve erişilebilirlik kontrolü).",
      "Portfolyo: işlerin sergilendiği, galeri ve iletişim bölümleri olan kişisel site.",
      "Marka sitesi: hizmetleri, ekibi ve iletişimi anlatan çok bölümlü kurumsal site.",
      "Kampanya sayfası: tek bir mesaja ve tek bir çağrıya odaklanan kısa sayfa.",
      "Olası ek işler: form ve e-posta bağlantısı, çok dillilik, arama motoru temelleri.",
      "Gösterilen örnek bu portfolyo sitesinin kendisi: masaüstü ve telefon görünümü, gerçek ekran görüntüleri.",
    ],
    stage: {
      kind: "web",
      desktop: [
        { src: "ai-works/web-sitesi/portfolyo-masaustu.jpg", alt: "Portfolyo sitesinin ana sayfası, masaüstü görünümü" },
        { src: "ai-works/web-sitesi/portfolyo-masaustu-2.jpg", alt: "Aynı sitenin Hakkımda sayfası, masaüstü görünümü" },
      ],
      phone: [
        { src: "ai-works/web-sitesi/portfolyo-mobil.jpg", alt: "Portfolyo sitesinin ana sayfası, telefon görünümü" },
        { src: "ai-works/web-sitesi/portfolyo-mobil-2.jpg", alt: "Aynı sitenin Hakkımda sayfası, telefon görünümü" },
      ],
      caption: "Bu portfolyo sitesi, masaüstünde ve telefonda",
      summary: "Bu portfolyo sitesinin ana sayfası masaüstü tarayıcıda kuruluyor, telefon görünümü yanına geliyor, ardından site Hakkımda sayfasına kayıyor.",
    },
  },
  {
    id: "reklam-filmi",
    title: "Reklam Filmi ve Video",
    service: "Reklam Filmi ve Video",
    summary: "Yapay zekâ ile ürettiğim görselleri hareketli grafik ve kurguyla reklam filmine, kısa videoya dönüştürüyorum.",
    outputs: ["Konsept ve storyboard", "Yapay zekâ destekli görseller", "Motion ve kurgu"],
    details: [
      "Konsept ve storyboard: mesajı, akışı ve kadrajları üretimden önce çizmek.",
      "Yapay zekâ destekli görsel üretim: sahneler, karakterler ve atmosfer için görseller.",
      "Hareketli grafik: yazılar, geçişler ve bilgi etiketleri. Kurgu: ritim, müzik ve ses, dikey (9:16) ve yatay formatlar.",
      "Gösterilen örnek Voop: portfolyomda Yapay Zekâ ve Kurgu kategorilerinde. Ürünlerin karikatür tarzı bir karakterle tanıtıldığı, 26 saniyelik dikey video; altyazılar konuşmayı kelime kelime takip ediyor.",
    ],
    stage: {
      kind: "video",
      preview: "ai-works/reklam-filmi/voop-onizleme.mp4",
      src: "portfolio/VoopKarikatür.mp4",
      poster: "portfolio/voop-karikatur.jpg",
      ratio: 9 / 16,
      caption: "Voop — Karikatür",
      summary: "Voop videosundan sessiz, sekiz saniyelik bir kesit döngüde oynuyor; altında konsept, görsel ve kurgu aşamalarını gösteren bir zaman çizelgesi var.",
    },
  },
  {
    id: "uygulama",
    title: "Uygulama Prototipleri",
    service: "Uygulama Geliştirme",
    summary: "Ürün fikrini kullanıcı akışına, arayüze ve tıklanabilir bir prototipe çeviriyorum.",
    outputs: ["Kullanıcı akışı", "Arayüz tasarımı", "Etkileşimli prototip"],
    details: [
      "Şu an yayında gösterebileceğim tamamlanmış bir uygulama yok; bu bölüm olası proje kapsamlarını anlatıyor.",
      "Olası kapsamlar: mobil uygulama fikri, küçük bir iç araç, bir hizmetin web uygulaması hâli.",
      "Çıktılar projeye göre değişir; ilk görüşmede kapsamı birlikte netleştiririz.",
      "Gösterilen akış tamamlanmış bir uygulama değil, bir konsept prototip: hizmet seçilir, seçim sonraki ekrana taşınır, gün ve saat seçilir, randevu onaylanır.",
    ],
    stage: {
      kind: "app",
      caption: "Konsept prototip: randevu akışı",
      summary: "Konsept prototip: üç ekranlı bir randevu akışı. Önce bir hizmet seçiliyor, seçim sonraki ekrana taşınıyor, gün ve saat seçiliyor, son ekranda randevu onaylanıyor ve başarı işareti beliriyor.",
    },
  },
];

/** The way of working, once, at the end of the page. */
export const aiSteps = [
  { title: "Brief'i anlat", text: "Üç adımlı formda ne istediğini ve kime için olduğunu yaz." },
  { title: "Kapsamı netleştirelim", text: "Fikri okur, sana bir yol ve kapsam öneririm; birlikte son hâlini veririz." },
  {
    title: "Tasarla, üret, geliştir",
    text: "Web sitesi için sayfa yapısı, tasarım ve geliştirme; film için konsept, görsel üretim ve kurgu; prototip için akış, arayüz ve tıklanabilir model.",
  },
  { title: "Teslim et", text: "Taslakları paylaşarak ilerler, son hâli teslim ederim." },
];
