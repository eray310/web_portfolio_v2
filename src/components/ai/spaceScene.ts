/**
 * The AI İşler background: one WebGL canvas with a slow drift through deep space.
 *
 * - Stars are GPU points placed in real 3D (x, y, z). The camera sits at the origin and the field
 *   moves towards it along z in three depth layers that move at different speeds (far ones hardly
 *   move, near ones pass by). Depth comes from the perspective camera, the different z distances and
 *   a very small camera sway. Nothing is a DOM element.
 * - The vanishing point sits behind the vertical showreel (set with a view offset), so the perspective
 *   is felt around it while the left of the screen stays calm and dark.
 * - One scroll value `s` (0 = opening, 1 = Web Sitesi, 2 = Reklam Filmi, 3 = Uygulama Prototipleri,
 *   4 = the closing call) blends the look of the five stops. It is the same scene all the way:
 *   nothing restarts, scrolling back plays the same blends backwards, and it settles in a short
 *   glide when the wheel is released.
 * - Quality drops by itself when frames are slow; the loop stops when the tab is hidden, when the
 *   brief form covers the page, when the visitor paused it, and it draws a single still frame
 *   for "Hareketi azalt".
 */
import {
  AdditiveBlending,
  BufferAttribute,
  DataTexture,
  RGBAFormat,
  UnsignedByteType,
  BufferGeometry,
  LineSegments,
  LinearFilter,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { spaceBus } from "./spaceBus";
import { createFlowField } from "./flowField";
import { createVolumeLayer } from "./volumeLayer";
import { createStoryLayer } from "./storyLayer";

export type SpaceOptions = {
  canvas: HTMLCanvasElement;
  /** Phone or touch screen: fewer particles, no pointer sway. */
  light: boolean;
  /** "Hareketi azalt": one still frame, no loop. */
  still: boolean;
  /** Elements the scene follows (the five stops and their media boxes). */
  stops: () => StopInfo[];
};

export type StopInfo = {
  /** Vertical centre of the stop in the document, in px. */
  y: number;
  /** The example / video box of that stop, in viewport px (null when it has none on screen). */
  box: { x: number; y: number; w: number; h: number } | null;
};

export type SpaceApi = {
  setPaused: (paused: boolean) => void;
  isPaused: () => boolean;
  refresh: () => void;
  quality: () => number;
  dispose: () => void;
};

// ── Looks of the five stops ────────────────────────────────────────────────────────────────────
// near:   share of the near (bright, passing) stars that is shown
// dust:   the denser layer of fine dust and the light trails (Reklam Filmi)
// arc:    the thin turquoise arc far away (Web Sitesi)
// glow:   soft light around the vanishing point (around the showreel)
// neb:    the far nebula
// clear:  how dark and clean it is behind the example box of the stop
// yaw:    camera turn along the same route
// speed:  drift speed
type Look = { near: number; dust: number; trails: number; arc: number; glow: number; neb: number; clear: number; yaw: number; speed: number; calm: number };
const LOOKS: Look[] = [
  { near: 1.0, dust: 0.25, trails: 0.0, arc: 0.0, glow: 0.5, neb: 0.5, clear: 0.0, yaw: 0.0, speed: 1.0, calm: 0.0 },
  { near: 0.3, dust: 0.2, trails: 0.0, arc: 0.85, glow: 0.22, neb: 0.4, clear: 0.85, yaw: 0.025, speed: 0.85, calm: 0.2 },
  { near: 0.55, dust: 1.0, trails: 1.0, arc: 0.2, glow: 0.3, neb: 0.35, clear: 0.7, yaw: 0.05, speed: 1.3, calm: 0.0 },
  { near: 0.25, dust: 0.35, trails: 0.0, arc: 0.3, glow: 0.3, neb: 0.5, clear: 0.8, yaw: -0.035, speed: 0.9, calm: 0.3 },
  { near: 0.1, dust: 0.12, trails: 0.0, arc: 0.45, glow: 0.22, neb: 0.4, clear: 0.0, yaw: 0.0, speed: 0.5, calm: 0.7 },
];
const KEYS = Object.keys(LOOKS[0]) as (keyof Look)[];

const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

// ── Shaders ────────────────────────────────────────────────────────────────────────────────────
const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute float aTint;
  uniform float uTravel;
  uniform float uL;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uPR;
  uniform float uShow;
  uniform float uMaxSize;
  uniform float uLeftCalm;
  uniform vec2 uClearC;
  uniform vec2 uClearR;
  uniform float uClear;
  uniform float uTime;
  uniform sampler2D uFlow;
  uniform float uFlowK;
  varying float vAlpha;
  varying float vTint;
  void main() {
    float z = mod(position.z + uTravel * uSpeed, uL) - uL;
    vec4 mv = modelViewMatrix * vec4(position.x, position.y, z, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;
    float visible = step(aSeed, uShow);
    // fade in far away, fade out close to the camera
    float farFade = 1.0 - smoothstep(uL * 0.78, uL * 0.98, dist);
    float nearFade = smoothstep(uL * 0.015, uL * 0.1, dist);
    vec2 uv = gl_Position.xy / max(gl_Position.w, 0.0001) * 0.5 + 0.5;
    float left = mix(1.0, 0.22, uLeftCalm * (1.0 - smoothstep(0.08, 0.5, uv.x)));
    vec2 dd = (uv - uClearC) / uClearR;
    float clearM = mix(1.0, 0.1, uClear * (1.0 - smoothstep(0.55, 1.15, length(dd))));
    float tw = 0.88 + 0.12 * sin(uTime * (0.6 + aSeed * 1.4) + aSeed * 40.0);
    // the pointer's flow: near stars are pushed aside and bent along the way, far ones hardly move;
    // calm on the left (the writing), more visible in the open space
    float wake = 0.0;
    if (uFlowK > 0.0) {
      vec4 f = texture2D(uFlow, uv);
      float mask = mix(0.28, 1.0, smoothstep(0.12, 0.5, uv.x));
      float nearness = clamp(1.0 - dist / (uL * 0.6), 0.12, 1.0);
      vec2 fl = (f.rg - 0.5) * 2.0 * uFlowK * mask * (0.25 + nearness * nearness * 1.6);
      gl_Position.xy += fl * gl_Position.w;
      wake = f.b * mask;
    }
    vAlpha = visible * farFade * nearFade * left * clearM * tw * (1.0 + wake * 0.7);
    vTint = aTint;
    gl_PointSize = clamp(aSize * uScale * uPR / max(dist, 0.001), 1.5 * uPR, uMaxSize * uPR);
  }
`;
const STAR_FRAG = /* glsl */ `
  precision mediump float;
  uniform float uBright;
  varying float vAlpha;
  varying float vTint;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 1.35);
    vec3 white = vec3(0.86, 0.92, 1.0);
    vec3 blue = vec3(0.42, 0.55, 0.85);
    vec3 teal = vec3(0.37, 0.92, 0.83);
    vec3 col = mix(blue, white, smoothstep(0.0, 0.6, vTint));
    col = mix(col, teal, smoothstep(0.9, 1.0, vTint));
    float alpha = a * vAlpha * uBright;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

const TRAIL_VERT = /* glsl */ `
  attribute float aEnd;
  attribute float aSeed;
  uniform float uTravel;
  uniform float uL;
  uniform float uLen;
  uniform float uTrails;
  uniform float uSpeed;
  varying float vAlpha;
  void main() {
    float z = mod(position.z + uTravel * uSpeed, uL) - uL;
    vec4 mv = modelViewMatrix * vec4(position.x, position.y, z - aEnd * uLen, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;
    float farFade = 1.0 - smoothstep(uL * 0.7, uL * 0.97, dist);
    float nearFade = smoothstep(uL * 0.04, uL * 0.16, dist);
    vAlpha = (1.0 - aEnd) * farFade * nearFade * uTrails;
  }
`;
const TRAIL_FRAG = /* glsl */ `
  precision mediump float;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vec3(0.5, 0.95, 0.88) * vAlpha * 0.55, vAlpha * 0.55);
  }
`;

const BG_VERT = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;
const BG_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec2 uRes;
  uniform vec2 uVp;
  uniform float uTime;
  uniform float uNeb;
  uniform float uGlow;
  uniform float uArc;
  uniform float uCalm;
  uniform float uQ;
  uniform float uLeftCalm;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.03 + 11.7;
      a *= 0.5;
    }
    return v;
  }
  void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float asp = uRes.x / uRes.y;
    vec2 p = (uv - uVp) * vec2(asp, 1.0);
    // charcoal black to night blue
    vec3 col = mix(vec3(0.016, 0.022, 0.035), vec3(0.028, 0.052, 0.105), smoothstep(0.0, 1.0, uv.y * 0.7 + 0.25 * (1.0 - uv.x)));
    // one very far, soft nebula up and to the right of the vanishing point: it tells the direction
    vec2 np = (p - vec2(0.22, 0.2)) * vec2(1.0, 1.35);
    float n = uQ > 0.5 ? fbm(np * 1.7 + vec2(uTime * 0.004, -uTime * 0.003)) : noise(np * 2.4);
    float shape = exp(-dot(np, np) * 1.15);
    float neb = smoothstep(0.32, 0.9, n) * shape * uNeb;
    col += neb * mix(vec3(0.05, 0.11, 0.26), vec3(0.05, 0.28, 0.3), smoothstep(0.35, 0.85, n)) * 0.9;
    // light around the showreel
    float g = exp(-dot(p, p) * 3.2) * uGlow;
    col += g * vec3(0.04, 0.2, 0.22) * 0.55;
    // a thin turquoise arc far away (Web Sitesi)
    vec2 ac = vec2(-0.05, -1.25);
    float r = length(p - ac);
    float ring = exp(-pow((r - 1.62) / 0.014, 2.0));
    float soft = exp(-pow((r - 1.62) / 0.1, 2.0)) * 0.3;
    float span = smoothstep(-0.25, 0.4, p.x + 0.15) * (1.0 - smoothstep(0.55, 1.0, p.x));
    col += (ring * 0.9 + soft) * span * uArc * vec3(0.2, 0.78, 0.7) * 0.75;
    // calm: the closing stop settles
    col *= 1.0 - uCalm * 0.25;
    // the left of the screen stays dark and quiet
    col *= mix(1.0, 0.55, uLeftCalm * (1.0 - smoothstep(0.0, 0.62, uv.x)));
    // edge vignette
    col *= 1.0 - 0.45 * smoothstep(0.55, 1.35, length((uv - 0.5) * vec2(asp * 0.8, 1.0)) * 1.4);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// The slow, soft parts (nebula, glow, arc) are drawn into a small picture (a quarter of the size, both ways)
