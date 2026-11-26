/**
 * "Eray'ın Zihni" (/zihnim): the world, the route, the places and the works, in ONE file.
 *
 * Scene units: the brain is about 190 wide (x), 110 high (y) and 190 long (z); its front faces +z.
 * The camera travels on ONE route (a smooth curve of camera positions and a matching curve of look targets).
 * The wheel, a vertical drag on a phone and the place buttons all move along this same route.
 * To add a place later: add knots to `route`, a station in `stations`, an entry in `areas` with its works, and its
 * geometry in worldGeometry.ts. Entries with status "planned" are kept as data only and are not shown.
 *
 * All works are real and already in the repo (src/data/projects.ts, public/portfolio/, public/ai-works/,
 * public/zihnim/ = captures of the concept app demo of /ai-isler).
 */
import { fileUrl, projects, type Project } from "../../data/projects";
import { aiWorks } from "../../data/aiWorks";

export type V3 = [number, number, number];
export type AreaId = "gorsel-hafiza" | "kurgu-masasi" | "deney-alani" | "hareket-atolyesi" | "birlikte-uretelim";
export type StationId = "genel" | "giris" | AreaId;

export type Work = {
  id: string;
  area: AreaId;
  title: string;
  text: string;
  image: string;
  tag?: string;
  /** A real video of the work: played only after the visitor presses play. */
  video?: string;
  link?: { href: string; label: string };
  /** Frame in the world: centre and width (the height follows the picture). Kurgu frames are placed on the strip. */
  at: V3;
  width: number;
  /** Extra turn (radians) on top of "facing the station". */
  turn?: number;
};

export type Area = {
  id: AreaId;
  status: "ready" | "planned";
  title: string;
  tagline: string;
  /** What to do here (shown when the camera has arrived). */
  hint: string;
  /** Label position in the world. */
  anchor: V3;
  slot: number;
};

const url = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
const byTitle = (start: string) => projects.find((p) => p.title.startsWith(start)) as Project;

// ── the route: knots of camera positions (pos) and look targets (target), evenly spaced in route time 0..1
export const route: { pos: V3; target: V3 }[] = [
  { pos: [0, 84, 176], target: [0, -6, -8] }, //  0 overview: the whole brain
  { pos: [0, 64, 122], target: [0, 10, 24] }, //   1 coming down to the front of the fissure
  { pos: [0, 26, 96], target: [-8, 13, 34] }, //   2 the entrance corridor, between the lobes
  { pos: [-14, 19, 70], target: [-42, 12, 24] }, // 3 turning into the left lobe
  { pos: [-27, 15, 54], target: [-54, 11, 8] }, //  4 Görsel Hafıza
  { pos: [-6, 28, 26], target: [32, 7, -8] }, //    5 over the idea core, across to the right lobe
  { pos: [27, 9, 12], target: [52, 4, -20] }, //    6 Kurgu Masası
  { pos: [27, -6, -30], target: [4, -21, -72] }, // 7 down and back
  { pos: [8, -12, -42], target: [2, -22, -82] }, // 8 Deney Alanı
];
const knotT = (i: number) => i / (route.length - 1);

export const stations: { id: StationId; title: string; t: number }[] = [
  { id: "genel", title: "Genel görünüm", t: knotT(0) },
  { id: "giris", title: "Giriş", t: knotT(2) },
  { id: "gorsel-hafiza", title: "Görsel Hafıza", t: knotT(4) },
  { id: "kurgu-masasi", title: "Kurgu Masası", t: knotT(6) },
  { id: "deney-alani", title: "Deney Alanı", t: knotT(8) },
];

