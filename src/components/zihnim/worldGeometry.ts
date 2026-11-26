/**
 * The points of "Eray'ın Zihni", generated once on the CPU (seeded: the world is always the same).
 *
 * kind: 0 shell (the two lobes), 1 idea core, 2 Görsel Hafıza, 3 Kurgu Masası, 4 Deney Alanı, 5 fibre paths,
 * 6 dust, 7 inner tracts, 8 near motes along the route (large, soft, few), 9 the dust of the tunnel, 10 the light of the hall.
 * The brain (buildWorld), the tunnel (buildTunnel) and the hall (buildHall) are separate sets: the scene makes the
 * tunnel and the hall only when the camera comes near them and frees them again when it is far away. Every point carries its own colour (aC): the colour follows the form (the crowns of the
 * folds are light, the grooves dim; the fissure and the lower parts turn icy; a little lavender at the back).
 * Points of a real picture keep the picture's colour and an image index (aImg): the scene fades them out when the
 * sharp picture (a textured plane) fades in.
 */
import { coverColor, galAt, galX, guideSpots, hallView, light, route, worldConfig as W, works, filmStrip, type V3, type Work } from "./zihnimWorld";

export type Samples = { w: number; h: number; lum: Float32Array; rgb: Float32Array };
export type Frame = { id: string; c: V3; right: V3; up: V3; normal: V3; w: number; h: number; img: number };
export type World = { pos: Float32Array; col: Float32Array; data: Float32Array; path: Float32Array; img: Float32Array; n: number; frames: Frame[] };

const TAU = Math.PI * 2;
/** Offsets of the core's three small lobes from the core centre (the guide's points start among them). */
const CORE_LOBES: V3[] = [
  [-2.5, 1, 1.4],
  [2.3, 1.6, -1.2],
  [0.3, -2.4, 1.6],
];
/** aPath of a picture's points (fill and outline) is FRAME_BASE + the picture's index: the scene moves frames as one. */
export const FRAME_BASE = 100;
/** aPath of a light line of the hall is LINE_BASE + the index of its picture; BEACON marks the far points of the first work. */
export const LINE_BASE = 200;
export const BEACON = 60;
/** Picture indices: the works of the hall come first (0..), the frames of the brain start here. */
export const BRAIN_FRAMES = 16;
/** The frames of the gallery (03) come after the works of the hall. */
export const GALLERY_FRAMES = 10;
const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
const gauss = (r: () => number) => (r() + r() + r() + r() - 2) * 0.8660254;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

// ── 3D value noise and ridged fractal noise (the folds of the lobes)
const hash3 = (x: number, y: number, z: number) => {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
/** 0..1, high on narrow crests (the gyri), low in the grooves between them. */
function ridged(x: number, y: number, z: number) {
  // a light domain warp makes the crests wind like gyri instead of running in straight bands
  const wx = x + (noise3(x * 0.5 + 7, y * 0.5, z * 0.5) - 0.5) * 1.6;
  const wy = y + (noise3(x * 0.5, y * 0.5 + 13, z * 0.5) - 0.5) * 1.6;
  const wz = z + (noise3(x * 0.5, y * 0.5, z * 0.5 + 29) - 0.5) * 1.6;
  let s = 0;
  let a = 0.74;
  let f = 1;
  for (let o = 0; o < 2; o++) {
    const n = noise3(wx * f, wy * f, wz * f);
    const rr = 1 - Math.abs(n * 2 - 1);
    s += rr * rr * rr * a;
    f *= 2.3;
    a *= 0.35;
  }
  return clamp(s, 0, 1);
}

function catmull(P: V3[], u: number): V3 {
  const n = P.length - 1;
  const f = clamp(u, 0, 0.99999) * n;
  const i = Math.floor(f);
  const t = f - i;
  const p0 = P[Math.max(0, i - 1)];
  const p1 = P[i];
  const p2 = P[i + 1];
  const p3 = P[Math.min(n, i + 2)];
  const c = (a: number, b: number, c2: number, d: number) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t * t + (-a + 3 * b - 3 * c2 + d) * t * t * t);
  return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1]), c(p0[2], p1[2], p2[2], p3[2])];
}

/**
 * Point size range (scene units) per kind; within a range most points are small and a few are larger (pow 3), so a
 * surface reads as fine grain with a few highlights instead of equal hard dots.
 */
const SIZE: Record<number, [number, number]> = { 0: [0.2, 0.7], 1: [0.12, 0.42], 2: [0.1, 0.2], 3: [0.1, 0.22], 4: [0.1, 0.36], 5: [0.1, 0.24], 6: [0.22, 0.95], 7: [0.12, 0.4], 8: [0.22, 0.6], 9: [0.14, 0.5], 10: [0.12, 0.3] };

