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
import { fileUrl, otherWorks, projects, type Project } from "../../data/projects";

export type V3 = [number, number, number];
export type AreaId = "gorsel-hafiza" | "kurgu-masasi" | "deney-alani" | "hareket-atolyesi" | "birlikte-uretelim";
export type StationId = "genel" | "giris" | "zirve" | AreaId;

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
// Works of "Seçili İşler" and the ones taken out of it (otherWorks): this place keeps showing both.
const byTitle = (start: string) =>
  [...projects, ...otherWorks].find((p) => p.title.startsWith(start)) as Project;

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
  { pos: [0, 176, 44], target: [0, -8, -12] }, //   9 05 Zirve: the camera has climbed high above; the brain lies below
  { pos: [0, 46, -172], target: [0, 0, -18] }, //  10 Birlikte Üretelim: the whole brain again, from behind
];
/**
 * "Işık Yolu": the first stretch of the journey leaves the brain. The camera enters the front fissure, the shell
 * dissolves, and it follows one beam of light along a long axis (the tunnel) to a tall dark hall far outside the brain
 * (Görsel Hafıza). After the hall a short cut through darkness leads back to the places that are still inside the
 * brain (Kurgu Masası, Deney Alanı, the final), on knots 5..10 of `route` above. Knots 2..4 of `route` are no longer
 * travelled; they stay because the layouts of the old places are written relative to them (`seen`).
 *
 * Tempo: `t` are route positions 0..1 (what the wheel moves). They are NOT evenly spaced: little scroll for the long
 * tunnel (the camera accelerates and slows down again), more for the hall.
 */
