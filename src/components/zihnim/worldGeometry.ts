/**
 * The points of "Eray'ın Zihni", generated once on the CPU (seeded, so the world is always the same).
 *
 * kind: 0 shell of the two lobes, 1 idea core, 2 Görsel Hafıza, 3 Kurgu Masası, 4 Deney Alanı, 5 path (fibre from the
 * core to a place; `path` holds the slot 0..2), 6 far dust. `t` is the point's place along its structure (0..1):
 * the colour waves of a chosen path travel along it.
 */
import { areas, worldConfig as W, type V3 } from "./zihnimWorld";

export type Samples = { w: number; h: number; lum: Float32Array; rgb: Float32Array };
export type World = { pos: Float32Array; data: Float32Array; path: Float32Array; col: Float32Array; n: number; blob: V3 };

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
/** Smooth folds of the surface (gyri): a sum of sines of the unit direction. */
const fold = (x: number, y: number, z: number) => Math.sin(x * 5.1 + 1.3) * Math.sin(y * 4.3 + 0.4) + Math.sin(z * 4.7 + 2.2) * 0.6 + Math.sin((x + y) * 7.5) * 0.25;

const SIZE: Record<number, [number, number]> = { 0: [0.14, 0.3], 1: [0.12, 0.26], 2: [0.04, 0.09], 3: [0.04, 0.1], 4: [0.1, 0.22], 5: [0.1, 0.2], 6: [0.1, 0.22] };

/** Catmull-Rom through control points. */
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