export function buildWorld(total: number, imgs: Record<string, Samples | null>): World {
  const r = rng(90817);
  const P = W.palette;
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const data = new Float32Array(total * 4);
  const path = new Float32Array(total).fill(-1);
  const img = new Float32Array(total).fill(-1);
  let i = 0;
  const put = (p: V3, c: V3, kind: number, t: number, pathId = -1, imgId = -1, sizeK = 1) => {
    if (i >= total) return;
    pos.set(p, i * 3);
    col.set(c, i * 3);
    const [a, b] = SIZE[kind];
    data[i * 4] = r();
    data[i * 4 + 1] = (a + Math.pow(r(), 3) * (b - a)) * sizeK;
    data[i * 4 + 2] = kind;
    data[i * 4 + 3] = t;
    path[i] = pathId;
    img[i] = imgId;
    i++;
  };
  // shares are of the brain as it was with its own Görsel Hafıza (that place is now the hall, outside the brain)
  const N = (share: number) => Math.round((total / 0.82) * share);

  // ── the two lobes: folded surfaces, dense on the crests, thin in the grooves; a fissure in between
  const B = W.brain;
  const nShell = N(0.42);
  let made = 0;
  let guard = 0;
  while (made < nShell && guard < nShell * 40) {
    guard++;
    const side = r() < 0.5 ? -1 : 1;
    const a = r() * TAU;
    const b = Math.acos(2 * r() - 1);
    const dx = Math.sin(b) * Math.cos(a);
    const dy = Math.sin(b) * Math.sin(a);
    const dz = Math.cos(b);
    let rx = B.r[0] * (1 - 0.17 * smooth(0.3, 1, dz)) * (1 - 0.1 * smooth(0.45, 1, -dz));
    const ry = B.r[1] * (dy < 0 ? 0.76 : 1) * (1 - 0.12 * smooth(0.5, 1, dz));
    // the temporal lobe: a bulge low on the outer side
    rx *= 1 + 0.12 * smooth(-0.05, -0.5, dy) * smooth(-0.45, 0.1, dz) * smooth(0.2, 0.9, dx * side);
    // even density over the surface: a direction near the long axis covers less area than one across it
    const areaK = Math.hypot(dx / rx, dy / ry, dz / B.r[2]) * Math.min(rx, ry, B.r[2]);
    if (r() > areaK) continue;
    const inner = r() < 0.12;
    const k = inner ? 0.93 : 1;
    const bx = side * B.hemiX + dx * rx * k;
    const by = dy * ry * k - 4;
    const bz = dz * B.r[2] * k;
    const rg = ridged(bx * 0.058 + 11, by * 0.058 + 3, bz * 0.058);
    if (r() > 0.03 + 0.97 * smooth(0.32, 0.78, rg)) continue;
    // not every region is equally dense: wide, soft patches of the surface stay almost dark
    const patch = noise3(bx * 0.02 + 5, by * 0.02 + 1, bz * 0.02 + 9);
    if (r() > 0.22 + 0.78 * smooth(0.34, 0.62, patch)) continue;
    const disp = rg * 5.4 - 2.2;
    const x = bx + dx * disp;
    if (x * side < B.gap) continue; // the fissure between the lobes
    const y = by + dy * disp;
    const z = bz + dz * disp;
    // colour follows the form: light crests, dim grooves; icy lower parts and fissure; a little lavender at the back
    let c = scale(P.offWhite, 0.16 + 0.9 * rg * rg);
    c = mix(c, scale(P.ice, 0.42 + 0.5 * rg), 0.55 * smooth(5, -42, y));
    c = mix(c, scale(P.teal, 0.5 + 0.5 * rg), 0.5 * smooth(22, 4, Math.abs(x)) * smooth(-30, 20, y));
    c = mix(c, scale(P.lavender, 0.45 + 0.5 * rg), 0.4 * smooth(-50, -85, z) * smooth(10, -25, y));
    if (inner) c = scale(c, 0.62);
    put([x, y, z], c, 0, rg, -1, -1, inner ? 0.8 : 1);
    made++;
  }

  // ── the idea core: three small lobed shells (their surfaces, not a solid blob, so the inside stays readable), a
  // sparse heart, and three faint tilted orbits. Few points and low light: no white blow-out where they overlap.
  const cc = W.core.c;
  for (let k = 0; k < N(0.012); k++) {
    const m = k % 10;
    if (m < 2) {
      const ring = k % 3;
      const R = [12, 16.5, 21][ring];
      const th = r() * TAU;
      const tilt = [0.5, -0.35, 1.1][ring];
      put([cc[0] + Math.cos(th) * R, cc[1] + Math.sin(th) * R * Math.sin(tilt) + gauss(r) * 0.1, cc[2] + Math.sin(th) * R * Math.cos(tilt)], mix(P.offWhite, P.teal, 0.3 + 0.15 * ring), 1, th / TAU);
    } else if (m < 9) {
      const lob = CORE_LOBES[k % 3];
      const a = r() * TAU;
      const b = Math.acos(2 * r() - 1);
      const R = 3.2 + 0.5 * Math.sin(a * 3 + b * 2) + gauss(r) * 0.12;
      const p: V3 = [cc[0] + lob[0] + Math.sin(b) * Math.cos(a) * R, cc[1] + lob[1] + Math.cos(b) * R, cc[2] + lob[2] + Math.sin(b) * Math.sin(a) * R];
      put(p, mix(P.offWhite, P.teal, 0.25 + 0.4 * r()), 1, r());
    } else {
      put([cc[0] + gauss(r) * 2.2, cc[1] + gauss(r) * 2.2, cc[2] + gauss(r) * 2.2], mix(P.ice, P.offWhite, 0.6), 1, r());
    }
  }

  // ── fibre paths: the entrance corridor (front of the fissure to the core) and the core to each place
  const fibre = (A: V3, Cc: V3, Bp: V3, count: number, id: number, c0: V3, c1: V3, width: number) => {
    for (let k = 0; k < count; k++) {
      const t = r();
      const q = 1 - t;
      const x = q * q * A[0] + 2 * q * t * Cc[0] + t * t * Bp[0];
      const y = q * q * A[1] + 2 * q * t * Cc[1] + t * t * Bp[1];
      const z = q * q * A[2] + 2 * q * t * Cc[2] + t * t * Bp[2];
      const f = k % 6;
      const th = f * (TAU / 6) + t * 5;
      const rad = width * (0.4 + 0.12 * f) * (1 - 0.5 * Math.abs(2 * t - 1));
      put([x + Math.cos(th) * rad + gauss(r) * 0.06, y + Math.sin(th) * rad + gauss(r) * 0.06, z + gauss(r) * 0.06], mix(c0, c1, t), 5, t, id);
    }
  };
  const nPath = N(0.0045);
  fibre([-5, 12, 104], [-4, 22, 60], [-2, 12, 10], nPath, -1, P.ice, P.teal, 2.2);
  fibre([5, 12, 104], [4, 6, 60], [2, 6, 10], nPath, -1, P.ice, P.teal, 2.2);
  const anchors: V3[] = [
    [-46, 12, 20],
    [46, 4, -14],
    [2, -18, -72],
  ];
  const ctrls: V3[] = [
    [-26, 26, 22],
    [24, 22, -4],
    [6, -6, -38],
  ];
  anchors.forEach((a, s) => fibre(cc, ctrls[s], a, nPath, s, P.teal, P.ice, 1.6));

  // ── inner tracts: long, faint curves through each lobe (near-field parallax while travelling)
  const nTract = N(0.05);
  const tracts = Array.from({ length: 56 }, (_, k) => {
    const side = k % 2 ? 1 : -1;
    const pt = (): V3 => [side * (B.hemiX * 0.9 + gauss(r) * 14), gauss(r) * 22 - 4, gauss(r) * 48];
    return [pt(), pt(), pt()];
  });
  for (let k = 0; k < nTract; k++) {
    const tr = tracts[k % tracts.length];
    const t = r();
    const q = 1 - t;
    const p = [0, 1, 2].map((d) => q * q * tr[0][d] + 2 * q * t * tr[1][d] + t * t * tr[2][d]) as V3;
    put([p[0] + gauss(r) * 0.3, p[1] + gauss(r) * 0.3, p[2] + gauss(r) * 0.3], scale(mix(P.grey, P.ice, 0.3), 0.75), 7, t);
  }

  // ── works: real pictures as particles (they hand over to sharp pictures up close) and their frames
  const frames: Frame[] = [];
  const picture = (w: Work, c: V3, right: V3, up: V3, normal: V3, imgId: number, count: number, kind: number) => {
    if (imgId >= 24) return 0;
    const s = imgs[w.id];
    const width = w.width;
    const height = s ? (width * s.h) / s.w : width * 1.4;
    frames.push({ id: w.id, c, right, up, normal, w: width, h: height, img: imgId });
    const at = (lx: number, ly: number, lz = 0): V3 => [c[0] + right[0] * lx + up[0] * ly + normal[0] * lz, c[1] + right[1] * lx + up[1] * ly + normal[1] * lz, c[2] + right[2] * lx + up[2] * ly + normal[2] * lz];
    const edge = Math.floor(count * 0.12);
    for (let k = 0; k < edge; k++) {
      const per = 2 * (width + height);
      let t = r() * per;
      let lx: number;
      let ly: number;
      if (t < width) [lx, ly] = [t - width / 2, -height / 2];
      else if ((t -= width) < height) [lx, ly] = [width / 2, t - height / 2];
      else if ((t -= height) < width) [lx, ly] = [width / 2 - t, height / 2];
      else [lx, ly] = [-width / 2, height / 2 - (t - width)];
      put(at(lx * 1.02, ly * 1.02), scale(P.offWhite, 0.7), kind, 0.5, FRAME_BASE + imgId, -1, 0.9);
    }
    let got = 0;
    let g2 = 0;
    while (got < count - edge && g2 < count * 30) {
      g2++;
      if (!s) {
        put(at((r() - 0.5) * width, (Math.round(r() * 20) / 20 - 0.5) * height), scale(P.grey, 0.8), kind, 0.5, FRAME_BASE + imgId, imgId);
        got++;
        continue;
      }
      const px = Math.floor(r() * s.w);
      const py = Math.floor(r() * s.h);
      const cell = py * s.w + px;
      if (r() > 0.18 + 0.82 * Math.pow(s.lum[cell], 0.85)) continue;
      put(at((px / s.w - 0.5) * width + gauss(r) * 0.02, (0.5 - py / s.h) * height + gauss(r) * 0.02, gauss(r) * 0.03), [s.rgb[cell * 3], s.rgb[cell * 3 + 1], s.rgb[cell * 3 + 2]], kind, 0.5, FRAME_BASE + imgId, imgId);
      got++;
    }
    return height;
  };
  const facing = (c: V3, target: V3, turn = 0) => {
    const d = sub(target, c);
    const ang = Math.atan2(d[0], d[2]) + turn;
    return { normal: [Math.sin(ang), 0, Math.cos(ang)] as V3, right: [Math.cos(ang), 0, -Math.sin(ang)] as V3, up: [0, 1, 0] as V3 };
  };
  let imgId = BRAIN_FRAMES;

  // Deney Alanı: folded membranes (contour bands show their shape) around a browser, a phone and app screens
  const dc: V3 = [2, -22, -82];
  const nD = N(0.13);
  // three membranes: a rolling floor under the screens, a curved wall behind them, an arch over the left side
  const nMem = Math.floor(nD * 0.66);
  for (let k = 0, g = 0; k < nMem && g < nMem * 8; g++) {
    const m = g % 3;
    const u = r() * 2 - 1;
    const v = r() * 2 - 1;
    let p: V3;
    if (m === 0) p = [dc[0] + 6 + u * 46, dc[1] - 17 + 4.5 * Math.sin(u * 3.2 + 1) * Math.cos(v * 2.4), dc[2] + 4 + v * 30];
    else if (m === 1) p = [dc[0] + 6 + u * 50, dc[1] + 2 + v * 20 + 4 * Math.sin(u * 4), dc[2] - 26 + 10 * Math.cos(u * 2.5) + 4 * Math.sin(v * 3)];
    else {
      const a = (u * 0.5 + 0.5) * Math.PI;
      p = [dc[0] - 14 - Math.cos(a) * 26, dc[1] + 2 + Math.sin(a) * 26, dc[2] - 12 + v * 6 + 5 * Math.sin(a * 3)];
    }
    const band = Math.abs(Math.sin(u * 13 + v * 4 + m));
    if (r() > 0.1 + 0.9 * smooth(0.7, 0.99, band)) continue;
    k++;
    let c = mix(P.teal, P.ice, u * 0.5 + 0.5);
    c = mix(c, P.lavender, 0.3 * smooth(0.5, 1, v));
    put(p, scale(c, 0.55 + 0.45 * band), 4, (u + 1) / 2);
  }
  const dList = works.filter((w) => w.area === "deney-alani");
  const dStation = route[8].pos;
  const perD = Math.floor((nD * 0.32) / dList.length);
  for (const w of dList) {
    const f = facing(w.at, dStation, w.turn ?? 0);
    picture(w, w.at, f.right, f.up, f.normal, imgId++, w.width > 15 ? perD * 2 : perD, 4);
  }

  // ── near motes: a few large, soft points around the camera's route (foreground parallax on every stretch)
  const nMote = Math.min(W.particles.bokeh.count, N(0.004));
  for (let k = 0; k < nMote; k++) {
    const f = r() * (route.length - 1);
    const a = Math.min(route.length - 2, Math.floor(f));
    const t = f - a;
    const A = route[a].pos;
    const Bp = route[a + 1].pos;
    const th = r() * TAU;
    const ph = Math.acos(2 * r() - 1);
    const rad = 9 + r() * 22;
    put([A[0] + (Bp[0] - A[0]) * t + Math.sin(ph) * Math.cos(th) * rad, A[1] + (Bp[1] - A[1]) * t + Math.cos(ph) * rad * 0.7, A[2] + (Bp[2] - A[2]) * t + Math.sin(ph) * Math.sin(th) * rad], mix(P.offWhite, r() < 0.3 ? P.teal : P.ice, 0.25 + 0.4 * r()), 8, r());
  }

  // ── dust: sparse inside the lobes; a far field around everything, in soft banks with dark gaps between them
  let dustGuard = 0;
  while (i < total && dustGuard < total * 6) {
    dustGuard++;
    if (r() < 0.28) {
      put([gauss(r) * 60, gauss(r) * 30 - 4, gauss(r) * 70], scale(P.grey, 0.4 + 0.3 * r()), 6, r(), -1, -1, 0.6);
    } else {
      const a = r() * TAU;
      const b = Math.acos(2 * r() - 1);
      const rad = 170 + Math.pow(r(), 0.7) * 280;
      const p: V3 = [Math.sin(b) * Math.cos(a) * rad * 1.3, Math.sin(b) * Math.sin(a) * rad * 0.7, Math.cos(b) * rad];
      const bank = noise3(p[0] * 0.007 + 3, p[1] * 0.012, p[2] * 0.007 + 17);
      if (r() > 0.06 + 0.94 * smooth(0.46, 0.7, bank)) continue;
      put(p, mix(scale(P.grey, 0.45), scale(P.ice, 0.55), smooth(-100, 100, p[1]) * (0.5 + 0.5 * bank)), 6, r());
    }
  }
  while (i < total) put([gauss(r) * 60, gauss(r) * 30 - 4, gauss(r) * 70], scale(P.grey, 0.4), 6, r(), -1, -1, 0.6);
  // shuffle the order: a lower quality step draws only the first part of the buffer, which is then an even sample of
  // every kind (in build order it would drop the dust first and then whole places)
  const order = new Uint32Array(total);
  for (let a = 0; a < total; a++) order[a] = a;
  for (let a = total - 1; a > 0; a--) {
    const b = Math.floor(r() * (a + 1));
    const t = order[a];
    order[a] = order[b];
    order[b] = t;
  }
  const P3 = new Float32Array(total * 3);
  const C3 = new Float32Array(total * 3);
  const D4 = new Float32Array(total * 4);
  const PA = new Float32Array(total);
  const IM = new Float32Array(total);
  for (let a = 0; a < total; a++) {
    const o = order[a];
    P3.set(pos.subarray(o * 3, o * 3 + 3), a * 3);
    C3.set(col.subarray(o * 3, o * 3 + 3), a * 3);
    D4.set(data.subarray(o * 4, o * 4 + 4), a * 4);
    PA[a] = path[o];
    IM[a] = img[o];
  }
  return { pos: P3, col: C3, data: D4, path: PA, img: IM, n: total, frames };
}

