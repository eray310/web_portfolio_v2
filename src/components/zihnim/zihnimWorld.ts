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
  { pos: [-62, 70, 132], target: [8, -8, 2] }, // 0 opening frame: three-quarter view, the brain fills the frame
  { pos: [-16, 58, 124], target: [0, 8, 22] }, //  1 swinging round to the front of the fissure
  { pos: [0, 26, 96], target: [-8, 13, 34] }, //   2 Fikir Çekirdeği: the entrance corridor, the core ahead
  { pos: [-14, 19, 70], target: [-42, 12, 24] }, // 3 turning into the left lobe
  { pos: [-27, 15, 54], target: [-54, 11, 8] }, //  4 Görsel Hafıza
  { pos: [-6, 28, 26], target: [32, 7, -8] }, //    5 over the idea core, across to the right lobe
  { pos: [27, 9, 12], target: [52, 4, -20] }, //    6 Kurgu Masası
  { pos: [27, -6, -30], target: [4, -21, -72] }, // 7 down and back
  { pos: [8, -12, -42], target: [2, -22, -82] }, // 8 Deney Alanı
  { pos: [42, 20, -116], target: [0, 4, -70] }, // 9 out through the back of the brain, looking back at it
  { pos: [0, 46, -172], target: [0, 0, -18] }, //  10 Birlikte Üretelim: the whole brain again, from behind
];
const knotT = (i: number) => i / (route.length - 1);

export const stations: { id: StationId; title: string; t: number; knot: number }[] = [
  { id: "genel", title: "Genel görünüm", t: knotT(0), knot: 0 },
  { id: "giris", title: "Fikir Çekirdeği", t: knotT(2), knot: 2 },
  { id: "gorsel-hafiza", title: "Görsel Hafıza", t: knotT(4), knot: 4 },
  { id: "kurgu-masasi", title: "Kurgu Masası", t: knotT(6), knot: 6 },
  { id: "deney-alani", title: "Deney Alanı", t: knotT(8), knot: 8 },
  { id: "birlikte-uretelim", title: "Birlikte Üretelim", t: knotT(10), knot: 10 },
];
export const stationT = (id: StationId) => stations.find((s) => s.id === id)!.t;

/**
 * The story: one short line per station ("Bir fikrin yolculuğu"). The card shows the station's name and this line;
 * between stations it shows where the route goes next. The same lines are in the static (no WebGL) version.
 */
const PALETTE = {
  offWhite: [0.94, 0.92, 0.89] as V3,
  grey: [0.58, 0.6, 0.63] as V3,
  teal: [0.2, 0.88, 0.78] as V3,
  ice: [0.6, 0.82, 1.0] as V3,
  lavender: [0.7, 0.62, 0.95] as V3,
};

export const story: Record<StationId, string> = {
  genel: "Bir fikrin yolculuğu. Rehberi izle; sırayla ilerle.",
  giris: "Bir fikir nereden gelir?",
  "gorsel-hafiza": "Önce görür, biriktiririm.",
  "kurgu-masasi": "Sonra parçalar arasında bir ritim bulurum.",
  "deney-alani": "Peki başka türlü olsaydı?",
  "birlikte-uretelim": "Sıradaki fikir senin olabilir.",
  "hareket-atolyesi": "",
};

