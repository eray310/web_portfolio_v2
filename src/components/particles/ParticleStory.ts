/**
 * One swarm of particles that carries a whole story: the SAME points change shape from scene to scene.
 *
 * - Up to four shapes (see samplers.ts) are stored on the GPU as vertex attributes; `setProgress(seg)`
 *   says where we are: 0 = the first shape, 1 = the second, 1.5 = half way between the second and the
 *   third. Everything else happens in the vertex shader: every particle leaves at its own moment, flows
 *   through a soft swirling field while it travels, and settles into the next shape.
 * - The camera follows the same number (a path of key frames), so the move is felt as a camera move.
 * - The pointer pushes the particles that are close to it (in screen space) a little aside; when the pointer
 *   goes away `setPointer(..., 0)` lets them return smoothly.
 * - Points are drawn on the GPU as soft dots, off-white with a few turquoise ones, never so bright that the
 *   inside of a letter fills up.
 *
 * The idea of one particle system whose shapes follow the scroll is the one of the "Cinematic Particle
 * Hero" (mstyli04/cinematic-hero) and of "Metamorphosis" (manurathansetty/metamorphosis); neither repo
 * carries a licence, so no code was taken from them. The per-particle delay and the pointer push follow
 * the "Particle Morph" effect of PSCactux/webgl-shader-lab (MIT, see THIRD_PARTY_NOTICES.md).
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import { palette } from "./config";
import type { Shape } from "./samplers";

export type CameraKey = { pos: [number, number, number]; look: [number, number, number]; fov?: number };

export type StoryOptions = {
  count: number;
  shapes: Shape[]; // 2..4
  camera: CameraKey[]; // one per shape
  size: number; // dot size (css px at a distance of about 10)
  /** How strongly turquoise each shape may be (0..1), per shape. */
  teal?: number[];
};