/** Reads an image into a small colour + luminance grid (long side `max` cells). Resolves null when it cannot be read. */
export function sampleImage(src: string, max = 96): Promise<Samples | null> {
  return new Promise((resolve) => {
    const im = new Image();
    const timer = window.setTimeout(() => resolve(null), 8000);
    im.onload = () => {
      window.clearTimeout(timer);
      try {
        const k = max / Math.max(im.naturalWidth, im.naturalHeight);
        const w = Math.max(8, Math.round(im.naturalWidth * k));
        const h = Math.max(8, Math.round(im.naturalHeight * k));
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (!g) return resolve(null);
        g.drawImage(im, 0, 0, w, h);
        const d = g.getImageData(0, 0, w, h).data;
        const lum = new Float32Array(w * h);
        const rgb = new Float32Array(w * h * 3);
        for (let q = 0; q < w * h; q++) {
          const v = (0.2126 * d[q * 4] + 0.7152 * d[q * 4 + 1] + 0.0722 * d[q * 4 + 2]) / 255;
          lum[q] = v;
          for (let ch = 0; ch < 3; ch++) rgb[q * 3 + ch] = (d[q * 4 + ch] / 255) * 0.85 + v * 0.15;
        }
        resolve({ w, h, lum, rgb });
      } catch {
        resolve(null);
      }
    };
    im.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    im.src = src;
  });
}

