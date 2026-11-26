/**
 * "Birlikte nasıl çalışırız?": the process story as ONE set of particles inside the page's one WebGL scene.
 *
 * The four steps of the real working process (aiSteps in data/aiWorks.ts) are four settled shapes of the same points:
 *   1  Brief'i anlat            scattered small clusters come together into one linked core
 *   2  Kapsamı netleştirelim    the core opens; orbits and a few linked focal points form around it
 *   3  Tasarla, üret, geliştir  the points on the orbits flow into nested, layered frames
 *   4  Teslim et                the layers line up into one calm, legible composition
 * The shape is never hidden and replaced: every point has a place in all five shapes (A0 scattered, A1 core,
 * B orbits, C frames, D aligned) and travels along a visible, slightly curved path from one to the next.
 * `uU` is the story position: 0..1 A0 to A1, 1..2 A1 to B, 2..3 B to C, 3..4 C to D. Step k is settled at u = k + 1.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Matrix3, Points, ShaderMaterial, Vector2, Vector3 } from "three";
import { storyConfig as S } from "./storyConfig";
import { volumeConfig as V } from "./volumeConfig";

const TAU = Math.PI * 2;
const MOTION_PERIOD = 64;

const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
const gauss = (r: () => number) => (r() + r() + r() + r() - 2) * 0.8660254;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

// ── Shapes ───────────────────────────────────────────────────────────────────────────────────────
type Role = 0 | 1 | 2 | 3 | 4 | 5 | 6; // core, orbit/frame 1..4, node, dust
type P3 = [number, number, number];

// A0: nine small clusters
const CLUSTERS: P3[] = [
  [-22, 9, -6],
  [-14, -11, 4],
  [-5, 13, 7],
  [4, -13, -8],
  [13, 10, -3],
  [22, -6, 6],
  [-26, -2, 8],
  [8, 1, -11],
  [25, 8, 9],
];
// A1: four linked lobes of one core
const LOBES: P3[] = [
  [-6.2, 2.7, 1.7],
  [5.6, 3.9, -2.7],
  [1, -6, 3.9],
  [-0.8, 0.2, -6.1],
];
// B: four orbits (circles tilted into ellipses)
const ORBIT_R = [10, 15, 20, 25];
const TILT_X = 1.02;
const TILT_Z = -0.22;
// C: nested frames (width, height, centre, turn about y)
const FRAMES = [
  { w: 30, h: 17.5, c: [-3, 1, -8] as P3, ry: 0.28 },
  { w: 10, h: 17.5, c: [11, 0, 3] as P3, ry: -0.22 },
  { w: 17, h: 10, c: [-9, -4, 9] as P3, ry: 0.15 },
  { w: 22, h: 13, c: [2, -1.5, -1] as P3, ry: 0.1 },
];
// D: one aligned composition: a main frame, a phone frame, a node and a base line, all in one plane
const MAIN = { w: 30, h: 18, c: [-7, 1.5, 0] as P3 };
const PHONE = { w: 9, h: 17, c: [16.5, 1.5, 0] as P3 };

function orbitPoint(k: number, th: number, off: number): P3 {
  const R = ORBIT_R[k] + off;
  const x = Math.cos(th) * R;
  let y = Math.sin(th) * R;
  let z = 0;
  // tilt about x, then about z
  const y1 = y * Math.cos(TILT_X) - z * Math.sin(TILT_X);
  const z1 = y * Math.sin(TILT_X) + z * Math.cos(TILT_X);
  y = y1;
  z = z1;
  const x2 = x * Math.cos(TILT_Z) - y * Math.sin(TILT_Z);
  const y2 = x * Math.sin(TILT_Z) + y * Math.cos(TILT_Z);
  return [x2, y2 * 0.9, z];
}

/** A point on a rectangle (outline with probability `edge`, otherwise on a scan line), in the frame's own plane. */
function rectPoint(r: () => number, w: number, h: number, edge: number, lines: number): [number, number] {
  if (r() < edge) {
    const per = 2 * (w + h);
    let t = r() * per;
    if (t < w) return [t - w / 2, -h / 2];
    t -= w;
    if (t < h) return [w / 2, t - h / 2];
    t -= h;
    if (t < w) return [w / 2 - t, h / 2];
    t -= w;
    return [-w / 2, h / 2 - t];
  }
  const y = (Math.round(r() * lines) / lines - 0.5) * h;
  return [(r() - 0.5) * w * 0.97, y];
}