const nrm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};
const AX0: V3 = [0, 14, 52];
const AXD: V3 = nrm([0, -0.1, -1]);
const AXU: V3 = [0, -AXD[2], AXD[1]]; // up, at a right angle to the axis (right is +x)
const TUNNEL_LEN = 1300; // from the start of the axis to the first work of the hall
const VIEW_DIST = 31; // the hall's viewing spot is this far in front of the first work
const along = (d: number, x = 0, y = 0): V3 => [AX0[0] + AXD[0] * d + x, AX0[1] + AXD[1] * d + AXU[1] * y, AX0[2] + AXD[2] * d + AXU[2] * y];
export const light = {
  axis: { p: AX0, d: AXD, up: AXU, len: TUNNEL_LEN },
  /** Route times: the opening frame, the fissure, the tunnel (from, to), the hall's viewing spot, the end of the look-around, the cut (from, to). */
  t: { swing: 0.06, fissure: 0.11, inside: 0.155, tunnel0: 0.19, tunnel1: 0.4, hall: 0.52, hallEnd: 0.6, gal0: 0.675, gal1: 0.74, room: 0.84, crane0: 0.885, summit: 0.935, push0: 0.945, final: 0.99, cut0: 2, cut1: 2.1 },
  /** Camera on the way in: positions and look targets at t = 0, swing, fissure, inside, tunnel0. */
  entry: [
    { pos: [-62, 70, 132] as V3, target: [8, -8, 2] as V3 },
    { pos: [-16, 58, 124] as V3, target: [0, 8, 22] as V3 },
    { pos: [0, 30, 106] as V3, target: [0, 14, 44] as V3 },
    { pos: [0, 19, 76] as V3, target: along(60) },
    { pos: AX0, target: along(120) },
  ],
  /** The hall: where the tunnel opens into it (distance along the axis), the viewing spot, and the slow push of the look-around (forward, right, up). */
  mouth: TUNNEL_LEN - VIEW_DIST - 120,
  view: TUNNEL_LEN - VIEW_DIST,
  push: [3, 2, 0.6] as V3,
  /** The brain's points dissolve between these route times as the camera enters; the beam reaches out of the fissure by `leak` units before that. */
  dissolve: [0.125, 0.19] as [number, number],
  leak: 78,
  /** Route times of knots 5..10 of `route` after the cut. */
  after: [0.805, 0.87, 0.935, 1],
  /**
   * 03 Hareket: a long gallery outside the brain, below the hall and across the axis. Its frames (real video covers)
   * wait behind the works of the hall as faint points (`galleryStart`); between the route times `gather` they come
   * forward one by one into ONE row, while the camera comes down to the row and then trucks sideways along it. On the
   * way the frames move a step at a time (`step`, tied to the route position). Voop is the large screen at the end.
   * `shutter`: the light lines of the hall fall into a slow, shallow rhythm (route position, not a clock).
   */
  gallery: {
    count: { desktop: 24000, light: 9000 },
    drop: 36,
    ahead: 34,
    gap: 21,
    dist: 30,
    startX: -16,
    voop: 13,
    gather: [0.548, 0.675] as [number, number],
    each: 0.014,
    step: { rate: 520, amp: 0.55 },
    shutter: { from: 0.545, to: 0.585, amp: 0.62, rate: 380 },
    /** The warm beam of a projector: from above and beside the row down onto Voop (points, like the beam of the tunnel). */
    beam: { from: [-46, 44, 34] as V3, share: 0.12 },
  },
  /**
   * 04 Yapay zekâ: the room of split light, at the end of the row. The truck goes on to the Allesta frame; a thin
   * prism (a sheet of points) stands before it and the frame opens into real frames of its making (`open`), in a
   * calm fan; the camera draws a small, slow arc (`arc`, radians). Its own point set.
   */
  room: { count: { desktop: 15000, light: 6000 }, gap: 40, dist: 27, arc: [-0.34, 0.24] as [number, number], open: [0.782, 0.845] as [number, number] },
  /**
   * 05 Zirve: the camera climbs high above the end of the road and looks back along it. Below lie light silhouettes of
   * every place (a few thousand points each, made only here): the brain far away, the tunnel, the hall, the gallery,
   * the room. 06: one empty screen in the sky in front of the camera; the light turns to the visitor, the camera
   * pushes in and stops `stop` in front of it.
   */
  summit: { count: { desktop: 22000, light: 9000 }, up: 210, beyond: 380, side: 60, lookAt: 300, streams: 0.16, dawn: 0.24 },
  screen: { dist: 150, w: 34, h: 19, stop: 40, light: 0.52, flow: [0.945, 0.978] as [number, number], turn: [0.962, 0.99] as [number, number] },
  /** The tunnel: point count (desktop / phone), half size of the beam's section, radius of the faint outer streaks. */
  tunnel: { count: { desktop: 20000, light: 8000 }, beam: [6, 6] as [number, number], outer: 26, streaks: 30, wrap: 240, farDim: [60, 210, 0.1] as V3 },
  /**
   * The far light of the tunnel: a SQUARE, the first song cover. No real cover is in the repository yet, so it is an
   * abstract square of points in a warm gradient (`coverColor`). It stands where the tunnel opens into the hall; as
   * the camera reaches it, its points leave for the screens of the hall (one square, many squares) between the
   * route times `split`.
   */
  cover: {
    side: 13,
    at: TUNNEL_LEN - VIEW_DIST - 110,
    points: 0.07,
    split: [0.381, 0.44] as [number, number],
    glow: 0.05,
    /** The real first cover (Eray's own song cover) and the two that join it at the arrival, smaller. Names are the ones written on the covers. */
    image: "kapaklar/sabah-olmadan.jpg",
    title: "Sabah Olmadan",
    aspect: 863 / 801,
    others: [
      { image: "kapaklar/her-gece.jpg", title: "Ormandaki Ev", aspect: 850 / 857, side: 6.6, x: -11.2, y: -0.4, back: 5 },
      { image: "kapaklar/yeterli-degil.jpg", title: "Yeterli Değil", aspect: 855 / 572, side: 7.6, x: 11.6, y: -0.6, back: 5 },
    ],
    /** The cover turns sharp between these distances; the two others arrive between these route times. */
    sharp: [230, 80] as [number, number],
    join: [0.352, 0.372] as [number, number],
  },
  /** Görsel dil: the camera comes out of the tunnel looking up into the height of the hall and settles down onto the leading work. */
  hallMove: { lookUp: 46, rise: 7 },
  /** The hall: point count, height the light lines come down from, floor level under the viewing spot, the far glow of the first work. */
  hall: { count: { desktop: 46000, light: 18000 }, ceiling: 150, floor: -17 },
  /** The hall's opening: each line starts `each` after the one before, comes down in `line`, and its work is written in `write` (route time). */
  opening: { from: 0.4, each: 0.0088, line: 0.018, write: 0.024 },
  /** Pictures of the hall turn sharp only this close (the layers behind stay points). */
  sharp: { far: 58, near: 42 },
};
/** A point of the hall as seen from its viewing spot: `d` units ahead, `x` to the right, `y` up. */
export const hallSeen = (d: number, x: number, y: number): V3 => along(light.view + d, x, y);
export const hallView: V3 = along(light.view);