export type Guide = {
  n: number;
  /** World position inside the idea core (where each point starts, at the overview). */
  home: Float32Array;
  /** Local position in the seed of light (around the guide's position). */
  seed: Float32Array;
  /** Local position in the bird (x right, y up, z forward). */
  bird: Float32Array;
  /** World position on the film strip of Kurgu Masası (the guide joins its flow there). */
  strip: Float32Array;
  /** World position on a membrane of Deney Alanı (the guide dissolves into it there). */
  mem: Float32Array;
  /** Colour picked up in Görsel Hafıza (from the real covers) for some points; base colour for the others. */
  tint: Float32Array;
  /** x: seed 0..1 (stagger), y: size, z: signed span position on a wing (0 = body), w: 1 if it carries a tint. */
  data: Float32Array;
};

/**
 * The guide: a seed of light (there is no bird). The same points (same index in every array) form the seed, the light
 * it hands to the screens of the hall, a stretch of the film strip and a patch of a membrane, so every change of form
 * is continuous.
 */
export function buildGuide(count: number, imgs: Record<string, Samples | null>): Guide {
  const r = rng(4242);
  const G = W.guide;
  const n = count;
  const home = new Float32Array(n * 3);
  const seed = new Float32Array(n * 3);
  const bird = new Float32Array(n * 3);
  const strip = new Float32Array(n * 3);
  const mem = new Float32Array(n * 3);
  const tint = new Float32Array(n * 3);
  const data = new Float32Array(n * 4);
  const cc = W.core.c;
  const hallF = hallFrames(imgs);
  const gImgs = works.filter((w) => w.area === "gorsel-hafiza").map((w) => imgs[w.id]).filter((s): s is Samples => !!s);
  const dc: V3 = [2, -22, -82];
  for (let k = 0; k < n; k++) {
    // home: on the core's lobes
    const lob = CORE_LOBES[k % 3];
    const a0 = r() * TAU;
    const b0 = Math.acos(2 * r() - 1);
    const R0 = 3.2 * Math.cbrt(r());
    home.set([cc[0] + lob[0] + Math.sin(b0) * Math.cos(a0) * R0, cc[1] + lob[1] + Math.cos(b0) * R0, cc[2] + lob[2] + Math.sin(b0) * Math.sin(a0) * R0], k * 3);
    // seed: dense in the middle, a thin halo
    const halo = r() < 0.12;
    const Rs = G.seedR * (halo ? 1.4 + r() * 1.2 : Math.pow(r(), 1.7));
    const a1 = r() * TAU;
    const b1 = Math.acos(2 * r() - 1);
    seed.set([Math.sin(b1) * Math.cos(a1) * Rs, Math.cos(b1) * Rs, Math.sin(b1) * Math.sin(a1) * Rs], k * 3);
    // "bird" is no bird any more: it is where this point lands when the seed opens in the hall and hands its light to
    // the screens (the top edge of a work, where its light line arrives), relative to the place the seed waits at
    const hf = hallF[k % hallF.length];
    const hx = (r() - 0.5) * hf.w;
    const spot = guideSpots["gorsel-hafiza"];
    bird.set([hf.c[0] + hf.right[0] * hx - spot[0], hf.c[1] + hf.h / 2 - spot[1], hf.c[2] + hf.right[2] * hx - spot[2]], k * 3);
    const span = 0;
    // strip: along the middle of the film strip, on its rails and cell edges
    const u = 0.28 + r() * 0.3;
    const c = catmull(filmStrip, u);
    const side = r() < 0.5 ? -1 : 1;
    strip.set([c[0], c[1] + side * (10.6 - r() * 1.5), c[2]], k * 3);
    // membrane: a patch of the curved wall behind the screens
    const mu = (r() - 0.5) * 1.2;
    const mv = (r() - 0.5) * 1.2;
    mem.set([dc[0] + 6 + mu * 50, dc[1] + 2 + mv * 20 + 4 * Math.sin(mu * 4), dc[2] - 26 + 10 * Math.cos(mu * 2.5) + 4 * Math.sin(mv * 3)], k * 3);
    // colour: off-white; about one point in six takes a colour of a real Görsel Hafıza cover
    let tc: V3 = W.palette.offWhite;
    let tinted = 0;
    if (r() < 0.17 && gImgs.length) {
      const s = gImgs[k % gImgs.length];
      for (let tries = 0; tries < 12; tries++) {
        const cell = Math.floor(r() * s.w * s.h);
        if (s.lum[cell] > 0.35) {
          tc = [s.rgb[cell * 3], s.rgb[cell * 3 + 1], s.rgb[cell * 3 + 2]];
          tinted = 1;
          break;
        }
      }
    }
    tint.set(tc, k * 3);
    data.set([r(), G.size * (0.6 + Math.pow(r(), 2.5) * 1.2), span, tinted], k * 4);
  }
  return { n, home, seed, bird, strip, mem, tint, data };
}