export const worldConfig = {
  fov: 52,
  /** The first knot of the route on a portrait screen (phones). */
  overviewPortrait: { pos: [0, 196, 96] as V3, target: [0, -8, -14] as V3 },
  /** The brain: two hemispheres (centre x = ±hemiX), radii, the gap of the fissure. */
  brain: { hemiX: 47, r: [47, 52, 94] as V3, gap: 3.2 },
  core: { c: [0, 8, 0] as V3, r: 8 },
  /** Point counts (desktop / phone). The quality steps draw a share of them. */
  count: { desktop: 260000, light: 90000 },
  /** Wheel: pixels of wheel for the whole route; the follow rate (1/s) once the wheel stops; largest step of one event. */
  wheel: { routePx: 5200, follow: 9, maxStep: 240, snapAfter: 260, snapReach: 0.035 },
  /** Phone: a vertical drag of this many screen heights runs the whole route. */
  touch: { routeScreens: 3.4 },
  /** A trip started by a button: seconds per whole route, and the limits. */
  trip: { perRoute: 2.6, min: 1.1, max: 3.0 },
  /** Limited look-around by dragging (desktop) or sideways (phone), radians. */
  look: { yaw: 0.38, pitch: 0.18, damping: 7 },
  /** How close (route time) counts as "at a station". */
  stationReach: 0.025,
  /** Real pictures: they fade in between these camera distances (far -> near); farther they are particles only. */
  picture: { far: 108, near: 60, load: 160 },
  /** The shell opens around the camera: points closer than `near` disappear, fully visible from `far`. */
  shellOpen: { near: 18, far: 46 },
  ambient: { speed: 1 },
  pointer: { radius: 0.08, push: 0.045, tint: 0.3 },
  ground: "#0c0a0b",
  palette: {
    offWhite: [0.94, 0.92, 0.89] as V3,
    grey: [0.58, 0.6, 0.63] as V3,
    teal: [0.2, 0.88, 0.78] as V3,
    ice: [0.6, 0.82, 1.0] as V3,
    lavender: [0.7, 0.62, 0.95] as V3,
  },
};

export const areas: Area[] = [
  {
    id: "gorsel-hafiza",
    status: "ready",
    slot: 0,
    title: "Görsel Hafıza",
    tagline: "İçine girilen bir görsel arşiv: farklı yükseklik ve derinlikte asılı, gerçek çalışmalarımın kareleri.",
    hint: "Bir kareye tıkla ya da listeden seç.",
    anchor: [-50, 34, 14],
  },
  {
    id: "kurgu-masasi",
    status: "ready",
    slot: 1,
    title: "Kurgu Masası",
    tagline: "Sağ lobun içinden kıvrılarak geçen bir film şeridi; kareler gerçek videolarımın kapakları.",
    hint: "Voop karesinde dur ve videoyu izle, ya da başka bir kareyi seç.",
    anchor: [54, 24, -18],
  },
  {
    id: "deney-alani",
    status: "ready",
    slot: 2,
    title: "Deney Alanı",
    tagline: "Kıvrımlı parçacık yüzeyleri arasında bir dijital atölye: gerçek site görüntüleri ve konsept uygulama ekranları.",
    hint: "Tarayıcıya, telefona ya da uygulama ekranlarına tıkla.",
    anchor: [0, 0, -78],
  },
  { id: "hareket-atolyesi", status: "planned", slot: -1, title: "Hareket Atölyesi", tagline: "Sonraki aşama.", hint: "", anchor: [0, 0, 0] },
  { id: "birlikte-uretelim", status: "planned", slot: -1, title: "Birlikte Üretelim", tagline: "Sonraki aşama.", hint: "", anchor: [0, 0, 0] },
];
export const readyAreas = areas.filter((a) => a.status === "ready");
export const areaById = (id: string | null) => (id ? areas.find((a) => a.id === id) ?? null : null);
export const stationIndex = (id: StationId) => stations.findIndex((s) => s.id === id);

// ── the works
const poster = (p: Project) => fileUrl(p.poster!);
/**
 * A point placed as seen from the camera at route knot `k`: `d` units ahead, `x` to the right, `y` up.
 * The pictures of a place are laid out this way, so they compose around the page's card (lower left) and route (right).
 */
const seen = (k: number, d: number, x: number, y: number): V3 => {
  const { pos: C, target: T } = route[k];
  const f = [T[0] - C[0], T[1] - C[1], T[2] - C[2]];
  const fl = Math.hypot(f[0], f[1], f[2]);
  const [fx, fy, fz] = [f[0] / fl, f[1] / fl, f[2] / fl];
  const rl = Math.hypot(fz, fx);
  const [rx, rz] = [-fz / rl, fx / rl]; // right = forward × up
  const [ux, uy, uz] = [-rz * fy, rz * fx - rx * fz, rx * fy]; // up = right × forward
  return [C[0] + fx * d + rx * x + ux * y, C[1] + fy * d + uy * y, C[2] + fz * d + rz * x + uz * y];
};
const G = 4; // route knot of Görsel Hafıza
const D = 8; // route knot of Deney Alanı
/** Görsel Hafıza: [title, distance, right, up, width, extra turn]: layers from near to far, kept clear of the card. */
const gorselList: [string, number, number, number, number, number?][] = [
  ["Motosan", 36, -1.4, 1.8, 6],
  ["RES360", 40, 10, -6.9, 7, -0.12],
  ["Next Telekom", 44, -14.4, 7.5, 6.5, 0.15],
  ["Lay", 50, 23.4, 7.4, 7.5, -0.18],
  ["PayPal", 54, 4.2, -11.9, 7],
  ["Uber Motion", 60, -11.7, 11.8, 8, 0.12],
  ["Fidan Properties", 64, 27.5, -9.4, 8.5, -0.2],
  ["Motivasyon vs Disiplin", 70, 13.7, 16.8, 8.5],
  ["Allesta", 76, -8.9, -14.9, 9, 0.1],
  ["Siux", 82, 37, 2, 9.5, -0.15],
];
const kurguList: [string, number][] = [
  ["The Lock", 0.12],
  ["Allvex", 0.26],
  ["Voop", 0.42],
  ["La Vita", 0.58],
  ["Regnum Riva", 0.74],
  ["Elaris", 0.88],
];
/** The film strip of Kurgu Masası: a curve through the right lobe; its frames sit at `u` along it. */
export const filmStrip: V3[] = [
  [44, 15, 4],
  [52, 4, -8],
  [57, 8, -24],
  [48, -2, -44],
  [64, 5, -62],
];
export const kurguU: Record<string, number> = {};

