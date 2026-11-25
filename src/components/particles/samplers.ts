/**
 * Turns things into target positions for the particle system. Every sampler returns exactly `count`
 * points (Float32Array of x, y, z) and a tone per point (0..1: how "bright" / how turquoise it may be),
 * so any shape can morph into any other with the same particles.
 *
 * Text is drawn on a 2D canvas and the lit pixels are read back (the idea of the "Particle Morph"
 * effect of PSCactux/webgl-shader-lab, MIT; the code here is written for this site, with Turkish
 * letters, a real font and layered depth). Model sampling picks points on the triangles of a GLB's
 * meshes, area-weighted, in the chosen pose.
 */
import {
  AnimationMixer,
  Box3,
  BufferGeometry,
  Euler,
  Material,
  Mesh,
  Object3D,
  SkinnedMesh,
  Vector3,
} from "three";
import type { GLTF } from "three-stdlib";
import type { ModelConfig } from "./config";

export type Shape = { pos: Float32Array; tone: Float32Array };

/** Small seeded random numbers: the same shapes every time. */
export const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

const empty = (n: number): Shape => ({ pos: new Float32Array(n * 3), tone: new Float32Array(n) });

/** A loose cloud (the free state the particles start from and fall back to). */
export function sampleCloud(count: number, seed = 11, radius = 7.5): Shape {
  const r = rng(seed);
  const s = empty(count);
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const u = r() * 2 - 1;
    const rad = radius * (0.35 + 0.65 * Math.cbrt(r()));
    const q = Math.sqrt(1 - u * u);
    s.pos[i * 3] = Math.cos(a) * q * rad * 1.5;
    s.pos[i * 3 + 1] = u * rad * 0.85;
    s.pos[i * 3 + 2] = Math.sin(a) * q * rad * 0.9 - 2;
    s.tone[i] = r();
  }
  return s;
}

export type TextOptions = {
  /** World width of the finished word. */
  width: number;
  weight?: number;
  family?: string;
  /** Extra depth: the particles of a letter are spread over this many world units, so the word has volume and perspective. */
  depth?: number;
  letterSpacing?: number;
  seed?: number;
};

/** Particles that spell `text` (uppercase or lowercase, Turkish letters included). */
export async function sampleText(text: string, count: number, o: TextOptions): Promise<Shape> {
  const family = o.family ?? "Geist, system-ui, sans-serif";
  const weight = o.weight ?? 800;
  // make sure the real font (with the Turkish letters) is there before it is measured
  try {
    await document.fonts.load(`${weight} 200px Geist`, text);
  } catch {
    /* the system font is used */
  }
  const W = 1600;
  const H = 520;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const probe = 200;
  ctx.font = `${weight} ${probe}px ${family}`;
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${(o.letterSpacing ?? 0.02) * probe}px`;
  const wProbe = ctx.measureText(text).width || 1;
  const size = Math.min(430, (probe * W * 0.94) / wProbe);
  ctx.font = `${weight} ${size}px ${family}`;
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${(o.letterSpacing ?? 0.02) * size}px`;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const m = ctx.measureText(text);
  const asc = m.actualBoundingBoxAscent;
  const desc = m.actualBoundingBoxDescent;
  ctx.fillText(text, W / 2, H / 2 + (asc - desc) / 2);
  const data = ctx.getImageData(0, 0, W, H).data;
  const lit: number[] = [];
  let minX = W;
  let maxX = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 128) {
        lit.push(x, y);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  const out = empty(count);
  const r = rng(o.seed ?? 7);
  const scale = o.width / Math.max(1, maxX - minX);
  const px = lit.length / 2;
  const depth = o.depth ?? 0.9;
  for (let i = 0; i < count; i++) {
    const k = px ? Math.floor(r() * px) * 2 : 0;
    const x = ((lit[k] ?? W / 2) - (minX + maxX) / 2 + r() - 0.5) * scale;
    const y = -((lit[k + 1] ?? H / 2) - H / 2 + r() - 0.5) * scale;
    // layered depth: some of the letter sits behind, some in front
    out.pos[i * 3] = x;
    out.pos[i * 3 + 1] = y;
    out.pos[i * 3 + 2] = (r() - 0.5) * depth;
    out.tone[i] = 0.25 + r() * 0.55;
  }
  return out;
}