export const worldConfig = {
  fov: 52,
  /**
   * Points. Size (css px) is clamped between minPx and maxPx; a point smaller than minPx is drawn at minPx with its
   * light scaled down (so far points stay small and calm instead of turning into equal hard specks). `edge` is the soft
   * rim of each dot in px; `exposure` scales all light. Alpha per kind: 0 shell, 1 core, 2-4 places, 5 paths, 6 dust,
   * 7 tracts. `near` scales points closer than `near.dist` (fewer, a little larger, softer).
   */
  particles: {
    minPx: 1.25,
    maxPx: 3.4,
    edge: 1.1,
    exposure: 1.5,
    alpha: [0.62, 0.34, 0.8, 0.5, 0.6, 0.3, 0.3, 0.26, 0.085],
    near: { dist: 28, alpha: 0.4 },
    /** Above `knee` px a point grows only by `slope` of the perspective size: near surfaces stay fine grain. */
    knee: 2.0,
    slope: 0.4,
    /** Seen from inside a lobe the shell is this much dimmer, so the works carry the frame. */
    insideShell: 0.5,
    /** Kind 8, the few near motes along the route: large, very soft, faint (depth without a blur pass). */
    bokeh: { count: 380, maxPx: 30, light: 6 },
  },
  /**
   * Local life: every point moves around its own place along a smooth field (neighbours move together), so a surface
   * breathes slowly without drifting. Amplitude in scene units per kind; `speed` in radians per second; `scale` is the
   * spatial frequency of the field. While the camera travels the amplitude drops to `whileMoving`.
   */
  motion: { amp: [0.5, 0.3, 0.12, 0.12, 0.4, 0.2, 0.7, 0.45, 0.9], speed: 0.32, scale: 0.055, whileMoving: 0.35 },
  /**
   * Light waves: `slots` waves run at the same time with their own period (s). Each starts at a point of the world,
   * spreads along the surface (radius grows to `reach`), leaves a short coloured trail and fades back to the base colour.
   * `colors` are weighted (lavender is rare). `strength` caps the brightening. Arriving at a place starts a stronger
   * wave there (`arrival`).
   */
  waves: {
    periods: [14, 19, 25],
    reach: 64,
    width: 7,
    trail: 16,
    strength: 0.5,
    colors: [
      ["teal", 4],
      ["ice", 4],
      ["lavender", 1],
    ] as [keyof typeof PALETTE, number][],
    arrival: 1.5,
  },
  /**
   * The guide: a small group of the core's points that gathers into a seed of light, opens into an abstract bird while
   * the route moves on, and waits at the next place. `count` points; `seedR` the seed's radius; `span` the bird's wing
   * span; `lead` how far (0..1 of a segment) it runs ahead of the camera; `wait` where in the segment it has arrived.
   */
  guide: { count: 1100, seedR: 1.1, span: 8, lead: 0.62, size: 0.3, ahead: 26, pull: 0.75 },
  /**
   * Discovery moments, as route time BEFORE each station (they are complete at the station, forwards and backwards):
   * Görsel Hafıza frames open layer by layer; Kurgu Masası frames align one after another; Deney Alanı screens pass
   * through another arrangement before they settle; the final gathers the colours.
   */
  moments: {
    gorsel: { from: 0.09, each: 0.006, len: 0.03 },
    kurgu: { from: 0.1, each: 0.011, len: 0.03 },
    deney: { from: 0.11, each: 0.007, end: 0.012 },
    final: { from: 0.07 },
  },
  /** The first knot of the route on a portrait screen (phones). */
  overviewPortrait: { pos: [0, 196, 96] as V3, target: [0, -8, -14] as V3 },
  /** The brain: two hemispheres (centre x = ±hemiX), radii, the gap of the fissure. */
  brain: { hemiX: 40, r: [47, 52, 94] as V3, gap: 2.6 },
  core: { c: [0, 8, 0] as V3, r: 8 },
  /** Point counts (desktop / phone). The quality steps draw a share of them. */
  count: { desktop: 260000, light: 90000 },
  /** Wheel: pixels of wheel for the whole route; the follow rate (1/s) once the wheel stops; largest step of one event. */
  /** snapReach 0: the camera stays exactly where the visitor stops (no pull onto a station). */
  wheel: { routePx: 6800, follow: 6.5, maxStep: 240, snapAfter: 260, snapReach: 0 },
  /** Phone: a vertical drag of this many screen heights runs the whole route. */
  touch: { routeScreens: 3.4 },
  /** A trip started by a button: seconds per whole route, and the limits. */
  trip: { perRoute: 3.4, min: 1.6, max: 4.2 },
  /** Limited look-around by dragging (desktop) or sideways (phone), radians. */
  look: { yaw: 0.38, pitch: 0.18, damping: 7 },
  /** How close (route time) counts as "at a station". */
  stationReach: 0.025,
  /** Real pictures: they fade in between these camera distances (far -> near); farther they are particles only. */
  picture: { far: 108, near: 60, load: 160, dimFar: 84, dimNear: 38, dim: 0.42 },
  /** The shell opens around the camera: points closer than `near` disappear, fully visible from `far`. */
  shellOpen: { near: 18, far: 46 },
  ambient: { speed: 1 },
  pointer: { radius: 0.08, push: 0.045, tint: 0.3 },
  ground: "#0c0a0b",
  palette: PALETTE,
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
  {
    id: "birlikte-uretelim",
    status: "ready",
    slot: 3,
    title: "Birlikte Üretelim",
    tagline: "Yolculukta biriken renkler ve biçimler burada buluşuyor.",
    hint: "Projeni anlat: üç kısa adımda bir brief.",
    anchor: [0, 30, -118],
  },
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
export const seen = (k: number, d: number, x: number, y: number): V3 => {
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
// three near works carry the frame (clear of each other); the rest recede behind them in two dimmer layers
const gorselList: [string, number, number, number, number, number?][] = [
  ["Motosan", 31, 0, 1.2, 8.6],
  ["Lay", 35, 13.6, 2.6, 7.6, -0.26],
  ["Next Telekom", 35, -14, 4.4, 7.6, 0.26],
  ["RES360", 50, 24.5, -14.5, 7.5, -0.34],
  ["PayPal", 52, 9.5, -14.5, 7],
  ["Uber Motion", 56, -35, 12, 7.5, 0.36],
  ["Fidan Properties", 70, -40, -6, 8.5, 0.3],
  ["Motivasyon vs Disiplin", 72, 4, 22, 8.5],
  ["Allesta", 74, -19, -8, 8.5, 0.2],
  ["Siux", 78, 30, 21, 9, -0.2],
];
const kurguList: [string, number][] = [
  ["The Lock", 0.2],
  ["Allvex", 0.36],
  ["Voop", 0.53],
  ["La Vita", 0.7],
  ["Regnum Riva", 0.83],
  ["Elaris", 0.94],
];
/** The film strip of Kurgu Masası: a curve through the right lobe; its frames sit at `u` along it. */
/** Laid out as seen from the station: a gentle arc that comes from the far left, passes the camera (Voop, facing it) and leaves to the right. */
export const filmStrip: V3[] = [seen(6, 60, -52, 4), seen(6, 43, -28, 1.5), seen(6, 34, -5, 0.5), seen(6, 39, 17, 1.5), seen(6, 54, 36, 4)];
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
    return { id, area: "kurgu-masasi" as AreaId, title: p.title, text: p.description, image: poster(p), tag: p.categories.join(" · "), video: fileUrl(p.video), at: [0, 0, 0] as V3, width: t === "Voop" ? 10.5 : 7.5 };
  }),
  {
    id: "d-web-ana",
    area: "deney-alani",
    title: "Portfolyo sitesi: ana sayfa",
    text: "Bu sitenin ana sayfası, masaüstü görünümü. " + web.summary,
    image: url("ai-works/web-sitesi/portfolyo-masaustu.jpg"),
    tag: "Web Sitesi",
    link: { href: "/ai-isler#web-sitesi", label: "Web Sitesi örneğini AI İşler’de gör" },
    at: seen(D, 44, 6, 5.5),
    width: 27,
  },
  {
    id: "d-web-hakkimda",
    area: "deney-alani",
    title: "Portfolyo sitesi: Hakkımda",
    text: "Aynı sitenin Hakkımda sayfası, masaüstü görünümü.",
    image: url("ai-works/web-sitesi/portfolyo-masaustu-2.jpg"),
    tag: "Web Sitesi",
    link: { href: "/hakkimda", label: "Hakkımda sayfasını aç" },
    at: seen(D, 64, -30, 15),
    width: 21,
    turn: 0.32,
  },
  {
    id: "d-web-mobil",
    area: "deney-alani",
    title: "Portfolyo sitesi: telefon",
    text: "Aynı sitenin ana sayfası, telefon görünümü.",
    image: url("ai-works/web-sitesi/portfolyo-mobil.jpg"),
    tag: "Web Sitesi",
    link: { href: "/ai-isler#web-sitesi", label: "Web Sitesi örneğini AI İşler’de gör" },
    at: seen(D, 39, -10.5, 2.5),
    width: 7,
  },
  ...(
    [
      ["app-hizmet", "Konu seçimi", seen(D, 43, -1, -11.5)],
      ["app-saat", "Gün ve saat", seen(D, 43, 7, -11.5)],
      ["app-ozet", "Özet", seen(D, 43, 15, -11.5)],
      ["app-onay", "Onay", seen(D, 43, 23, -11.5)],
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
    width: 5.6,
  })),
];
export const worksOf = (id: string) => works.filter((w) => w.area === id);
export const workById = (id: string | null) => (id ? works.find((w) => w.id === id) ?? null : null);

/**
 * Where the guide waits at each station: in view of that station's camera, beside the place's main work and clear of
 * the card (lower left) and the route indicator (right). At the overview it is still part of the idea core.
 */
export const guideSpots: Record<StationId, V3> = {
  genel: [0, 8, 0],
  giris: [-2, 12, 24],
  "gorsel-hafiza": seen(4, 24, -3.6, -3.2),
  "kurgu-masasi": seen(6, 20, -9.5, 4.5),
  "deney-alani": seen(8, 32, -8, 2),
  "birlikte-uretelim": seen(10, 34, 0, 5),
  "hareket-atolyesi": [0, 8, 0],
};

/** Görsel Hafıza's veil: a folded sheet of points in front of the archive (as seen from the station); it parts as the camera arrives. */
export const veil = (() => {
  const a = seen(4, 19, 0, 0);
  const b = seen(4, 19, 1, 0);
  const c = seen(4, 19, 0, 1);
  const d = seen(4, 20, 0, 0);
  const sub = (p: V3, q: V3): V3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
  return { at: a, right: sub(b, a), up: sub(c, a), fwd: sub(d, a), halfW: 30, halfH: 18, from: 0.085, to: 0.012 };
})();