const web = aiWorks.find((w) => w.id === "web-sitesi")!;
const app = aiWorks.find((w) => w.id === "uygulama")!;

export const works: Work[] = [
  ...gorselList.map(([t, d, x, y, width, turn]) => {
    const p = byTitle(t);
    return { id: `g-${p.poster}`, area: "gorsel-hafiza" as AreaId, title: p.title, text: p.description, image: poster(p), tag: p.categories.join(" · "), at: seen(G, d, x, y), width, turn };
  }),
  ...kurguList.map(([t, u]) => {
    const p = byTitle(t);
    const id = `k-${p.poster}`;
    kurguU[id] = u;
    return { id, area: "kurgu-masasi" as AreaId, title: p.title, text: p.description, image: poster(p), tag: p.categories.join(" · "), video: fileUrl(p.video), at: [0, 0, 0] as V3, width: t === "Voop" ? 11 : 7.5 };
  }),
  {
    id: "d-web-ana",
    area: "deney-alani",
    title: "Portfolyo sitesi: ana sayfa",
    text: "Bu sitenin ana sayfası, masaüstü görünümü. " + web.summary,
    image: url("ai-works/web-sitesi/portfolyo-masaustu.jpg"),
    tag: "Web Sitesi",
    link: { href: "/ai-isler#web-sitesi", label: "Web Sitesi örneğini AI İşler’de gör" },
    at: seen(D, 44, 4, 4),
    width: 26,
  },
  {
    id: "d-web-hakkimda",
    area: "deney-alani",
    title: "Portfolyo sitesi: Hakkımda",
    text: "Aynı sitenin Hakkımda sayfası, masaüstü görünümü.",
    image: url("ai-works/web-sitesi/portfolyo-masaustu-2.jpg"),
    tag: "Web Sitesi",
    link: { href: "/hakkimda", label: "Hakkımda sayfasını aç" },
    at: seen(D, 52, -25, 12),
    width: 17,
    turn: 0.25,
  },
  {
    id: "d-web-mobil",
    area: "deney-alani",
    title: "Portfolyo sitesi: telefon",
    text: "Aynı sitenin ana sayfası, telefon görünümü.",
    image: url("ai-works/web-sitesi/portfolyo-mobil.jpg"),
    tag: "Web Sitesi",
    link: { href: "/ai-isler#web-sitesi", label: "Web Sitesi örneğini AI İşler’de gör" },
    at: seen(D, 46, -14, 6),
    width: 7.5,
  },
  ...(
    [
      ["app-hizmet", "Konu seçimi", seen(D, 48, -2, -11)],
      ["app-saat", "Gün ve saat", seen(D, 48, 7, -11)],
      ["app-ozet", "Özet", seen(D, 48, 16, -11)],
      ["app-onay", "Onay", seen(D, 48, 25, -11)],
    ] as [string, string, V3][]
  ).map(([f, t, at]) => ({
    id: `d-${f}`,
    area: "deney-alani" as AreaId,
    title: `Konsept prototip: ${t}`,
    text: "Görüşme randevusu için bir konsept uygulama akışından bir ekran (örnek gün ve saatler; gerçek bir randevu yapılmaz). " + app.summary,
    image: url(`zihnim/${f}.jpg`),
    tag: "Konsept prototip",
    link: { href: "/ai-isler#uygulama", label: "Uygulama prototipini AI İşler’de gör" },
    at,
    width: 6,
  })),
];
export const worksOf = (id: string) => works.filter((w) => w.area === id);
export const workById = (id: string | null) => (id ? works.find((w) => w.id === id) ?? null : null);