export function buildWorld(total: number, frameImgs: (Samples | null)[], keyImg: Samples | null): World {
  const r = rng(7771);
  const pos = new Float32Array(total * 3);
  const data = new Float32Array(total * 4);
  const path = new Float32Array(total).fill(-1);
  const col = new Float32Array(total * 3); // colour of a picture point (0,0,0: an ordinary point)
  let i = 0;
  const put = (x: number, y: number, z: number, kind: number, t: number, pathId = -1, rgb?: Samples | null, cell = 0) => {
    if (i >= total) return;
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
    const [a, b] = SIZE[kind];
    data[i * 4] = r();
    data[i * 4 + 1] = a + Math.pow(r(), 2.2) * (b - a);
    data[i * 4 + 2] = kind;
    data[i * 4 + 3] = t;
    path[i] = pathId;
    if (rgb) {
      col[i * 3] = rgb.rgb[cell * 3];
      col[i * 3 + 1] = rgb.rgb[cell * 3 + 1];
      col[i * 3 + 2] = rgb.rgb[cell * 3 + 2];
    }
    i++;
  };
  const N = (share: number) => Math.round(total * share);
  const nShell = N(0.2);
  const nCore = N(0.05);
  const nA = N(0.34);
  const nB = N(0.16);
  const nC = N(0.09);
  const nPath = N(0.035);
  const nDust = N(0.04);

  // ── the two lobes: folded shells (an outer and a sparser inner one), denser along the folds, with a fissure between them
  for (let k = 0; k < nShell; k++) {
    const lobe = W.lobes[k % 2];
    for (let tries = 0; tries < 8; tries++) {
      const a = r() * TAU;
      const b = Math.acos(2 * r() - 1);
      const vx = Math.sin(b) * Math.cos(a);
      const vy = Math.sin(b) * Math.sin(a);
      const vz = Math.cos(b);
      const f = fold(vx, vy, vz);
      const inner = r() < 0.3 ? 0.84 : 1;
      const mul = (1 + 0.085 * f + 0.05 * Math.sin(vy * 3.1 + lobe.side * 1.7)) * inner;
      const x = lobe.c[0] + vx * lobe.r[0] * mul;
      if ((x - lobe.side * 0.9) * lobe.side < 0) continue; // the fissure: each lobe stays on its own side
      if (r() > 0.28 + 0.72 * smooth(-0.3, 0.95, f)) continue; // dense along the folds, thin between them
      put(x, lobe.c[1] + vy * lobe.r[1] * mul + gauss(r) * 0.25, lobe.c[2] + vz * lobe.r[2] * mul + gauss(r) * 0.25, 0, r());
      break;
    }
  }

  // ── the idea core: a dense, slightly lobed heart
  const cc = W.core.c;
  const lobes: V3[] = [
    [-1.6, 0.6, 0.8],
    [1.5, 1.0, -0.7],
    [0.2, -1.5, 1.0],
  ];
  for (let k = 0; k < nCore; k++) {
    const l = lobes[k % 3];
    const rad = W.core.r * 0.5;
    put(cc[0] + l[0] + gauss(r) * rad, cc[1] + l[1] + gauss(r) * rad, cc[2] + l[2] + gauss(r) * rad, 1, r());
  }

  // ── Görsel Hafıza: frames hanging at different heights; real posters become particle pictures
  const frames: { c: V3; bw: number; ry: number; img: number; bh?: number }[] = [
    { c: [-26, 9, 8], bw: 4.6, ry: 0.4, img: 0 },
    { c: [-19, 3.5, 15], bw: 4.4, ry: 0.15, img: 1 },
    { c: [-12, 9.5, 10], bw: 4.8, ry: -0.12, img: 2 },
    { c: [-6, 3, 16], bw: 4.4, ry: -0.35, img: 3 },
    { c: [-23, -3.5, 13], bw: 4.4, ry: 0.3, img: 4 },
    { c: [-14, -3, 19], bw: 4.6, ry: -0.1, img: 5 },
    { c: [-28, 2, 16], bw: 6.5, ry: 0.5, img: -1, bh: 4 },
    { c: [-4, 10, 12], bw: 5.5, ry: -0.4, img: -1, bh: 3.6 },
  ];
  const perFrame = Math.floor((nA * 0.93) / frames.length);
  const place = (c: V3, ry: number, lx: number, ly: number, lz = 0): V3 => [c[0] + lx * Math.cos(ry) + lz * Math.sin(ry), c[1] + ly, c[2] - lx * Math.sin(ry) + lz * Math.cos(ry)];
  for (const [fi, f] of frames.entries()) {
    const img = f.img >= 0 ? frameImgs[f.img] : null;
    const bh = img ? (f.bw * img.h) / img.w : f.bh ?? 4.4;
    let made = 0;
    const edge = Math.floor(perFrame * (img ? 0.12 : 0.5));
    for (let k = 0; k < edge; k++) {
      const per = 2 * (f.bw + bh);
      let t = r() * per;
      let lx: number;
      let ly: number;
      if (t < f.bw) [lx, ly] = [t - f.bw / 2, -bh / 2];
      else if ((t -= f.bw) < bh) [lx, ly] = [f.bw / 2, t - bh / 2];
      else if ((t -= bh) < f.bw) [lx, ly] = [f.bw / 2 - t, bh / 2];
      else [lx, ly] = [-f.bw / 2, bh / 2 - (t - f.bw)];
      const p = place(f.c, f.ry, lx, ly);
      put(p[0] + gauss(r) * 0.04, p[1] + gauss(r) * 0.04, p[2] + gauss(r) * 0.04, 2, (fi + r()) / frames.length);
      made++;
    }
    let guard = 0;
    while (made < perFrame && guard < perFrame * 30) {
      guard++;
      if (img) {
        const px = Math.floor(r() * img.w);
        const py = Math.floor(r() * img.h);
        const lum = img.lum[py * img.w + px];
        if (r() > Math.pow(lum, 0.9) * 1.05) continue;
        const p = place(f.c, f.ry, (px / img.w - 0.5) * f.bw + gauss(r) * 0.03, (0.5 - py / img.h) * bh + gauss(r) * 0.03);
        put(p[0], p[1], p[2] + gauss(r) * 0.05, 2, (fi + r()) / frames.length, -1, img, py * img.w + px);
      } else {
        const p = place(f.c, f.ry, (r() - 0.5) * f.bw * 0.97, (Math.round(r() * 14) / 14 - 0.5) * bh);
        put(p[0], p[1], p[2] + gauss(r) * 0.04, 2, (fi + r()) / frames.length);
      }
      made++;
    }
    // two thin lines hold it up from above
    for (let c = 0; c < 2; c++) {
      const lx = (c ? 0.38 : -0.38) * f.bw;
      const top = place(f.c, f.ry, lx, bh / 2);
      for (let k = 0; k < Math.floor((nA * 0.07) / frames.length / 2); k++) {
        const y = top[1] + r() * (27 - top[1]);
        put(top[0] + gauss(r) * 0.03, y, top[2] + gauss(r) * 0.03, 2, 0.5);
      }
    }
  }

  // ── Kurgu Masası: a film strip winding through the right lobe; the middle frame is a real project cover
  const spine: V3[] = [
    [6, -2.5, 10],
    [13, 0, 14],
    [20, -1.2, 12],
    [27, 1.8, 15],
    [33, 0, 12],
  ];
  const keyU = 0.5;
  const frameU = [0.08, 0.2, 0.33, 0.67, 0.8, 0.92];
  const tangent = (u: number): V3 => {
    const a = catmull(spine, Math.max(0, u - 0.01));
    const b = catmull(spine, Math.min(1, u + 0.01));
    const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    return [d[0] / l, d[1] / l, d[2] / l];
  };
  /** A point of the strip: u along, s across (-1..1), banked a little as the strip turns. */
  const stripAt = (u: number, s: number, w: number, lift = 0): V3 => {
    const c = catmull(spine, u);
    const t = tangent(u);
    // side vector = tangent x up, then banked by the turn of the strip
    let sx = t[2];
    let sy = 0;
    let sz = -t[0];
    const sl = Math.hypot(sx, sz) || 1;
    sx /= sl;
    sz /= sl;
    const bank = Math.sin(u * 9) * 0.45;
    sy = Math.sin(bank) * 1.0;
    return [c[0] + sx * s * w, c[1] + sy * s * w + lift, c[2] + sz * s * w];
  };
  const FW = 3.0; // half width of the strip
  const nRail = Math.floor(nB * 0.22);
  for (let k = 0; k < nRail; k++) {
    const u = r();
    const side = r() < 0.5 ? -1 : 1;
    const p = stripAt(u, side * (1 + gauss(r) * 0.02), FW);
    put(p[0], p[1], p[2], 3, u);
  }
  const nHole = Math.floor(nB * 0.16);
  for (let k = 0; k < nHole; k++) {
    const u = Math.round(r() * 90) / 90;
    const side = r() < 0.5 ? -1 : 1;
    const p = stripAt(u, side * 0.86 + gauss(r) * 0.015, FW);
    put(p[0] + gauss(r) * 0.02, p[1] + gauss(r) * 0.02, p[2] + gauss(r) * 0.02, 3, u);
  }
  const nFrames = Math.floor(nB * 0.22);
  for (let k = 0; k < nFrames; k++) {
    const u = frameU[k % frameU.length];
    const along = (r() - 0.5) * 0.07;
    const s = (r() - 0.5) * 1.5;
    const edge = r() < 0.55;
    const uu = edge ? u + (r() < 0.5 ? -0.035 : 0.035) : u + along;
    const ss = edge ? s : r() < 0.5 ? -0.72 : 0.72;
    const p = stripAt(uu, ss, FW);
    put(p[0] + gauss(r) * 0.03, p[1] + gauss(r) * 0.03, p[2] + gauss(r) * 0.03, 3, u);
  }
  // the key frame: a portrait frame in the middle of the strip, drawn from the Voop cover
  const nKey = Math.floor(nB * 0.5);
  const kw = 5.2;
  const kh = keyImg ? (kw * keyImg.h) / keyImg.w : 6.4;
  const kc = stripAt(keyU, 0, FW, 0.3);
  let made = 0;
  let guard = 0;
  while (made < nKey && guard < nKey * 40) {
    guard++;
    let lx: number;
    let ly: number;
    if (keyImg) {
      const px = Math.floor(r() * keyImg.w);
      const py = Math.floor(r() * keyImg.h);
      if (r() > Math.pow(keyImg.lum[py * keyImg.w + px], 0.9) * 1.05) continue;
      lx = (px / keyImg.w - 0.5) * kw;
      ly = (0.5 - py / keyImg.h) * kh;
    } else {
      lx = (r() - 0.5) * kw;
      ly = (Math.round(r() * 24) / 24 - 0.5) * kh;
    }
    // the picture plane faces the viewer of the overview (+z), turned a little toward the strip
    const ry = -0.28;
    put(kc[0] + lx * Math.cos(ry) + gauss(r) * 0.03, kc[1] + ly + gauss(r) * 0.03, kc[2] - lx * Math.sin(ry) + gauss(r) * 0.04, 3, keyU + gauss(r) * 0.01, -1, keyImg, keyImg ? Math.min(keyImg.w * keyImg.h - 1, Math.max(0, Math.round((0.5 - ly / kh) * (keyImg.h - 1)) * keyImg.w + Math.round((lx / kw + 0.5) * (keyImg.w - 1)))) : 0);
    made++;
  }
  for (let k = 0; k < Math.floor(nB * 0.06); k++) {
    // the outline of the key frame
    const per = 2 * (kw + kh);
    let t = r() * per;
    let lx: number;
    let ly: number;
    if (t < kw) [lx, ly] = [t - kw / 2, -kh / 2];
    else if ((t -= kw) < kh) [lx, ly] = [kw / 2, t - kh / 2];
    else if ((t -= kh) < kw) [lx, ly] = [kw / 2 - t, kh / 2];
    else [lx, ly] = [-kw / 2, kh / 2 - (t - kw)];
    const ry = -0.28;
    put(kc[0] + lx * Math.cos(ry), kc[1] + ly, kc[2] - lx * Math.sin(ry), 3, keyU);
  }

  // ── Deney Alanı: an organic blob with satellites; the vertex shader makes it change a little
  const bc = areas[2].anchor;
  const sats: V3[] = [
    [7.5, 2, -1],
    [-7, 3, 1.5],
    [3, 6.5, 2],
    [-4, -4.5, -2],
    [6, -4, 3],
  ];
  for (let k = 0; k < nC; k++) {
    const sat = r() < 0.22;
    const a = r() * TAU;
    const b = Math.acos(2 * r() - 1);
    const vx = Math.sin(b) * Math.cos(a);
    const vy = Math.sin(b) * Math.sin(a);
    const vz = Math.cos(b);
    if (sat) {
      const s = sats[k % sats.length];
      const rad = 1.5 * Math.cbrt(r());
      put(bc[0] + s[0] + vx * rad, bc[1] + s[1] + vy * rad, bc[2] + s[2] + vz * rad, 4, r());
    } else {
      const f = fold(vx * 1.4, vy * 1.4, vz * 1.4);
      const shellRad = 5.2 * (1 + 0.2 * f);
      const rad = r() < 0.62 ? shellRad + gauss(r) * 0.15 : shellRad * Math.cbrt(r()) * 0.92;
      put(bc[0] + vx * rad, bc[1] + vy * rad * 0.9, bc[2] + vz * rad, 4, r());
    }
  }

  // ── paths: fibres from the core to each place, with a slow helical twist
  const slots = areas.filter((a) => a.status === "ready");
  for (const a of slots) {
    const P2 = a.anchor;
    const d: V3 = [P2[0] - cc[0], P2[1] - cc[1], P2[2] - cc[2]];
    const dl = Math.hypot(d[0], d[1], d[2]);
    const P0: V3 = [cc[0] + (d[0] / dl) * 4.2, cc[1] + (d[1] / dl) * 4.2, cc[2] + (d[2] / dl) * 4.2];
    const M: V3 = [(P0[0] + P2[0]) / 2, (P0[1] + P2[1]) / 2, (P0[2] + P2[2]) / 2];
    const ctrl: V3 = [M[0] + (a.slot === 1 ? 4 : a.slot === 0 ? -4 : 0), M[1] + (a.slot === 2 ? -3 : 7), M[2] + 4];
    for (let k = 0; k < nPath; k++) {
      const t = r();
      const q = 1 - t;
      const x = q * q * P0[0] + 2 * q * t * ctrl[0] + t * t * P2[0];
      const y = q * q * P0[1] + 2 * q * t * ctrl[1] + t * t * P2[1];
      const z = q * q * P0[2] + 2 * q * t * ctrl[2] + t * t * P2[2];
      const fibre = k % 5;
      const th = fibre * (TAU / 5) + t * 4;
      const rad = (0.3 + fibre * 0.1) * (1 - 0.6 * Math.abs(2 * t - 1)) * 1.2;
      put(x + Math.cos(th) * rad + gauss(r) * 0.05, y + Math.sin(th) * rad + gauss(r) * 0.05, z + gauss(r) * 0.05, 5, t, a.slot);
    }
  }

  // ── far dust: clusters and voids around everything
  for (let k = 0; k < nDust; k++) {
    for (let tries = 0; tries < 10; tries++) {
      const a = r() * TAU;
      const b = Math.acos(2 * r() - 1);
      const rad = 62 + Math.pow(r(), 0.8) * 70;
      const x = Math.sin(b) * Math.cos(a) * rad * 1.3;
      const y = Math.sin(b) * Math.sin(a) * rad * 0.8;
      const z = Math.cos(b) * rad - 20;
      if (Math.sin(x * 0.06 + 1) * Math.sin(y * 0.08) * Math.sin(z * 0.05 + 2) > -0.1 || r() < 0.1) {
        put(x, y, z, 6, r());
        break;
      }
    }
  }
  // whatever is left of the budget goes to the shell (so the count is exact)
  while (i < total) {
    const lobe = W.lobes[i % 2];
    const a = r() * TAU;
    const b = Math.acos(2 * r() - 1);
    const vx = Math.sin(b) * Math.cos(a);
    const x = lobe.c[0] + vx * lobe.r[0];
    if ((x - lobe.side * 0.9) * lobe.side < 0) {
      put(lobe.c[0] + Math.abs(vx) * lobe.side * lobe.r[0], lobe.c[1] + Math.sin(b) * Math.sin(a) * lobe.r[1], lobe.c[2] + Math.cos(b) * lobe.r[2], 0, r());
    } else put(x, lobe.c[1] + Math.sin(b) * Math.sin(a) * lobe.r[1], lobe.c[2] + Math.cos(b) * lobe.r[2], 0, r());
  }
  return { pos, data, path, col, n: total, blob: bc };
}

