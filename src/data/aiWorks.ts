/**
 * Content of /ai-isler ("AI İşler"): one wide section for each of the three areas.
 *
 * Each section has a short description, at most three concrete outputs, an optional list of stages,
 * a folded "Kapsam ayrıntıları" box, media, and a "Projeni anlat" button that opens the brief
 * form with `service` already chosen (`service` must be one of the labels in src/data/brief.ts).
 *
 * ADDING REAL WORK LATER - everything happens in this file:
 *   1. Put the files in  public/ai-works/<section>/  (images as .jpg/.webp, videos as .mp4).
 *   2. Add an entry to that section's `media` list, for example:
 *        { kind: "video", src: "ai-works/reklam-filmi/kampanya.mp4", poster: "ai-works/reklam-filmi/kampanya.jpg",
 *          alt: "Kampanya filminden bir kare", caption: "Kampanya filmi", ratio: 9 / 16 },
 *        { kind: "desktop", src: "ai-works/web-sitesi/yeni-site.jpg", alt: "...", caption: "..." },
 *        { kind: "phone",   src: "ai-works/web-sitesi/yeni-site-mobil.jpg", alt: "...", caption: "..." },
 *   3. To drop the "Konsept" drawing of the app section, replace its `concept` entry with a real
 *      image (kind "phone") and, if you like, remove the "label".
 * Paths for files that already live in the portfolio (public/portfolio/...) work the same way.
 *
 * Only things that really exist belong here: no invented clients, results or finished work. Items
 * that are a sketch or an idea carry the label "Konsept".
 */
export type AiMedia = {
  /** desktop / phone: a screenshot in a device frame. video: a cover that plays on click. concept: a drawn sketch. */
  kind: "desktop" | "phone" | "video" | "concept";
  /** Path inside public/ (not needed for "concept"). For a video: the video file. */
  src?: string;
  /** Cover picture of a video (loaded at once; the video itself only when played). */
  poster?: string;
  /** What the picture shows, for screen readers. */
  alt: string;
  caption?: string;
  /** Small badge on the picture, e.g. "Konsept". */
  label?: string;
  /** Width / height of a video or concept (default 9 / 16). */
  ratio?: number;
};

export type AiWork = {
  id: string;
  title: string;
  /** Label of the brief service that "Projeni anlat" chooses (see src/data/brief.ts). */
  service: string;
  /** Short line above the title. */
  kicker: string;
  summary: string;
  /** At most three concrete outputs. */
  outputs: string[];
  /** Optional ordered stages (e.g. design, development, launch). */
  stages?: { title: string; text: string }[];
  /** Folded "Kapsam ayrıntıları" box. */
  details: string[];
  /** A note under the media when the picture is not finished work. */
  mediaNote?: string;
  media: AiMedia[];
};

export const aiIntro = "Web siteleri, reklam filmleri ve uygulama prototipleri: fikirden yayına, yapay zekâ destekli üretimle.";

