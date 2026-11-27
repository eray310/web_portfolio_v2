export const CATEGORIES = ["Motion Graphics", "Kurgu", "Yapay Zekâ"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Project = {
  title: string;
  /** One or two short sentences; shown as "Proje Özeti" in the detail panel. */
  description: string;
  /** Video file inside `public/portfolio/`. Heavy ones are web copies in `public/portfolio/web/` (the sources stay in the folder above). */
  video: string;
  /** Cover image inside `public/portfolio/`. Without it the first frame of the video is shown. */
  poster?: string;
  /**
   * Short silent clip inside `public/portfolio/previews/` played when the
   * centre card is hovered. Defaults to a file named like the video.
   */
  preview?: string;
  /** A project may belong to several categories. */
  categories: Category[];
  /**
   * Verified points for "Benim Katkım". Leave it out when not confirmed: the
   * section is then not shown (nothing is guessed).
   */
  contribution?: string[];
  /**
   * "Projenin odağı / Katkım / Teslim": three short confirmed lines (the client's exact request is not known, so it is not claimed). The block is shown
   * only when ALL THREE are filled in (nothing is guessed, no half-finished text is shown).
   */
  story?: { focus: string; did: string; delivered: string };
};

/** The story block of a project, or null while it is not complete. */
export const completeStory = (p: Project) => {
  const s = p.story;
  return s && s.focus.trim() && s.did.trim() && s.delivered.trim() ? s : null;
};

/** Encodes each path segment so names with spaces or apostrophes still load. */
export const fileUrl = (file: string) =>
  `${import.meta.env.BASE_URL}portfolio/${file.split("/").map(encodeURIComponent).join("/")}`;

export const previewUrl = (project: Project) =>
  fileUrl(`previews/${project.preview ?? project.video}`);

/**
 * Selected works. To add one: copy the video into `public/portfolio/`, make a
 * short silent clip of the same name in `public/portfolio/previews/`, and add
 * ONE entry here; the card, filters, counter and detail panel follow.
 */
export const projects: Project[] = [
  {
    title: "Voop — Karikatür",
    description:
      "Voop için hazırlanan dikey videoda karikatür tarzı bir karakter ürünleri tanıtıyor. Altyazılar konuşmayı kelime kelime takip ediyor.",
    video: "VoopKarikatür.mp4",
    poster: "voop-karikatur.jpg",
    preview: "voop-karikatur.mp4",
    categories: ["Yapay Zekâ", "Kurgu"],
    story: {
      focus: "Voop ürünlerini ve evcil dostlara yönelik yaklaşımını, karikatür tarzı bir karakterin anlatımıyla tanıtmak.",
      did: "Videoyu baştan sona ben yaptım. Karakteri ve mağaza, depo, bahçe sahnelerini yapay zekâ destekli görsellerle kurdum, kurguyu yaptım, altyazıları konuşmayı kelime kelime takip edecek şekilde işledim.",
      delivered: "26 saniyelik, sesli ve altyazılı dikey (9:16) video.",
    },
  },
  {
    title: "Motosan",
    description:
      "Bir kask tanıtımı için hazırlanan dikey video. Kask parçalara ayrılıp yeniden birleşiyor, öne çıkan özellikler oklu yazılarla gösteriliyor.",
    video: "Motosan.mp4",
    poster: "motosan.jpg",
    preview: "motosan.mp4",
    categories: ["Motion Graphics"],
    story: {
      focus: "Mototaş için bir kaskı, yapısı ve öne çıkan özellikleriyle tanıtmak.",
      did: "Videoyu ben yaptım. Kaskı parçalara ayrılıp yeniden birleşen bir akışa dönüştürdüm; “Aerodinamik Full-Face Tasarım”, “Geniş Vizör Açısı” gibi özellikleri oklu yazılarla gösterdim ve Mototaş logosu ile web adresiyle bitirdim.",
      delivered: "15 saniyelik, sesli dikey (9:16) video.",
    },
  },
  {
    title: "RES360 | Proje Tanıtım Videosu",
    description:
      "RES360 için hazırladığım hareketli grafik videosu, farklı gayrimenkul projelerini kartlar hâlinde tanıtıyor.",
    video: "web/Res__360.mp4",
    preview: "Res__360.mp4",
    poster: "Res__360.jpg",
    categories: ["Motion Graphics"],
    contribution: ["Proje kartlarını ve ekran geçişlerini hareketli grafik olarak hazırladım."],
  },
  {
    title: "Next Telekom",
    description:
      "Next Telekom için hazırlanan dikey videoda internet hızı ve hızlı başvuru mesajları hareketli yazılar ve canlı görsellerle art arda geliyor.",
    video: "web/Nexttelekom.mp4",
    poster: "next-telekom.jpg",
    preview: "next-telekom.mp4",
    categories: ["Motion Graphics", "Kurgu"],
    story: {
      focus: "İnternet hızını, simetrik hızı, uydu interneti seçeneğini ve dijital sözleşmeyle hızlı başvuruyu anlatmak.",
      did: "Videoyu ben yaptım. Her mesaja ayrı bir görsel dünya kurguladım: neon bir açılış, kod ekranında hız yazıları, uzayda uydu interneti, roketli başvuru çağrısı. Yazıları hareketlendirip “Next Telekom’a gel” çağrısıyla kapattım.",
      delivered: "30 saniyelik, sesli dikey (9:16) video.",
    },
  },
  {
    title: "Fidan Properties",
    description:
      "Fidan Properties için hazırlanan dikey videoda uydu görüntüsü üzerinde bölgeler ve konumlar hareketli grafik ve yazılarla tanıtılıyor.",
    video: "web/FidanProperties.mp4",
    poster: "fidan-properties.jpg",
    preview: "fidan-properties.mp4",
    categories: ["Motion Graphics", "Kurgu"],
    story: {
      focus: "Fidan Properties'in bölgelerini ve konumlarını uydu görüntüsü üzerinde göstermek.",
      did: "Videoyu ben yaptım. Türkiye haritasından bölge haritasına yaklaşan akışı kurdum, bölgeleri renkli alanlarla ayırdım, konum işaretlerini ve etiketlerini hareketlendirdim, kapanışta marka yazısını getirdim.",
      delivered: "53 saniyelik, sesli dikey (9:16) video.",
    },
  },
  {
    title: "PayPal",
    description:
      "PayPal için hazırladığım bu çalışmada, marka mesajını hareketli grafiklerle anlattım. Harita, telefon ekranı ve metin animasyonları tek bir akışta ilerliyor.",
    video: "Paypal.mp4",
    poster: "paypal.jpg",
    preview: "paypal.mp4",
    categories: ["Motion Graphics"],
    contribution: ["Videodaki hareketli grafikleri ve metin animasyonlarını hazırladım."],
  },
  {
    title: "Lay’s",
    description:
      "Lay’s odaklı bu video çalışmasında ürün sunumu ve görsel akış öne çıkıyor. Paketler ve logo, canlı renkli arka planlar üzerinde hareketli geçişlerle sunuluyor.",
    video: "Lay's.mp4",
    poster: "lays.jpg",
    preview: "lays.mp4",
    categories: ["Motion Graphics"],
    contribution: ["Ürün animasyonlarını ve geçişleri içeren video çalışmasını hazırladım."],
  },
  {
    title: "The Lock",
    description:
      "The Lock için hazırladığım bu kısa video, dikey sosyal medya formatına uygun bir akış sunuyor. Planlar birbirine kısa geçişlerle bağlanıyor.",
    video: "web/TheLockReels.mp4",
    poster: "the-lock.jpg",
    preview: "the-lock.mp4",
    categories: ["Kurgu"],
    contribution: ["Planları dikey formatta kurguladım ve akışı mobil izlemeye göre düzenledim."],
  },
  {
    title: "Uber Motion",
    description:
      "Uber odaklı bu motion graphics çalışmasında, marka anlatısı hareketli görsellerle ilerliyor. Sürüş akışının adımları ekran içi metin ve simge animasyonlarıyla gösteriliyor.",
    video: "Uber Motion.mp4",
    poster: "uber-motion.jpg",
    preview: "uber-motion.mp4",
    categories: ["Motion Graphics"],
    contribution: ["Ekran içi metinleri, simgeleri ve geçişleri hareketli grafik olarak hazırladım."],
  },
  {
    title: "Allvex | Sosyal Medya Videosu",
    description:
      "Allvex için hazırladığım dikey sosyal medya videosunda görüntü seçimini, kesme ritmini ve metin yerleşimini mobil izlemeye göre kurguladım.",
    video: "web/Allvex_Reels4.mp4",
    preview: "Allvex_Reels4.mp4",
    poster: "Allvex_Reels4.jpg",
    categories: ["Kurgu"],
    contribution: [
      "Görüntü seçimini ve kesme ritmini belirledim.",
      "Metin yerleşimini mobil izlemeye göre düzenledim.",
    ],
  },
  // Kept after the first Allvex entry: /zihnim picks works by the start of the title (first match).
  {
    title: "Allvex | O mu? Bu mu?",
    description:
      "Allvex’in D Vitamini ve Ferritin testlerini yan yana tanıtan dikey video. İki testin belirtileri ekranda listeleniyor; video “Şimdi eczanelerde!” çağrısıyla kapanıyor.",
    video: "web/allvex-omu-bumu.mp4",
    poster: "allvex-omu-bumu.jpg",
    preview: "allvex-omu-bumu.mp4",
    categories: ["Motion Graphics"],
  },
  {
    title: "Motivasyon vs Disiplin",
    description:
      "Motivasyon ile disiplin arasındaki farkı kısa video formatında anlatan bir çalışma. Takvim ve illüstrasyonlar, ekrandaki metinlerle birlikte hareket ediyor.",
    video: "web/Motivasyon vs Disiplin.mp4",
    poster: "motivasyon-vs-disiplin.jpg",
    preview: "motivasyon-vs-disiplin.mp4",
    categories: ["Motion Graphics"],
    contribution: ["Metin ve illüstrasyon animasyonlarını hazırladım."],
  },
  {
    title: "La Vita",
    description:
      "La Vita için hazırladığım reklam videosu, projenin öne çıkan detaylarını kısa bir anlatıda bir araya getiriyor. Kullanım hakkı ve kira gibi bilgiler yuvarlak etiketlerle gösteriliyor.",
    video: "web/LaVitaReklam3.3.mp4",
    poster: "la-vita.jpg",
    preview: "la-vita.mp4",
    categories: ["Kurgu"],
    contribution: ["Planları kurguladım; ekrandaki metinleri ve bilgi etiketlerini yerleştirdim."],
  },
  {
    title: "Allesta | Yapay Zekâ Destekli Reklam",
    description:
      "Allesta için hazırladığım reklam videosunda yapay zekâ destekli görselleri, video kurgu ve hareketli grafiklerle birleştirdim.",
    video: "web/Allesta_YZReklam.mp4",
    preview: "Allesta_YZReklam.mp4",
    poster: "Allesta_YZReklam.jpg",
    categories: ["Yapay Zekâ", "Motion Graphics", "Kurgu"],
    contribution: [
      "Yapay zekâ destekli görselleri video akışında bir araya getirdim.",
      "Kurguyu ve hareketli grafikleri hazırladım.",
    ],
  },
  {
    title: "Regnum Riva",
    description:
      "Regnum Riva tanıtım videosu, projeyi ve öne çıkan satış bilgilerini kısa bir formatta sunuyor.",
    video: "web/RegnumRiva.mp4",
    poster: "regnum-riva.jpg",
    preview: "regnum-riva.mp4",
    categories: ["Kurgu"],
    contribution: ["Bu portfolyo için video çalışmasını hazırladım."],
  },
  {
    title: "Siux",
    description:
      "Siux için hazırladığım video çalışmasında markayı öne çıkaran planlar, kısa bir görsel akışta bir araya geliyor. Video, vurgulu bir slogan yazısıyla kapanıyor.",
    video: "web/Siux1.1.mp4",
    poster: "siux.jpg",
    preview: "siux.mp4",
    categories: ["Motion Graphics", "Kurgu"],
    contribution: ["Ürün planlarını kurguladım ve kapanıştaki yazı animasyonunu hazırladım."],
  },
  {
    title: "Elaris | Sosyal Medya Videosu",
    description:
      "Elaris için hazırladığım kısa videoda projenin öne çıkan detaylarını akıcı bir kurgu ve okunaklı metinlerle sundum.",
    video: "web/Elaris_Reels_22.mp4",
    preview: "Elaris_Reels_22.mp4",
    poster: "Elaris_Reels_22.jpg",
    categories: ["Kurgu"],
    contribution: [
      "Planları akıcı bir sırayla kurguladım.",
      "Metinleri mobilde okunaklı olacak şekilde düzenledim.",
    ],
  },
];