/** Reads an image into a small luminance grid (long side `max` cells). Resolves null when the image cannot be read. */
export function sampleImage(src: string, max = 72): Promise<Samples | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => resolve(null), 6000);
    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const k = max / Math.max(img.naturalWidth, img.naturalHeight);
        const w = Math.max(8, Math.round(img.naturalWidth * k));
        const h = Math.max(8, Math.round(img.naturalHeight * k));
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (!g) return resolve(null);
        g.drawImage(img, 0, 0, w, h);
        const d = g.getImageData(0, 0, w, h).data;
        const lum = new Float32Array(w * h);
        const rgb = new Float32Array(w * h * 3);
        let lo = 1;
        let hi = 0;
        for (let q = 0; q < w * h; q++) {
          const v = (0.2126 * d[q * 4] + 0.7152 * d[q * 4 + 1] + 0.0722 * d[q * 4 + 2]) / 255;
          lum[q] = v;
          for (let ch = 0; ch < 3; ch++) rgb[q * 3 + ch] = (d[q * 4 + ch] / 255) * 0.72 + v * 0.28;
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
        // stretch the contrast so a picture reads as light and dark
        const span = Math.max(0.1, hi - lo);
        for (let q = 0; q < w * h; q++) lum[q] = clamp((lum[q] - lo) / span, 0, 1) * 0.92 + 0.06;
        resolve({ w, h, lum, rgb });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}