/** The colour of the abstract cover at (u, v) 0..1: amber to coral to a deep warm rose, on a diagonal. */
export const coverColor = (u: number, v: number): V3 => {
  const k = Math.min(1, Math.max(0, 0.55 * u + 0.45 * v));
  const a: V3 = [0.98, 0.72, 0.36];
  const b: V3 = [0.93, 0.42, 0.34];
  const c: V3 = [0.62, 0.26, 0.4];
  const m = (p: V3, q: V3, t: number): V3 => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  return k < 0.5 ? m(a, b, k * 2) : m(b, c, k * 2 - 1);
};
export const coverAt: V3 = along(light.cover.at);
/** A point of the gallery: `x` along the row, `y` up, `back` toward the camera's side of the row. */
export const galAt = (x: number, y = 0, back = 0): V3 => along(light.view + light.gallery.ahead - back, x, y - light.gallery.drop);
/** x of the k-th frame of the row (0..5); the last one is Voop, a little apart. */
export const galX = (k: number) => (k < 5 ? k * light.gallery.gap : 5 * light.gallery.gap + 8);
/** Where the k-th frame of the gallery waits in the hall, high up behind the works. */
/** x of the Allesta frame, the heart of the room of 04. */
export const roomX = () => galX(5) + light.room.gap;
/** The summit: where the camera stands, and a point `d` along its look (with `y` up from that line). */
export const summitPos: V3 = along(light.view + light.summit.beyond, light.summit.side, light.summit.up);
const summitTo: V3 = along(light.summit.lookAt, 0, -30);
export const summitLook = (d: number, y = 0): V3 => {
  const v: V3 = [summitTo[0] - summitPos[0], summitTo[1] - summitPos[1], summitTo[2] - summitPos[2]];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [summitPos[0] + (v[0] / l) * d, summitPos[1] + (v[1] / l) * d + y, summitPos[2] + (v[2] / l) * d];
};
export const galleryStart = (k: number): V3 => hallSeen(66 + 5 * k, (k - 2.5) * 11, 24 + (k % 2) * 7);

/**
 * The seven chapters of the story (00..06): Eray's own way into this work. One text pattern for each: number, label,
 * a title of at most two lines, one sentence, at most one hint. `title` is also the station's name for screen readers.
 */