/** Points along the segment a-b, `n` of them. Used by the frame builders. */
type Seg = { a: [number, number]; b: [number, number]; w: number; tone: number };

function fromSegments(segs: Seg[], count: number, seed: number, depth: number): Shape {
  const r = rng(seed);
  const total = segs.reduce((s, g) => s + g.w, 0);
  const out = empty(count);
  for (let i = 0; i < count; i++) {
    let pick = r() * total;
    let g = segs[0];
    for (const s of segs) {
      if ((pick -= s.w) <= 0) {
        g = s;
        break;
      }
    }
    const t = r();
    const jitter = 0.018;
    out.pos[i * 3] = g.a[0] + (g.b[0] - g.a[0]) * t + (r() - 0.5) * jitter * 2;
    out.pos[i * 3 + 1] = g.a[1] + (g.b[1] - g.a[1]) * t + (r() - 0.5) * jitter * 2;
    out.pos[i * 3 + 2] = (r() - 0.5) * depth;
    out.tone[i] = g.tone * (0.8 + r() * 0.2);
  }
  return out;
}

const rect = (x0: number, y0: number, x1: number, y1: number, w: number, tone: number): Seg[] => [
  { a: [x0, y0], b: [x1, y0], w: w * (x1 - x0), tone },
  { a: [x1, y0], b: [x1, y1], w: w * (y0 - y1), tone },
  { a: [x1, y1], b: [x0, y1], w: w * (x1 - x0), tone },
  { a: [x0, y1], b: [x0, y0], w: w * (y0 - y1), tone },
];

/** The browser frame's measures (also used by the page to place the real picture inside it). */
export const browserFrame = {
  /** Width / height of the whole frame. */
  aspect: 1.6,
  /** Top bar height as a share of the frame's height. */
  bar: 0.1,
  /** The picture area inside, as shares of the frame (left, top, right, bottom). */
  content: { l: 0.012, t: 0.115, r: 0.988, b: 0.988 },
};

/** A browser window: outline, address bar with three dots and a pill, and a faint grid of "page" dots inside. */
export function sampleBrowserFrame(count: number, width: number, seed = 31): Shape {
  const w = width;
  const h = width / browserFrame.aspect;
  const x0 = -w / 2;
  const x1 = w / 2;
  const y1 = h / 2;
  const y0 = -h / 2;
  const barY = y1 - h * browserFrame.bar;
  const segs: Seg[] = [
    ...rect(x0, y1, x1, y0, 5, 0.9),
    { a: [x0, barY], b: [x1, barY], w: 5 * w, tone: 0.9 },
    // the address pill
    ...rect(x0 + w * 0.12, y1 - h * 0.025, x0 + w * 0.62, barY + h * 0.025, 2.2, 0.6),
  ];
  // three dots at the left of the bar
  for (let i = 0; i < 3; i++) {
    const cx = x0 + w * (0.03 + i * 0.022);
    const cy = (y1 + barY) / 2;
    const rr = h * 0.013;
    for (let k = 0; k < 8; k++) {
      const a0 = (k / 8) * Math.PI * 2;
      const a1 = ((k + 1) / 8) * Math.PI * 2;
      segs.push({ a: [cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr], b: [cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr], w: 0.35, tone: 0.95 });
    }
  }
  const frame = fromSegments(segs, Math.round(count * 0.78), seed, 0.5);
  // the rest: a faint grid of dots inside (the page that will be there)
  const r = rng(seed + 5);
  const out = empty(count);
  const nf = Math.round(count * 0.78);
  out.pos.set(frame.pos.subarray(0, nf * 3), 0);
  out.tone.set(frame.tone.subarray(0, nf), 0);
  const cl = x0 + w * browserFrame.content.l;
  const cr = x0 + w * browserFrame.content.r;
  const ct = y1 - h * browserFrame.content.t;
  const cb = y1 - h * browserFrame.content.b;
  for (let i = nf; i < count; i++) {
    out.pos[i * 3] = cl + r() * (cr - cl);
    out.pos[i * 3 + 1] = cb + r() * (ct - cb);
    out.pos[i * 3 + 2] = (r() - 0.5) * 0.9;
    out.tone[i] = 0.2 + r() * 0.35;
  }
  return out;
}