// ── the tunnel and the hall ("Işık Yolu"): separate point sets, made when the camera comes near

/** Collects points like buildWorld does and returns them shuffled (a quality step draws an even share of every part). */
function bag(total: number, seed: number) {
  const r = rng(seed);
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const data = new Float32Array(total * 4);
  const path = new Float32Array(total).fill(-1);
  const img = new Float32Array(total).fill(-1);
  let i = 0;
  const put = (p: V3, c: V3, kind: number, t: number, pathId = -1, imgId = -1, sizeK = 1, seedV?: number) => {
    if (i >= total) return;
    pos.set(p, i * 3);
    col.set(c, i * 3);
    const [a, b] = SIZE[kind];
    data.set([seedV ?? r(), (a + Math.pow(r(), 3) * (b - a)) * sizeK, kind, t], i * 4);
    path[i] = pathId;
    img[i] = imgId;
    i++;
  };
  const done = (frames: Frame[] = []): World => {
    const n = i;
    const order = new Uint32Array(n);
    for (let a = 0; a < n; a++) order[a] = a;
    for (let a = n - 1; a > 0; a--) {
      const b = Math.floor(r() * (a + 1));
      const t = order[a];
      order[a] = order[b];
      order[b] = t;
    }
    const P3 = new Float32Array(n * 3);
    const C3 = new Float32Array(n * 3);
    const D4 = new Float32Array(n * 4);
    const PA = new Float32Array(n);
    const IM = new Float32Array(n);
    for (let a = 0; a < n; a++) {
      const o = order[a];
      P3.set(pos.subarray(o * 3, o * 3 + 3), a * 3);
      C3.set(col.subarray(o * 3, o * 3 + 3), a * 3);
      D4.set(data.subarray(o * 4, o * 4 + 4), a * 4);
      PA[a] = path[o];
      IM[a] = img[o];
    }
    return { pos: P3, col: C3, data: D4, path: PA, img: IM, n, frames };
  };
  return { r, put, done, full: () => i >= total };
}
const colorAt = (s: Samples | null, u: number, v: number, fallback: V3): V3 => {
  if (!s) return fallback;
  const cell = Math.min(s.h - 1, Math.max(0, Math.floor(v * s.h))) * s.w + Math.min(s.w - 1, Math.max(0, Math.floor(u * s.w)));
  return [s.rgb[cell * 3], s.rgb[cell * 3 + 1], s.rgb[cell * 3 + 2]];
};
const hallWorks = () => works.filter((w) => w.area === "gorsel-hafiza");
/** The coloured cells of a picture (its paper and greys left out): the colours its light carries. */
const vivid = (s: Samples | null): V3[] => {
  const out: V3[] = [];
  if (!s) return out;
  for (let q = 0; q < s.w * s.h; q++) {
    const c: V3 = [s.rgb[q * 3], s.rgb[q * 3 + 1], s.rgb[q * 3 + 2]];
    const mx = Math.max(c[0], c[1], c[2]);
    const mn = Math.min(c[0], c[1], c[2]);
    if (mx > 0.2 && (mx - mn) / mx > 0.32) out.push(c);
  }
  return out;
};