// and stretched over the screen: they are smooth anyway, and it costs a fraction of drawing them at full size.
const COMP_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;
const COMP_FRAG = /* glsl */ `
  precision mediump float;
  uniform sampler2D uTex;
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(texture2D(uTex, vUv).rgb, 1.0);
  }
`;

type Layer = {
  points: Points;
  geo: BufferGeometry;
  mat: ShaderMaterial;
  count: number;
  base: number;
};

export function createSpaceScene(opts: SpaceOptions): SpaceApi {
  const { canvas, light, still } = opts;
  // One context with only what is needed (no alpha, no antialias, no depth buffer): the stars are drawn
  // in a fixed order with additive blending. A "desynchronized" context was tried and left out: it is
  // faster on average here but makes the frame times uneven.
  const attrs: WebGLContextAttributes = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: light ? "low-power" : "default" };
  const context = (canvas.getContext("webgl2", attrs) || canvas.getContext("webgl", attrs)) as WebGLRenderingContext | WebGL2RenderingContext | null;
  if (!context) throw new Error("no WebGL");
  const renderer = new WebGLRenderer({ canvas, context, antialias: false, alpha: false });
  renderer.setClearColor(0x05070c, 1);
  const scene = new Scene();
  const camera = new PerspectiveCamera(58, 1, 0.1, 2000);
  camera.position.set(0, 0, 0);

  let level = 0; // 0 = full, 1 = lighter, 2 = lightest, 3 = slowest machines (set by frame times)
  let tick = 0;
  let lastRaf = 0;
  let lastScrollT = 0;
  // Drawing size: at most 1.25 pixels per CSS pixel (1 on a phone), and a slow machine draws it smaller,
  // step by step, before anything else is taken away; the stars keep their positions and depth.
  let resScale = 1;
  const dprMax = () => (light ? 1 : 1.25) * resScale;

  // ── background quad (charcoal, night blue, nebula, glow, arc) ──
  const bgMat = new ShaderMaterial({
    vertexShader: BG_VERT,
    fragmentShader: BG_FRAG,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uRes: { value: new Vector2(1, 1) },
      uVp: { value: new Vector2(0.7, 0.5) },
      uTime: { value: 0 },
      uNeb: { value: 0.9 },
      uGlow: { value: 0.9 },
      uArc: { value: 0 },
      uCalm: { value: 0 },
      uQ: { value: light ? 0 : 1 },
      uLeftCalm: { value: 1 },
    },
  });
  // The pointer flow field (mouse only; none on a phone or for "Hareketi azalt"): a tiny picture the shaders read.
  const flow = light || still ? null : createFlowField({ enabled: () => !spaceBus.briefOpen && !paused });
  const flowTex = flow ? new DataTexture(flow.data as Uint8Array<ArrayBuffer>, flow.cols, flow.rows, RGBAFormat, UnsignedByteType) : null;
  if (flowTex) {
    flowTex.minFilter = LinearFilter;
    flowTex.magFilter = LinearFilter;
    flowTex.generateMipmaps = false;
    flowTex.needsUpdate = true;
  }
  const vtf = renderer.capabilities.maxVertexTextures > 0;
  const bgScene = new Scene();
  const bgQuad = new Mesh(new PlaneGeometry(2, 2), bgMat);
  bgQuad.frustumCulled = false;
  bgScene.add(bgQuad);
  const rt = new WebGLRenderTarget(64, 64, { minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
  const compMat = new ShaderMaterial({ vertexShader: COMP_VERT, fragmentShader: COMP_FRAG, depthTest: false, depthWrite: false, uniforms: { uTex: { value: rt.texture } } });
  const bg = new Mesh(new PlaneGeometry(2, 2), compMat);
  bg.frustumCulled = false;
  bg.renderOrder = -10;
  scene.add(bg);

  // ── star layers: far (fine, pale, hardly move), mid (behind the video), near (few, bright, pass by), dust ──
  const shared = {
    uTravel: { value: 0 },
    uScale: { value: 600 },
    uPR: { value: 1 },
    uTime: { value: 0 },
    uLeftCalm: { value: 1 },
    uClearC: { value: new Vector2(0.7, 0.5) },
    uClearR: { value: new Vector2(0.3, 0.4) },
    uClear: { value: 0 },
    uBright: { value: 1 },
    uFlow: { value: null as unknown as DataTexture },
    uFlowK: { value: 0 },
  };
  shared.uFlow.value = flowTex as DataTexture;
  const makeLayer = (seed: number, count: number, L: number, R: number, size: [number, number], speed: number, bias: { x: number; y: number }, maxSize: number, bright: number, tintBright: number): Layer => {
    const r = rng(seed);
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const sd = new Float32Array(count);
    const tn = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2;
      const rad = Math.sqrt(r()) * R;
      pos[i * 3] = Math.cos(a) * rad * 1.35 + bias.x * R * (r() * 0.9);
      pos[i * 3 + 1] = Math.sin(a) * rad + bias.y * R * (r() * 0.9);
      pos[i * 3 + 2] = -r() * L;
      sz[i] = size[0] + Math.pow(r(), 3) * (size[1] - size[0]);
      sd[i] = r();
      // most stars are pale; a few are warmer white; a very few are turquoise
      const t = r();
      tn[i] = t < 0.06 ? 0.95 + r() * 0.05 : t < 0.35 ? 0.62 + r() * 0.3 : r() * 0.5;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new BufferAttribute(sz, 1));
    geo.setAttribute("aSeed", new BufferAttribute(sd, 1));
    geo.setAttribute("aTint", new BufferAttribute(tn, 1));
    const mat = new ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        ...shared,
        uBright: { value: bright * tintBright },
        uL: { value: L },
        uSpeed: { value: speed },
        uShow: { value: 1 },
        uMaxSize: { value: maxSize },
      },
    });
    const points = new Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);
    return { points, geo, mat, count, base: count };
  };
  const k = light ? 0.4 : 1;
  const far = makeLayer(11, Math.round(2600 * k), 1400, 640, [0.9, 2.1], 0.12, { x: 0, y: 0 }, 3.0, 0.95, 1);
  const mid = makeLayer(23, Math.round(800 * k), 640, 300, [1.3, 3.2], 0.45, { x: 0.25, y: 0.1 }, 4.2, 0.85, 1);
  const near = makeLayer(37, Math.round(90 * k), 260, 120, [2.4, 6.2], 1.5, { x: 0.8, y: 0.55 }, 16, 1.0, 1);
  const dust = makeLayer(53, Math.round(520 * k), 190, 80, [0.8, 1.8], 1.0, { x: 0.15, y: 0.05 }, 3.4, 0.6, 1);

  // the particle volume (opening and Web Sitesi): one more Points object in this same scene
  const volume = createVolumeLayer({ light, still, shared: shared as unknown as Record<string, { value: unknown }> });
  scene.add(volume.points);
  const story = createStoryLayer({ light, still, shared: shared as unknown as Record<string, { value: unknown }> });
  scene.add(story.points);
  (canvas as unknown as { __story?: unknown }).__story = story;
  let volFrac = 1;
  // read-only hook for tests: freeze the colour loop / breathing at a chosen moment
  (canvas as unknown as { __volume?: unknown }).__volume = volume;

  // light trails (Reklam Filmi): a few short lines running along the drift
  const nTrail = light ? 10 : 22;
  const tr = rng(71);
  const tpos = new Float32Array(nTrail * 2 * 3);
  const tend = new Float32Array(nTrail * 2);
  const tseed = new Float32Array(nTrail * 2);
  for (let i = 0; i < nTrail; i++) {
    const a = tr() * Math.PI * 2;
    const rad = 16 + Math.sqrt(tr()) * 92;
    const x = Math.cos(a) * rad * 1.3 + 14;
    const y = Math.sin(a) * rad * 0.8 + 6;
    const z = -tr() * 260;
    for (let j = 0; j < 2; j++) {
      tpos.set([x, y, z], (i * 2 + j) * 3);
      tend[i * 2 + j] = j;
      tseed[i * 2 + j] = tr();
    }
  }
  const tgeo = new BufferGeometry();
  tgeo.setAttribute("position", new BufferAttribute(tpos, 3));
  tgeo.setAttribute("aEnd", new BufferAttribute(tend, 1));
  tgeo.setAttribute("aSeed", new BufferAttribute(tseed, 1));
  const tmat = new ShaderMaterial({
    vertexShader: TRAIL_VERT,
    fragmentShader: TRAIL_FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTravel: shared.uTravel, uL: { value: 260 }, uLen: { value: 26 }, uTrails: { value: 0 }, uSpeed: { value: 2.2 } },
  });
  const trails = new LineSegments(tgeo, tmat);
  trails.frustumCulled = false;
  scene.add(trails);

  // ── state ──
  const cur: Look = { ...LOOKS[0] };
  let sTarget = 0;
  let sCur = 0;
  let travel = 37; // the still frame uses this too
  let time = 0;
  let stops: StopInfo[] = [];
  let stopsScrollY = 0; // where the page was scrolled when the boxes of `stops` were measured (they are viewport px)
  let clearC = new Vector2(0.7, 0.5);
  let clearR = new Vector2(0.3, 0.4);
  let vp = new Vector2(0.7, 0.5);
  let pointerX = 0;
  let pointerY = 0;
  let swayX = 0;
  let swayY = 0;
  let lastMove = 0;
  let paused = false;
  let raf = 0;
  let last = 0;
  let w = 0;
  let h = 0;
  let disposed = false;
  let ema = 16;
  let frames = 0;

  const goal = { far: 1, mid: 1, near: 1, dust: 1 };
  const drawFrac = { far: 1, mid: 1, near: 1, dust: 1 };
  const easeCounts = (k: number) => {
    for (const key of ["far", "mid", "near", "dust"] as const) {
      const d = goal[key] - drawFrac[key];
      if (Math.abs(d) < 0.004) drawFrac[key] = goal[key];
      else drawFrac[key] += d * k;
    }
    far.geo.setDrawRange(0, Math.round(far.base * drawFrac.far));
    mid.geo.setDrawRange(0, Math.round(mid.base * drawFrac.mid));
    near.geo.setDrawRange(0, Math.round(near.base * drawFrac.near));
    dust.geo.setDrawRange(0, Math.round(dust.base * drawFrac.dust));
  };

  const applyQuality = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, dprMax());
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    shared.uPR.value = dpr;
    // the counts are only targets: drawFrac eases toward them frame by frame (no sudden thinning)
    goal.far = level === 2 ? 0.45 : level === 1 ? 0.8 : 1;
    goal.mid = level === 2 ? 0.55 : level === 1 ? 0.85 : 1;
    goal.near = light && level >= 1 ? 0.6 : 1;
    goal.dust = level === 0 ? 1 : level === 1 ? 0.6 : 0.2;
    bgMat.uniforms.uQ.value = light || level >= 1 ? 0 : 1;
    trails.visible = level < 2;
  };

  const measure = () => {
    w = Math.max(1, window.innerWidth);
    h = Math.max(1, window.innerHeight);
    camera.aspect = w / h;
    // the vanishing point sits behind the showreel: right of centre on a wide screen, upper middle on a phone
    const wide = w >= 900;
    vp.set(wide ? 0.72 : 0.5, wide ? 0.47 : 0.62);
    camera.setViewOffset(w, h, w / 2 - vp.x * w, h / 2 - (1 - vp.y) * h, w, h);
    camera.updateProjectionMatrix();
    shared.uScale.value = h / (2 * Math.tan((camera.fov * Math.PI) / 360));
    applyQuality();
    const rw = Math.max(48, Math.ceil(w / 4));
    const rh = Math.max(48, Math.ceil(h / 4));
    rt.setSize(rw, rh);
    bgMat.uniforms.uRes.value.set(rw, rh);
    bgMat.uniforms.uVp.value.copy(vp);
    shared.uLeftCalm.value = wide ? 1 : 0.35;
    bgMat.uniforms.uLeftCalm.value = wide ? 1 : 0.35;
    stops = opts.stops();
    stopsScrollY = window.scrollY;
  };

  // scroll position -> s (0 opening ... 4 closing), eased inside each step
  const readScroll = () => {
    if (!stops.length) return;
    const yv = window.scrollY + window.innerHeight * 0.5;
    let s = 0;
    if (yv <= stops[0].y) s = 0;
    else if (yv >= stops[stops.length - 1].y) s = stops.length - 1;
    else {
      for (let i = 0; i < stops.length - 1; i++) {
        if (yv >= stops[i].y && yv < stops[i + 1].y) {
          const t = (yv - stops[i].y) / Math.max(1, stops[i + 1].y - stops[i].y);
          s = i + t * t * (3 - 2 * t);
          break;
        }
      }
    }
    sTarget = s;
  };

  const look = (s: number): Look => {
    const i = Math.min(LOOKS.length - 2, Math.max(0, Math.floor(s)));
    const t = Math.min(1, Math.max(0, s - i));
    const out = {} as Look;
    for (const key of KEYS) out[key] = LOOKS[i][key] + (LOOKS[i + 1][key] - LOOKS[i][key]) * t;
    return out;
  };

  const boxOf = (idx: number) => stops[Math.min(stops.length - 1, Math.max(0, idx))]?.box ?? null;

  const frame = (t: number) => {
    raf = 0;
    if (disposed) return;
    // Not every frame is drawn when that is not needed: half of them while the page is not being scrolled
    // (the drift is slow), and one in two or three on a machine that cannot keep up. The movement is
    // timed with the clock, so it keeps its speed whatever is skipped.
    tick++;
    // how fast the screen really runs (every rAF counts, drawn or skipped): this drives the quality
    const raw = lastRaf ? Math.min(100, t - lastRaf) : 16;
    lastRaf = t;
    ema += (raw - ema) * 0.06;
    frames++;
    if (frames > 60 && frames % 40 === 0 && ema > (light ? 30 : 22) && !paused) {
      if (resScale > 0.61) resScale = Math.max(0.6, resScale - 0.1);
      else if (level < 2 || (level === 2 && ema > 40)) level++;
      applyQuality();
    }
    const reading = performance.now() - lastScrollT > 300;
    const flowing = !!flow && flow.energy > 0.02; // the pointer is moving things: draw every frame
    // the volume moves all the time: while it is on screen every frame is drawn (unless the machine is slowest)
    const every = level >= 3 ? 2 : reading && !flowing && !spaceBus.stageLive && !volume.visible() && !story.visible() ? 2 : 1;
    if (every > 1 && last && tick % every !== 0 && !paused && !document.hidden && !spaceBus.briefOpen) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(0.25, last ? (t - last) / 1000 : 0.016);
    last = t;
    time += dt;
    if (flow && flowTex) {
      flow.update(dt);
      if (flow.changed) flowTex.needsUpdate = true;
      // quality steps: full, then a lighter bend, then the displacement off (the light texture stays longest)
      shared.uFlowK.value = vtf && level < 2 ? (level === 0 ? 0.045 : 0.028) : 0;
    }
    readScroll();
    // settles in a short glide: it follows the scroll, no long catch-up and no waiting
    const k1 = 1 - Math.exp(-dt * 11);
    const prev = sCur;
    sCur += (sTarget - sCur) * k1;
    const target = look(sCur);
    const k2 = 1 - Math.exp(-dt * 9);
    for (const key of KEYS) cur[key] += (target[key] - cur[key]) * k2;

    // a player that is open calms the background so it does not compete with it
    const calmPlayer = spaceBus.playerOpen ? 1 : 0;
    const speed = cur.speed * (1 - 0.7 * calmPlayer);
    travel += dt * 7.5 * speed + (sCur - prev) * 38;

    // tiny camera sway from the pointer; it settles back to the centre when the pointer rests
    if (!light) {
      const idle = performance.now() - lastMove > 700;
      const tx = idle ? 0 : pointerX * 0.55;
      const ty = idle ? 0 : pointerY * 0.35;
      const k3 = 1 - Math.exp(-dt * (idle ? 2.2 : 4));
      swayX += (tx - swayX) * k3;
      swayY += (ty - swayY) * k3;
    }
    camera.position.set(swayX, swayY, 0);
    camera.rotation.y = cur.yaw;
    camera.rotation.x = -cur.yaw * 0.25;

    // dark, clean area behind the example box of the nearest stops
    const i0 = Math.floor(sCur);
    const f0 = sCur - i0;
    const b0 = boxOf(i0);
    const b1 = boxOf(i0 + 1);
    const pick = f0 < 0.5 ? b0 : b1;
    if (pick) {
      const cx = (pick.x + pick.w / 2) / w;
      const cy = 1 - (pick.y + pick.h / 2) / h;
      clearC.x += (cx - clearC.x) * k2;
      clearC.y += (cy - clearC.y) * k2;
      clearR.x += (Math.max(0.12, (pick.w / w) * 0.75) - clearR.x) * k2;
      clearR.y += (Math.max(0.15, (pick.h / h) * 0.75) - clearR.y) * k2;
    }
    const hasBox = pick ? 1 : 0;

    easeCounts(1 - Math.exp(-dt * 3));
    // volume: thinner on slow machines (eased, so it never pops), pointer parallax only for a mouse at rest or moving
    const volGoal = level === 0 ? 1 : level === 1 ? 0.75 : level === 2 ? 0.5 : 0.3;
    volFrac += (volGoal - volFrac) * (1 - Math.exp(-dt * 2));
    volume.setDrawFraction(volFrac);
    const idleP = light || performance.now() - lastMove > 900;
    // the example boxes were measured at some scroll position; move them to where they are on screen now
    const liveBox = (b: StopInfo["box"]) => {
      if (!b) return null;
      const sy = window.scrollY - stopsScrollY;
      return { cx: (b.x + b.w / 2) / w, cy: 1 - (b.y - sy + b.h / 2) / h, rx: Math.max(0.12, (b.w / w) * 0.75), ry: Math.max(0.15, (b.h / h) * 0.75) };
    };
    const lb0 = liveBox(b0) ?? liveBox(b1);
    const lb1 = liveBox(b1) ?? lb0;
    const bt = Math.min(1, Math.max(0, (f0 - 0.25) / 0.5));
    const bs = bt * bt * (3 - 2 * bt);
    const vClear = lb0 && lb1 ? { cx: lb0.cx + (lb1.cx - lb0.cx) * bs, cy: lb0.cy + (lb1.cy - lb0.cy) * bs, rx: lb0.rx + (lb1.rx - lb0.rx) * bs, ry: lb0.ry + (lb1.ry - lb0.ry) * bs, amount: 1 } : { cx: 0.7, cy: 0.5, rx: 0.3, ry: 0.4, amount: 0 };
    volume.update({ clear: vClear, shiftU: vClear.amount ? vClear.cx + (0.5 - vClear.cx) * 0.85 - vp.x : 0, aspect: camera.aspect, fov: camera.fov, dt: still ? 0 : dt, s: sCur, px: idleP ? 0 : pointerX, py: idleP ? 0 : pointerY, calm: calmPlayer * (1 - Math.min(1, Math.max(0, (Math.abs(sCur - 2) - 0.4) / 0.8))), pushK: flow && vtf && level < 3 ? (level === 0 ? 1 : level === 1 ? 0.7 : 0.4) : 0 });
    // the process story: drawn into the box the page reports (the sticky box, or the card of the step on a phone)
    {
      const sb = spaceBus.story;
      const sbox = sb.box;
      const on = !!sbox && sb.show > 0.001;
      story.setDrawFraction(volFrac);
      story.update({
        dt: still ? 0 : dt,
        u: sb.u,
        show: on ? sb.show * (1 - 0.7 * (spaceBus.briefOpen ? 1 : 0)) : 0,
        box: sbox ? { cx: (sbox.x + sbox.w / 2) / w, cy: 1 - (sbox.y + sbox.h / 2) / h, w: sbox.w / w, h: sbox.h / h } : { cx: 0.5, cy: 0.5, w: 0.3, h: 0.3 },
        vp: { x: vp.x, y: vp.y },
        aspect: camera.aspect,
        fov: camera.fov,
        px: idleP ? 0 : pointerX,
        py: idleP ? 0 : pointerY,
        pushK: flow && vtf && level < 3 ? (level === 0 ? 1 : level === 1 ? 0.7 : 0.4) : 0,
        calm: 0,
      });
    }
    shared.uTravel.value = travel;
    shared.uTime.value = time;
    shared.uClearC.value.copy(clearC);
    shared.uClearR.value.copy(clearR);
    shared.uClear.value = cur.clear * hasBox;
    near.mat.uniforms.uShow.value = Math.min(1, cur.near);
    dust.mat.uniforms.uShow.value = Math.min(1, 0.12 + cur.dust * 0.88) * (1 - 0.55 * calmPlayer);
    far.mat.uniforms.uShow.value = 1;
    mid.mat.uniforms.uShow.value = 1 - cur.calm * 0.3;
    tmat.uniforms.uTrails.value = cur.trails * (1 - calmPlayer);
    bgMat.uniforms.uTime.value = time;
    bgMat.uniforms.uNeb.value = cur.neb;
    bgMat.uniforms.uGlow.value = cur.glow;
    bgMat.uniforms.uArc.value = cur.arc;
    bgMat.uniforms.uCalm.value = cur.calm;
    // soft background into the small picture: it only drifts slowly, so every third frame is enough,
    // every second one while the scroll is changing the look
    if (frames <= 3 || still || frames % (light || level >= 2 ? 4 : 3) === 0 || (Math.abs(sCur - prev) > 0.0005 && frames % (light ? 3 : 2) === 0)) {
      renderer.setRenderTarget(rt);
      renderer.render(bgScene, camera);
      renderer.setRenderTarget(null);
    }
    renderer.render(scene, camera);
    // the particle stage (prototype): drawn by the same renderer into its own box, only while the box is on screen
    const stage = spaceBus.stage;
    if (stage) {
      const r = stage.rect();
      if (r && r.bottom > 0 && r.top < h && r.right > 0 && r.left < w && r.width > 8 && r.height > 8) {
        stage.step(dt);
        const vy = h - r.bottom;
        const sx = Math.max(0, r.left);
        const sy = Math.max(0, vy);
        renderer.autoClear = false;
        renderer.setScissorTest(true);
        renderer.setViewport(r.left, vy, r.width, r.height);
        renderer.setScissor(sx, sy, Math.min(w, r.right) - sx, Math.min(h, vy + r.height) - sy);
        stage.render(renderer, renderer.getPixelRatio());
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, w, h);
        renderer.autoClear = true;
      }
    }
    // read-only state for tests and debugging
    if (frames % 5 === 0 || still || paused) {
      canvas.dataset.s = sCur.toFixed(2);
      canvas.dataset.q = String(level);
      canvas.dataset.res = resScale.toFixed(1);
      canvas.dataset.frames = String(frames);
      if (flow) canvas.dataset.flow = flow.energy.toFixed(3);
    }
    if (!paused && !document.hidden && !spaceBus.briefOpen) raf = requestAnimationFrame(frame);
    else last = 0;
  };

  const kick = () => {
    if (disposed || still || raf || paused || document.hidden || spaceBus.briefOpen) return;
    raf = requestAnimationFrame(frame);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
    pointerY = -(e.clientY / window.innerHeight - 0.5) * 2;
    lastMove = performance.now();
  };
  let stillRaf = 0;
  const onScroll = () => {
    lastScrollT = performance.now();
    // "Hareketi azalt": no loop, but the story steps still have to follow the scroll (one still frame each time)
    if (still && !stillRaf && (spaceBus.story.show > 0.001 || story.visible())) {
      stillRaf = requestAnimationFrame(() => {
        stillRaf = 0;
        drawOnce();
      });
    }
  };
  const onVis = () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    } else kick();
  };
  let resizeT = 0;
  const onResize = () => {
    window.clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      measure();
      if (still || paused) drawOnce();
    }, 80);
  };
  const drawOnce = () => {
    last = 0;
    frame(performance.now());
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  // the brief form covers the page: the loop stops; it starts again when the form closes
  let busWas = false;
  const busTimer = window.setInterval(() => {
    if (spaceBus.briefOpen !== busWas) {
      busWas = spaceBus.briefOpen;
      if (!busWas) kick();
    }
  }, 250);

  measure();
  if (still) {
    // one calm frame of the same composition (the opening)
    sCur = sTarget = 0;
    Object.assign(cur, LOOKS[0]);
    travel = 37;
    drawOnce();
  } else {
    readScroll();
    sCur = sTarget;
    Object.assign(cur, look(sCur));
    kick();
  }
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVis);
  if (!light && !still) window.addEventListener("pointermove", onMove, { passive: true });

  return {
    setPaused(p: boolean) {
      paused = p;
      if (p) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else kick();
    },
    isPaused: () => paused,
    refresh() {
      stops = opts.stops();
      stopsScrollY = window.scrollY;
      readScroll();
      if (still || paused) drawOnce();
    },
    quality: () => level,
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      window.clearInterval(busTimer);
      window.removeEventListener("resize", onResize);
          window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      [far, mid, near, dust].forEach((l) => {
        l.geo.dispose();
        l.mat.dispose();
      });
      volume.dispose();
      story.dispose();
      flow?.dispose();
      flowTex?.dispose();
      tgeo.dispose();
      tmat.dispose();
      bg.geometry.dispose();
      bgQuad.geometry.dispose();
      bgMat.dispose();
      compMat.dispose();
      rt.dispose();
      renderer.dispose();
    },
  };
}
