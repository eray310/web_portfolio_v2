/**
 * The particle volume of the AI İşler opening and the Web Sitesi section.
 *
 * It lives inside the page's one WebGL scene (`spaceScene.ts`): one extra `Points` object, no second canvas.
 *
 * Two shapes are baked into every point once, on the CPU, and the GPU does the rest:
 *   A  the opening: a folded, twisting ribbon made of fine fibres, with dense and thin stretches and wide
 *      dark gaps, plus a little far dust and a few large soft points close to the camera;
 *   B  Web Sitesi: the same points laid onto orderly lanes (lines of flow) and flat grid panels around
 *      where the browser and the phone stand.
 * The vertex shader blends A to B with the scroll (`uMorph`), bends the whole thing with slow, smooth
 * folds (one coherent field, not per-point noise), turns it a little with the pointer, pushes near points
 * aside where the pointer's flow field is, and computes the colour: off-white / pale grey, with a few
 * soft colour waves that travel along the shape and repeat exactly every `loopSeconds`.
 *
 * All the numbers that shape the look are in `volumeConfig.ts`.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Matrix3, Points, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";
import { volumeConfig as C } from "./volumeConfig";

const TAU = Math.PI * 2;
const MOTION_PERIOD = 64; // seconds; all breathing rates are whole multiples of 1/64 Hz, so nothing jumps when it wraps

const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
const gauss = (r: () => number) => (r() + r() + r() + r() - 2) * 0.8660254; // roughly N(0, 0.58), cheap
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// ── Shape A: the folded ribbon ───────────────────────────────────────────────────────────────────
const centre = (u: number, out: Vector3) => {
  const a = TAU * u;
  return out.set(34 * (u - 0.5) + 6 * Math.sin(a + 0.4), 10 * Math.sin(a + 0.9) + 4 * Math.sin(2 * a + 0.2), 13 * Math.sin(1.5 * a + 0.3));
};
const halfWidth = (u: number) => 4 + 11 * Math.pow(0.5 + 0.5 * Math.sin(TAU * u - 1.2), 1.5);
// density along the ribbon: thick stretches and near-empty ones
const density = (u: number) => clamp(0.12 + 1.35 * Math.pow(0.5 + 0.5 * Math.sin(TAU * (1.9 * u + 0.18)), 1.4), 0, 1);

const T = new Vector3();
const N1 = new Vector3();
const B1 = new Vector3();
const UP = new Vector3(0, 1, 0);
const P0 = new Vector3();
const P1 = new Vector3();

/** Position on the ribbon at (u along, v across -1..1): returns the world-ish position in `out` and the local frame. */
function ribbon(u: number, v: number, out: Vector3, frame?: { w: Vector3; n: Vector3 }) {
  centre(u, P0);
  centre(Math.min(1, u + 0.002), P1);
  T.copy(P1).sub(P0);
  if (T.lengthSq() < 1e-9) {
    centre(Math.max(0, u - 0.002), P1);
    T.copy(P0).sub(P1);
  }
  T.normalize();
  N1.crossVectors(T, UP).normalize();
  B1.crossVectors(T, N1).normalize();
  const psi = TAU * 1.1 * u + 0.5; // the ribbon twists: edge-on in places, seen flat in others
  const cs = Math.cos(psi);
  const sn = Math.sin(psi);
  const wx = N1.x * cs + B1.x * sn;
  const wy = N1.y * cs + B1.y * sn;
  const wz = N1.z * cs + B1.z * sn;
  const nx = -N1.x * sn + B1.x * cs;
  const ny = -N1.y * sn + B1.y * cs;
  const nz = -N1.z * sn + B1.z * cs;
  const hw = halfWidth(u);
  const across = v * hw;
  const cup = (v * v - 0.35) * hw * 0.55 + Math.abs(v) * 1.2 * Math.sin(TAU * 2.6 * u); // cupped, with a soft crease
  out.set(P0.x + wx * across + nx * cup, P0.y + wy * across + ny * cup, P0.z + wz * across + nz * cup);
  if (frame) {
    frame.w.set(wx, wy, wz);
    frame.n.set(nx, ny, nz);
  }
  return out;
}

// ── Shape B: lanes and panels ────────────────────────────────────────────────────────────────────
const LANES = 17;
const PANELS = [
  { c: [-12, 6, -6], size: [34, 21], ry: 0.42 },
  { c: [15, -4, 5], size: [30, 20], ry: -0.36 },
  { c: [3, 12, -17], size: [38, 16], ry: 0.12 },
];