/** The frames of the works of the hall (cheap; the scene needs them before the points of the hall exist). */
export function hallFrames(imgs: Record<string, Samples | null>): Frame[] {
  return hallWorks().map((w, k) => {
    const d = sub(hallView, w.at);
    const ang = Math.atan2(d[0], d[2]) + (w.turn ?? 0);
    const s = imgs[w.id];
    return { id: w.id, c: w.at, right: [Math.cos(ang), 0, -Math.sin(ang)] as V3, up: [0, 1, 0] as V3, normal: [Math.sin(ang), 0, Math.cos(ang)] as V3, w: w.width, h: s ? (w.width * s.h) / s.w : w.width * 1.6, img: k };
  });
}

/**
 * The tunnel: dust in one beam along the axis. The beam comes from the first work of the hall, so its dust carries
 * the colours of that picture across its section (as in the beam of a projector); outside the beam there are only a
 * few faint, long streaks that run with the axis (they give the perspective and the speed). No rings, no walls.
 * t = distance along the axis / length (the scene lets the beam reach out of the fissure first).
 */
export function buildTunnel(total: number, cover: Samples | null): World {
  const B = bag(total, 7717);
  const { r, put } = B;
  const P = W.palette;
  const A = light.axis;
  const at = (d: number, x: number, y: number): V3 => [A.p[0] + A.d[0] * d + x, A.p[1] + A.d[1] * d + A.up[1] * y, A.p[2] + A.d[2] * d + A.up[2] * y];
  // one stretch of the axis, twice `wrap` long: the shader repeats it around the camera
  const from = 0;
  const to = light.tunnel.wrap * 2;
  const [bw, bh] = light.tunnel.beam;
  const nBeam = Math.floor(total * 0.72);
  const pal = vivid(cover);
  for (let k = 0; k < nBeam; k++) {
    const d = from + r() * (to - from);
    // soft-edged section; a little denser along the middle
    const x = (r() + r() - 1) * bw * 1.25;
    const y = (r() + r() - 1) * bh * 1.25;
    // the beam comes from the square cover at its end: its dust carries the colours of the cover across its section
    // the dust carries the COLOURS of the cover (its turquoise, blues and a little orange), not its pale paper
    const c = pal.length ? pal[Math.floor(r() * pal.length)] : coverColor(0.5 + x / (bw * 2.5), 0.5 - y / (bh * 2.5));
    put(at(d, x, y), mix(P.offWhite, c, 0.78), 9, d / A.len, -1, -1, 0.7 + 0.6 * r());
  }
  // the faint outside: long streaks parallel to the axis, each a gentle curve
  const streaks = Array.from({ length: light.tunnel.streaks }, () => ({ a: r() * TAU, rad: 9 + r() * light.tunnel.outer, d0: from + r() * (to - from), len: 90 + r() * 200, bend: (r() - 0.5) * 9, c: mix(scale(P.grey, 0.7), r() < 0.2 ? P.lavender : P.ice, 0.35) }));
  while (!B.full()) {
    const st = streaks[Math.floor(r() * streaks.length)];
    const u = r();
    const rad = st.rad + st.bend * Math.sin(u * Math.PI);
    const d = st.d0 + u * st.len;
    put(at(d, Math.cos(st.a) * rad + gauss(r) * 0.12, Math.sin(st.a) * rad + gauss(r) * 0.12), scale(st.c, 0.5 * Math.sin(u * Math.PI) + 0.12), 9, d / A.len, -1, -1, 0.8);
  }
  return B.done();
}