export const aiWorks: AiWork[] = [
  {
    id: "web-sitesi",
    title: "Web Sitesi",
    service: "Web Sitesi",
    kicker: "Tasarım, geliştirme, yayın",
    summary: "Markanın dilini taşıyan, hızlı açılan ve telefonda rahat kullanılan siteler. Tasarımdan yayına tek elden.",
    outputs: ["Portfolyo sitesi", "Marka tanıtım sitesi", "Kampanya sayfası"],
    stages: [
      { title: "Tasarım", text: "Sayfa yapısı, görsel dil ve masaüstü ile mobil ekranlar." },
      { title: "Geliştirme", text: "Duyarlı arayüz, hareket, iletişim formu ve içerik yerleşimi." },
      { title: "Yayına alma", text: "Alan adı ve yayın, hız ile erişilebilirlik kontrolü." },
    ],
    details: [
      "Portfolyo: işlerin sergilendiği, galeri ve iletişim bölümleri olan kişisel site.",
      "Marka sitesi: hizmetleri, ekibi ve iletişimi anlatan çok bölümlü kurumsal site.",
      "Kampanya sayfası: tek bir mesaja ve tek bir çağrıya odaklanan kısa sayfa.",
      "Olası ek işler: form ve e-posta bağlantısı, çok dillilik, arama motoru temelleri.",
    ],
    media: [
      {
        kind: "desktop",
        src: "ai-works/web-sitesi/portfolyo-masaustu.jpg",
        alt: "Bu portfolyo sitesinin masaüstü görünümü: koyu zeminde karakter, ad ve menü.",
        caption: "Bu portfolyo sitesinin kendisi",
      },
      {
        kind: "phone",
        src: "ai-works/web-sitesi/portfolyo-mobil.jpg",
        alt: "Aynı sitenin telefon görünümü: başlık, menü ve karakter alt alta.",
        caption: "Telefonda",
      },
    ],
  },
  {
    id: "reklam-filmi",
    title: "Reklam Filmi ve Video",
    service: "Reklam Filmi ve Video",
    kicker: "Konseptten kurguya",
    summary: "Yapay zekâ ile ürettiğim görselleri hareketli grafik ve kurguyla birleştirip reklam filmine ve kısa videoya dönüştürüyorum.",
    outputs: ["Konsept ve storyboard", "Yapay zekâ destekli görseller", "Motion ve kurgu"],
    details: [
      "Konsept ve storyboard: mesajı, akışı ve kadrajları çekim ya da üretim öncesinde çizmek.",
      "Yapay zekâ destekli görsel üretim: sahneler, karakterler ve atmosfer için görseller.",
      "Hareketli grafik: yazılar, geçişler ve bilgi etiketleri.",
      "Kurgu: ritim, müzik ve ses, sosyal medya için dikey (9:16) ve yatay formatlar.",
    ],
    mediaNote: "Portfolyomdan, yapay zekâ destekli görsellerin kullanıldığı bir iş.",
    media: [
      {
        kind: "video",
        src: "portfolio/web/Allesta_YZReklam.mp4",
        poster: "portfolio/Allesta_YZReklam.jpg",
        alt: "Allesta reklam filminden bir kare. Oynatmak için tıkla.",
        caption: "Allesta | Yapay Zekâ Destekli Reklam",
        ratio: 9 / 16,
      },
    ],
  },
  {
    id: "uygulama",
    title: "Uygulama Geliştirme",
    service: "Uygulama Geliştirme",
    kicker: "Fikirden prototipe",
    summary: "Ürün fikrini kullanıcı akışına, arayüze ve tıklanabilir bir prototipe çeviriyorum.",
    outputs: ["Kullanıcı akışı", "Arayüz tasarımı", "Etkileşimli prototip"],
    stages: [
      { title: "Ürün fikri", text: "Kim kullanacak, hangi sorunu çözecek, ilk sürümde ne olacak." },
      { title: "Kullanıcı akışı", text: "Ekranların sırası ve kullanıcının izleyeceği yol." },
      { title: "Arayüz", text: "Ekran tasarımları, bileşenler ve görsel dil." },
      { title: "Prototip", text: "Tıklanarak denenebilen, ilk sürümün nasıl hissettireceğini gösteren model." },
    ],
    details: [
      "Şu an yayında gösterebileceğim tamamlanmış bir uygulama yok; bu bölüm olası proje kapsamlarını anlatıyor.",
      "Olası kapsamlar: mobil uygulama fikri, küçük bir iç araç, bir hizmetin web uygulaması hâli.",
      "Çıktılar projeye göre değişir; ilk görüşmede kapsamı birlikte netleştiririz.",
    ],
    mediaNote: "Yandaki çizim yalnızca bir konsept: tamamlanmış bir uygulama değil.",
    media: [
      {
        kind: "concept",
        alt: "Konsept çizim: bir telefon ekranında liste, kart ve alt sekme çubuğu.",
        caption: "Örnek arayüz",
        label: "Konsept",
        ratio: 9 / 18,
      },
    ],
  },
];

/** The three steps shown above the final call. */
export const aiSteps = [
  { title: "Brief'i anlat", text: "Üç adımlı formda ne istediğini ve kime için olduğunu yaz." },
  { title: "Kapsamı netleştirelim", text: "Fikri okur, sana bir yol ve kapsam öneririm; birlikte son hâlini veririz." },
  { title: "Üret ve teslim et", text: "Taslakları paylaşarak ilerler, son hâli teslim ederim." },
];