function ordered(u: number, v: number, seed: number, seed2: number, out: Vector3) {
  if (seed < 0.5) {
    // a line of flow: u runs along it, v picks the lane
    const f = clamp((v * 0.5 + 0.5) * LANES, 0, LANES - 0.001);
    const lane = Math.floor(f);
    const lateral = (f - lane - 0.5) * 0.42;
    const x = (u - 0.5) * 88;
    const y = (lane / (LANES - 1) - 0.5) * 38 + 5 * Math.sin(x * 0.055 + lane * 0.5) + lateral;
    const z = ((lane * 3) % 5) * 3.1 - 6 + 3 * Math.sin(x * 0.04 + lane);
    return out.set(x, y, z);
  }
  // a flat grid panel, a share of it on the frame's edge
  const k = Math.min(PANELS.length - 1, Math.floor(((seed - 0.5) / 0.5) * PANELS.length));
  const pn = PANELS[k];
  let px = u - 0.5;
  let py = v * 0.5;
  if (seed2 < 0.34) {
    // snap onto the outline
    const e = seed2 / 0.34;
    if (e < 0.5) py = e < 0.25 ? -0.5 : 0.5;
    else px = e < 0.75 ? -0.5 : 0.5;
  } else {
    // a regular grid of dots
    // scan lines (rows only) for most, a fine dot grid for the rest
    py = Math.round(py * 34) / 34;
    if (seed2 > 0.8) px = Math.round(px * 56) / 56;
  }
  const lx = px * pn.size[0];
  const ly = py * pn.size[1];
  const cs = Math.cos(pn.ry);
  const sn = Math.sin(pn.ry);
  return out.set(pn.c[0] + lx * cs, pn.c[1] + ly, pn.c[2] - lx * sn);
}

// ── Build the points ─────────────────────────────────────────────────────────────────────────────
type Built = { pos: Float32Array; posB: Float32Array; data: Float32Array; tier: Float32Array; n: number };