/**
 * The hall (Görsel Hafıza): no walls. Its architecture is light: one thin line comes down from high above to each
 * work, and where it lands the work is written out of points (top to bottom), with a faint pool of its colour on the
 * floor. The first work is the light the beam of the tunnel came from: it is there from the start, and from far away
 * a few large points of it (BEACON) show its colours.
 * Line points: kind 10, aPath = LINE_BASE + picture, t 0 (top) .. 1 (at the work); the floor pool has t = 2.
 * Picture points: kind 2, t = how far down the picture (0 top .. 1 bottom).
 */
export function buildHall(total: number, imgs: Record<string, Samples | null>, frames: Frame[], cover: Samples | null): World {
  const B = bag(total, 31337);
  const { r, put } = B;
  const P = W.palette;
  const list = hallWorks();
  const H = light.hall;
  const floorY = hallView[1] + H.floor;
  const perPic = Math.floor((total * 0.7) / list.length);
  frames.forEach((f, k) => {
    const w = list[k];
    const s = imgs[w.id];
    const at = (lx: number, ly: number, lz = 0): V3 => [f.c[0] + f.right[0] * lx + f.up[0] * ly + f.normal[0] * lz, f.c[1] + f.right[1] * lx + f.up[1] * ly + f.normal[1] * lz, f.c[2] + f.right[2] * lx + f.up[2] * ly + f.normal[2] * lz];
    const count = k < 3 ? Math.floor(perPic * 1.5) : Math.floor(perPic * 0.8);
    // the work, as points; denser where the picture is lighter
    for (let got = 0, g = 0; got < count && g < count * 30; g++) {
      const u = r();
      const v = r();
      if (s) {
        const cell = Math.floor(v * s.h) * s.w + Math.floor(u * s.w);
        if (r() > 0.16 + 0.84 * Math.pow(s.lum[cell], 0.85)) continue;
      }
      put(at((u - 0.5) * f.w + gauss(r) * 0.02, (0.5 - v) * f.h + gauss(r) * 0.02, gauss(r) * 0.04), colorAt(s, u, v, scale(P.grey, 0.8)), 2, v, FRAME_BASE + f.img, f.img);
      got++;
    }
    // its light line, from high above down to its top edge (two close strands)
    const top: V3 = [f.c[0], f.c[1] + f.h / 2, f.c[2]];
    const high = H.ceiling * (0.7 + 0.3 * r());
    const nLine = Math.floor(total * 0.014);
    for (let q = 0; q < nLine; q++) {
      const t = Math.pow(r(), 0.8);
      const strand = (q % 2 ? 1 : -1) * 0.07;
      put([top[0] + f.right[0] * strand + gauss(r) * 0.03, top[1] + (1 - t) * high, top[2] + f.right[2] * strand + gauss(r) * 0.03], mix(P.offWhite, P.ice, 0.3 + 0.4 * t), 10, t, LINE_BASE + f.img, -1, 2.4);
    }
    // the pool of its light on the floor
    const avg = s ? colorAt(s, 0.5, 0.45, P.ice) : P.ice;
    const nPool = Math.floor(total * 0.006);
    for (let q = 0; q < nPool; q++) {
      const a = r() * TAU;
      const rad = Math.pow(r(), 0.7) * f.w * 0.9;
      put([f.c[0] + Math.cos(a) * rad, floorY + gauss(r) * 0.04, f.c[2] + Math.sin(a) * rad * 0.7], scale(mix(P.offWhite, avg, 0.6), 0.5 * (1 - rad / (f.w * 0.9)) + 0.1), 10, 2, LINE_BASE + f.img);
    }
  });
  // the square cover at the end of the tunnel (BEACON): each of its points is stored at the place on a screen it will
  // fly to; the shader holds it in the square (t = across, seed = up) until the camera arrives: one square, many squares
  for (let q = 0; q < Math.floor(total * light.cover.points); q++) {
    let u = r();
    let v = r();
    // about a fifth of the points draw the edge of the square: a thin, clear line, so it reads as a square from far away
    const edge = r() < 0.2;
    if (edge) {
      if (r() < 0.5) u = r() < 0.5 ? 0 : 1;
      else v = r() < 0.5 ? 0 : 1;
    }
    const f = frames[q % frames.length];
    const lx = (r() - 0.5) * f.w;
    const ly = (r() - 0.5) * f.h;
    // the paper of the cover is pale: its points are kept low so the square never adds up to white; the colours keep their light
    const raw = colorAt(cover, u, 1 - v, coverColor(u, 1 - v));
    const sat = (Math.max(raw[0], raw[1], raw[2]) - Math.min(raw[0], raw[1], raw[2])) / Math.max(0.01, Math.max(raw[0], raw[1], raw[2]));
    const cc = edge ? scale(P.offWhite, 0.9) : scale(raw, 0.3 + 0.9 * Math.min(1, sat * 2));
    put([f.c[0] + f.right[0] * lx, f.c[1] + ly, f.c[2] + f.right[2] * lx], cc, 10, u, BEACON, -1, edge ? 3 : 4, v);
  }
  // the air of the hall: very sparse dust, a little more in the height above the works
  while (!B.full()) {
    const p: V3 = [hallView[0] + gauss(r) * 46, hallView[1] + H.floor + Math.pow(r(), 1.6) * (H.ceiling + 20), hallView[2] - 40 + gauss(r) * 60];
    put(p, scale(mix(P.grey, P.ice, 0.3), 0.3 + 0.25 * r()), 10, 0);
  }
  return B.done(frames);
}

