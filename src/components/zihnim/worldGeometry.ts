/**
 * The points of "Eray'ın Zihni", generated once on the CPU (seeded: the world is always the same).
 *
 * kind: 0 shell (the two lobes), 1 idea core, 2 Görsel Hafıza, 3 Kurgu Masası, 4 Deney Alanı, 5 fibre paths,
 * 6 dust, 7 inner tracts. Every point carries its own colour (aC): the colour follows the form (the crowns of the
 * folds are light, the grooves dim; the fissure and the lower parts turn icy; a little lavender at the back).
 * Points of a real picture keep the picture's colour and an image index (aImg): the scene fades them out when the
 * sharp picture (a textured plane) fades in.
 */
import { route, stations, worldConfig as W, works, filmStrip, kurguU, type V3, type Work } from "./zihnimWorld";

export type Samples = { w: number; h: number; lum: Float32Array; rgb: Float32Array };
export type Frame = { id: string; c: V3; right: V3; up: V3; normal: V3; w: number; h: number; img: number };
export type World = { pos: Float32Array; col: Float32Array; data: Float32Array; path: Float32Array; img: Float32Array; n: number; frames: Frame[] };

const TAU = Math.PI * 2;
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
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

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

const SIZE: Record<number, [number, number]> = { 0: [0.34, 0.66], 1: [0.22, 0.46], 2: [0.1, 0.2], 3: [0.1, 0.22], 4: [0.12, 0.3], 5: [0.16, 0.32], 6: [0.3, 0.7], 7: [0.16, 0.34] };

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
    data[i * 4 + 1] = (a + Math.pow(r(), 2.2) * (b - a)) * sizeK;
    data[i * 4 + 2] = kind;
    data[i * 4 + 3] = t;
    path[i] = pathId;
    img[i] = imgId;
    i++;
  };
  const N = (share: number) => Math.round(total * share);

  // ── the two lobes: folded surfaces, dense on the crests, thin in the grooves; a fissure in between
  const B = W.brain;
  const nShell = N(0.42);
  let made = 0;
  let guard = 0;
  while (made < nShell && guard < nShell * 12) {
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
    const rg = ridged(bx * 0.07 + 11, by * 0.07 + 3, bz * 0.07);
    if (r() > 0.05 + 0.95 * smooth(0.3, 0.75, rg)) continue;
    const disp = rg * 4.2 - 1.8;
    const x = bx + dx * disp;
    if (x * side < B.gap) continue; // the fissure between the lobes
    const y = by + dy * disp;
    const z = bz + dz * disp;
    // colour follows the form: light crests, dim grooves; icy lower parts and fissure; a little lavender at the back
    let c = scale(P.offWhite, 0.3 + 0.7 * rg);
    c = mix(c, scale(P.ice, 0.42 + 0.5 * rg), 0.55 * smooth(5, -42, y));
    c = mix(c, scale(P.teal, 0.5 + 0.5 * rg), 0.5 * smooth(22, 4, Math.abs(x)) * smooth(-30, 20, y));
    c = mix(c, scale(P.lavender, 0.45 + 0.5 * rg), 0.4 * smooth(-50, -85, z) * smooth(10, -25, y));
    if (inner) c = scale(c, 0.62);
    put([x, y, z], c, 0, rg, -1, -1, inner ? 0.8 : 1);
    made++;
  }

  // ── the idea core: a dense, lobed heart with three tilted orbits around it
  const cc = W.core.c;
  const lobes: V3[] = [
    [-2.5, 1, 1.4],
    [2.3, 1.6, -1.2],
    [0.3, -2.4, 1.6],
  ];
  for (let k = 0; k < N(0.03); k++) {
    if (k % 3 === 0) {
      const ring = k % 9 === 0 ? 0 : k % 9 === 3 ? 1 : 2;
      const R = [12, 16.5, 21][ring];
      const th = r() * TAU;
      const tilt = [0.5, -0.35, 1.1][ring];
      put([cc[0] + Math.cos(th) * R, cc[1] + Math.sin(th) * R * Math.sin(tilt) + gauss(r) * 0.15, cc[2] + Math.sin(th) * R * Math.cos(tilt)], mix(P.offWhite, P.teal, 0.35 + 0.2 * ring), 1, th / TAU);
    } else {
      const lob = lobes[k % 3];
      const p: V3 = [cc[0] + lob[0] + gauss(r) * 3.4, cc[1] + lob[1] + gauss(r) * 3.4, cc[2] + lob[2] + gauss(r) * 3.4];
      const d = Math.hypot(p[0] - cc[0], p[1] - cc[1], p[2] - cc[2]);
      put(p, mix(P.teal, P.offWhite, smooth(2, 8, d)), 1, r());
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
  const nPath = N(0.012);
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
  const stationPos = (id: string) => route[Math.round(stations.find((s) => s.id === id)!.t * (route.length - 1))].pos;
  const picture = (w: Work, c: V3, right: V3, up: V3, normal: V3, imgId: number, count: number, kind: number) => {
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
      put(at(lx * 1.02, ly * 1.02), scale(P.offWhite, 0.95), kind, 0.5, -1, -1, 0.9);
    }
    let got = 0;
    let g2 = 0;
    while (got < count - edge && g2 < count * 30) {
      g2++;
      if (!s) {
        put(at((r() - 0.5) * width, (Math.round(r() * 20) / 20 - 0.5) * height), scale(P.grey, 0.8), kind, 0.5, -1, imgId);
        got++;
        continue;
      }
      const px = Math.floor(r() * s.w);
      const py = Math.floor(r() * s.h);
      const cell = py * s.w + px;
      if (r() > 0.18 + 0.82 * Math.pow(s.lum[cell], 0.85)) continue;
      put(at((px / s.w - 0.5) * width + gauss(r) * 0.02, (0.5 - py / s.h) * height + gauss(r) * 0.02, gauss(r) * 0.03), [s.rgb[cell * 3], s.rgb[cell * 3 + 1], s.rgb[cell * 3 + 2]], kind, 0.5, -1, imgId);
      got++;
    }
    return height;
  };
  const facing = (c: V3, target: V3, turn = 0) => {
    const d = sub(target, c);
    const ang = Math.atan2(d[0], d[2]) + turn;
    return { normal: [Math.sin(ang), 0, Math.cos(ang)] as V3, right: [Math.cos(ang), 0, -Math.sin(ang)] as V3, up: [0, 1, 0] as V3 };
  };
  let imgId = 0;

  // Görsel Hafıza: an archive of frames hanging in layers around an open aisle; wires above, a dotted floor below
  const gList = works.filter((w) => w.area === "gorsel-hafiza");
  const gStation = stationPos("gorsel-hafiza");
  const nG = N(0.15);
  const perG = Math.floor((nG * 0.84) / gList.length);
  for (const w of gList) {
    const f = facing(w.at, gStation, w.turn ?? 0);
    const height = picture(w, w.at, f.right, f.up, f.normal, imgId++, perG, 2);
    for (const sx of [-0.4, 0.4]) {
      const top: V3 = [w.at[0] + f.right[0] * sx * w.width, w.at[1] + height / 2, w.at[2] + f.right[2] * sx * w.width];
      for (let k = 0; k < Math.floor(nG * 0.004); k++) put([top[0], top[1] + r() * (46 - top[1]), top[2]], scale(P.grey, 0.7), 2, 0.5);
    }
  }
  for (let k = 0; k < Math.floor(nG * 0.1); k++) {
    const onX = r() < 0.5;
    const lane = Math.round((r() - 0.5) * 14) * 6;
    const along = (r() - 0.5) * 90;
    const x = -50 + (onX ? along * 0.75 : lane);
    const z = 8 + (onX ? lane : along);
    if (r() > 1 - smooth(25, 45, Math.hypot(x + 50, z - 8) * 0.8)) continue;
    put([x, -24 + gauss(r) * 0.05, z], scale(P.grey, 0.55), 2, 0.5);
  }

  // Kurgu Masası: a film strip winding through the right lobe; frames are real video covers; the Voop frame is the stop
  const kStation = stationPos("kurgu-masasi");
  const nK = N(0.11);
  const HALF = 12;
  const tangentAt = (u: number): V3 => norm(sub(catmull(filmStrip, Math.min(1, u + 0.004)), catmull(filmStrip, Math.max(0, u - 0.004))));
  for (let k = 0; k < Math.floor(nK * 0.2); k++) {
    const u = r();
    const c = catmull(filmStrip, u);
    const side = r() < 0.5 ? -1 : 1;
    const hole = r() < 0.45;
    if (hole && Math.floor(u * 260) % 2 === 0) continue;
    put([c[0], c[1] + side * (HALF - (hole ? 1.4 : 0)) + gauss(r) * 0.04, c[2]], hole ? scale(P.ice, 0.85) : mix(P.offWhite, P.ice, u), 3, u);
  }
  for (let k = 0; k < Math.floor(nK * 0.12); k++) {
    const cellU = Math.floor(r() * 34) / 34 + 0.5 / 34;
    const tg = tangentAt(cellU);
    const c = catmull(filmStrip, cellU);
    const edgeV = r() < 0.5;
    const lx = edgeV ? (r() < 0.5 ? -1 : 1) * 3.6 : (r() - 0.5) * 7.2;
    const ly = edgeV ? (r() - 0.5) * (HALF * 2 - 4) : (r() < 0.5 ? -1 : 1) * (HALF - 2);
    put([c[0] + tg[0] * lx, c[1] + ly, c[2] + tg[2] * lx], scale(P.offWhite, 0.55), 3, cellU);
  }
  const kList = works.filter((w) => w.area === "kurgu-masasi");
  const perK = Math.floor((nK * 0.62) / kList.length);
  for (const w of kList) {
    const u = kurguU[w.id];
    const c = catmull(filmStrip, u);
    const tg = tangentAt(u);
    let normal = norm(cross([0, 1, 0], tg));
    if (normal[0] * (kStation[0] - c[0]) + normal[2] * (kStation[2] - c[2]) < 0) normal = scale(normal, -1);
    const right = norm(cross([0, 1, 0], normal));
    const at: V3 = [c[0] + normal[0] * 0.3, c[1], c[2] + normal[2] * 0.3];
    w.at = at;
    picture(w, at, scale(right, -1), [0, 1, 0], normal, imgId++, w.width > 9 ? Math.floor(perK * 1.6) : perK, 3);
  }

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
  const dStation = stationPos("deney-alani");
  const perD = Math.floor((nD * 0.32) / dList.length);
  for (const w of dList) {
    const f = facing(w.at, dStation, w.turn ?? 0);
    picture(w, w.at, f.right, f.up, f.normal, imgId++, w.width > 15 ? perD * 2 : perD, 4);
  }

  // ── dust: sparse inside the lobes; a far field around everything (it fills the screen around the overview)
  while (i < total) {
    if (r() < 0.45) {
      put([gauss(r) * 60, gauss(r) * 30 - 4, gauss(r) * 70], scale(P.grey, 0.5 + 0.3 * r()), 6, r(), -1, -1, 0.6);
    } else {
      const a = r() * TAU;
      const b = Math.acos(2 * r() - 1);
      const rad = 180 + Math.pow(r(), 0.7) * 260;
      const p: V3 = [Math.sin(b) * Math.cos(a) * rad * 1.3, Math.sin(b) * Math.sin(a) * rad * 0.7, Math.cos(b) * rad];
      put(p, mix(scale(P.grey, 0.45), scale(P.ice, 0.5), smooth(-100, 100, p[1])), 6, r());
    }
  }
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