function build(total: number, light: boolean): Built {
  const r = rng(90210);
  const pos = new Float32Array(total * 3);
  const posB = new Float32Array(total * 3);
  const data = new Float32Array(total * 4);
  const tier = new Float32Array(total);
  const nFar = Math.round(total * C.share.far);
  const nNear = Math.round(total * C.share.near);
  const A = new Vector3();
  const Bv = new Vector3();
  const frame = { w: new Vector3(), n: new Vector3() };
  const fibres = 46;
  const fibreW = Array.from({ length: fibres }, () => 0.35 + 0.65 * r());
  const strands = Array.from({ length: 7 }, (_, i) => ({ k: 1.5 + i * 0.7 + r(), ph: r() * TAU, rad: 2.2 + r() * 5 }));
  let i = 0;
  // the order of the points is random, so the first N of them are an even thinning of the whole when quality drops
  const kinds: number[] = [];
  for (let k = 0; k < total; k++) kinds.push(k < nFar ? 0 : k < nFar + nNear ? 2 : 1);
  for (let k = total - 1; k > 0; k--) {
    const j = Math.floor(r() * (k + 1));
    [kinds[k], kinds[j]] = [kinds[j], kinds[k]];
  }
  for (; i < total; i++) {
    const kind = kinds[i];
    let u = 0;
    let v = 0;
    const seed = r();
    const seed2 = r();
    if (kind === 0) {
      // far dust: clusters and voids in a large shell behind and around the ribbon
      let x = 0;
      let y = 0;
      let z = 0;
      for (let tries = 0; tries < 12; tries++) {
        const a = r() * TAU;
        const b = Math.acos(2 * r() - 1);
        const rad = 38 + Math.pow(r(), 0.7) * 95;
        x = Math.sin(b) * Math.cos(a) * rad * 1.5;
        y = Math.sin(b) * Math.sin(a) * rad * 0.8;
        z = Math.cos(b) * rad * 0.9 - 30;
        const cl = Math.sin(x * 0.05 + 1) * Math.sin(y * 0.07 + 2) * Math.sin(z * 0.045 + 0.5);
        if (cl > -0.05 || r() < 0.12) break;
      }
      A.set(x, y, z);
      Bv.set(x, y, z);
      u = r();
      v = r() * 2 - 1;
    } else {
      // the ribbon: u by density (thick and thin stretches), v mostly on fibres
      for (let tries = 0; tries < 24; tries++) {
        const rr = r();
        u = rr + 0.04 * Math.sin(TAU * 3 * rr);
        if (r() < density(u)) break;
      }
      u = clamp(u, 0, 1);
      const strand = r() < 0.12;
      if (strand) {
        const s = strands[Math.floor(r() * strands.length)];
        ribbon(u, 0, A, frame);
        const ang = s.k * TAU * u + s.ph;
        const rad = s.rad * (0.7 + 0.5 * Math.sin(TAU * u * 1.3 + s.ph)) + gauss(r) * 0.35;
        A.addScaledVector(frame.w, Math.cos(ang) * rad).addScaledVector(frame.n, Math.sin(ang) * rad * 0.8);
        v = clamp(Math.cos(ang) * 0.9, -1, 1);
      } else {
        let f = 0;
        for (let tries = 0; tries < 8; tries++) {
          f = Math.floor(r() * fibres);
          if (r() < fibreW[f]) break;
        }
        v = r() < 0.74 ? ((f + 0.5) / fibres) * 2 - 1 + gauss(r) * (0.38 / fibres) : r() * 2 - 1;
        v = clamp(v, -1, 1);
        ribbon(u, v, A);
        // most points sit on their fibre; some drift off it into a soft haze around the folds (volume, not a shell)
        const spread = r() < 0.12 ? 0.9 + r() * 1.5 : 0.1;
        A.x += gauss(r) * spread;
        A.y += gauss(r) * spread;
        A.z += gauss(r) * spread;
      }
      ordered(u, v, seed, seed2, Bv);
      Bv.x += gauss(r) * 0.07;
      Bv.y += gauss(r) * 0.07;
      Bv.z += gauss(r) * 0.07;
      if (kind === 2) {
        // a few points close to the camera: large and soft
        const dz = 18 + r() * 14;
        A.z += dz;
        Bv.z += dz;
      }
    }
    pos.set([A.x, A.y, A.z], i * 3);
    posB.set([Bv.x, Bv.y, Bv.z], i * 3);
    const size = kind === 0 ? C.size.far : kind === 2 ? C.size.near : C.size.main;
    data[i * 4] = u;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = seed;
    data[i * 4 + 3] = size[0] + Math.pow(r(), 2.4) * (size[1] - size[0]);
    tier[i] = kind;
  }
  void light;
  return { pos, posB, data, tier, n: total };
}