export type Chapter = {
  id: StationId;
  n: string;
  label: string;
  /** Small line above the title: period, role or place. Only real data. */
  meta?: string;
  title: string;
  line: string;
  /** Two or three lines of facts, from the site's own data (Career, tools, projects) and Eray's material. */
  facts?: string[];
  hint?: string;
  link?: { href: string; label: string };
  quote?: { text: string; by: string; note: string };
  t: number;
};
export const stations: Chapter[] = [
  { id: "genel", n: "00", label: "Kapı", title: "Her şey bir şarkı kapağıyla başladı.", line: "Işığı izle; nereye vardığını gör.", hint: "Tekerlekle ilerle", t: 0 },
  {
    id: "giris",
    n: "01",
    label: "Başlangıç",
    meta: "Kendi şarkılarım",
    title: "Kendi şarkılarıma kapak yapıyordum.",
    line: "Bir şarkıya yüz vermek, ilk tasarımlarımdı.",
    facts: ["3 kapak · Sabah Olmadan, Ormandaki Ev, Yeterli Değil"],
    t: light.t.inside,
  },
  {
    id: "gorsel-hafiza",
    n: "02",
    label: "Görsel dil",
    title: "Önce görmeyi öğrendim.",
    line: "Kapaklardan kolajlara, kampanyalardan markalara.",
    facts: ["Photoshop · Illustrator · InDesign"],
    hint: "Bir kareye dokun",
    t: light.t.hall,
  },
  {
    id: "kurgu-masasi",
    n: "03",
    label: "Hareket",
    title: "Grafik tasarım bana yetmedi.",
    line: "Hareket daha dinamik, daha etkili geldi.",
    facts: ["MODD Group · Motion Designer", "After Effects · Premiere Pro"],
    hint: "Voop’ta dur, izle",
    t: light.t.gal1,
  },
  {
    id: "deney-alani",
    n: "04",
    label: "Yapay zekâ",
    title: "İşimi büyütmek isterken yapay zekâ geldi.",
    line: "Bir fikir artık onlarca biçim alabiliyor.",
    facts: ["Görsel ve video üretiminde güncel yapay zekâ araçları"],
    link: { href: "/ai-isler#web-sitesi", label: "Web sitesi ve uygulama örnekleri → AI İşler" },
    t: light.after[1],
  },
  { id: "zirve", n: "05", label: "Zirve", title: "Zirve", line: "", quote: { text: "Dağa tırman, seni dünya görsün diye değil, dünyayı görebilmen için.", by: "David McCullough Jr.", note: "sevdiğim söz" }, t: light.after[2] },
  { id: "birlikte-uretelim", n: "06", label: "Ben", title: "Ben Eray Ömeroğlu.", line: "Motion Designer · Art Director · AI Artist", t: 1 },
];
/** Extra stops of the calm view (station to station, no flights): the tunnel as one still frame. */
export const calmStops = [0.3];
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
  genel: "",
  giris: "",
  zirve: "",
  "gorsel-hafiza": "",
  "kurgu-masasi": "",
  "deney-alani": "",
  "birlikte-uretelim": "",
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
    alpha: [0.62, 0.34, 0.8, 0.5, 0.6, 0.3, 0.3, 0.26, 0.085, 0.62, 0.8],
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
  motion: { amp: [0.5, 0.3, 0.12, 0.12, 0.4, 0.2, 0.7, 0.45, 0.9, 0.5, 0.04], speed: 0.32, scale: 0.055, whileMoving: 0.35 },
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
  guide: { count: 520, seedR: 0.9, span: 9, lead: 0.62, leadTunnel: 0.72, size: 0.34, ahead: 34, pull: 0.8 },
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
  count: { desktop: 173000, light: 60000 },
  /** Wheel: pixels of wheel for the whole route; the follow rate (1/s) once the wheel stops; largest step of one event. */
  /** snapReach 0: the camera stays exactly where the visitor stops (no pull onto a station). */
  /**
   * Tempo: pairs of [scroll position, route time], both 0..1. The wheel, a drag and the keys move the scroll position
   * evenly; a smooth monotone curve through these pairs turns it into the route time the story runs on. Where route
   * time grows slowly the story lingers (the room of 04, the quote of 05, the final screen). The stations and moments
   * keep their route times; only how much scrolling each stretch takes changes.
   */
  tempo: [
    [0, 0],
    [0.115, 0.155], //  01: the way in
    [0.38, 0.52], //    02: the tunnel and the hall
    [0.54, 0.74], //    03: down to the row and sideways
    [0.66, 0.84], //    the truck reaches the room of 04
    [0.73, 0.87], //    04: the versions open
    [0.785, 0.885], //  04: a calm stop in the room
    [0.855, 0.935], //  the climb, slow at both ends
    [0.91, 0.945], //   05: the quote, the camera almost still
    [0.965, 0.978], //  05 -> 06: the colours flow to the screen
    [0.985, 0.99], //   the light turns to the visitor
    [1, 1], //          06: the final rests
  ] as [number, number][],
  wheel: { routePx: 21000, startGain: 1.3, startReach: 0.06, follow: 7.5, maxStep: 240, snapAfter: 260, snapReach: 0 },
  /** Phone: a vertical drag of this many screen heights runs the whole route. */
  touch: { routeScreens: 4.5 },
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
    anchor: hallSeen(31, 0, 12),
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
/** Görsel Hafıza: [title, distance, right, up, width, extra turn]: layers from near to far, kept clear of the card. */
/** A portrait screen (a phone) is narrow: there the three near works are stepped in height and depth so none is cut. */
const PORTRAIT = typeof window !== "undefined" && window.innerWidth / Math.max(1, window.innerHeight) < 0.8;
/** Eray's personal graphic works (not client work): always labelled "Kişisel çalışma · Kolaj". */
const PERSONAL: Record<string, { title: string; image: string }> = {
  kendrick: { title: "Kendrick Lamar kolajı", image: "grafik/kendrick-lamar-kolaj.jpg" },
  novak: { title: "Novak × Sinner kolajı", image: "grafik/novak-sinner-kolaj.jpg" },
  blonded: { title: "blonded radio kolajı", image: "grafik/blonded-radio.jpg" },
};
export const PERSONAL_TAG = "Kişisel çalışma · Kolaj";
type HallRow = [string, number, number, number, number, number?];
const gorselPortrait: HallRow[] = [
  ["kendrick", 36, 0, 12, 9.4],
  ["novak", 40, 6.5, -1.6, 7.4],
  ["blonded", 40, -6.5, -2.4, 7.8],
  ["Motosan", 58, 14, 17, 7],
  ["Lay", 60, -15, 18, 7],
  ["Next Telekom", 64, 0, 34, 7],
  ["RES360", 74, 20, 2, 8],
  ["PayPal", 76, -21, 3, 8],
  ["Uber Motion", 80, 9, 43, 8],
  ["Fidan Properties", 82, -10, 45, 8.5],
];
// one work leads in the middle, two stand beside it; the client works recede behind them in two dimmer layers
const gorselWide: HallRow[] = [
  ["kendrick", 30, 0.4, 0.8, 10.6],
  ["novak", 36, 15.6, 2.6, 9.2, -0.26],
  ["blonded", 36, -15.8, 3.4, 10.4, 0.26],
  ["Motosan", 52, 27, -14, 7.5, -0.34],
  ["Lay", 54, 9.5, -15.5, 7],
  ["Next Telekom", 58, -35, 6, 7.5, 0.36],
  ["RES360", 70, -40, -7, 8.5, 0.3],
  ["PayPal", 72, 4, 22, 8.5],
  ["Uber Motion", 74, -19, -9, 8.5, 0.2],
  ["Fidan Properties", 78, 30, 21, 9, -0.2],
];
/** Chosen from the shape of the screen now (asked again when the phone is turned: the scene rebuilds the hall). */
export const isPortrait = () => typeof window !== "undefined" && window.innerWidth / Math.max(1, window.innerHeight) < 0.8;
const gorselList = PORTRAIT ? gorselPortrait : gorselWide;
const kurguList: [string, number][] = [
  ["The Lock", 0.2],
  ["Allvex | Sosyal", 0.36],
  ["Voop", 0.53],
  ["La Vita", 0.69],
  ["Regnum Riva", 0.81],
  ["Elaris", 0.92],
];
/** The film strip of Kurgu Masası: a curve through the right lobe; its frames sit at `u` along it. */
/** Laid out as seen from the station: a gentle arc that comes from the far left, passes the camera (Voop, facing it) and leaves to the right. */
export const filmStrip: V3[] = [seen(6, 60, -52, 4), seen(6, 43, -28, 1.5), seen(6, 34, -5, 0.5), seen(6, 41, 15, 1.5), seen(6, 62, 25, 4)];
export const kurguU: Record<string, number> = {};


