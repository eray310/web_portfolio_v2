/**
 * "Bir İşin Perde Arkası": the one project shown step by step.
 *
 * Files live in `public/process/<project>/`. A step whose file is missing is
 * hidden on the published site (no broken images); on the dev server it shows
 * a placeholder that names the file to add.
 *
 * Kurgu step, best case: add a RAW and a FINAL frame of the SAME shot
 * (same size and framing). A thin turquoise line then sweeps left to right
 * and opens the final. Without that pair it moves from the "Görsel Üretim"
 * image (or the clip's first frame) to the short silent final clip, which is
 * loaded only when the step is opened.
 */
export type ImageStep = {
  id: string;
  title: string;
  /** One or two sentences: only what is true about this project. */
  note: string;
  /** Path inside `public/`. */
  image: string;
};

export type EditStep = {
  id: string;
  title: string;
  note: string;
  /** Raw and final frame of the same shot (optional pair). */
  raw?: string;
  final?: string;
  /** Short silent final clip (a few seconds, no audio). */
  clip: string;
  /** First frame of the clip, shown until the clip plays. */
  poster: string;
};

export type BehindTheScenes = {
  project: string;
  steps: [ImageStep, ImageStep, EditStep];
};

export const behindTheScenes: BehindTheScenes = {
  project: "Allesta",
  steps: [
    {
      id: "fikir",
      title: "Fikir",
      note: "Reklamın ana mesajını ve sahne akışını netleştirdim.",
      // No source picture exists in the project yet. Empty = the step is left out (no request,
      // no broken image). Add the file and set e.g. "process/allesta/fikir.jpg" to show it.
      image: "",
    },
    {
      id: "gorsel",
      title: "Görsel Üretim",
      note: "Yapay zekâ destekli görselleri reklamın akışına göre bir araya getirdim.",
      image: "", // same: add "process/allesta/gorsel-uretim.jpg" when the picture is ready
    },
    {
      id: "kurgu",
      title: "Kurgu",
      note: "Görselleri kurgu ve hareketli grafiklerle tek bir reklam videosunda birleştirdim.",
      // raw: "process/allesta/kurgu-ham.jpg",
      // final: "process/allesta/kurgu-final.jpg",
      clip: "process/allesta/kurgu-final.mp4",
      poster: "process/allesta/kurgu-final-kare.jpg",
    },
  ],
};