/** A picture frame: double border, corner marks and a gradient field of dots inside (the picture). */
export function samplePictureFrame(count: number, width: number, seed = 47): Shape {
  const w = width;
  const h = width * 0.72;
  const x0 = -w / 2;
  const x1 = w / 2;
  const y1 = h / 2;
  const y0 = -h / 2;
  const inset = w * 0.045;
  const segs: Seg[] = [...rect(x0, y1, x1, y0, 5, 0.9), ...rect(x0 + inset, y1 - inset, x1 - inset, y0 + inset, 3, 0.7)];
  const mark = w * 0.07;
  for (const [cx, cy, sx, sy] of [
    [x0, y1, 1, -1],
    [x1, y1, -1, -1],
    [x0, y0, 1, 1],
    [x1, y0, -1, 1],
  ] as const) {
    segs.push({ a: [cx - sx * mark * 0.4, cy], b: [cx + sx * mark, cy], w: 1.5 * mark, tone: 1 });
    segs.push({ a: [cx, cy - sy * mark * 0.4], b: [cx, cy + sy * mark], w: 1.5 * mark, tone: 1 });
  }
  const nf = Math.round(count * 0.5);
  const frame = fromSegments(segs, nf, seed, 0.6);
  const out = empty(count);
  out.pos.set(frame.pos.subarray(0, nf * 3), 0);
  out.tone.set(frame.tone.subarray(0, nf), 0);
  const r = rng(seed + 9);
  const il = x0 + inset * 1.6;
  const ir = x1 - inset * 1.6;
  const it = y1 - inset * 1.6;
  const ib = y0 + inset * 1.6;
  for (let i = nf; i < count; i++) {
    const u = r();
    const v = r();
    // a soft field: denser toward a bright "sun" at the upper right, with a horizon band
    const dx = u - 0.72;
    const dy = v - 0.68;
    const keep = Math.exp(-(dx * dx + dy * dy) * 3.2) * 0.8 + 0.2 + (v < 0.35 ? 0.18 : 0);
    if (r() > keep) {
      i--;
      continue;
    }
    out.pos[i * 3] = il + u * (ir - il);
    out.pos[i * 3 + 1] = ib + v * (it - ib);
    out.pos[i * 3 + 2] = (r() - 0.5) * 1.1;
    out.tone[i] = 0.2 + Math.exp(-(dx * dx + dy * dy) * 5) * 0.8;
  }
  return out;
}

// ── 3D models ──────────────────────────────────────────────────────────────────────────────────
const _v = new Vector3();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const _n = new Vector3();
const _e1 = new Vector3();
const _e2 = new Vector3();
const _nv = new Vector3();
const _nw = new Vector3();

/** three.js cleans node names (dots, brackets, spaces); the config may use the names as they are written in the file. */
const clean = (n: string) => n.replace(/\s/g, "_").replace(/[.:/[\]]/g, "");

/** True when the mesh, or a group it sits in (a mesh with several materials becomes a group), has one of the names. */
const named = (o: Object3D, names: Set<string>): boolean => {
  for (let p: Object3D | null = o; p; p = p.parent) if (p.name && (names.has(p.name) || names.has(clean(p.name)))) return true;
  return false;
};

