/**
 * "Eray'ın Zihni" (/zihnim): the world, its places, the camera and the content, in ONE file.
 *
 * Coordinates are scene units; the camera looks down -z in the overview. To add a place later: add an entry
 * to `areas` (status "ready" once it has geometry in worldGeometry.ts, a camera pose and a panel), nothing else
 * has to change in the page. Entries with status "planned" are kept as data only and are not shown anywhere.
 *
 * All content is real and already in the repo (src/data/projects.ts, src/data/aiWorks.ts, public/portfolio/...).
 */
import { fileUrl, projects } from "../../data/projects";
import { aiWorks } from "../../data/aiWorks";

export type V3 = [number, number, number];
export type AreaId = "gorsel-hafiza" | "kurgu-masasi" | "deney-alani" | "hareket-atolyesi" | "birlikte-uretelim";

export type PanelItem = { title: string; text?: string; image?: string; tag?: string };
export type AreaContent =
  | { kind: "gallery"; intro: string; items: PanelItem[] }
  | { kind: "video"; intro: string; title: string; text: string; poster: string; src: string; note: string }
  | { kind: "links"; intro: string; items: { title: string; text: string; href: string; label: string }[] };

export type Area = {
  id: AreaId;
  status: "ready" | "planned";
  /** Short name (button, label, panel title). */
  title: string;
  /** One line under the title. */
  tagline: string;
  /** The place in the world (the label sits here). */
  anchor: V3;
  /** Camera pose when the visitor is at this place. */
  camera: { pos: V3; target: V3 };
  /** Index (0..2) used by the shaders for the three working places. */
  slot: number;
  content?: AreaContent;
};

const motionWorks = projects.filter((p) => p.poster && p.categories.includes("Motion Graphics")).slice(0, 8);
const voop = projects.find((p) => p.title.startsWith("Voop"))!;
const web = aiWorks.find((w) => w.id === "web-sitesi")!;
const app = aiWorks.find((w) => w.id === "uygulama")!;

export const worldConfig = {
  /** The overview: the whole world and the three places together. */
  overview: { pos: [12, 17, 78] as V3, target: [0, 0, 2] as V3, fov: 44 },
  /** Fixed lobes of the silhouette: centre, radii. */
  lobes: [
    { c: [-15.5, 2, 0] as V3, r: [23, 19, 21] as V3, side: -1 },
    { c: [15.5, 2, 0] as V3, r: [23, 19, 21] as V3, side: 1 },
  ],
  core: { c: [0, 1, 0] as V3, r: 4.4 },
  /** Point counts (desktop / phone). The quality steps draw a share of them. */
  count: { desktop: 120000, light: 46000 },
  /** Flight time of the camera between two views, seconds (a very short blend for "Hareketi azalt"). */
  flight: { seconds: 1.5, reduced: 0.06 },
  /** Limited look-around by dragging: largest turn in radians. */
  drag: { yaw: 0.42, pitch: 0.22, damping: 7 },
  /** The ambient life of the world: slow and small. */
  ambient: { breathe: 0.006, speed: 1, shellFade: 0.35 },
  /** Pointer: a small local opening and a touch of colour (desktop mouse only). */
  pointer: { radius: 0.085, push: 0.05, tint: 0.35 },
  /** Dark, slightly warm ground. */
  ground: "#0c0a0b",
  /** Point colours (rgb 0..1): mostly off-white and grey, with turquoise, ice blue and a little lavender. */
  palette: {
    offWhite: [0.93, 0.92, 0.9] as V3,
    grey: [0.6, 0.62, 0.65] as V3,
    teal: [0.2, 0.9, 0.8] as V3,
    ice: [0.58, 0.82, 1.0] as V3,
    lavender: [0.68, 0.6, 0.96] as V3,
  },
};

export const areas: Area[] = [
  {
    id: "gorsel-hafiza",
    status: "ready",
    slot: 0,
    title: "Görsel Hafıza",
    tagline: "Havada asılı kadrajlar: gerçek tasarım çalışmalarından bir seçki.",
    anchor: [-17, 7, 12],
    camera: { pos: [-3, 4, 42], target: [-8, 4, 10] },
    content: {
      kind: "gallery",
      intro: "Motion Graphics çalışmalarımdan kapak kareleri. Bunlar portfolyomdaki gerçek videoların kapakları; her kare dünyada bir kadraj olarak asılı duruyor.",
      items: motionWorks.map((p) => ({ title: p.title, text: p.description, image: fileUrl(p.poster!), tag: "Motion Graphics" })),
    },
  },
  {
    id: "kurgu-masasi",
    status: "ready",
    slot: 1,
    title: "Kurgu Masası",
    tagline: "Mekânın içinden geçen film şeridi ve gerçek bir proje karesi.",
    anchor: [18, -1, 13],
    camera: { pos: [28, 2, 37], target: [25, 0, 12] },
    content: {
      kind: "video",
      intro: "Şeridin ortasındaki kare, Voop videosunun kapağından oluşuyor.",
      title: voop.title,
      text: voop.description,
      poster: fileUrl(voop.poster!),
      src: fileUrl(voop.video),
      note: "Video sesli. Yalnızca “Videoyu oynat” düğmesine basınca başlar.",
    },
  },
  {
    id: "deney-alani",
    status: "ready",
    slot: 2,
    title: "Deney Alanı",
    tagline: "Küçük dönüşümler geçiren organik bir oluşum: web ve uygulama denemeleri.",
    anchor: [0, -10, 4],
    camera: { pos: [9, -5, 30], target: [6, -10, 3] },
    content: {
      kind: "links",
      intro: "AI İşler sayfasındaki mevcut örneklerden kısa bir özet. Tamamı için sayfayı aç.",
      items: [
        { title: web.title, text: web.summary, href: "/ai-isler#web-sitesi", label: "Web Sitesi örneğini gör" },
        { title: app.title, text: app.summary, href: "/ai-isler#uygulama", label: "Uygulama prototipini gör" },
        { title: "AI İşler", text: "Web siteleri, reklam filmleri ve dijital prototipler.", href: "/ai-isler", label: "AI İşler sayfasına git" },
      ],
    },
  },
  { id: "hareket-atolyesi", status: "planned", slot: -1, title: "Hareket Atölyesi", tagline: "Sonraki aşama.", anchor: [0, 0, 0], camera: { pos: [0, 0, 0], target: [0, 0, 0] } },
  { id: "birlikte-uretelim", status: "planned", slot: -1, title: "Birlikte Üretelim", tagline: "Sonraki aşama.", anchor: [0, 0, 0], camera: { pos: [0, 0, 0], target: [0, 0, 0] } },
];

export const readyAreas = areas.filter((a) => a.status === "ready");
export const areaById = (id: AreaId | null) => (id ? areas.find((a) => a.id === id) ?? null : null);

/** The posters that become particle pictures in the world: Görsel Hafıza frames and the Kurgu Masası key frame. */
export const worldImages = {
  frames: motionWorks.slice(0, 6).map((p) => fileUrl(p.poster!)),
  keyFrame: fileUrl(voop.poster!),
};
