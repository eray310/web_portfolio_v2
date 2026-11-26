/**
 * /hakkimda, "Albüm iç kapağı": the settings of the dot portrait and the texts of the page, in one place.
 * Only real information: Eray's own story, the data files of the site (career, tools, brands, projects) and the
 * wording of the AI İşler steps.
 */
export const portraitConfig = {
  /** One dot per cell: cell size in css px, and the limits of the grid (columns = rows). */
  cell: 5.2,
  minCols: 64,
  maxCols: 124,
  /** Brightness below `black` gives no dot; `gamma` shapes the rest; below `sparseBelow` dots are left out at random. */
  black: 0.15,
  gamma: 1.3,
  sparseBelow: 0.1,
  /** Largest dot as a share of its cell, smallest radius in px, how far a dot may sit off its cell centre (0..1). */
  maxFill: 1.02,
  minR: 0.35,
  jitter: 0.22,
  /** The dots gather once, in this time; `stagger` spreads their starts. */
  gatherMs: 1900,
  stagger: 0.7,
  /** Colours: off-white, and a very few turquoise dots as an accent. */
  ink: "#eee9e4",
  tealColor: "#5eead4",
  teal: 0.012,
  /** Mouse only: dots within `radius` (share of the width) give way by up to `push` (share of the width). */
  pointer: { radius: 0.2, push: 0.014 },
};

export const tracks = [
  { id: "baslangic", n: "01", title: "Başlangıç" },
  { id: "donum-noktasi", n: "02", title: "Dönüm noktası" },
  { id: "yapay-zeka", n: "03", title: "Yapay zekâ" },
  { id: "nasil-calisirim", n: "04", title: "Nasıl çalışırım" },
  { id: "kariyer", n: "05", title: "Kariyer" },
  { id: "kunye", n: "06", title: "Künye" },
];

export const roles = ["Motion Designer", "Art Director", "Video Editor", "AI Artist"];

/** The three song covers: only the names of the songs. */
export const covers = [
  { file: "sabah-olmadan", title: "Sabah Olmadan", w: 863, h: 801 },
  { file: "her-gece", title: "Ormandaki Ev", w: 850, h: 857 },
  { file: "yeterli-degil", title: "Yeterli Değil", w: 855, h: 572 },
];

/** Real frames from the making of the Allesta ad (public/process/allesta). */
export const allestaFrames = [
  { file: "kurgu-kesit-1", label: "Süreçten kare 1" },
  { file: "kurgu-kesit-2", label: "Süreçten kare 2" },
  { file: "kurgu-kesit-3", label: "Süreçten kare 3" },
  { file: "kurgu-final-kare", label: "Son kare" },
];

/** How I work: three short principles, taken from the steps of AI İşler (data/aiWorks.ts). No new promise. */
export const principles = [
  { title: "Önce brief", text: "Ne istediğini ve kimin için olduğunu yazarsın; oradan başlarız." },
  { title: "Kapsamı birlikte netleştiririz", text: "Fikri okur, sana bir yol ve kapsam öneririm; son hâlini birlikte veririz." },
  { title: "Taslakları paylaşarak ilerlerim", text: "Süreç boyunca taslakları görürsün; son hâli öyle teslim ederim." },
];

export const quote = { text: "Dağa tırman, seni dünya görsün diye değil, dünyayı görebilmen için.", by: "David McCullough Jr.", note: "sevdiğim söz" };