/** What a debug run prints so the include / exclude lists of config.ts can be filled in for a new model. */
export function describeModel(gltf: GLTF, cfg?: ModelConfig): { name: string; skinned: boolean; box: number[]; meanNormal?: number[] }[] {
  if (cfg?.pose) {
    const clip = gltf.animations.find((a) => a.name === cfg.pose!.clip);
    if (clip) {
      const mixer = new AnimationMixer(gltf.scene);
      mixer.clipAction(clip).play();
      mixer.setTime(cfg.pose.at === "start" ? 0 : cfg.pose.at === "end" ? clip.duration : cfg.pose.at);
    }
  }
  gltf.scene.updateMatrixWorld(true);
  const rows: { name: string; skinned: boolean; box: number[]; meanNormal?: number[] }[] = [];
  gltf.scene.traverse((o: Object3D) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    if ((m as SkinnedMesh).isSkinnedMesh) (m as SkinnedMesh).skeleton.update();
    const b = new Box3().setFromObject(m);
    const nrm = (m.geometry as BufferGeometry).getAttribute("normal");
    const mean = new Vector3();
    if (nrm) {
      for (let i = 0; i < nrm.count; i++) mean.add(_v.fromBufferAttribute(nrm, i));
      mean.divideScalar(nrm.count).transformDirection(m.matrixWorld);
    }
    rows.push({ name: m.name, skinned: !!(m as SkinnedMesh).isSkinnedMesh, box: [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map((v) => +v.toFixed(2)), meanNormal: nrm ? [mean.x, mean.y, mean.z].map((v) => +v.toFixed(2)) : undefined });
  });
  return rows;
}

function materialTone(mat: Material | Material[]): number {
  const m = (Array.isArray(mat) ? mat[0] : mat) as Material & { color?: { r: number; g: number; b: number } };
  if (!m?.color) return 0.6;
  const l = 0.2126 * m.color.r + 0.7152 * m.color.g + 0.0722 * m.color.b;
  return Math.min(1, Math.max(0.25, 0.3 + l * 0.9));
}

/**
 * Points on the surface of the model, in the chosen pose: skinned meshes are evaluated through their
 * skeleton, only the wanted meshes and the cropped parts are used, and triangles that face away from
 * `facing` are left out (so the front reads clearly). The result is centred and scaled to `fit.height`.
 */