const VERT = /* glsl */ `
  attribute vec3 aS0;
  attribute vec3 aS1;
  attribute vec3 aS2;
  attribute vec3 aS3;
  attribute vec4 aTones;
  attribute float aSeed;
  uniform float uSeg;
  uniform float uN;
  uniform float uTime;
  uniform float uPR;
  uniform float uScale;
  uniform float uSize;
  uniform float uAspect;
  uniform float uFree;
  uniform vec3 uPointer;
  uniform vec4 uTeal;
  varying float vTone;
  varying float vAlpha;
  varying float vTeal;

  vec3 shapeAt(int i) {
    if (i <= 0) return aS0;
    if (i == 1) return aS1;
    if (i == 2) return aS2;
    return aS3;
  }
  float toneAt(int i) {
    if (i <= 0) return aTones.x;
    if (i == 1) return aTones.y;
    if (i == 2) return aTones.z;
    return aTones.w;
  }
  float tealAt(int i) {
    if (i <= 0) return uTeal.x;
    if (i == 1) return uTeal.y;
    if (i == 2) return uTeal.z;
    return uTeal.w;
  }

  void main() {
    float seg = clamp(uSeg, 0.0, uN - 1.0 - 0.0001);
    float fi = floor(seg);
    int i0 = int(fi);
    float t = seg - fi;
    // every particle leaves at its own moment (the first ones early, the last ones late) and arrives smoothly
    float sp = 0.6;
    float m = clamp(t * (1.0 + sp) - aSeed * sp, 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);
    vec3 a = shapeAt(i0);
    vec3 b = shapeAt(i0 + 1);
    vec3 pos = mix(a, b, m);

    // while travelling: a soft swirl and flow, strongest in the middle of the trip, none when settled
    float travel = sin(3.14159265 * m);
    float ph = aSeed * 6.2831;
    vec3 flow = vec3(
      sin(pos.y * 0.9 + uTime * 0.55 + ph),
      sin(pos.z * 1.1 + uTime * 0.45 + ph * 1.7),
      sin(pos.x * 0.8 + uTime * 0.6 + ph * 0.6)
    );
    float ang = travel * (aSeed - 0.5) * 1.6;
    float ca = cos(ang);
    float sa = sin(ang);
    pos.xy = vec2(pos.x * ca - pos.y * sa, pos.x * sa + pos.y * ca);
    pos += flow * travel * uFree * (0.7 + aSeed * 1.9);
    // a very small breath so a settled shape is alive, never noisy
    pos += 0.018 * vec3(sin(uTime * 0.8 + ph * 3.0), cos(uTime * 0.7 + ph * 2.0), sin(uTime * 0.6 + ph));

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // the pointer pushes close particles aside (screen space), softly
    vec2 ndc = gl_Position.xy / gl_Position.w;
    vec2 d = (ndc - uPointer.xy) * vec2(uAspect, 1.0);
    float r = length(d);
    float fall = exp(-r * r / (2.0 * 0.12 * 0.12)) * uPointer.z;
    vec2 dir = d / max(r, 0.0001);
    gl_Position.xy += (dir / vec2(uAspect, 1.0)) * fall * 0.24 * gl_Position.w;

    float dist = -mv.z;
    gl_PointSize = clamp(uSize * uPR * (0.6 + aSeed * 0.85) * uScale / dist, 1.0 * uPR, 6.5 * uPR);
    vTone = mix(toneAt(i0), toneAt(i0 + 1), m);
    vTeal = mix(tealAt(i0), tealAt(i0 + 1), m);
    // farther particles are fainter: the depth is felt
    vAlpha = (0.35 + 0.65 * smoothstep(60.0, 8.0, dist)) * (0.75 + 0.25 * (1.0 - aSeed));
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uOff;
  uniform vec3 uTealColor;
  uniform float uBright;
  varying float vTone;
  varying float vAlpha;
  varying float vTeal;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.08, d);
    // off-white by default; the brighter-toned particles lean turquoise, as much as the shape allows
    float teal = smoothstep(0.55, 1.0, vTone) * vTeal;
    vec3 col = mix(uOff, uTealColor, teal);
    float alpha = a * vAlpha * uBright;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

export class ParticleStory {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(30, 1, 0.1, 400);
  readonly count: number;
  private geo = new BufferGeometry();
  private mat: ShaderMaterial;
  private points: Points;
  private keys: CameraKey[];
  private pointer = { x: 9, y: 9, s: 0, tx: 9, ty: 9, ts: 0 };
  private seg = 0;
  private time = 0;
  private vh = 1;

  constructor(opts: StoryOptions) {
    this.count = opts.count;
    this.keys = opts.camera;
    const n = opts.shapes.length;
    if (n < 2 || n > 4) throw new Error("ParticleStory takes 2 to 4 shapes");
    const shapes = [...opts.shapes];
    while (shapes.length < 4) shapes.push(shapes[shapes.length - 1]);
    for (let i = 0; i < 4; i++) {
      if (shapes[i].pos.length !== opts.count * 3) throw new Error("every shape needs the same number of points");
      this.geo.setAttribute(`aS${i}`, new BufferAttribute(shapes[i].pos, 3));
    }
    this.geo.setAttribute("position", new BufferAttribute(shapes[0].pos, 3)); // three needs one named position
    const tones = new Float32Array(opts.count * 4);
    const seeds = new Float32Array(opts.count);
    let s = 90210;
    for (let i = 0; i < opts.count; i++) {
      for (let k = 0; k < 4; k++) tones[i * 4 + k] = shapes[k].tone[i];
      s = (s * 1664525 + 1013904223) >>> 0;
      seeds[i] = s / 4294967296;
    }
    this.geo.setAttribute("aTones", new BufferAttribute(tones, 4));
    this.geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    const teal = opts.teal ?? [0.5, 0.5, 0.5, 0.5];
    this.mat = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uSeg: { value: 0 },
        uN: { value: n },
        uTime: { value: 0 },
        uPR: { value: 1 },
        uScale: { value: 600 },
        uSize: { value: opts.size },
        uAspect: { value: 1 },
        uFree: { value: 1 },
        uPointer: { value: new Vector3(9, 9, 0) },
        uTeal: { value: new Vector4(teal[0] ?? 0.5, teal[1] ?? 0.5, teal[2] ?? 0.5, teal[3] ?? 0.5) },
        uOff: { value: new Vector3(...palette.offWhite) },
        uTealColor: { value: new Vector3(...palette.teal) },
        uBright: { value: 0.62 },
      },
    });
    this.points = new Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    this.setProgress(0);
  }

  /** Where in the story: 0 = first shape, 1 = second, 1.5 = half way between the second and the third. */
  setProgress(seg: number) {
    this.seg = seg;
    this.mat.uniforms.uSeg.value = seg;
    this.placeCamera();
  }

  /** The pointer in normalised device coordinates (-1..1, y up); strength 0..1 (0 = away: particles return). */
  setPointer(x: number, y: number, strength: number) {
    this.pointer.tx = x;
    this.pointer.ty = y;
    this.pointer.ts = strength;
  }

  /** Size and pixel ratio of what is drawn (css px). */
  resize(width: number, height: number, pixelRatio: number) {
    this.vh = height;
    this.camera.aspect = width / Math.max(1, height);
    this.mat.uniforms.uAspect.value = this.camera.aspect;
    this.mat.uniforms.uPR.value = pixelRatio;
    this.placeCamera();
  }

  /** 0..1: how much of the swarm is drawn (the quality step for slow machines). */
  setDrawFraction(f: number) {
    this.geo.setDrawRange(0, Math.max(1000, Math.round(this.count * f)));
  }

  /** The loose free flow of the travelling particles (0 = none). */
  setFree(f: number) {
    this.mat.uniforms.uFree.value = f;
  }

  setBrightness(b: number) {
    this.mat.uniforms.uBright.value = b;
  }

  /** Advances the pointer smoothing and the clock; returns true while something is still moving. */
  update(dt: number): boolean {
    this.time += dt;
    this.mat.uniforms.uTime.value = this.time;
    const p = this.pointer;
    // the pointer follows quickly; its strength rises quickly and falls slowly (the particles regroup softly)
    const kx = 1 - Math.exp(-dt * 18);
    p.x += (p.tx - p.x) * kx;
    p.y += (p.ty - p.y) * kx;
    const ks = 1 - Math.exp(-dt * (p.ts > p.s ? 14 : 3.2));
    p.s += (p.ts - p.s) * ks;
    if (p.s < 0.002) p.s = 0;
    (this.mat.uniforms.uPointer.value as Vector3).set(p.x, p.y, p.s);
    return p.s > 0;
  }

  private placeCamera() {
    const n = this.keys.length;
    const seg = Math.min(n - 1 - 1e-4, Math.max(0, this.seg));
    const i = Math.floor(seg);
    const t = smooth(seg - i);
    const a = this.keys[i];
    const b = this.keys[Math.min(n - 1, i + 1)];
    const lerp = (x: number, y: number) => x + (y - x) * t;
    this.camera.position.set(lerp(a.pos[0], b.pos[0]), lerp(a.pos[1], b.pos[1]), lerp(a.pos[2], b.pos[2]));
    this.camera.fov = lerp(a.fov ?? 30, b.fov ?? 30);
    this.camera.lookAt(lerp(a.look[0], b.look[0]), lerp(a.look[1], b.look[1]), lerp(a.look[2], b.look[2]));
    this.camera.updateProjectionMatrix();
    this.mat.uniforms.uScale.value = this.vh / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
  }

  /** Draws the swarm with the given renderer (the caller owns the canvas and the viewport). */
  render(renderer: WebGLRenderer) {
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
  }
}