/** The frames of the gallery (03): real video covers in ONE row, Voop last and largest. Sets each work's place. */
export function galleryFrames(imgs: Record<string, Samples | null>): Frame[] {
  const list = works.filter((w) => w.area === "kurgu-masasi");
  list.sort((a, b) => Number(a.title.startsWith("Voop")) - Number(b.title.startsWith("Voop")));
  const A = light.axis;
  return list.map((w, k) => {
    const voop = k === list.length - 1;
    const width = voop ? light.gallery.voop : 7.2;
    const s = imgs[w.id];
    const h = s ? (width * s.h) / s.w : width * 1.6;
    const c = galAt(galX(k), voop ? 1.5 : 0);
    w.at = c;
    w.width = width;
    return { id: w.id, c, right: [1, 0, 0] as V3, up: A.up, normal: scale(A.d, -1), w: width, h, img: GALLERY_FRAMES + k };
  });
}

/**
 * The gallery: the covers as points (kind 2, they are there from the start: t = 0), two thin warm rails that run with
 * the row (the light of a projector), and a little warm dust. No curved strip.
 */
export function buildGallery(total: number, imgs: Record<string, Samples | null>, frames: Frame[]): World {
  const B = bag(total, 90210);
  const { r, put } = B;
  const warm: V3 = [1.0, 0.82, 0.58];
  const list = works.filter((w) => w.area === "kurgu-masasi");
  const per = Math.floor((total * 0.74) / frames.length);
  frames.forEach((f, k) => {
    const s = imgs[f.id] ?? imgs[list[k]?.id];
    const count = k === frames.length - 1 ? per * 2 : Math.floor(per * 0.8);
    for (let got = 0, g = 0; got < count && g < count * 30; g++) {
      const u = r();
      const v = r();
      if (s) {
        const cell = Math.floor(v * s.h) * s.w + Math.floor(u * s.w);
        if (r() > 0.16 + 0.84 * Math.pow(s.lum[cell], 0.85)) continue;
      }
      const lx = (u - 0.5) * f.w;
      const ly = (0.5 - v) * f.h;
      put([f.c[0] + lx, f.c[1] + f.up[1] * ly, f.c[2] + f.up[2] * ly], colorAt(s, u, v, scale(warm, 0.6)), 2, 0, FRAME_BASE + f.img, f.img);
      got++;
    }
  });
  const x0 = light.gallery.startX - 30;
  const x1 = galX(5) + 40;
  for (let q = 0; q < Math.floor(total * 0.14); q++) {
    const x = x0 + r() * (x1 - x0);
    const top = r() < 0.5;
    put(galAt(x, top ? 11.5 : -10.5, gauss(r) * 0.05), scale(warm, 0.3 + 0.25 * r()), 10, 0, -1, -1, 1.4);
  }
  while (!B.full()) put(galAt(x0 + r() * (x1 - x0), gauss(r) * 9, 4 + r() * 26), scale(warm, 0.22 + 0.2 * r()), 10, 0);
  return B.done(frames);
}