const place = (fr: { c: P3; ry?: number }, lx: number, ly: number, lz: number, r: () => number, jit: number): P3 => {
  const ry = fr.ry ?? 0;
  const x = lx * Math.cos(ry) + lz * Math.sin(ry);
  const z = -lx * Math.sin(ry) + lz * Math.cos(ry);
  return [fr.c[0] + x + gauss(r) * jit, fr.c[1] + ly + gauss(r) * jit, fr.c[2] + z + gauss(r) * jit];
};

type Built = { p: Float32Array[]; data: Float32Array; n: number };

function build(total: number): Built {
  const r = rng(424242);
  const p = [0, 1, 2, 3, 4].map(() => new Float32Array(total * 3));
  const data = new Float32Array(total * 4); // seed, order along the shape, size, role
  const sh = S.share;
  const cut = [sh.core, sh.r1, sh.r2, sh.r3, sh.r4, sh.node, sh.dust];
  const roleOf = (x: number): Role => {
    let a = 0;
    for (let i = 0; i < cut.length; i++) {
      a += cut[i];
      if (x < a) return i as Role;
    }
    return 6;
  };
  const sigma = CLUSTERS.map(() => 1.5 + r() * 1.6);
  const set = (i: number, shape: number, v: P3) => p[shape].set(v, i * 3);

  for (let i = 0; i < total; i++) {
    const role = roleOf(r());
    const seed = r();
    const order = r();
    const grp = Math.floor(r() * 36);
    // A0: the cluster of the point (dust: scattered wide)
    {
      if (role === 6) set(i, 0, [gauss(r) * 20, gauss(r) * 12, gauss(r) * 9]);
      else {
        const j = grp % CLUSTERS.length;
        set(i, 0, [CLUSTERS[j][0] + gauss(r) * sigma[j], CLUSTERS[j][1] + gauss(r) * sigma[j] * 0.8, CLUSTERS[j][2] + gauss(r) * sigma[j] * 0.8]);
      }
    }
    // A1: one linked core (clusters j go to lobe j % 4); focal nodes become the bridges between lobes; dust a thin halo
    {
      const l = grp % 4;
      if (role === 6) {
        const a = r() * TAU;
        const b = Math.acos(2 * r() - 1);
        const rad = 8 + r() * 7;
        set(i, 1, [Math.sin(b) * Math.cos(a) * rad, Math.sin(b) * Math.sin(a) * rad * 0.8, Math.cos(b) * rad * 0.7]);
      } else if (role === 5) {
        const l2 = (l + 1) % 4;
        const t = r();
        set(i, 1, [LOBES[l][0] + (LOBES[l2][0] - LOBES[l][0]) * t + gauss(r) * 0.45, LOBES[l][1] + (LOBES[l2][1] - LOBES[l][1]) * t + gauss(r) * 0.45, LOBES[l][2] + (LOBES[l2][2] - LOBES[l][2]) * t + gauss(r) * 0.45]);
      } else {
        const sg = role === 0 ? 2.7 : 3.2;
        set(i, 1, [LOBES[l][0] + gauss(r) * sg, LOBES[l][1] + gauss(r) * sg, LOBES[l][2] + gauss(r) * sg]);
      }
    }
    // B: core sphere, four orbits (three fine fibres each), three focal nodes on the orbits, a sparse halo
    {
      if (role === 0) {
        const a = r() * TAU;
        const b = Math.acos(2 * r() - 1);
        const rad = 4.4 * Math.cbrt(r());
        set(i, 2, [Math.sin(b) * Math.cos(a) * rad, Math.sin(b) * Math.sin(a) * rad, Math.cos(b) * rad]);
      } else if (role >= 1 && role <= 4) {
        const sub = Math.floor(r() * 3) - 1;
        const q = orbitPoint(role - 1, order * TAU, sub * 0.55);
        set(i, 2, [q[0] + gauss(r) * 0.14, q[1] + gauss(r) * 0.14, q[2] + gauss(r) * 0.14]);
      } else if (role === 5) {
        const n = grp % 3;
        const c = orbitPoint(n + 1, [0.6, 2.7, 4.6][n], 0);
        const a = r() * TAU;
        const b = Math.acos(2 * r() - 1);
        const rad = 2.4 * Math.cbrt(r());
        set(i, 2, [c[0] + Math.sin(b) * Math.cos(a) * rad, c[1] + Math.sin(b) * Math.sin(a) * rad, c[2] + Math.cos(b) * rad]);
      } else {
        const a = r() * TAU;
        const b = Math.acos(2 * r() - 1);
        const rad = 14 + r() * 13;
        set(i, 2, [Math.sin(b) * Math.cos(a) * rad, Math.sin(b) * Math.sin(a) * rad * 0.6, Math.cos(b) * rad * 0.7]);
      }
    }
    // C: nested frames. Orbit k flows into frame k; the core into a small inner frame; nodes mark corners; dust fills a sheet
    {
      if (role >= 1 && role <= 4) {
        const f = FRAMES[role - 1];
        const [lx, ly] = rectPoint(r, f.w, f.h, 0.34, 26);
        set(i, 3, place(f, lx, ly, 0, r, 0.1));
      } else if (role === 0) {
        const f = FRAMES[3];
        const [lx, ly] = rectPoint(r, f.w * 0.42, f.h * 0.5, 0.45, 12);
        set(i, 3, place(f, lx, ly, 1.4, r, 0.1));
      } else if (role === 5) {
        const f = FRAMES[grp % 4];
        const cx = grp % 2 ? 1 : -1;
        const cy = (grp >> 1) % 2 ? 1 : -1;
        const along = r() * 2.6;
        const horiz = r() < 0.5;
        set(i, 3, place(f, cx * (f.w / 2 - (horiz ? along : 0)), cy * (f.h / 2 - (horiz ? 0 : along)), 0, r, 0.1));
      } else {
        const f = FRAMES[0];
        const [lx, ly] = rectPoint(r, f.w * 0.96, f.h * 0.96, 0, 30);
        set(i, 3, place(f, lx, ly, 0.5, r, 0.12));
      }
    }
    // D: everything lies in one plane and lines up
    {
      if (role === 1) {
        const [lx, ly] = rectPoint(r, MAIN.w, MAIN.h, 1, 1);
        set(i, 4, place({ c: MAIN.c }, lx, ly, 0, r, 0.05));
      } else if (role === 2) {
        const [lx, ly] = rectPoint(r, MAIN.w * 0.94, MAIN.h * 0.94, 0, 22);
        set(i, 4, place({ c: MAIN.c }, lx, ly * 0.9 + MAIN.h * 0.04, 0, r, 0.05));
      } else if (role === 3) {
        const [lx, ly] = rectPoint(r, MAIN.w * 0.94, MAIN.h * 0.94, 0, 22);
        set(i, 4, place({ c: MAIN.c }, lx, ly * 0.9 - MAIN.h * 0.04, 0, r, 0.05));
      } else if (role === 4) {
        const [lx, ly] = rectPoint(r, PHONE.w, PHONE.h, 0.4, 24);
        set(i, 4, place({ c: PHONE.c }, lx, ly, 0, r, 0.05));
      } else if (role === 0) {
        const a = order * TAU;
        const rad = r() < 0.7 ? 3 : 3 * Math.sqrt(r());
        set(i, 4, [-25 + Math.cos(a) * rad, -12.5 + Math.sin(a) * rad, gauss(r) * 0.05]);
      } else if (role === 5) {
        const g = grp % 5;
        set(i, 4, [-14 + g * 8 + gauss(r) * 0.9, -13.4 + gauss(r) * 0.12, gauss(r) * 0.05]);
      } else {
        const [lx, ly] = rectPoint(r, MAIN.w * 0.9, MAIN.h * 0.9, 0, 38);
        set(i, 4, place({ c: MAIN.c }, lx, ly, 0, r, 0.05));
      }
    }
    data[i * 4] = seed;
    data[i * 4 + 1] = order;
    data[i * 4 + 2] = S.size.min + Math.pow(r(), 2.2) * (S.size.max - S.size.min);
    data[i * 4 + 3] = role;
  }
  return { p, data, n: total };
}