export function sampleModel(gltf: GLTF, count: number, cfg: ModelConfig, seed = 5): Shape {
  const scene = gltf.scene;
  // the pose
  if (cfg.pose) {
    const clip = gltf.animations.find((a) => a.name === cfg.pose!.clip);
    if (clip) {
      const mixer = new AnimationMixer(scene);
      const act = mixer.clipAction(clip);
      act.play();
      mixer.setTime(cfg.pose.at === "start" ? 0 : cfg.pose.at === "end" ? clip.duration : cfg.pose.at);
    }
  }
  scene.updateMatrixWorld(true);

  const include = new Set([...cfg.include, ...cfg.include.map(clean)]);
  const exclude = new Set([...cfg.exclude, ...cfg.exclude.map(clean)]);
  const face = new Vector3(...cfg.facing).normalize();
  const tris: number[] = []; // ax ay az bx by bz cx cy cz
  const triTone: number[] = [];
  const area: number[] = [];

  scene.traverse((o: Object3D) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    if (named(mesh, exclude)) return;
    if (include.size && !named(mesh, include)) return;
    const geo = mesh.geometry as BufferGeometry;
    const pos = geo.getAttribute("position");
    if (!pos) return;
    const skinned = (mesh as SkinnedMesh).isSkinnedMesh;
    if (skinned) (mesh as SkinnedMesh).skeleton.update();
    const world = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      if (skinned) (mesh as SkinnedMesh).getVertexPosition(i, _v);
      else _v.fromBufferAttribute(pos, i);
      _v.applyMatrix4(mesh.matrixWorld);
      world[i * 3] = _v.x;
      world[i * 3 + 1] = _v.y;
      world[i * 3 + 2] = _v.z;
    }
    const nrm = geo.getAttribute("normal");
    const idx = geo.index;
    const n = idx ? idx.count / 3 : pos.count / 3;
    let crop = cfg.crop["*"];
    for (let p: Object3D | null = mesh; p && !crop; p = p.parent) {
      if (!p.name) continue;
      const key = Object.keys(cfg.crop).find((k) => k === p!.name || clean(k) === clean(p!.name));
      if (key) crop = cfg.crop[key];
    }
    const tone = materialTone(mesh.material);
    for (let t = 0; t < n; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      _a.fromArray(world, i0 * 3);
      _b.fromArray(world, i1 * 3);
      _c.fromArray(world, i2 * 3);
      const cy = (_a.y + _b.y + _c.y) / 3;
      if (crop) {
        if (crop.minY !== undefined && cy < crop.minY) continue;
        if (crop.maxY !== undefined && cy > crop.maxY) continue;
        if (crop.maxAbsX !== undefined && Math.abs((_a.x + _b.x + _c.x) / 3) > crop.maxAbsX) continue;
      }
      _e1.subVectors(_b, _a);
      _e2.subVectors(_c, _a);
      _n.crossVectors(_e1, _e2);
      const ar = _n.length() / 2;
      if (ar < 1e-9) continue;
      _n.normalize();
      // the winding of skinned / mirrored meshes can be the other way round: orient the face normal like the
      // mesh's own vertex normals, so "facing the front" means the outside of the surface
      if (nrm) {
        _nv.fromBufferAttribute(nrm, i0);
        _nw.fromBufferAttribute(nrm, i1);
        _nv.add(_nw);
        _nw.fromBufferAttribute(nrm, i2);
        _nv.add(_nw).transformDirection(mesh.matrixWorld);
        if (_n.dot(_nv) < 0) _n.negate();
      }
      if (_n.dot(face) < cfg.minFacing) continue;
      tris.push(_a.x, _a.y, _a.z, _b.x, _b.y, _b.z, _c.x, _c.y, _c.z);
      triTone.push(tone);
      area.push(ar);
    }
  });

  if (!area.length) throw new Error("the model gave no triangles (check include / exclude / crop in config.ts)");
  // cumulative areas for area-weighted picking
  const cum = new Float64Array(area.length);
  let sum = 0;
  for (let i = 0; i < area.length; i++) cum[i] = sum += area[i];

  const r = rng(seed);
  const out = empty(count);
  let minY = Infinity;
  let maxY = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < count; i++) {
    const pick = r() * sum;
    let lo = 0;
    let hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < pick) lo = mid + 1;
      else hi = mid;
    }
    const k = lo * 9;
    let u = r();
    let v = r();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const x = tris[k] + (tris[k + 3] - tris[k]) * u + (tris[k + 6] - tris[k]) * v;
    const y = tris[k + 1] + (tris[k + 4] - tris[k + 1]) * u + (tris[k + 7] - tris[k + 1]) * v;
    const z = tris[k + 2] + (tris[k + 5] - tris[k + 2]) * u + (tris[k + 8] - tris[k + 2]) * v;
    out.pos[i * 3] = x;
    out.pos[i * 3 + 1] = y;
    out.pos[i * 3 + 2] = z;
    out.tone[i] = Math.min(1, triTone[lo] * (0.75 + r() * 0.35));
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  // centre, scale to the wanted height, turn and move
  const s = cfg.fit.height / Math.max(1e-6, maxY - minY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const rot = new Euler(0, cfg.rotationY, 0);
  for (let i = 0; i < count; i++) {
    _v.set((out.pos[i * 3] - cx) * s, (out.pos[i * 3 + 1] - cy) * s, (out.pos[i * 3 + 2] - cz) * s).applyEuler(rot);
    out.pos[i * 3] = _v.x + cfg.offset[0];
    out.pos[i * 3 + 1] = _v.y + cfg.offset[1];
    out.pos[i * 3 + 2] = _v.z + cfg.offset[2];
  }
  return out;
}
