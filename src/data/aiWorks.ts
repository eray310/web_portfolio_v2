/**
 * Content of /ai-isler ("AI İşler"): the opening, one wide section for each of the three areas, and
 * the way of working that closes the page.
 *
 * Each section reads in this order: title, short description, a work example, the scope. A
 * "Projeni anlat" button at the end opens the brief form with `service` already chosen (`service`
 * must be one of the labels in src/data/brief.ts).
 *
 * ADDING REAL WORK LATER - everything happens in this file:
 *   1. Put the files in  public/ai-works/<section>/  (images as .jpg/.webp, videos as .mp4).
 *   2. Change that section's `media` list, for example:
 *        { kind: "video", src: "ai-works/reklam-filmi/kampanya.mp4", poster: "ai-works/reklam-filmi/kampanya.jpg",
 *          alt: "Kampanya filminden bir kare", caption: "Kampanya filmi", ratio: 9 / 16 },
 *        { kind: "desktop", src: "ai-works/web-sitesi/yeni-site.jpg", alt: "...", caption: "..." },
 *   3. To replace the drawn "Konsept prototip" of the app section, use real screenshots (kind "phone").
 * Paths for files that already live in the portfolio (public/portfolio/...) work the same way.
 *
 * Only things that really exist belong here: no invented clients, results or finished work. Items
 * that are a sketch or an idea carry the label "Konsept prototip".
 */
export type AiMedia = {
  /** desktop / phone: a screenshot in a device frame. video: a cover that plays on click. flow: a drawn three-screen concept. */
  kind: "desktop" | "phone" | "video" | "flow";
  /** Path inside public/ (not needed for "flow"). For a video: the video file. */
  src?: string;
  /** Cover picture of a video (loaded at once; the video itself only when played). */
  poster?: string;
  /** What the picture shows, for screen readers. */
  alt: string;
  caption?: string;
  /** Width / height of a video (default 9 / 16). */
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
  /** Small label above the example ("Proje örneği", "Konsept prototip"). */
  exampleLabel: string;
  /** Facts about the example that are confirmed in the portfolio (shown as a short list under it). */
  facts?: { label: string; text: string }[];
  /** At most three concrete outputs. */
  outputs: string[];
  /** Folded "Kapsam ayrıntıları" box. */
  details: string[];
  /** A note under the example when it is not finished work. */
  mediaNote?: string;
  media: AiMedia[];
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
    kicker: "Tasarım, geliştirme, yayın",
    summary: "Markanın dilini taşıyan, hızlı açılan ve telefonda rahat kullanılan siteler. Tasarımdan yayına tek elden.",
    exampleLabel: "Proje örneği",
    outputs: ["Portfolyo sitesi", "Marka tanıtım sitesi", "Kampanya sayfası"],
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
    exampleLabel: "Proje örneği: Voop",
    // Only what the portfolio (src/data/projects.ts, "Voop — Karikatür") and the video file confirm.
    facts: [
      { label: "Amaç", text: "Voop ürünlerinin karikatür tarzı bir karakterle dikey videoda tanıtılması." },
      { label: "Katkım", text: "Portfolyomda bu iş Yapay Zekâ ve Kurgu kategorilerinde yer alıyor." },
      { label: "Teslim edilen iş", text: "26 saniyelik dikey (9:16) video; altyazılar konuşmayı kelime kelime takip ediyor." },
    ],
    outputs: ["Konsept ve storyboard", "Yapay zekâ destekli görseller", "Motion ve kurgu"],
    details: [
      "Konsept ve storyboard: mesajı, akışı ve kadrajları çekim ya da üretim öncesinde çizmek.",
      "Yapay zekâ destekli görsel üretim: sahneler, karakterler ve atmosfer için görseller.",
      "Hareketli grafik: yazılar, geçişler ve bilgi etiketleri.",
      "Kurgu: ritim, müzik ve ses, sosyal medya için dikey (9:16) ve yatay formatlar.",
    ],
    media: [
      {
        kind: "video",
        src: "portfolio/VoopKarikatür.mp4",
        poster: "portfolio/voop-karikatur.jpg",
        alt: "Voop videosundan bir kare: ürünleri tutan karikatür bir karakter. Oynatmak için tıkla.",
        caption: "Voop — Karikatür",
        ratio: 9 / 16,
      },
    ],
  },
  {
    id: "uygulama",
    title: "Uygulama Prototipleri",
    service: "Uygulama Geliştirme",
    kicker: "Fikirden prototipe",
    summary: "Ürün fikrini kullanıcı akışına, arayüze ve tıklanabilir bir prototipe çeviriyorum.",
    exampleLabel: "Örnek akış: randevu",
    outputs: ["Kullanıcı akışı", "Arayüz tasarımı", "Etkileşimli prototip"],
    details: [
      "Şu an yayında gösterebileceğim tamamlanmış bir uygulama yok; bu bölüm olası proje kapsamlarını anlatıyor.",
      "Olası kapsamlar: mobil uygulama fikri, küçük bir iç araç, bir hizmetin web uygulaması hâli.",
      "Çıktılar projeye göre değişir; ilk görüşmede kapsamı birlikte netleştiririz.",
    ],
    mediaNote: "Bu ekranlar tamamlanmış bir uygulama değil, yalnızca bir konsept prototip: hizmet seç, saat seç, onayla.",
    media: [
      {
        kind: "flow",
        alt: "Konsept prototip: üç telefon ekranı. Birincisinde hizmet seçiliyor, ikincisinde saat seçiliyor, üçüncüsünde randevu onaylanıyor.",
      },
    ],
  },
];

/** The way of working, once, at the end of the page (it used to be repeated inside the sections). */
export const aiSteps = [
  { title: "Brief'i anlat", text: "Üç adımlı formda ne istediğini ve kime için olduğunu yaz." },
  { title: "Kapsamı netleştirelim", text: "Fikri okur, sana bir yol ve kapsam öneririm; birlikte son hâlini veririz." },
  {
    title: "Tasarla, üret, geliştir",
    text: "Web sitesi için sayfa yapısı, tasarım ve geliştirme; film için konsept, görsel üretim ve kurgu; prototip için akış, arayüz ve tıklanabilir model.",
  },
  { title: "Teslim et", text: "Taslakları paylaşarak ilerler, son hâli teslim ederim." },
];