export const works: Work[] = [
  ...gorselList.map(([t, d, x, y, width, turn]) => {
    const own = PERSONAL[t];
    if (own) return { id: `g-${t}`, area: "gorsel-hafiza" as AreaId, title: own.title, text: "Kişisel çalışma: kolaj. Bir müşteri işi değil.", image: url(own.image), tag: PERSONAL_TAG, at: hallSeen(d, x, y), width, turn };
    const p = byTitle(t);
    return { id: `g-${p.poster}`, area: "gorsel-hafiza" as AreaId, title: p.title, text: p.description, image: poster(p), tag: p.categories.join(" · "), at: hallSeen(d, x, y), width, turn };
  }),
  ...kurguList.map(([t, u]) => {
    const p = byTitle(t);
    const id = `k-${p.poster}`;
    kurguU[id] = u;
    return { id, area: "kurgu-masasi" as AreaId, title: p.title, text: p.description, image: poster(p), tag: p.categories.join(" · "), video: fileUrl(p.video), at: [0, 0, 0] as V3, width: t === "Voop" ? 10.5 : 7.5 };
  }),
  ...(() => {
    const p = byTitle("Allesta");
    const base = { area: "deney-alani" as AreaId, tag: "Yapay zekâ destekli reklam", at: [0, 0, 0] as V3, link: { href: "/ai-isler", label: "AI İşler’i gör" } };
    return [
      { ...base, id: "d-allesta", title: p.title, text: p.description, image: poster(p), video: fileUrl(p.video), width: 11 },
      ...[
        ["kurgu-kesit-1", "Allesta: süreçten kare 1"],
        ["kurgu-kesit-2", "Allesta: süreçten kare 2"],
        ["kurgu-kesit-3", "Allesta: süreçten kare 3"],
        ["kurgu-final-kare", "Allesta: son kare"],
      ].map(([f, t]) => ({ ...base, id: `d-${f}`, title: t, text: "Allesta reklamının yapım sürecinden gerçek bir kare. " + p.description, image: url(`process/allesta/${f}.jpg`), width: 7 })),
    ];
  })(),
];
export const worksOf = (id: string) => works.filter((w) => w.area === id);
export const workById = (id: string | null) => (id ? works.find((w) => w.id === id) ?? null : null);

/**
 * Where the guide waits at each station: in view of that station's camera, beside the place's main work and clear of
 * the card (lower left) and the route indicator (right). At the overview it is still part of the idea core.
 */
export const guideSpots: Record<StationId, V3> = {
  genel: [0, 15, 108],
  giris: along(46, 0, 1),
  "gorsel-hafiza": PORTRAIT ? hallSeen(26, 0, 2.4) : hallSeen(24, -3.6, -3.2),
  "kurgu-masasi": galAt(galX(5) - 10, 5, 10),
  "deney-alani": galAt(galX(5) + light.room.gap - 10, 6, 8),
  zirve: summitLook(90, -14),
  "birlikte-uretelim": summitLook(light.screen.dist - 12, -6),
  "hareket-atolyesi": [0, 8, 0],
};