// ── Shaders ──────────────────────────────────────────────────────────────────────────────────────
const VERT = /* glsl */ `
  attribute vec3 aP0; attribute vec3 aP1; attribute vec3 aP2; attribute vec3 aP3; attribute vec3 aP4;
  attribute vec4 aData;
  uniform float uU;
  uniform float uPhase;
  uniform float uLoop;
  uniform float uShow;
  uniform float uCalm;
  uniform mat3 uRot;
  uniform vec3 uPlace;
  uniform float uFormScale;
  uniform float uFold;
  uniform float uRipple;
  uniform float uScale;
  uniform float uPR;
  uniform float uMaxPx;
  uniform float uAlpha;
  uniform float uSoft;
  uniform sampler2D uFlow;
  uniform float uPush;
  uniform float uTint;
  uniform vec3 cOff; uniform vec3 cGrey; uniform vec3 cTeal; uniform vec3 cIce; uniform vec3 cLav;
  uniform float uLav;
  uniform float uColStrength;
  uniform float uWaveW;
  varying vec4 vCol;
  varying float vSoft;

  float hash11(float n) { return fract(sin(n * 91.345) * 47453.5453); }
  vec3 pick(float i) {
    vec3 v = aP0;
    v = mix(v, aP1, step(0.5, i));
    v = mix(v, aP2, step(1.5, i));
    v = mix(v, aP3, step(2.5, i));
    v = mix(v, aP4, step(3.5, i));
    return v;
  }
  void main() {
    float seed = aData.x;
    float order = aData.y;
    float sz = aData.z;
    float u = clamp(uU, 0.0, 4.0);
    float seg = min(3.0, floor(u));
    float f = u - seg;
    vec3 a = pick(seg);
    vec3 b = pick(seg + 1.0);
    // the front of the change sweeps along the shape (by "order"), so the points follow one another
    float m = smoothstep(0.0, 1.0, clamp(f * 1.7 - order * 0.7, 0.0, 1.0));
    vec3 d = b - a;
    vec3 axis = normalize(cross(d, vec3(0.31, 1.0, 0.17)) + vec3(0.0001));
    // a visible, slightly curved path (each point bends its own way), strongest half way
    vec3 p = mix(a, b, m) + axis * sin(m * 3.14159) * length(d) * 0.17 * (seed * 2.0 - 1.0);
    // slow breathing of the folds; calmer once the story is complete
    float amp = mix(1.0, uCalm, smoothstep(3.0, 4.0, u));
    vec3 q = p * 0.1;
    float ph = uPhase;
    vec3 dd = vec3(
      sin(q.y * 1.3 + ph * 3.0 + q.z * 0.8) + 0.5 * sin(q.z * 2.1 - ph * 5.0 + 1.7),
      sin(q.z * 1.1 + ph * 2.0 + q.x * 0.7 + 2.0) + 0.5 * sin(q.x * 2.3 + ph * 4.0),
      sin(q.x * 1.2 - ph * 3.0 + q.y * 0.9 + 4.0));
    p += dd * uFold * amp;
    vec3 r = p * 0.3;
    p += vec3(sin(r.y + ph * 12.0), sin(r.z + ph * 10.0 + 1.0), sin(r.x + ph * 14.0 + 2.0)) * uRipple * amp;
    vec3 world = uRot * (p * uFormScale) + uPlace;
    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    vec4 clip = projectionMatrix * mv;
    float dist = -mv.z;
    vec2 uv = clip.xy / max(clip.w, 0.0001) * 0.5 + 0.5;
    vec4 fl = texture2D(uFlow, uv);
    float wake = fl.b;
    clip.xy += (fl.rg - 0.5) * 2.0 * uPush * (0.55 + wake * 0.5) * clip.w;
    gl_Position = clip;

    float depthFade = clamp(1.2 - (dist - 50.0) / 80.0, 0.35, 1.0);
    float alpha = uAlpha * depthFade * uShow * (0.82 + 0.18 * hash11(seed * 311.0));
    // colour: pale points, one soft wave per step along the shape (the wave position follows the step)
    vec3 base = mix(cGrey, cOff, clamp(0.35 + 0.65 * hash11(seed * 17.0), 0.0, 1.0));
    float wsum = 0.0;
    vec3 wcol = vec3(0.0);
    for (int i = 0; i < 2; i++) {
      float c = fract(uLoop * (1.0 + float(i)) + 0.37 * float(i));
      float dl = order - c;
      dl -= floor(dl + 0.5);
      float front = exp(-(dl * dl) / (uWaveW * uWaveW));
      float trail = dl < 0.0 ? 0.55 * exp(dl / (uWaveW * 1.8)) : 0.0;
      float env = sin(3.14159 * c);
      float w = max(front, trail) * env;
      float hueSig = 0.5 + 0.5 * sin(6.2832 * (uLoop + 0.45 * float(i)));
      vec3 col = mix(cTeal, cIce, smoothstep(0.0, 1.0, -dl / (uWaveW * 2.5)) * 0.8);
      col = mix(col, cLav, uLav * hueSig * hueSig * 0.8);
      wsum += w;
      wcol += col * w;
    }
    float amt = clamp(wsum, 0.0, 1.0) * uColStrength;
    vec3 rgb = mix(base, (wcol / max(wsum, 0.0001)) * 1.08, amt);
    rgb = mix(rgb, cTeal, clamp(wake * uTint, 0.0, 0.7));
    vCol = vec4(rgb, alpha);
    vSoft = uSoft;
    gl_PointSize = clamp(sz * uScale * uPR / max(dist, 0.001), 1.3 * uPR, uMaxPx * uPR);
  }
`;
const FRAG = /* glsl */ `
  precision mediump float;
  varying vec4 vCol;
  varying float vSoft;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float crisp = 1.0 - smoothstep(0.5, 0.98, d);
    float soft = pow(clamp(1.0 - d, 0.0, 1.0), 2.0);
    float a = mix(crisp, soft, vSoft) * vCol.a;
    gl_FragColor = vec4(vCol.rgb * a, a);
  }
`;