// ── Shaders ──────────────────────────────────────────────────────────────────────────────────────
const VERT = /* glsl */ `
  attribute vec3 aB;
  attribute vec4 aData;
  attribute float aTier;
  uniform float uPhase;      // 0..2pi over the 64 s breathing period
  uniform float uLoop;       // 0..1 over one colour loop
  uniform float uMorph;
  uniform float uShow;
  uniform mat3 uRot;
  uniform vec3 uPlace;
  uniform float uFormScale;
  uniform float uFold;
  uniform float uRipple;
  uniform float uScale;
  uniform float uPR;
  uniform float uMaxPx;
  uniform float uLeftCalm;
  uniform float uTextCol;
  uniform vec2 uClearC;
  uniform vec2 uClearR;
  uniform float uClear;
  uniform float uBehind;
  uniform float uAround;
  uniform float uLight;
  uniform vec2 uLightK;
  uniform sampler2D uFlow;
  uniform float uPush;
  uniform float uSpread;
  uniform float uTint;
  uniform vec3 uAlphaTier;
  uniform vec3 uSoftTier;
  uniform vec3 cOff; uniform vec3 cGrey; uniform vec3 cTeal; uniform vec3 cIce; uniform vec3 cLav;
  uniform float uLav;
  uniform float uColStrength;
  uniform vec4 uW[3];
  uniform vec4 uWA[3];
  varying vec4 vCol;
  varying float vSoft;

  float hash11(float n) { return fract(sin(n * 91.345) * 47453.5453); }

  void main() {
    float u = aData.x;
    float v = aData.y;
    float seed = aData.z;
    float sz = aData.w;
    // the shape: A to B, rolling along the ribbon (the front end changes first)
    float m = smoothstep(0.0, 1.0, clamp(uMorph * 1.5 - u * 0.5, 0.0, 1.0));
    vec3 p = mix(position, aB, aTier < 0.5 ? 0.0 : m);
    p.z += sin(m * 3.14159) * 5.0 * sin(u * 6.2832 + 1.0);
    // slow folds: one smooth field, so neighbouring points move together
    float amp = mix(1.0, 0.42, m);
    vec3 q = p * 0.085;
    float ph = uPhase;
    vec3 d = vec3(
      sin(q.y * 1.3 + ph * 3.0 + q.z * 0.8) + 0.5 * sin(q.z * 2.1 - ph * 5.0 + 1.7),
      sin(q.z * 1.1 + ph * 2.0 + q.x * 0.7 + 2.0) + 0.5 * sin(q.x * 2.3 + ph * 4.0),
      sin(q.x * 1.2 - ph * 3.0 + q.y * 0.9 + 4.0) + 0.5 * sin(q.y * 2.0 + ph * 6.0 + 0.5));
    p += d * uFold * amp;
    vec3 r = p * 0.32;
    p += vec3(sin(r.y + ph * 12.0), sin(r.z + ph * 10.0 + 1.0), sin(r.x + ph * 14.0 + 2.0)) * uRipple;
    vec3 world = uRot * (p * uFormScale) + uPlace;
    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    vec4 clip = projectionMatrix * mv;
    float dist = -mv.z;
    vec2 uv = clip.xy / max(clip.w, 0.0001) * 0.5 + 0.5;

    // the pointer: near points are pushed aside along the flow and spread a little; far ones hardly
    vec4 f = texture2D(uFlow, uv);
    float wake = f.b;
    float gain = aTier < 0.5 ? 0.3 : aTier > 1.5 ? 1.6 : 1.0;
    vec2 fl = (f.rg - 0.5) * 2.0;
    float fmask = mix(0.35, 1.0, smoothstep(0.12, 0.5, uv.x));
    clip.xy += fl * uPush * gain * fmask * (0.55 + wake * uSpread) * clip.w;
    gl_Position = clip;

    // brightness: depth (far parts of the shape are dimmer), the quiet text column, the example boxes
    float depthFade = clamp(1.2 - (dist - 48.0) / 90.0, 0.3, 1.0);
    float nearFade = smoothstep(12.0, 30.0, dist);
    float left = mix(1.0, uTextCol, uLeftCalm * (1.0 - smoothstep(0.12, 0.64, uv.x)));
    vec2 dd = (uv - uClearC - vec2(0.0, -0.07)) / (uClearR * vec2(1.0, 1.4));
    float len = length(dd);
    float behind = mix(1.0, uBehind, uClear * (1.0 - smoothstep(0.6, 0.88, len)));
    float halo = 1.0 + (uAround - 1.0) * uClear * exp(-pow((len - 1.0) / 0.3, 2.0));
    float edge = 1.0 - smoothstep(0.88, 1.12, max(abs(uv.x - 0.5), abs(uv.y - 0.5)) * 2.0);
    float tierA = aTier < 0.5 ? uAlphaTier.x : aTier > 1.5 ? uAlphaTier.z : uAlphaTier.y;
    float alpha = tierA * depthFade * nearFade * left * behind * halo * mix(0.35, 1.0, edge) * uShow;
    alpha *= 0.82 + 0.18 * hash11(seed * 311.0); // fixed, tiny variety (no flicker)
    alpha *= mix(1.0, uLightK.x * mix(1.0, uLightK.y, smoothstep(0.66, 0.84, uv.y)), uLight);

    // colour: off-white and pale grey; waves of colour travel along the shape
    vec3 base = mix(cGrey, cOff, clamp(0.35 + 0.65 * hash11(seed * 17.0), 0.0, 1.0));
    float wsum = 0.0;
    vec3 wcol = vec3(0.0);
    float cluster = 0.35 + 0.65 * smoothstep(-0.25, 0.55, sin(world.x * 0.1 + 1.0) * sin(world.y * 0.12 + 2.0) + 0.5 * sin(world.z * 0.09 + 0.7));
    for (int i = 0; i < 3; i++) {
      float laps = uW[i].x;
      float c = fract(uW[i].w + laps * uLoop);
      float dd2 = u - c;
      dd2 -= floor(dd2 + 0.5);                       // circular distance along the shape, -0.5..0.5
      float w = uW[i].y;
      float tl = uW[i].z;
      float front = exp(-(dd2 * dd2) / (w * w));
      float trail = dd2 < 0.0 ? 0.6 * exp(dd2 / tl) : 0.0;
      float across = exp(-pow((v - uWA[i].x) / uWA[i].y, 2.0));
      float env = sin(3.14159 * c);                    // the wave rises and fades over its lap
      float a = max(front, trail) * across * env * cluster;
      float back = smoothstep(0.0, 1.0, clamp(-dd2 / (tl * 1.4), 0.0, 1.0));
      float hueSig = 0.5 + 0.5 * sin(6.2832 * (uWA[i].z + uLoop));
      vec3 col = mix(cTeal, cIce, back * 0.8);
      col = mix(col, cLav, uLav * hueSig * hueSig * smoothstep(0.1, 0.9, back + 0.25));
      wsum += a;
      wcol += col * a;
    }
    float amt = clamp(wsum, 0.0, 1.0) * uColStrength;
    vec3 wc = wcol / max(wsum, 0.0001);
    vec3 rgb = mix(base, wc * 1.08, amt);
    // a little colour goes with the pointer
    rgb = mix(rgb, cTeal, clamp(wake * uTint * fmask, 0.0, 0.8));
    alpha *= 1.0 + 0.25 * amt;
    vCol = vec4(rgb, alpha);
    vSoft = aTier < 0.5 ? uSoftTier.x : aTier > 1.5 ? uSoftTier.z : uSoftTier.y;
    float px = sz * uScale * uPR / max(dist, 0.001);
    gl_PointSize = clamp(px, 1.25 * uPR, uMaxPx * uPR);
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

export type VolumeInputs = {
  /** Seconds since the last step (any wall-clock dt). */
  dt: number;
  /** The smoothed scroll position 0..4 (0 = opening, 1 = Web Sitesi ...). */
  s: number;
  /** Pointer position -1..1 (x right, y up); 0 when resting. */
  px: number;
  py: number;
  /** 0..1: a video player is open (the movement calms). */
  calm: number;
  /** The example box of the nearest stop, live on screen (centre and half-extent in 0..1 screen units, y up) and how much to clear. */
  clear: { cx: number; cy: number; rx: number; ry: number; amount: number };
  /** Flow-field displacement gain for this quality level (0 = off). */
  pushK: number;
};

export type VolumeApi = {
  points: Points;
  /** Advances time (unless `frozen`) and updates the uniforms. */
  update: (inp: VolumeInputs) => void;
  /** The fraction of the points that is drawn (0..1), for the quality steps. */
  setDrawFraction: (f: number) => void;
  /** Show the curated still moment of the colour loop. */
  setStill: (still: boolean) => void;
  /** For tests only: freeze the colour loop (0..1) and the breathing (seconds); `null` lets time run again. */
  debugSet: (loop: number | null, motion?: number) => void;
  /** True while the volume is visible at all (the scene can skip its work when not). */
  visible: () => boolean;
  dispose: () => void;
};

export function createVolumeLayer(opts: { light: boolean; shared: Record<string, { value: unknown }>; still: boolean }): VolumeApi {
  const { light } = opts;
  const total = light ? C.count.light : C.count.desktop;
  const b = build(total, light);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(b.pos, 3));
  geo.setAttribute("aB", new BufferAttribute(b.posB, 3));
  geo.setAttribute("aData", new BufferAttribute(b.data, 4));
  geo.setAttribute("aTier", new BufferAttribute(b.tier, 1));
  const wv = C.color.waves.map((w) => new Vector4(w.laps, w.width, w.trail, w.start));
  const wa = C.color.waves.map((w) => new Vector4(w.across, w.spread, w.hue, 0));
  const pal = C.palette;
  const v3 = (a: readonly number[]) => new Vector3(a[0], a[1], a[2]);
  const mat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uPhase: { value: 0 },
      uLoop: { value: 0 },
      uMorph: { value: 0 },
      uShow: { value: 1 },
      uRot: { value: new Matrix3() },
      uPlace: { value: new Vector3(C.place.x, C.place.y, C.place.z) },
      uFormScale: { value: light ? C.place.phoneScale : C.place.scale },
      uFold: { value: C.motion.fold },
      uRipple: { value: C.motion.ripple },
      uScale: opts.shared.uScale,
      uPR: opts.shared.uPR,
      uMaxPx: { value: C.size.maxPx },
      uLeftCalm: opts.shared.uLeftCalm,
      uTextCol: { value: C.readability.textColumn },
      uClearC: { value: new Vector2(0.7, 0.5) },
      uClearR: { value: new Vector2(0.3, 0.4) },
      uClear: { value: 0 },
      uBehind: { value: C.readability.behindBox },
      uAround: { value: C.readability.aroundMedia },
      uLight: { value: light ? 1 : 0 },
      uLightK: { value: new Vector2(C.readability.phoneAlpha, C.readability.phoneTop) },
      uFlow: opts.shared.uFlow,
      uPush: { value: 0 },
      uSpread: { value: C.pointer.spread },
      uTint: { value: C.pointer.tint },
      uAlphaTier: { value: new Vector3(C.alpha.far, C.alpha.main, C.alpha.near) },
      uSoftTier: { value: new Vector3(C.soft.far, C.soft.main, C.soft.near) },
      cOff: { value: v3(pal.offWhite) },
      cGrey: { value: v3(pal.paleGrey) },
      cTeal: { value: v3(pal.teal) },
      cIce: { value: v3(pal.ice) },
      cLav: { value: v3(pal.lavender) },
      uLav: { value: C.lavenderShare },
      uColStrength: { value: C.color.strength },
      uW: { value: wv },
      uWA: { value: wa },
    },
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 1;

  let motionT = 0;
  let loopT = 0;
  let still = opts.still;
  let hold = false;
  let show = 1;
  const rotM = new Matrix3();
  const setRot = (ry: number, rx: number) => {
    const cy = Math.cos(ry);
    const sy = Math.sin(ry);
    const cx = Math.cos(rx);
    const sx = Math.sin(rx);
    // Ry * Rx (column-major for Matrix3.set row order below)
    rotM.set(cy, sy * sx, sy * cx, 0, cx, -sx, -sy, cy * sx, cy * cx);
    (mat.uniforms.uRot.value as Matrix3).copy(rotM);
  };
  const rotSmooth = new Vector2(0, 0);

  const api: VolumeApi = {
    points,
    update({ dt, s, px, py, calm, pushK, clear }) {
      const u = mat.uniforms;
      if (hold) {
        // a test froze the clocks (see `debugSet`)
      } else if (!still) {
        motionT = (motionT + dt * C.motion.speed * (1 - 0.6 * calm)) % MOTION_PERIOD;
        loopT = (loopT + dt) % C.color.loopSeconds;
      } else {
        // the curated still moment: motion at a pleasing fixed point, colour frozen at `stillAt`
        motionT = 9;
        loopT = C.color.stillAt * C.color.loopSeconds;
      }
      u.uPhase.value = (motionT / MOTION_PERIOD) * TAU;
      u.uLoop.value = loopT / C.color.loopSeconds;
      const morph = clamp(s / C.scroll.morphEnd, 0, 1);
      u.uMorph.value = morph;
      show = 1 - smooth(C.scroll.fadeStart, C.scroll.fadeEnd, s);
      u.uShow.value = show;
      const k = 1 - Math.exp(-dt * 3);
      rotSmooth.x += (px - rotSmooth.x) * k;
      rotSmooth.y += (py - rotSmooth.y) * k;
      const breathe = Math.sin(u.uPhase.value * 2) * C.motion.turn;
      setRot(0.34 * (1 - morph) - 0.1 * morph + breathe + rotSmooth.x * C.motion.parallax, 0.08 * (1 - morph) - rotSmooth.y * C.motion.parallax * 0.7 + Math.sin(u.uPhase.value * 3 + 1) * C.motion.turn * 0.4);
      u.uPush.value = pushK * C.pointer.push;
      (u.uClearC.value as Vector2).set(clear.cx, clear.cy);
      (u.uClearR.value as Vector2).set(clear.rx, clear.ry);
      u.uClear.value = clear.amount;
    },
    setDrawFraction(f) {
      geo.setDrawRange(0, Math.max(0, Math.round(b.n * clamp(f, 0, 1))));
    },
    setStill(v) {
      still = v;
    },
    debugSet(loop, motion) {
      hold = loop !== null;
      if (loop !== null) {
        loopT = loop * C.color.loopSeconds;
        motionT = motion ?? 0;
      }
    },
    visible: () => show > 0.01,
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
  return api;
}