export type StoryInputs = {
  dt: number;
  /** Story position 0..4 (see the top of the file). */
  u: number;
  /** 0..1: how much of the story is on screen (fades the points in and out). */
  show: number;
  /** Where to draw: centre and size of the box, in 0..1 screen units (y up), plus the camera facts. */
  box: { cx: number; cy: number; w: number; h: number };
  vp: { x: number; y: number };
  aspect: number;
  fov: number;
  /** Pointer in -1..1, flow-field gain, and an open player / paused-ness (0..1). */
  px: number;
  py: number;
  pushK: number;
  calm: number;
};

export type StoryApi = {
  points: Points;
  update: (inp: StoryInputs) => void;
  setDrawFraction: (f: number) => void;
  setStill: (still: boolean) => void;
  visible: () => boolean;
  dispose: () => void;
};

export function createStoryLayer(opts: { light: boolean; shared: Record<string, { value: unknown }>; still: boolean }): StoryApi {
  const total = opts.light ? S.count.light : S.count.desktop;
  const b = build(total);
  const geo = new BufferGeometry();
  b.p.forEach((arr, i) => geo.setAttribute(i === 0 ? "position" : `aP${i}`, new BufferAttribute(arr, 3)));
  geo.setAttribute("aP0", new BufferAttribute(b.p[0], 3));
  geo.setAttribute("aData", new BufferAttribute(b.data, 4));
  const pal = V.palette;
  const v3 = (a: readonly number[]) => new Vector3(a[0], a[1], a[2]);
  const mat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uU: { value: 0 },
      uPhase: { value: 0 },
      uLoop: { value: 0 },
      uShow: { value: 0 },
      uCalm: { value: S.motion.completeCalm },
      uRot: { value: new Matrix3() },
      uPlace: { value: new Vector3(0, 0, V.place.z) },
      uFormScale: { value: 1 },
      uFold: { value: S.motion.fold },
      uRipple: { value: S.motion.ripple },
      uScale: opts.shared.uScale,
      uPR: opts.shared.uPR,
      uMaxPx: { value: S.size.maxPx },
      uAlpha: { value: S.alpha },
      uSoft: { value: S.soft },
      uFlow: opts.shared.uFlow,
      uPush: { value: 0 },
      uTint: { value: S.pointer.tint },
      cOff: { value: v3(pal.offWhite) },
      cGrey: { value: v3(pal.paleGrey) },
      cTeal: { value: v3(pal.teal) },
      cIce: { value: v3(pal.ice) },
      cLav: { value: v3(pal.lavender) },
      uLav: { value: V.lavenderShare },
      uColStrength: { value: S.color.strength },
      uWaveW: { value: S.color.waveWidth },
    },
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 2;
  points.visible = false;

  let motionT = 0;
  let loopT = 0;
  let still = opts.still;
  let shown = 0;
  const rot = new Matrix3();
  const sm = new Vector2(0, 0);
  const setRot = (ry: number, rx: number) => {
    const cy = Math.cos(ry);
    const sy = Math.sin(ry);
    const cx = Math.cos(rx);
    const sx = Math.sin(rx);
    rot.set(cy, sy * sx, sy * cx, 0, cx, -sx, -sy, cy * sx, cy * cx);
    (mat.uniforms.uRot.value as Matrix3).copy(rot);
  };

  return {
    points,
    update(inp) {
      const u = mat.uniforms;
      if (!still) {
        motionT = (motionT + inp.dt * (1 - 0.6 * inp.calm)) % MOTION_PERIOD;
        loopT = (loopT + inp.dt) % V.color.loopSeconds;
      } else {
        motionT = 9;
        loopT = V.color.stillAt * V.color.loopSeconds;
      }
      u.uPhase.value = (motionT / MOTION_PERIOD) * TAU;
      u.uLoop.value = loopT / V.color.loopSeconds;
      u.uU.value = inp.u;
      shown = inp.show;
      points.visible = shown > 0.01;
      u.uShow.value = shown;
      // fit the shapes into the box: scene units per screen unit at the formation's distance
      const unitsH = 2 * Math.abs(V.place.z) * Math.tan((inp.fov * Math.PI) / 360);
      const unitsW = unitsH * inp.aspect;
      const fit = Math.min((inp.box.w * unitsW) / S.extent.w, (inp.box.h * unitsH) / S.extent.h) * S.fit;
      u.uFormScale.value = Math.max(0.05, fit);
      (u.uPlace.value as Vector3).set((inp.box.cx - inp.vp.x) * unitsW, (inp.box.cy - inp.vp.y) * unitsH, V.place.z);
      const k = 1 - Math.exp(-inp.dt * 3);
      sm.x += (inp.px - sm.x) * k;
      sm.y += (inp.py - sm.y) * k;
      const turn = Math.sin(u.uPhase.value * 2) * S.motion.turn * 0.4;
      setRot(0.22 - 0.1 * (inp.u / 4) + turn + sm.x * 0.05, 0.1 - sm.y * 0.04);
      u.uPush.value = inp.pushK * S.pointer.push;
    },
    setDrawFraction(f) {
      geo.setDrawRange(0, Math.max(0, Math.round(b.n * clamp(f, 0, 1))));
    },
    setStill(v) {
      still = v;
    },
    visible: () => shown > 0.01,
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
