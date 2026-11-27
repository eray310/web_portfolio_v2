/**
 * The 3D world of /zihnim: ONE WebGL renderer and canvas.
 *
 * - All points of the world (worldGeometry.ts) are drawn in one call. The vertex shader adds each point's local life
 *   (a slow, bounded breathing around its own place, neighbours moving together), the light waves that travel over the
 *   surfaces, the discovery moments of the places (frames opening, aligning, settling), opens the shell around the
 *   camera and hands real pictures over from particles to sharp textured planes up close.
 * - The guide is a second, small Points object in the same scene and renderer: the same points form a seed of light,
 *   an abstract bird, a stretch of the film strip and a patch of a membrane.
 * - ONE value drives everything: the route position `s` (0..1). The wheel, a vertical drag on a phone and the place
 *   buttons move it; the camera, the guide and the moments are pure functions of it, so forwards and backwards follow
 *   the same story and the visitor can stop anywhere.
 * - It draws only while something changes, never while the tab is hidden or the brief is open; `dispose()` removes
 *   everything.
 */
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CustomBlending,
  DoubleSide,
  Matrix3,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OneFactor,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Raycaster,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import { calmStops, coverAt, galAt, galX, galleryStart, guideSpots, isPortrait, roomX, summitLook, summitPos, light as LY, readyAreas, route, stations, worldConfig as W, works, type StationId, type V3 } from "./zihnimWorld";
import { BEACON, FRAME_BASE, LINE_BASE, STREAM, buildGallery, buildGuide, buildHall, buildRoom, buildSummit, buildTunnel, buildWorld, galleryFrames, hallFrames, roomFrames, sampleImage, type Samples, type World } from "./worldGeometry";

export type SceneOptions = {
  canvas: HTMLCanvasElement;
  light: boolean;
  reduced: boolean;
  alive: () => boolean;
  /** Label elements by place id (and "core"); the scene moves them to the places' screen positions. */
  labels: () => Record<string, HTMLElement | null>;
  /** Route position changed (0..1), at most a few times per second. */
  onProgress: (s: number) => void;
  /** The camera has settled at a station (or left it: null). */
  onStation: (id: StationId | null) => void;
  /** A picture in the world was chosen with the pointer. */
  onPickWork: (id: string) => void;
  /** First input of the visitor (wheel, drag, trip): the hint can go. */
  onFirstInput: () => void;
};

export type SceneApi = {
  goTo: (id: StationId) => void;
  setPaused: (paused: boolean) => void;
  /** 0..1: a panel or a video is open; the decorative motion calms down. */
  setCalm: (calm: number) => void;
  /** true: the brief is open; nothing moves or draws until it closes (the route position is kept). */
  setHold: (hold: boolean) => void;
  /** A vertical swipe on the chapter card (phones): the finger moved by dy px since the last call; travels like a drag on the scene. */
  swipeBy: (dy: number) => void;
  /** The swipe on the card ended; total: its whole vertical travel in px (the calm view steps by it). */
  swipeEnd: (total: number) => void;
  dispose: () => void;
};

const MAX_FRAMES = 24;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep
const sstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const v3 = (a: V3) => new Vector3(a[0], a[1], a[2]);
/**
 * A smooth, monotone curve through the tempo pairs (Fritsch-Carlson), so the speed changes softly at every chapter
 * and never runs backwards; with its inverse (bisection). x: scroll position, y: route time.
 */
const makeTempo = (k: [number, number][]) => {
  const n = k.length;
  const dx = k.slice(1).map((p, i) => p[0] - k[i][0]);
  const dl = k.slice(1).map((p, i) => (p[1] - k[i][1]) / dx[i]);
  const m = k.map((_, i) => (i === 0 ? dl[0] : i === n - 1 ? dl[n - 2] : dl[i - 1] * dl[i] <= 0 ? 0 : (dl[i - 1] + dl[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (dl[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / dl[i];
    const b = m[i + 1] / dl[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * dl[i];
      m[i + 1] = t * b * dl[i];
    }
  }
  const f = (x: number) => {
    x = Math.min(1, Math.max(0, x));
    let i = 0;
    while (i < n - 2 && x > k[i + 1][0]) i++;
    const h = dx[i];
    const t = (x - k[i][0]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * k[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * k[i + 1][1] + (t3 - t2) * h * m[i + 1];
  };
  const inv = (y: number) => {
    let lo = 0;
    let hi = 1;
    for (let j = 0; j < 40; j++) {
      const mid = (lo + hi) / 2;
      if (f(mid) < y) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  return { f, inv };
};
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ── shaders of the world's points
const VERT = /* glsl */ `
  attribute vec3 aC;
  attribute vec4 aD;
  attribute float aPath;
  attribute float aImg;
  uniform float uTime, uScale, uPR, uMinPx, uMaxPx, uEdge, uExposure, uLife, uMove, uFinal;
  uniform float uAlpha[11];
  uniform float uAmp[11];
  uniform float uKnee, uSlope, uInside, uBokehPx, uBokehLight;
  uniform float uBrain, uReach, uCut, uCamAx, uWrap, uMouth, uSplit, uCoverS;
  uniform vec3 uCoverC, uCoverU, uFarDim;
  uniform float uShutA, uShutP, uFlow;
  uniform vec3 uScrC, uScrR, uScrU;
  uniform vec2 uScrS;
  uniform vec3 uAxisP, uAxisD;
  uniform float uLine[${MAX_FRAMES}];
  uniform float uMScale, uMSpeed;
  uniform float uOpenNear, uOpenFar, uOutside, uNearDist, uNearAlpha;
  uniform vec4 uHemi;
  uniform vec4 uFrameC[${MAX_FRAMES}];
  uniform vec4 uFrameO[${MAX_FRAMES}];
  uniform vec4 uWave[3];
  uniform vec4 uWaveC[3];
  uniform float uWaveW, uWaveTrail;
  uniform float uPathWave, uPathT, uPathSlot;
  uniform vec2 uPointer;
  uniform float uPointerOn, uAspect, uPRad, uPPush, uPTint;
  uniform vec2 uAnch[5];
  uniform vec3 cTeal, cIce, cLav;
  varying vec4 vCol;
  varying float vSoft;
  void main() {
    float seed = aD.x;
    float sz = aD.y;
    float kind = aD.z;
    float t = aD.w;
    int ki = int(kind + 0.5);
    vec3 p = position;
    vec3 col = aC;

    // a frame of a real work: it opens (Görsel), aligns (Kurgu) or settles (Deney) as one piece
    float fr = aPath - ${FRAME_BASE.toFixed(1)};
    float fade = 0.0;
    // a light line of the hall (and the pool of light under its work) belongs to a picture too
    float ln = aPath - ${LINE_BASE.toFixed(1)};
    if (fr > 50.0) fr = -1.0;
    if (fr > -0.5) {
      vec4 FC = uFrameC[int(fr + 0.5)];
      vec4 FO = uFrameO[int(fr + 0.5)];
      p += FO.xyz;
      fade = FC.w;
      // particles in front of a sharp picture thin out and step aside
      if (aImg > -0.5) p += normalize(p - FC.xyz - FO.xyz + vec3(0.001)) * fade * 0.9;
    }

    // local life: a smooth field, so neighbours move together; bounded around the point's own place
    float amp = uAmp[ki] * uLife * uMove * (fr > -0.5 ? 0.25 : 1.0);
    if (amp > 0.001) {
      vec3 q = position * uMScale;
      float tt = uTime * uMSpeed;
      float ph = seed * 0.8;
      p += amp * vec3(
        sin(q.y * 1.3 + q.z * 0.7 + tt + ph),
        sin(q.z * 1.1 + q.x * 0.9 + tt * 0.83 + 1.7 + ph),
        sin(q.x * 1.2 + q.y * 0.6 + tt * 1.13 + 3.1 + ph));
    }
    // the membranes of the Deney Alanı roll slowly
    if (ki == 4 && aImg < -0.5 && fr < -0.5) p.y += sin(uTime * 0.5 + p.x * 0.11 + p.z * 0.07) * 0.9 * uLife;

    // the square cover at the end of the tunnel: held in its square until the camera arrives, then every point leaves
    // for its place on a screen of the hall and goes out there
    float coverK = -1.0;
    if (ki == 10 && abs(aPath - ${BEACON.toFixed(1)}) < 0.5) {
      float st = fract(seed * 7.31);
      coverK = 1.0 - smoothstep(st * 0.5, st * 0.5 + 0.5, uSplit);
      vec3 cp = uCoverC + vec3(1.0, 0.0, 0.0) * (t - 0.5) * uCoverS + uCoverU * (seed - 0.5) * uCoverS;
      p = mix(p, cp, coverK * coverK * (3.0 - 2.0 * coverK));
    }

    // 05 -> 06: the light of every place walks to the one screen, in thin streams, and fills it
    float flowK = -1.0;
    if (ki == 10 && abs(aPath - ${STREAM.toFixed(1)}) < 0.5) {
      float st = fract(seed * 7.31) * 0.62;
      flowK = smoothstep(st, st + 0.38, uFlow);
      vec3 tp = uScrC + uScrR * (t - 0.5) * uScrS.x + uScrU * (seed - 0.5) * uScrS.y;
      p = mix(p, tp, flowK) + vec3(0.0, 1.0, 0.0) * sin(flowK * 3.14159) * 30.0;
    }

    // the dust of the beam is one stretch of the axis that repeats around the camera: the same few points are always
    // near (dense enough to read as a beam), and each still stands still in the world while the camera passes it
    float ax = 0.0;
    if (ki == 9) {
      ax = dot(p - uAxisP, uAxisD);
      float w = uCamAx + mod(ax - uCamAx + uWrap, 2.0 * uWrap) - uWrap;
      p += uAxisD * (w - ax);
      ax = w;
    }

    // entering the fissure: the brain comes apart point by point and drifts outward a little; the dark is left
    float brainK = 1.0;
    if (ki != 2 && ki < 9) {
      brainK = smoothstep(seed * 0.6, seed * 0.6 + 0.4, uBrain);
      p += normalize(p + vec3(0.001)) * (1.0 - uBrain) * (4.0 + 10.0 * seed);
    }

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    float dist = -mv.z;
    vec2 uv = clip.xy / max(clip.w, 0.0001) * 0.5 + 0.5;

    // pointer: a small local opening; never around the labels, never on works or their frames
    vec2 d = (uv - uPointer) * vec2(uAspect, 1.0);
    float infl = (1.0 - smoothstep(0.0, uPRad, length(d))) * uPointerOn * (fr > -0.5 ? 0.0 : 1.0);
    for (int i = 0; i < 5; i++) infl *= smoothstep(0.035, 0.11, length((uv - uAnch[i]) * vec2(uAspect, 1.0)));
    clip.xy += normalize(d + vec2(0.0001)) * infl * uPPush * clip.w;
    gl_Position = clip;

    // light waves: they start somewhere, run along the surface (stronger on the crests of the folds), leave a short
    // trail and fade back; pictures keep their own colours
    float bright = 1.0;
    if (aImg < -0.5) {
      vec3 wc = vec3(0.0);
      float wsum = 0.0;
      float fold = ki == 0 ? mix(0.35, 1.0, t) : 0.8;
      for (int i = 0; i < 3; i++) {
        if (uWaveC[i].a < 0.001) continue;
        float x = distance(position, uWave[i].xyz) - uWave[i].w;
        float band = exp(-(x * x) / (uWaveW * uWaveW));
        float tail = x < 0.0 ? exp(x / uWaveTrail) * 0.4 : 0.0;
        float k = max(band, tail) * uWaveC[i].a * fold;
        wc += uWaveC[i].rgb * k;
        wsum += k;
      }
      // the hue changes clearly, the light only a little
      if (wsum > 0.001) col = mix(col, wc / wsum, clamp(wsum * 1.7, 0.0, 0.85));
      bright += 0.3 * clamp(wsum, 0.0, 1.0);
      // the final: each place keeps a calm glow of the colour it gave the journey
      if (ki >= 2 && ki <= 4 && fr < -0.5) {
        vec3 ac = ki == 2 ? cTeal : ki == 3 ? cIce : cLav;
        col = mix(col, ac, 0.35 * uFinal);
        bright += 0.25 * uFinal;
      }
    }
    // a trip: a wave runs from the core along the path to the place
    if (ki == 5) {
      float on = (1.0 - step(0.5, abs(aPath - uPathSlot))) * uPathWave;
      float dl = t - uPathT;
      float w = max(exp(-(dl * dl) / 0.01), dl < 0.0 ? 0.5 * exp(dl / 0.12) : 0.0) * on;
      col = mix(col, mix(cTeal, cIce, 0.3), clamp(w, 0.0, 1.0));
      bright += 1.2 * w;
    }
    col = mix(col, cTeal, clamp(infl * uPTint, 0.0, 0.6));

    float a = uAlpha[ki] * uExposure * bright * smoothstep(2.5, 8.0, dist) * brainK * uCut;
    if (ki == 9) {
      // the beam: only as far along the axis as the journey has opened it; far dust is fainter (the depth stays dark)
      a *= 1.0 - smoothstep(uReach - 60.0, uReach, ax);
      a *= 1.0 - smoothstep(uMouth, uMouth + 140.0, ax);
      a *= smoothstep(${(-LY.leak - 30).toFixed(1)}, ${(-LY.leak).toFixed(1)}, ax);
      a *= smoothstep(-uWrap, -uWrap * 0.8, ax - uCamAx) * (1.0 - smoothstep(uWrap * 0.75, uWrap, ax - uCamAx));
      // far dust all falls on the same few pixels around the far light: it is dimmed so the centre never burns white
      a *= mix(1.0, uFarDim.z, smoothstep(uFarDim.x, uFarDim.y, dist));
    }
    if (ki == 10) {
      if (ln > -0.5) {
        int li = int(ln + 0.5);
        float L = uLine[li];
        float Wr = uFrameO[li].w;
        if (t > 1.5) a *= Wr * 0.8 * (1.0 - uShutA * (0.5 + 0.5 * sin(uShutP + float(li) * 1.7)));
        else {
          // the line comes down: its tip is the brightest part; once the work is written the line rests fainter
          a *= 1.0 - smoothstep(L * 1.06 - 0.06, L * 1.06, t);
          a *= 1.0 + 2.5 * exp(-pow((t - L) * 14.0, 2.0)) * (1.0 - step(0.995, L));
          a *= mix(1.0, 0.4, Wr);
          // the shutter: a slow, shallow rhythm of the lines before the journey turns to motion (route position, no clock)
          a *= 1.0 - uShutA * (0.5 + 0.5 * sin(uShutP + float(li) * 1.7));
        }
      } else if (flowK > -0.5) a *= smoothstep(0.0, 0.06, flowK) * (1.0 - 0.75 * smoothstep(0.8, 1.0, flowK));
      else if (coverK > -0.5) a *= 0.45 * smoothstep(0.0, 0.4, coverK) * clamp(40000.0 / (dist * dist), 0.06, 1.0); // far away its points share a few pixels: each gives less, so the square keeps one brightness
    }
    // the shell, the tracts and the inner dust open around the camera (a corridor of view)
    if (ki == 0 || ki == 6 || ki == 7) a *= smoothstep(uOpenNear, uOpenFar, dist);
    if (ki == 0) a *= mix(uInside, 1.0, uOutside);
    // seen from outside, the far side of each lobe stays dim: the near surface (and its folds) reads as a volume
    if (ki == 0 && uOutside > 0.001) {
      float sx = p.x < 0.0 ? -1.0 : 1.0;
      vec3 hq = p - vec3(sx * uHemi.x, -4.0, 0.0);
      vec3 n = normalize(hq / (uHemi.yzw * uHemi.yzw));
      float facing = dot(n, normalize(cameraPosition - p));
      a *= mix(1.0, mix(0.14, 1.0, smoothstep(-0.25, 0.35, facing)), uOutside);
    }
    // a real picture hands over completely to the sharp plane; its outline stays, dimmer
    if (aImg > -0.5) a *= 1.0 - fade;
    else if (fr > -0.5) a *= 1.0 - 0.55 * fade;
    // a closed frame is only a faint line; it brightens as it opens
    if (fr > -0.5 && ki == 2) {
      // a work of the hall is written from the top down, where its light line has landed; the writing edge is brighter
      float wr = uFrameO[int(fr + 0.5)].w * 1.14;
      a *= 1.0 - smoothstep(wr - 0.14, wr, t);
      a *= 1.0 + 1.8 * exp(-pow((t - wr + 0.07) * 16.0, 2.0)) * (1.0 - step(1.13, wr));
      // the three leading works are the one focus of the hall: the works behind them stay clearly fainter;
      // the frames of the gallery are faint points while they wait far away
      if (fr > 2.5 && fr < 9.5) a *= 0.42;
      if (fr > 9.5) a *= mix(0.3, 1.0, smoothstep(78.0, 42.0, dist));
    }
    // up close: fewer, softer points
    if (ki < 8) a *= mix(uNearAlpha, 1.0, smoothstep(uNearDist * 0.45, uNearDist, dist));

    // size: clamped in css px; a point smaller than the minimum keeps the minimum size with less light. Above the knee
    // a point grows slower than the perspective, so a near surface stays fine grain instead of a field of equal discs.
    float px = sz * uScale / max(dist, 0.001);
    float pxc;
    if (ki == 8) {
      // a near mote: a large, very soft disc; the same light spread over its area
      pxc = clamp(px, 3.0, uBokehPx);
      a *= clamp(uBokehLight / pxc, 0.0, 1.0) * smoothstep(3.0, 9.0, dist);
      vSoft = 0.92;
    } else {
      float pk = px > uKnee ? uKnee + (px - uKnee) * uSlope : px;
      pxc = clamp(pk, uMinPx, uMaxPx);
      a *= pow(min(1.0, px / uMinPx), 1.35);
      vSoft = clamp(uEdge / pxc, 0.1, 0.75);
    }
    vCol = vec4(col, a);
    gl_PointSize = pxc * uPR;
  }
`;
// a round dot with an anti-aliased rim and a faint body (a little volume, never a blur); premultiplied for ONE, ONE
const FRAG = /* glsl */ `
  precision mediump float;
  varying vec4 vCol;
  varying float vSoft;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = (1.0 - smoothstep(1.0 - vSoft, 1.0, d)) * vCol.a;
    if (a < 0.002) discard;
    float body = exp(-d * d * 1.5);
    gl_FragColor = vec4(vCol.rgb * body * a, a);
  }
`;

// ── shaders of the guide
const GVERT = /* glsl */ `
  attribute vec3 aHome;
  attribute vec3 aSeed;
  attribute vec3 aBird;
  attribute vec3 aStrip;
  attribute vec3 aMem;
  attribute vec3 aTint;
  attribute vec4 aG;
  uniform vec3 uGPos;
  uniform mat3 uGRot;
  uniform float uGather, uMorph, uLift, uStripK, uMemK, uTintK, uIceK, uLavK, uRest;
  uniform float uTime, uLife, uScale, uPR, uMinPx, uMaxPx, uEdge, uExposure;
  uniform vec3 cOff, cIce, cLav, cTeal;
  varying vec4 vCol;
  varying float vSoft;
  void main() {
    float st = aG.x;
    float m = smoothstep(st * 0.45, st * 0.45 + 0.55, uMorph);
    // at the final the seed opens into a wider, calm light
    vec3 restShape = mix(aSeed * 2.2, normalize(aSeed + vec3(0.0001)) * (2.6 + 1.4 * fract(st * 7.0)), 0.7);
    vec3 local = mix(mix(aSeed, restShape, uRest), aBird, m);
    // the wings bend with the journey (tied to the route, not to a clock): no flapping mascot
    local.y += uLift * pow(abs(aG.z), 1.5) * m;
    // the seed breathes very little while it waits
    local += (1.0 - m) * 0.07 * uLife * vec3(sin(uTime * 0.8 + st * 21.0), sin(uTime * 0.67 + st * 33.0), sin(uTime * 0.74 + st * 13.0));
    vec3 w = uGPos + uGRot * local;
    w = mix(aHome, w, smoothstep(st * 0.4, st * 0.4 + 0.6, uGather));
    w = mix(w, aStrip, smoothstep(st * 0.5, st * 0.5 + 0.5, uStripK));
    w = mix(w, aMem, smoothstep(st * 0.5, st * 0.5 + 0.5, uMemK));
    vec4 mv = modelViewMatrix * vec4(w, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;

    // colours gathered on the way: covers of Görsel Hafıza, then ice (Kurgu), then lavender (Deney)
    vec3 col = cOff;
    col = mix(col, aTint, uTintK * aG.w);
    if (aG.w < 0.5 && st < 0.12) col = mix(col, cIce, uIceK * 0.8);
    if (aG.w < 0.5 && st > 0.12 && st < 0.19) col = mix(col, cLav, uLavK * 0.8);
    if (aG.w < 0.5 && st > 0.19 && st < 0.24) col = mix(col, cTeal, uIceK * 0.6);
    // a seed is many points in a small space: each is faint so the seed is a calm light, not a white blot
    float a = mix(mix(0.1, 0.22, uRest), 0.2, m) * (1.0 - 0.85 * m) * mix(1.0, 0.75, uStripK) * uExposure;
    float px = aG.y * uScale / max(dist, 0.001);
    float pxc = clamp(px, uMinPx, uMaxPx);
    a *= pow(min(1.0, px / uMinPx), 1.2) * smoothstep(1.5, 5.0, dist);
    vSoft = clamp(uEdge / pxc, 0.1, 0.75);
    vCol = vec4(col, a);
    gl_PointSize = pxc * uPR;
  }
`;

type Trip = { from: number; to: number; t: number; dur: number };
type Wave = { period: number; offset: number; cycle: number; o: Vector3; c: Vector3 };

export async function createScene(o: SceneOptions): Promise<SceneApi> {
  const { canvas, light } = o;
  /** Calm: "Hareketi azalt" or "Sakin görünüm". Cuts instead of flights, finished compositions, no ambient motion. */
  let reduced = o.reduced;
  const P = W.palette;
  const PW = W.particles;

  // the pictures become particles; each picture is read once into a small grid
  const samples: Record<string, Samples | null> = {};
  await Promise.all(works.map(async (w) => (samples[w.id] = await sampleImage(w.image))));
  if (!o.alive()) throw new Error("cancelled");
  // the first song cover: the far light of the tunnel takes its colours from the real picture
  const coverS = await sampleImage(import.meta.env.BASE_URL + LY.cover.image, 96);
  if (!o.alive()) throw new Error("cancelled");
  const world = buildWorld(light ? W.count.light : W.count.desktop, samples);
  const guide = buildGuide(light ? Math.round(W.guide.count * 0.75) : W.guide.count, samples);

  const attrs: WebGLContextAttributes = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: light ? "low-power" : "default" };
  const gl = (canvas.getContext("webgl2", attrs) || canvas.getContext("webgl", attrs)) as WebGLRenderingContext | null;
  if (!gl) throw new Error("no WebGL");
  const renderer = new WebGLRenderer({ canvas, context: gl, antialias: false, alpha: false });
  renderer.setClearColor(W.ground, 1);
  const scene = new Scene();
  const camera = new PerspectiveCamera(W.fov, 1, 0.5, 4200); // far enough for the summit, where the brain lies about 1700 units away

  // ── the world's points
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(world.pos, 3));
  geo.setAttribute("aC", new BufferAttribute(world.col, 3));
  geo.setAttribute("aD", new BufferAttribute(world.data, 4));
  geo.setAttribute("aPath", new BufferAttribute(world.path, 1));
  geo.setAttribute("aImg", new BufferAttribute(world.img, 1));
  const anch = [0, 1, 2, 3, 4].map(() => new Vector2(-9, -9));
  const frameC = Array.from({ length: MAX_FRAMES }, () => new Vector4());
  const frameO = Array.from({ length: MAX_FRAMES }, () => new Vector4(0, 0, 0, 1));
  const lineU: number[] = new Array(MAX_FRAMES).fill(0);
  const waveU = [0, 1, 2].map(() => new Vector4(0, -999, 0, 0));
  const waveC = [0, 1, 2].map(() => new Vector4(1, 1, 1, 0));
  const blend = { blending: CustomBlending, blendSrc: OneFactor, blendDst: OneFactor, transparent: true, depthTest: false, depthWrite: false } as const;
  const common = {
    uTime: { value: 0 },
    uScale: { value: 600 },
    uPR: { value: 1 },
    uMinPx: { value: PW.minPx },
    uMaxPx: { value: PW.maxPx },
    uEdge: { value: PW.edge },
    uExposure: { value: PW.exposure },
    uLife: { value: 1 },
    cTeal: { value: v3(P.teal) },
    cIce: { value: v3(P.ice) },
    cLav: { value: v3(P.lavender) },
  };
  const mat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    ...blend,
    uniforms: {
      ...common,
      uMove: { value: 1 },
      uFinal: { value: 0 },
      uAlpha: { value: PW.alpha },
      uKnee: { value: PW.knee },
      uSlope: { value: PW.slope },
      uInside: { value: PW.insideShell },
      uBokehPx: { value: PW.bokeh.maxPx },
      uBokehLight: { value: PW.bokeh.light },
      uBrain: { value: 1 },
      uReach: { value: 0 },
      uCut: { value: 1 },
      uCamAx: { value: 0 },
      uWrap: { value: LY.tunnel.wrap },
      uMouth: { value: LY.mouth },
      uSplit: { value: 0 },
      uCoverS: { value: LY.cover.side },
      uCoverC: { value: v3(coverAt) },
      uCoverU: { value: v3(LY.axis.up) },
      uFarDim: { value: v3(LY.tunnel.farDim) },
      uShutA: { value: 0 },
      uFlow: { value: 0 },
      uScrC: { value: new Vector3() },
      uScrR: { value: new Vector3(1, 0, 0) },
      uScrU: { value: new Vector3(0, 1, 0) },
      uScrS: { value: new Vector2(LY.screen.w, LY.screen.h) },
      uShutP: { value: 0 },
      uAxisP: { value: v3(LY.axis.p) },
      uAxisD: { value: v3(LY.axis.d) },
      uLine: { value: lineU },
      uAmp: { value: W.motion.amp },
      uMScale: { value: W.motion.scale },
      uMSpeed: { value: W.motion.speed },
      uOpenNear: { value: W.shellOpen.near },
      uOpenFar: { value: W.shellOpen.far },
      uOutside: { value: 1 },
      uNearDist: { value: PW.near.dist },
      uNearAlpha: { value: PW.near.alpha },
      uHemi: { value: new Vector4(W.brain.hemiX, W.brain.r[0], W.brain.r[1], W.brain.r[2]) },
      uFrameC: { value: frameC },
      uFrameO: { value: frameO },
      uWave: { value: waveU },
      uWaveC: { value: waveC },
      uWaveW: { value: W.waves.width },
      uWaveTrail: { value: W.waves.trail },
      uPathWave: { value: 0 },
      uPathT: { value: 0 },
      uPathSlot: { value: -1 },
      uPointer: { value: new Vector2(-9, -9) },
      uPointerOn: { value: 0 },
      uAspect: { value: 1.6 },
      uPRad: { value: W.pointer.radius },
      uPPush: { value: W.pointer.push },
      uPTint: { value: W.pointer.tint },
      uAnch: { value: anch },
    },
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  // ── the tunnel and the hall: their own point sets (same material), made when the camera comes near and freed when it
  // is far away. The brain is the current or a neighbouring place everywhere on the route, so it stays.
  type Chunk = { g: BufferGeometry; pts: Points; n: number };
  const makeChunk = (w: World): Chunk => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(w.pos, 3));
    g.setAttribute("aC", new BufferAttribute(w.col, 3));
    g.setAttribute("aD", new BufferAttribute(w.data, 4));
    g.setAttribute("aPath", new BufferAttribute(w.path, 1));
    g.setAttribute("aImg", new BufferAttribute(w.img, 1));
    const pts = new Points(g, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    return { g, pts, n: w.n };
  };
  const freeChunk = (c: Chunk | null) => {
    if (!c) return null;
    scene.remove(c.pts);
    c.g.dispose();
    return null;
  };
  let tunnel: Chunk | null = null;
  let hall: Chunk | null = null;
  let gallery: Chunk | null = null;
  let room: Chunk | null = null;
  let summit: Chunk | null = null;
  const hallF = hallFrames(samples);
  const galF = galleryFrames(samples);
  const roomF = roomFrames(samples);

  // ── the guide: a second small Points object, same renderer
  const ggeo = new BufferGeometry();
  ggeo.setAttribute("position", new BufferAttribute(guide.home, 3)); // bounds only; the shader places every point
  ggeo.setAttribute("aHome", new BufferAttribute(guide.home, 3));
  ggeo.setAttribute("aSeed", new BufferAttribute(guide.seed, 3));
  ggeo.setAttribute("aBird", new BufferAttribute(guide.bird, 3));
  ggeo.setAttribute("aStrip", new BufferAttribute(guide.strip, 3));
  ggeo.setAttribute("aMem", new BufferAttribute(guide.mem, 3));
  ggeo.setAttribute("aTint", new BufferAttribute(guide.tint, 3));
  ggeo.setAttribute("aG", new BufferAttribute(guide.data, 4));
  const gmat = new ShaderMaterial({
    vertexShader: GVERT,
    fragmentShader: FRAG,
    ...blend,
    uniforms: {
      ...common,
      uGPos: { value: new Vector3() },
      uGRot: { value: new Matrix3() },
      uGather: { value: 0 },
      uMorph: { value: 0 },
      uLift: { value: 0 },
      uStripK: { value: 0 },
      uMemK: { value: 0 },
      uTintK: { value: 0 },
      uIceK: { value: 0 },
      uLavK: { value: 0 },
      uRest: { value: 0 },
      cOff: { value: v3(P.offWhite) },
    },
  });
  const guidePts = new Points(ggeo, gmat);
  guidePts.frustumCulled = false;
  guidePts.renderOrder = 4;
  scene.add(guidePts);

  // ── sharp pictures: planes; textures are prepared ahead of need (decoded and uploaded while the visitor rests)
  const areaOf = Object.fromEntries(works.map((w) => [w.id, w.area]));
  const workImage = Object.fromEntries(works.map((w) => [w.id, w.image]));
  const orderIn: Record<string, number> = {};
  const planes = [...hallF, ...galF, ...roomF, ...world.frames].map((f) => {
    const area = areaOf[f.id];
    orderIn[area] = (orderIn[area] ?? -1) + 1;
    const m = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, depthTest: false, side: DoubleSide, toneMapped: false });
    const mesh = new Mesh(new PlaneGeometry(f.w, f.h), m);
    mesh.matrixAutoUpdate = false;
    mesh.renderOrder = 3;
    mesh.visible = false;
    mesh.userData = { id: f.id };
    scene.add(mesh);
    return {
      f,
      area,
      order: orderIn[area],
      mesh,
      mat: m,
      tex: null as Texture | null,
      state: "none" as "none" | "loading" | "ready" | "failed",
      center: v3(f.c),
      basis: new Matrix4().makeBasis(v3(f.right), v3(f.up), v3(f.normal)),
      off: new Vector3(),
      open: 1,
      line: 1,
      write: 1,
      fade: 0,
    };
  });
  // the far glow of the square cover: the one light the tunnel is seen by (a cheap additive plane, kept low)
  const f0 = hallF[0];
  const glowCol = new Vector3(0.45, 0.7, 0.8);
  // the real covers as sharp pictures: the first one where the tunnel ends (sharp for a moment at the arrival), then the
  // two others beside it, smaller: three squares. They go when the squares leave for the screens of the hall.
  const coverUp = v3(LY.axis.up);
  const coverN = v3(LY.axis.d).multiplyScalar(-1);
  const makeCover = (image: string, side: number, aspect: number, at: Vector3) => {
    const m = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false });
    const w = aspect >= 1 ? side : side * aspect;
    const h = aspect >= 1 ? side / aspect : side;
    const mesh = new Mesh(new PlaneGeometry(w, h), m);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.makeBasis(new Vector3(1, 0, 0), coverUp, coverN).setPosition(at);
    mesh.matrixWorldNeedsUpdate = true;
    mesh.renderOrder = 3;
    mesh.visible = false;
    scene.add(mesh);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (disposed) return;
      const tex = new Texture(img);
      tex.colorSpace = SRGBColorSpace;
      tex.needsUpdate = true;
      m.map = tex;
      m.needsUpdate = true;
      kick();
    };
    img.src = import.meta.env.BASE_URL + image;
    return { mesh, m };
  };
  const ogShot = new URLSearchParams(window.location.search).has("og");
  const coverC = v3(coverAt);
  const coverMain = makeCover(LY.cover.image, LY.cover.side, LY.cover.aspect, coverC);
  const coverOthers = LY.cover.others.map((c) => makeCover(c.image, c.side, c.aspect, coverC.clone().add(new Vector3(c.x, 0, 0)).addScaledVector(coverUp, c.y).addScaledVector(v3(LY.axis.d), c.back)));
  const glowMat = new ShaderMaterial({
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: { uCol: { value: glowCol }, uK: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "precision mediump float; varying vec2 vUv; uniform vec3 uCol; uniform float uK; void main() { vec2 p = abs(vUv - 0.5) * 2.0; float r = max(p.x, p.y); float g = smoothstep(1.0, 0.42, r); gl_FragColor = vec4(uCol * g * g * uK, 0.0); }",
  });
  const glow = new Mesh(new PlaneGeometry(LY.cover.side * 1.9, LY.cover.side * 1.9), glowMat);
  glow.matrixAutoUpdate = false;
  glow.matrix.makeBasis(new Vector3(1, 0, 0), v3(LY.axis.up), v3(LY.axis.d).multiplyScalar(-1)).setPosition(v3(coverAt));
  glow.matrixWorldNeedsUpdate = true;
  glow.renderOrder = 2;
  glow.visible = false;
  scene.add(glow);
  const maxSide = light ? 960 : 1280;
  const prepare = (p: (typeof planes)[number]) => {
    if (p.state !== "none") return;
    p.state = "loading";
    const img = new Image();
    img.decoding = "async";
    img.src = workImage[p.f.id];
    (img.decode ? img.decode() : new Promise<void>((res, rej) => ((img.onload = () => res()), (img.onerror = rej))))
      .then(() => {
        if (disposed) return;
        let source: HTMLImageElement | HTMLCanvasElement = img;
        const k = maxSide / Math.max(img.naturalWidth, img.naturalHeight);
        if (k < 1) {
          const c = document.createElement("canvas");
          c.width = Math.round(img.naturalWidth * k);
          c.height = Math.round(img.naturalHeight * k);
          c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
          source = c;
        }
        const tex = new Texture(source);
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        tex.needsUpdate = true;
        renderer.initTexture(tex); // upload now, not in the middle of a trip
        p.tex = tex;
        p.mat.map = tex;
        p.mat.needsUpdate = true;
        p.state = "ready";
        kick();
      })
      .catch(() => {
        p.state = "failed"; // the particles simply stay
      });
  };
  // one picture at a time, while the camera rests; the nearest places along the route first
  let prepTimer = 0;
  const stationOfArea = (a: string) => stations.find((x) => x.id === a)?.t ?? 0.5;
  const prepNext = () => {
    prepTimer = 0;
    if (disposed) return;
    // not in the first seconds, and not while the visitor is scrolling: uploads then would cost frames
    const moving = !!trip || Math.abs(sTarget - s) > 0.002 || hold || performance.now() - startedAt < 2000 || performance.now() - lastNav < 800;
    if (!moving) {
      const next = planes
        .filter((p) => p.state === "none")
        .sort((a, b) => Math.abs(stationOfArea(a.area) - s) - Math.abs(stationOfArea(b.area) - s) || a.order - b.order)[0];
      if (next) prepare(next);
      else return;
    }
    prepTimer = window.setTimeout(prepNext, moving ? 400 : 160);
  };

  // the one empty screen of 06: a surface of fine points of light with soft edges, facing the visitor (one cheap
  // additive plane). The colours of the streams arrive in its points and drift, then the points settle into an even
  // warm white; when the light turns to the visitor it gathers a little toward the middle. The pattern and the glow
  // only move light around: the average brightness stays that of a plain surface. The lower right, where the card
  // stands, stays a little lower.
  const screenMat = new ShaderMaterial({
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: { uK: { value: 0 }, uFill: { value: 0 }, uSettle: { value: 0 }, uGlow: { value: 0 }, uTime: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `precision mediump float;
      varying vec2 vUv;
      uniform float uK, uFill, uSettle, uGlow, uTime;
      float hash(vec2 c) { return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec2 p = abs(vUv - 0.5) * 2.0;
        vec2 e = smoothstep(vec2(1.0), vec2(0.7), p);
        float inside = e.x * e.y;
        float card = 1.0 - 0.45 * smoothstep(0.35, 0.8, vUv.x) * smoothstep(0.6, 0.2, vUv.y);
        float base = 0.07 * uK + uFill * card * (0.72 + 0.28 * (1.0 - max(p.x, p.y)));
        // points: a fine grid; until they settle each one drifts a little around its place and carries a colour
        vec2 g = vUv * vec2(150.0, 84.0);
        vec2 id = floor(g);
        float h = hash(id);
        float h2 = hash(id + 17.0);
        float loose = 1.0 - uSettle;
        vec2 off = 0.16 * (vec2(h, h2) - 0.5) + loose * 0.3 * vec2(sin(uTime * (0.7 + h) + h * 6.28), cos(uTime * (0.6 + h) + h * 9.1));
        float r = length(fract(g) - 0.5 - off);
        float w = fwidth(r) + 0.02;
        float dotv = 1.0 - smoothstep(0.3 - w, 0.3 + w, r);
        // part of the light gathers in the points, the rest stays between them; divided by the points' average cover
        // (pi * 0.3^2, a little more with the soft rim) so the average is unchanged
        float pts = 0.62 + 0.38 * (0.7 + 0.6 * h2) * dotv / (0.283 + 0.63 * w * w);
        // far away (a point smaller than a few pixels) the texture fades to a plain surface, so it never shimmers
        pts = mix(1.0, pts, smoothstep(0.4, 0.22, fwidth(g.x)));
        vec3 tint = h < 0.34 ? vec3(0.9, 0.93, 1.0) : h < 0.67 ? vec3(1.0, 0.8, 0.55) : vec3(0.78, 0.72, 1.0);
        vec3 col = mix(tint, vec3(1.0, 0.95, 0.88), uSettle);
        // the turn to the visitor: a soft gathering toward the middle, balanced (0.41: its average over the lit surface)
        // so the average stays the same
        vec2 q = (vUv - 0.5) * 2.0;
        float glow = 1.0 + uGlow * 0.14 * (exp(-dot(q, q) * 2.5) - 0.41) / 0.41;
        gl_FragColor = vec4(col * inside * base * pts * glow, 0.0);
      }`,
  });
  const screen = new Mesh(new PlaneGeometry(LY.screen.w * 1.16, LY.screen.h * 1.16), screenMat);
  {
    const c = v3(summitLook(LY.screen.dist));
    const n = v3(summitPos).sub(c).normalize();
    const rgt = new Vector3().crossVectors(new Vector3(0, 1, 0), n).normalize();
    const upv = new Vector3().crossVectors(n, rgt).normalize();
    screen.matrixAutoUpdate = false;
    screen.matrix.makeBasis(rgt, upv, n).setPosition(c);
    mat.uniforms.uScrC.value.copy(c);
    mat.uniforms.uScrR.value.copy(rgt);
    mat.uniforms.uScrU.value.copy(upv);
    screen.matrixWorldNeedsUpdate = true;
  }
  // 05: a very soft ice-blue dawn on the horizon behind the far brain (one wide additive gradient, no bloom)
  const dawnMat = new ShaderMaterial({
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: { uK: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "precision mediump float; varying vec2 vUv; uniform float uK; void main() { float h = 1.0 - vUv.y; float x = 1.0 - abs(vUv.x - 0.5) * 2.0; float g = pow(h, 2.0) * smoothstep(0.0, 0.7, x) * smoothstep(0.0, 0.3, vUv.y); gl_FragColor = vec4(vec3(0.42, 0.68, 1.0) * g * uK, 0.0); }",
  });
  const dawn = new Mesh(new PlaneGeometry(2600, 700), dawnMat);
  {
    const n = v3(summitPos).setY(0).normalize();
    const rgt = new Vector3().crossVectors(new Vector3(0, 1, 0), n).normalize();
    dawn.matrixAutoUpdate = false;
    dawn.matrix.makeBasis(rgt, new Vector3(0, 1, 0), n).setPosition(new Vector3(0, 330, 120));
    dawn.matrixWorldNeedsUpdate = true;
  }
  dawn.renderOrder = 1;
  dawn.visible = false;
  scene.add(dawn);
  screen.renderOrder = 2;
  screen.visible = false;
  scene.add(screen);

  // ── the route
  // Işık Yolu: the way in (a curve), the tunnel (the axis, eased), the hall (a slow arrival and a slower push), then a
  // cut through darkness to the places that are still inside the brain (knots 5..10 of `route`).
  const LT = LY.t;
  const posCurve = new CatmullRomCurve3(LY.entry.map((k) => v3(k.pos)), false, "centripetal");
  const tarCurve = new CatmullRomCurve3(LY.entry.map((k) => v3(k.target)), false, "centripetal");
  const entryT = [0, LT.swing, LT.fissure, LT.inside, LT.tunnel0];
  const afterPos = new CatmullRomCurve3(route.slice(7).map((k) => v3(k.pos)), false, "centripetal");
  const afterTar = new CatmullRomCurve3(route.slice(7).map((k) => v3(k.target)), false, "centripetal");
  const GA = LY.gallery;
  const galCam = (xc: number, pos: Vector3, look: Vector3) => {
    pos.set(...galAt(xc, 1.2, GA.dist));
    look.set(...galAt(xc, 0.6, 0));
  };
  const gp = new Vector3();
  const gq = new Vector3();
  const RO = LY.room;
  const roomCam = (th: number, pos: Vector3, look: Vector3) => {
    const tall = isPortrait();
    const d = tall ? RO.tall.dist : RO.dist;
    const y = tall ? -RO.tall.lift : 0;
    pos.set(...galAt(roomX() + Math.sin(th) * d, 1.2 + y, Math.cos(th) * d));
    look.set(...galAt(roomX(), 0.8 + y, 0));
  };
  const sumP = v3(summitPos);
  const sumL = v3(summitLook(400));
  const screenC = v3(summitLook(LY.screen.dist));
  const screenStop = v3(summitLook(LY.screen.dist - LY.screen.stop));
  /** After Voop: the truck goes on to Allesta (a small arc in its room), a crane up to the summit, a push in to the screen. */
  const tail = (x: number, pos: Vector3, look: Vector3) => {
    if (x <= LT.room) {
      const u = ease((x - LT.gal1) / (LT.room - LT.gal1));
      galCam(galX(5) - 3.5, pos, look);
      roomCam(RO.arc[0], gp, gq);
      pos.lerp(gp, u);
      look.lerp(gq, u);
    } else if (x <= LT.crane0) {
      roomCam(RO.arc[0] + (RO.arc[1] - RO.arc[0]) * sstep(LT.room, LY.after[1], x), pos, look);
    } else if (x <= LT.summit) {
      const u = ease((x - LT.crane0) / (LT.summit - LT.crane0));
      roomCam(RO.arc[1], pos, look);
      pos.lerp(sumP, u);
      look.lerp(sumL, Math.min(1, u * 1.25));
    } else {
      const u = ease(sstep(LT.push0, LT.final, x));
      pos.copy(sumP).lerp(screenStop, u);
      look.copy(sumL).lerp(screenC, Math.min(1, u * 1.5));
    }
  };
  const axP = v3(LY.axis.p);
  const axD = v3(LY.axis.d);
  const axU = v3(LY.axis.up);
  const cutMid = (LT.cut0 + LT.cut1) / 2;
  /** Curve parameter for route time x over knots at the times ts (the knots are not evenly spaced in time). */
  const pw = (x: number, ts: number[]) => {
    let i = 0;
    while (i < ts.length - 2 && x >= ts[i + 1]) i++;
    return clamp((i + (x - ts[i]) / (ts[i + 1] - ts[i])) / (ts.length - 1), 0, 1);
  };
  const first0 = v3(f0.c);
  const glowAt = v3(coverAt);
  const camAt = (x: number, pos: Vector3, look: Vector3) => {
    if (x <= LT.tunnel0) {
      const u = pw(x, entryT);
      posCurve.getPoint(u, pos);
      tarCurve.getPoint(u, look);
    } else if (x <= LT.tunnel1) {
      // little scroll, a long way: the camera gathers speed and slows down again before the hall
      const e = ease((x - LT.tunnel0) / (LT.tunnel1 - LT.tunnel0));
      pos.copy(axP).addScaledVector(axD, e * LY.mouth);
      look.copy(pos).addScaledVector(axD, 120);
    } else if (x < cutMid) {
      const a = sstep(LT.tunnel1, LT.hall, x);
      const afterHall = x > LT.hallEnd;
      const arrive = 1 - (1 - a) * (1 - a); // quick out of the tunnel, slow onto the viewing spot
      const b = sstep(LT.hall, LT.hallEnd, Math.min(x, LT.hallEnd));
      pos.copy(axP).addScaledVector(axD, LY.mouth + (LY.view - LY.mouth) * arrive + LY.push[0] * b);
      pos.x += LY.push[1] * b;
      pos.addScaledVector(axU, -1.2 * arrive + LY.push[2] * b);
      look.copy(pos).addScaledVector(axD, 120).lerp(first0, 0.2 * arrive);
      const up = 1 - sstep(LT.tunnel1 + 0.03, LT.hall, x);
      look.addScaledVector(axU, LY.hallMove.lookUp * up * sstep(LT.tunnel1, LT.tunnel1 + 0.03, x));
      pos.addScaledVector(axU, LY.hallMove.rise * up * sstep(LT.tunnel1, LT.tunnel1 + 0.03, x));
      if (afterHall) {
        // 02 -> 03: no cut. The camera comes DOWN from the hall to the row (the look tips down first), then trucks
        // SIDEWAYS along it; the row runs past a calm camera and ends at the large screen (Voop).
        if (x > LT.gal1) tail(x, pos, look);
        else if (x <= LT.gal0) {
          const u = (x - LT.hallEnd) / (LT.gal0 - LT.hallEnd);
          galCam(GA.startX, gp, gq);
          pos.lerp(gp, ease(u));
          look.lerp(gq, ease(Math.min(1, u * 1.35)));
        } else {
          const v = (x - LT.gal0) / (LT.gal1 - LT.gal0);
          const e = 1 - Math.pow(1 - Math.min(1, v), 1.7);
          galCam(GA.startX + (galX(5) - 3.5 - GA.startX) * e, pos, look);
        }
      }
    } else {
      const u = pw(x, LY.after);
      afterPos.getPoint(u, pos);
      afterTar.getPoint(u, look);
    }
  };
  const stopsT = [...stations.map((x) => x.t), ...calmStops].sort((a, b) => a - b);
  const tempo = makeTempo(W.tempo);
  /** Moves a route time by an even step of scrolling (the step is in scroll position). */
  const scrollBy = (t: number, step: number) => tempo.f(clamp(tempo.inv(t) + step, 0, 1));
  const T = stations.map((x) => x.t);
  const tOf = (id: StationId) => stations.find((x) => x.id === id)!.t;
  const tG = tOf("gorsel-hafiza");
  const tK = tOf("kurgu-masasi");
  const tD = tOf("deney-alani");
  const tF = tOf("birlikte-uretelim");
  const spots = stations.map((x) => v3(guideSpots[x.id]));
  // after a turn of the phone the page reloads with the hall laid out for the new shape; the journey goes on from here
  let s = 0;
  try {
    const kept = window.sessionStorage.getItem("zihnim-s");
    if (kept) {
      s = clamp(+kept || 0, 0, 1);
      window.sessionStorage.removeItem("zihnim-s");
    }
  } catch {
    /* no storage: the journey starts at the door */
  }
  let sTarget = s;
  let trip: Trip | null = null;
  let yaw = 0;
  let pitch = 0;
  let yawT = 0;
  let pitchT = 0;
  let paused = false;
  let hold = false;
  let calm = 0;
  let calmS = 0;
  let time = 0;
  let pathWave = 0;
  let pathT = 0;
  let pathSlot = -1;
  let pointerOn = 0;
  let lastPointerMove = 0;
  let disposed = false;
  let raf = 0;
  let last = 0;
  let width = 1;
  let height = 1;
  let level = 0;
  let ema = 16;
  let slowChecks = 0;
  const startedAt = performance.now();
  let frames = 0;
  let station: StationId | null = "genel";
  let lastProgress = -1;
  let lastProgressAt = 0;
  let firstInput = false;
  let moveK = 1;
  const lastCam = new Vector3();
  const first = () => {
    if (firstInput) return;
    firstInput = true;
    o.onFirstInput();
  };

  // quality: effects and points go first; the resolution only last, and never below a readable floor
  const Q = [
    { points: 1, waves: 3, res: 1 },
    { points: 0.75, waves: 3, res: 1 },
    { points: 0.55, waves: 2, res: 1 },
    { points: 0.4, waves: 2, res: 1, motion: 0.5 },
    { points: 0.4, waves: 1, res: 0.8, motion: 0 },
    // a device that is still slow here (no graphics chip, an old phone): fewer points and a lower resolution, the
    // forms still clear; only this step may go below the usual resolution floor
    { points: 0.28, waves: 1, res: 0.65, motion: 0, floor: 0.65 },
  ] as { points: number; waves: number; res: number; motion?: number; floor?: number }[];
  /** The size the lens was last set for; a small change of height alone keeps that lens (see resize). */
  let lensW = 0;
  let lensH = 0;
  const applyQuality = () => {
    const q = Q[level];
    const base = Math.min(window.devicePixelRatio || 1, light ? 1.5 : 1.75);
    const floor = q.floor ?? Math.max(0.9, base * 0.7);
    const dpr = Math.max(Math.min(floor, base), base * q.res);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    const sc = (lensH || height) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    for (const m of [mat, gmat]) {
      m.uniforms.uPR.value = dpr;
      m.uniforms.uScale.value = sc * (light ? 1.4 : 1);
    }
    // fewer points: each remaining point carries a little more light, so the forms keep their weight
    mat.uniforms.uExposure.value = PW.exposure * Math.pow(1 / q.points, 0.35);
    geo.setDrawRange(0, Math.round(world.n * q.points));
    for (const c of [tunnel, hall, gallery, room, summit]) if (c) c.g.setDrawRange(0, Math.round(c.n * q.points));
  };
  const resize = () => {
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    camera.aspect = width / height;
    if (width !== lensW || Math.abs(height - lensH) > lensH * 0.25) {
      lensW = width;
      lensH = height;
      // a narrow (portrait) screen gets a wider lens so the same part of the world fits across
      camera.fov = W.fov * clamp(1.35 / camera.aspect, 1, 1.55);
      camera.clearViewOffset();
      // a portrait screen sees the overview from higher up: the brain's length then runs up the screen and fills it
      const ov = camera.aspect < 0.8 ? W.overviewPortrait : LY.entry[0];
      posCurve.points[0].set(...ov.pos);
      tarCurve.points[0].set(...ov.target);
    } else {
      // only the height changed a little (a phone's address bar comes or goes at the bottom): the same lens, the view
      // held at the top, so the world keeps its size and place and only a strip at the bottom appears or goes
      camera.aspect = lensW / lensH;
      camera.setViewOffset(lensW, lensH, 0, 0, width, height);
    }
    camera.updateProjectionMatrix();
    mat.uniforms.uAspect.value = camera.aspect;
    applyQuality();
    kick();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // ── input: wheel, trackpad, drag, touch
  const stepTo = (dir: number) => {
    // "Hareketi azalt": the wheel goes from one station to the next, directly
    const idx = stopsT.reduce((best, t, k) => (Math.abs(t - s) < Math.abs(stopsT[best] - s) ? k : best), 0);
    const next = clamp(idx + dir, 0, stopsT.length - 1);
    s = sTarget = stopsT[next];
  };
  let reducedAcc = 0;
  /** Last wheel or touch travel (used only if snapping is switched on in the config). */
  let lastNav = 0;
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return; // pinch-zoom of a trackpad: leave it to the browser
    e.preventDefault();
    if (hold) return;
    first();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? height : 1;
    const dy = clamp(e.deltaY * unit, -W.wheel.maxStep, W.wheel.maxStep);
    if (reduced) {
      reducedAcc += dy;
      if (Math.abs(reducedAcc) > 120) {
        stepTo(Math.sign(reducedAcc));
        reducedAcc = 0;
      }
      kick();
      return;
    }
    if (trip) {
      sTarget = s; // the visitor takes over from where the camera is
      trip = null;
    }
    const gain = dy > 0 ? 1 + W.wheel.startGain * (1 - sstep(0, W.wheel.startReach, sTarget)) : 1;
    sTarget = scrollBy(sTarget, (dy * gain) / W.wheel.routePx);
    lastNav = performance.now();
    kick();
  };
  canvas.addEventListener("wheel", onWheel, { passive: false });
  // the labels float over the world: a wheel over them travels too (the card, menus and panels keep their own scroll)
  const labelLayer = canvas.parentElement?.querySelector<HTMLElement>(".zh-labels") ?? null;
  labelLayer?.addEventListener("wheel", onWheel, { passive: false });

  let dragging = false;
  let activeId = -1;
  let downX = 0;
  let downY = 0;
  let lastY = 0;
  let downYaw = 0;
  let downPitch = 0;
  let moved = 0;
  let isTouch = false;
  const soft = (x: number, lim: number) => lim * Math.tanh(x / lim);
  const onDown = (e: PointerEvent) => {
    if (e.button > 0 || dragging || hold) return;
    dragging = true;
    activeId = e.pointerId;
    isTouch = e.pointerType !== "mouse";
    moved = 0;
    downX = e.clientX;
    downY = lastY = e.clientY;
    downYaw = yawT;
    downPitch = pitchT;
    canvas.setPointerCapture(e.pointerId);
    kick();
  };
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const pick = (clientX: number, clientY: number) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(planes.filter((p) => p.mesh.visible && p.fade > 0.35).map((p) => p.mesh), false);
    return hits.length ? (hits[0].object.userData.id as string) : null;
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "mouse") {
      const r = canvas.getBoundingClientRect();
      mat.uniforms.uPointer.value.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
      lastPointerMove = performance.now();
      if (!dragging) canvas.style.cursor = pick(e.clientX, e.clientY) ? "pointer" : "";
      kick();
    }
    if (!dragging || e.pointerId !== activeId) return;
    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    moved = Math.max(moved, Math.hypot(dx, dy));
    if (moved > 6) first();
    if (isTouch) {
      // a phone: up/down travels the route, sideways looks around
      if (!reduced) {
        if (trip) {
          sTarget = s;
          trip = null;
        }
        sTarget = scrollBy(sTarget, -(e.clientY - lastY) / (height * W.touch.routeScreens));
        lastNav = performance.now();
      }
      lastY = e.clientY;
      yawT = soft(downYaw - (dx / width) * 1.6, W.look.yaw);
    } else {
      yawT = soft(downYaw - (dx / width) * 2.2, W.look.yaw);
      pitchT = soft(downPitch - (dy / height) * 1.4, W.look.pitch);
    }
    kick();
  };
  const onUp = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== activeId) return;
    dragging = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (moved < 6) {
      const id = pick(e.clientX, e.clientY);
      if (id) o.onPickWork(id);
    }
    if (isTouch) {
      yawT = 0; // a finger lets go: the view turns back softly
      if (reduced) {
        const dy = e.clientY - downY;
        if (Math.abs(dy) > 60) stepTo(dy < 0 ? 1 : -1);
      }
    }
    kick();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  // ── keyboard: arrows and PageUp / PageDown travel, Home / End go to the two ends (never while a panel, a menu's
  // sheet or the brief has the focus)
  const onKey = (e: KeyboardEvent) => {
    if (hold || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || canvas.classList.contains("is-blocked")) return;
    const el = e.target as HTMLElement | null;
    if (el && el.closest && el.closest('input, textarea, select, [role="dialog"], .vm-pop, .zh-works, [contenteditable]')) return;
    if (/^[0-6]$/.test(e.key)) {
      e.preventDefault();
      goTo(stations[+e.key].id);
      return;
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      goTo(e.key === "Home" ? "genel" : "birlikte-uretelim");
      return;
    }
    const step = ({ ArrowDown: 0.03, ArrowRight: 0.03, PageDown: 0.1, ArrowUp: -0.03, ArrowLeft: -0.03, PageUp: -0.1 } as Record<string, number>)[e.key];
    if (!step) return;
    e.preventDefault();
    first();
    if (reduced) {
      stepTo(Math.sign(step));
      kick();
      return;
    }
    if (trip) {
      sTarget = s;
      trip = null;
    }
    sTarget = scrollBy(sTarget, step);
    lastNav = performance.now();
    kick();
  };
  window.addEventListener("keydown", onKey);

  // ── trips started by a button: along the same route
  const goTo = (id: StationId) => {
    const st = stations.find((x) => x.id === id);
    if (!st) return;
    first();
    const area = readyAreas.find((a) => a.id === id);
    pathSlot = area && area.slot < 3 ? area.slot : -1;
    pathT = 0;
    if (reduced) {
      trip = null;
      s = sTarget = st.t;
    } else {
      const d = Math.abs(st.t - s);
      if (d < 0.0005) return;
      // a trip runs evenly in scroll position, so it lingers where the story does
      const wd = Math.abs(tempo.inv(st.t) - tempo.inv(s));
      trip = { from: tempo.inv(s), to: tempo.inv(st.t), t: 0, dur: clamp(W.trip.perRoute * Math.max(d, wd) * 1.6, W.trip.min, W.trip.max) };
    }
    yawT = 0;
    pitchT = 0;
    kick();
  };

  // ── light waves: each slot has its own period; a new cycle starts at another place of the world
  const origins: Vector3[] = [];
  for (let k = 0; k < world.n && origins.length < 64; k += 997) if (Math.round(world.data[k * 4 + 2]) === 0) origins.push(new Vector3(world.pos[k * 3], world.pos[k * 3 + 1], world.pos[k * 3 + 2]));
  const colorPool: V3[] = [];
  for (const [name, weight] of W.waves.colors) for (let k = 0; k < weight; k++) colorPool.push(P[name]);
  const waves: Wave[] = W.waves.periods.map((period, i) => ({ period, offset: i / W.waves.periods.length + 0.13 * i, cycle: -1, o: new Vector3(), c: new Vector3() }));
  /** A stronger wave at the place the visitor has just reached (slot 0), for a few seconds of world time. */
  let arrival: { o: Vector3; c: Vector3; t0: number } | null = null;
  const areaColor: Partial<Record<StationId, V3>> = { giris: P.ice, "gorsel-hafiza": P.teal, "kurgu-masasi": P.ice, "deney-alani": P.lavender, "birlikte-uretelim": P.teal };
  const updateWaves = () => {
    const nSlots = reduced ? 0 : Q[level].waves;
    waves.forEach((w, i) => {
      const x = time / w.period + w.offset;
      const cyc = Math.floor(x);
      const ph = x - cyc;
      if (cyc !== w.cycle) {
        w.cycle = cyc;
        w.o.copy(origins[Math.floor(hash(cyc * 7.13 + i * 31.7) * origins.length) % origins.length] ?? new Vector3());
        w.c.set(...colorPool[Math.floor(hash(cyc * 3.71 + i * 17.3) * colorPool.length) % colorPool.length]);
      }
      let o3 = w.o;
      let c3 = w.c;
      let r = W.waves.reach * ph;
      let k = i < nSlots ? W.waves.strength * Math.pow(Math.sin(Math.PI * ph), 0.8) : 0;
      if (i === 0 && arrival && nSlots > 0) {
        const a = (time - arrival.t0) / 7;
        if (a >= 1) arrival = null;
        else {
          o3 = arrival.o;
          c3 = arrival.c;
          r = W.waves.reach * 0.8 * a;
          k = W.waves.strength * W.waves.arrival * Math.pow(Math.sin(Math.PI * a), 0.7);
        }
      }
      waveU[i].set(o3.x, o3.y, o3.z, r);
      waveC[i].set(c3.x, c3.y, c3.z, k);
    });
  };

  // ── the story along the route: the moments of the places and the guide, all from `s`
  const gm = W.moments;
  const gorsel = planes.filter((p) => p.area === "gorsel-hafiza");
  const kurgu = planes.filter((p) => p.area === "kurgu-masasi");
  const deney = planes.filter((p) => p.area === "deney-alani");
  const tmpM = new Matrix4();
  const sc1 = new Vector3();
  const updateMoments = () => {
    // the hall opens: one light line after the other comes down, and each work is written where its line lands.
    const O = LY.opening;
    for (const p of gorsel) {
      const a = O.from + O.each * p.order;
      p.line = sstep(a, a + O.line, s);
      p.write = sstep(a + O.line * 0.8, a + O.line + O.write, s);
    }
    // 03: the video frames wait high up behind the works of the hall; one after the other they come forward into ONE
    // row. Once in the row they move a step at a time as the route moves (still frame -> moving frame); Voop comes to
    // rest as the large screen.
    for (const p of kurgu) {
      const i = p.order;
      const a = GA.gather[0] + GA.each * i;
      const k = ease(sstep(a, GA.gather[1] - GA.each * (5 - i), s));
      p.off.set(...galleryStart(i)).sub(p.center).multiplyScalar(1 - k);
      if (!reduced) {
        const rest = i === 5 ? 1 - sstep(LT.gal1 - 0.035, LT.gal1 - 0.004, s) : 1;
        const step = Math.round(Math.sin(s * GA.step.rate + i * 1.3)) * GA.step.amp * k * rest * sstep(LT.gal0 - 0.02, LT.gal0 + 0.01, s);
        p.off.addScaledVector(axU, step);
      }
    }
    // 04: behind the prism the one frame opens into the frames of its making, one after the other; at rest they
    // breathe a very little (not in the calm view)
    for (const p of deney) {
      const i = p.order;
      if (i === 0) {
        p.off.set(0, 0, 0);
        continue;
      }
      const a = RO.open[0] + 0.008 * i;
      const k = ease(sstep(a, RO.open[1] - 0.008 * (4 - i), s));
      p.off.copy(deney[0].center).sub(p.center).multiplyScalar(1 - k);
      if (!reduced) p.off.addScaledVector(axU, 0.14 * Math.sin(time * 0.6 + i * 1.9) * k);
    }
  };

  const gpos = new Vector3();
  const gahead = new Vector3();
  const gctrl = new Vector3();
  const gtan = new Vector3();
  const gRotM = new Matrix4();
  const updateGuide = () => {
    let k = 0;
    while (k < T.length - 2 && s >= T[k + 1]) k++;
    const p = clamp((s - T[k]) / (T[k + 1] - T[k]), 0, 1);
    // the guide runs ahead and waits at the next place: it has arrived when the visitor is `lead` of the way there
    const g = ease(sstep(0, k === 1 ? W.guide.leadTunnel : W.guide.lead, p));
    const A = spots[k];
    const B = spots[k + 1];
    gctrl.copy(A).add(B).multiplyScalar(0.5).add(new Vector3(0, 9, 0));
    const u = 1 - g;
    gpos.copy(A).multiplyScalar(u * u).addScaledVector(gctrl, 2 * u * g).addScaledVector(B, g * g);
    gtan.copy(gctrl).sub(A).multiplyScalar(2 * u).addScaledVector(B.clone().sub(gctrl), 2 * g);
    // in mid-flight it keeps to the visitor's view: pulled toward a point ahead of the camera (never at the ends)
    camera.getWorldDirection(gahead);
    // in the tunnel it flies a little ahead of the visitor, beside the beam, and points the way the light goes
    gahead.multiplyScalar(W.guide.ahead).add(camera.position).add(new Vector3(k === 1 ? -2.2 : 0, k === 1 ? -1.8 : 2.5, 0));
    const pull = k === 1 ? Math.min(1, 7 * Math.sin(Math.PI * g)) * 0.97 : 0;
    gpos.lerp(gahead, pull);
    if (k === 1) gtan.lerp(axD, Math.min(1, pull * 1.2));
    // seen from behind a level bird is only a line: in the tunnel its back is tipped toward the visitor
    const tip = 0;
    if (gtan.lengthSq() < 1e-6) gtan.set(0, 0, 1);
    gtan.normalize();
    const right = new Vector3().crossVectors(gtan, new Vector3(0, 1, 0));
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const up = new Vector3().crossVectors(right, gtan).normalize();
    if (tip > 0) {
      const fwd = gtan.clone().multiplyScalar(Math.cos(0.75 * tip)).addScaledVector(up, Math.sin(0.75 * tip)).normalize();
      up.crossVectors(right, fwd).normalize();
      gtan.copy(fwd);
    }
    gRotM.makeBasis(right, up, gtan);
    const gu = gmat.uniforms;
    gu.uGRot.value.setFromMatrix4(gRotM);
    gu.uGPos.value.copy(gpos);
    // a bird while it travels, a seed of light while it waits (at both ends)
    // a bird only in the passages (the way in, the tunnel); in the worlds it waits as a seed. Half way through the
    // tunnel it gathers into the seed for a moment. Wings follow the route position, never a clock.
    // No bird. The seed runs ahead in the beam; in the hall it opens and hands its light to the screens (its points
    // fly to where the light lines land) and gathers again before the journey goes on. All from the route position.
    const morph = sstep(LT.tunnel1 + 0.012, LT.hall - 0.02, s) * (1 - sstep(LT.hall + 0.04, LT.hallEnd, s));
    if (morph > 0.001) gRotM.identity();
    gu.uGRot.value.setFromMatrix4(gRotM);
    gu.uMorph.value = morph;
    gu.uLift.value = 0;
    gu.uGather.value = 1;
    gu.uStripK.value = 0;
    gu.uMemK.value = 0;
    gu.uTintK.value = sstep(tG - 0.01, tG + 0.035, s);
    gu.uIceK.value = sstep(tK, tK + 0.04, s);
    gu.uLavK.value = sstep(tD + 0.02, tD + 0.06, s);
    gu.uRest.value = sstep(tF - 0.03, tF, s);
    mat.uniforms.uFinal.value = sstep(tF - gm.final.from, tF, s);
  };

  // ── labels follow the places, without overlapping and never under the page's controls
  const tmp = new Vector3();
  let avoid: { l: number; r: number; t: number; b: number }[] | null = null;
  const anchors: [string, V3][] = [...readyAreas.map((a) => [a.id, a.anchor] as [string, V3]), ["core", W.core.c]];
  const placeLabels = () => {
    const els = o.labels();
    const list: { el: HTMLElement; x: number; y: number; ok: boolean }[] = [];
    anchors.forEach(([id, p], i) => {
      tmp.set(p[0], p[1], p[2]);
      const dist = tmp.distanceTo(camera.position);
      tmp.project(camera);
      if (i < anch.length) anch[i].set(tmp.x * 0.5 + 0.5, tmp.y * 0.5 + 0.5);
      const el = els[id];
      if (!el) return;
      // inside the brain only nearby places are named; at the final none (the composition speaks for itself)
      const outside = mat.uniforms.uOutside.value > 0.5;
      const ok =
        tmp.z < 1 && Math.abs(tmp.x) < 1.02 && Math.abs(tmp.y) < 1.02 && dist > 26 && dist < (outside ? 420 : 95) && !el.classList.contains("is-on") && s < tF - 0.04 && (id !== "birlikte-uretelim" || s < 0.08);
      list.push({ el, x: clamp((tmp.x * 0.5 + 0.5) * width, 70, width - 70), y: clamp((1 - (tmp.y * 0.5 + 0.5)) * height, 70, height - 90), ok });
    });
    const box = (l: { el: HTMLElement }) => ({ w: l.el.offsetWidth || 130, h: l.el.offsetHeight || 36 });
    if (frames % 20 === 1 || !avoid) {
      const host = canvas.parentElement;
      const cr = canvas.getBoundingClientRect();
      avoid = host
        ? Array.from(host.querySelectorAll<HTMLElement>(".zh-route-track, .zh-route i, .zh-route .is-on span, .zh-card, .zh-top nav, .zh-view, .zh-menu-btn, .zh-brand > *, .zh-hint")).map((e) => {
            const b = e.getBoundingClientRect();
            return { l: b.left - cr.left - 4, r: b.right - cr.left + 4, t: b.top - cr.top - 4, b: b.bottom - cr.top + 4 };
          })
        : [];
    }
    for (const l of list) {
      if (!l.ok) continue;
      const b = box(l);
      if (avoid.some((a) => l.x + b.w / 2 > a.l && l.x - b.w / 2 < a.r && l.y + b.h / 2 > a.t && l.y - b.h / 2 < a.b)) l.ok = false;
    }
    const vis = list.filter((l) => l.ok).sort((a, b) => a.y - b.y);
    for (let pass = 0; pass < 4; pass++) {
      let movedAny = false;
      for (let a = 1; a < vis.length; a++)
        for (let b = 0; b < a; b++) {
          const ba = box(vis[a]);
          const bb = box(vis[b]);
          if (Math.abs(vis[a].x - vis[b].x) < (ba.w + bb.w) / 2 + 6 && Math.abs(vis[a].y - vis[b].y) < (ba.h + bb.h) / 2 + 10) {
            vis[a].y = vis[b].y + (ba.h + bb.h) / 2 + 12;
            movedAny = true;
          }
        }
      if (!movedAny) break;
    }
    for (const l of list) {
      l.el.style.transform = `translate(${l.x.toFixed(1)}px, ${Math.min(l.y, height - 30).toFixed(1)}px) translate(-50%, -50%)`;
      l.el.style.opacity = l.ok ? "1" : "0";
      l.el.style.pointerEvents = l.ok ? "auto" : "none";
    }
  };

  // ── the loop
  const kick = () => {
    if (disposed || raf || document.hidden || hold) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const look = new Vector3();
  /** True while only the breathing of the world keeps the loop running (the camera and the route are still). */
  let idleOnly = false;
  /** A touch device (phone, tablet): only these slow down at rest; a desktop keeps its full rate. */
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const frame = (now: number) => {
    raf = 0;
    if (disposed || hold) return;
    // a phone at rest draws every other frame (about 30 per second); any movement brings the full rate back at once
    const still = idleOnly && !trip && !dragging && Math.abs(sTarget - s) <= 0.00002;
    if (touch && still && last && now - last < 30) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const raw = last ? Math.min(100, now - last) : 16;
    const dt = raw / 1000;
    last = now;
    frames++;
    // single hitches (a video starting, a texture upload) are clipped, so only a steadily slow device steps down;
    // the slower rest frames of a phone do not count
    if (!(touch && still)) ema += (Math.min(raw, 45) - ema) * 0.06;
    // adaptive quality: two slow checks in a row step down; after a step the average starts again
    const limit = light ? 30 : 24;
    if (frames > 24 && frames % 16 === 0) {
      slowChecks = ema > limit ? slowChecks + 1 : 0;
      if (slowChecks >= 2 && level < Q.length - 1) {
        level = Math.min(Q.length - 1, level + (ema > 40 ? 2 : 1));
        applyQuality();
        ema = limit;
        slowChecks = 0;
      }
    }
    calmS += (calm - calmS) * (1 - Math.exp(-dt * 3));
    const life = reduced || paused ? 0 : 1 - 0.8 * calmS;
    time += dt * life;
    for (const m of [mat, gmat]) {
      m.uniforms.uTime.value = time;
      m.uniforms.uLife.value = life;
    }

    // route position: a trip eases along the route; otherwise the position follows the wheel and settles quickly
    if (trip) {
      trip.t += dt / trip.dur;
      const k = clamp(trip.t, 0, 1);
      s = sTarget = tempo.f(trip.from + (trip.to - trip.from) * ease(k));
      pathT = clamp(k * 1.15, 0, 1.2);
      if (k >= 1) trip = null;
    } else {
      if (W.wheel.snapReach > 0 && lastNav && !dragging && now - lastNav > W.wheel.snapAfter) {
        const near = stations.find((st) => Math.abs(st.t - sTarget) < W.wheel.snapReach);
        if (near) sTarget = near.t;
        lastNav = 0;
      }
      s += (sTarget - s) * (1 - Math.exp(-dt * W.wheel.follow));
      if (Math.abs(sTarget - s) < 0.00002) s = sTarget;
    }
    let pathGoal = trip ? 1 : 0;
    if (!trip && !reduced && life > 0 && s < T[1] * 0.85) {
      pathSlot = -1;
      pathT = ((time % 6.5) / 6.5) * 1.5 - 0.15;
      pathGoal = 0.75 * (1 - s / (T[1] * 0.85));
    }
    // at the start, the light that keeps running along the way in is part of the world at rest, not a movement
    const invite = !trip && pathGoal > 0;
    pathWave += (pathGoal - pathWave) * (1 - Math.exp(-dt * (pathGoal ? 6 : 1.6)));
    mat.uniforms.uPathWave.value = pathWave;
    mat.uniforms.uPathT.value = pathT;
    mat.uniforms.uPathSlot.value = pathSlot;

    // camera on the route, plus the limited look-around
    const kd = 1 - Math.exp(-dt * (dragging ? 22 : W.look.damping));
    yaw += (yawT - yaw) * kd;
    pitch += (pitchT - pitch) * kd;
    camAt(s, camera.position, look);
    const v = look.clone().sub(camera.position);
    v.applyAxisAngle(new Vector3(0, 1, 0), yaw);
    const right = new Vector3().crossVectors(v, new Vector3(0, 1, 0)).normalize();
    v.applyAxisAngle(right, pitch);
    camera.lookAt(camera.position.clone().add(v));
    camera.updateMatrixWorld();
    // the local life calms while the camera travels, so the two motions do not add up
    const speed = frames > 1 ? camera.position.distanceTo(lastCam) / Math.max(dt, 0.001) : 0;
    lastCam.copy(camera.position);
    moveK += (1 - (1 - W.motion.whileMoving) * sstep(2, 24, speed) - moveK) * (1 - Math.exp(-dt * 4));
    mat.uniforms.uMove.value = moveK * (Q[level].motion ?? 1);
    {
      // 0 inside a lobe, 1 well outside: the far side of the shell dims only when seen from outside
      const c = camera.position;
      const e = Math.min(...[-1, 1].map((sx) => ((c.x - sx * W.brain.hemiX) / W.brain.r[0]) ** 2 + ((c.y + 4) / W.brain.r[1]) ** 2 + (c.z / W.brain.r[2]) ** 2));
      mat.uniforms.uOutside.value = sstep(1.0, 1.6, e);
    }

    // the light path: how much of the brain is left, how far the beam is open, the cut, and which point sets exist
    const inLight = s < cutMid;
    const brainK = inLight ? 1 - sstep(LY.dissolve[0], LY.dissolve[1], s) : 1;
    const cutK = sstep(0, (LT.cut1 - LT.cut0) / 2, Math.abs(s - cutMid));
    mat.uniforms.uBrain.value = brainK;
    mat.uniforms.uCut.value = cutK;
    mat.uniforms.uCamAx.value = camera.position.clone().sub(axP).dot(axD);
    mat.uniforms.uReach.value = 8 + (LY.axis.len + 400) * sstep(LT.fissure * 0.6, LT.tunnel0, s);
    const wantTunnel = frames > 3 && s < LT.hall + 0.06;
    const wantGallery = s > LT.tunnel1 && s < LT.crane0 + 0.03;
    if (wantGallery && !gallery) {
      gallery = makeChunk(buildGallery(light ? GA.count.light : GA.count.desktop, samples, galF));
      applyQuality();
    } else if (!wantGallery && gallery) gallery = freeChunk(gallery);
    if (gallery) gallery.pts.visible = inLight;
    mat.uniforms.uShutA.value = reduced ? 0 : GA.shutter.amp * sstep(GA.shutter.from, GA.shutter.to, s) * (1 - sstep(LT.gal0 - 0.02, LT.gal0 + 0.02, s));
    mat.uniforms.uShutP.value = s * GA.shutter.rate;
    // where the journey changes place without a flight, a soft veil of light covers the change (never a black cut)
    canvas.parentElement?.style.setProperty("--zh-veil", (0.22 * (1 - cutK)).toFixed(3));
    const wantHall = s > 0.015 && s < LT.room;
    const wantRoom = s > LT.gal0 && s < LT.summit + 0.02;
    const wantSummit = s > LT.room + 0.01;
    if (wantRoom && !room) {
      room = makeChunk(buildRoom(light ? RO.count.light : RO.count.desktop, samples, roomF));
      applyQuality();
    } else if (!wantRoom && room) room = freeChunk(room);
    if (wantSummit && !summit) {
      summit = makeChunk(buildSummit(light ? LY.summit.count.light : LY.summit.count.desktop, [
        { frames: hallF, color: P.offWhite },
        { frames: galF, color: [1, 0.8, 0.55] },
        { frames: roomF, color: P.lavender },
      ]));
      applyQuality();
    } else if (!wantSummit && summit) summit = freeChunk(summit);
    if (summit) summit.pts.visible = s > LT.crane0 + 0.006;
    // 06: one empty screen; its light comes up as the camera turns to it
    screen.visible = s > LT.summit - 0.01;
    screenMat.uniforms.uK.value = sstep(LT.summit, LY.screen.flow[0] + 0.01, s);
    screenMat.uniforms.uFill.value = LY.screen.light * sstep(LY.screen.turn[0], LY.screen.turn[1], s);
    screenMat.uniforms.uSettle.value = sstep(LY.screen.turn[0], LY.screen.turn[1] - 0.004, s);
    screenMat.uniforms.uGlow.value = sstep(LY.screen.turn[0] + 0.01, 1, s);
    screenMat.uniforms.uTime.value = time;
    mat.uniforms.uFlow.value = sstep(LY.screen.flow[0], LY.screen.flow[1], s);
    dawn.visible = s > LT.crane0;
    dawnMat.uniforms.uK.value = LY.summit.dawn * sstep(LT.crane0, LT.summit, s) * (1 - 0.5 * sstep(LY.screen.turn[0], 1, s));
    if (wantTunnel && !tunnel) {
      tunnel = makeChunk(buildTunnel(light ? LY.tunnel.count.light : LY.tunnel.count.desktop, coverS));
      applyQuality();
    } else if (!wantTunnel && tunnel) tunnel = freeChunk(tunnel);
    if (wantHall && !hall) {
      hall = makeChunk(buildHall(light ? LY.hall.count.light : LY.hall.count.desktop, samples, hallF, coverS));
      applyQuality();
    } else if (!wantHall && hall) hall = freeChunk(hall);
    if (tunnel) tunnel.pts.visible = inLight;
    if (hall) hall.pts.visible = inLight && s > LT.fissure;
    glow.visible = inLight && s > LT.fissure;
    const split = sstep(LY.cover.split[0], LY.cover.split[1], s);
    mat.uniforms.uSplit.value = split;
    const coverDist = camera.position.distanceTo(glowAt);
    glowMat.uniforms.uK.value = LY.cover.glow * (1 - split) * sstep(30, 200, coverDist) * cutK;
    const coverOn = inLight && s > LT.fissure ? 1 - sstep(LY.cover.split[0], LY.cover.split[0] + 0.014, s) : 0;
    coverMain.m.opacity = coverMain.m.map ? sstep(LY.cover.sharp[0], LY.cover.sharp[1], coverDist) * coverOn : 0;
    coverMain.mesh.visible = coverMain.m.opacity > 0.004;
    for (const c of coverOthers) {
      // ?og: the picture for sharing is taken with the first cover alone
      c.m.opacity = c.m.map && !ogShot ? sstep(LY.cover.join[0], LY.cover.join[1], s) * coverOn : 0;
      c.mesh.visible = c.m.opacity > 0.004;
    }
    points.visible = brainK > 0.001;

    updateMoments();
    updateGuide();
    updateWaves();

    // pictures: prepared ahead; near enough, they hand over from particles to the sharp picture
    let fadeBusy = false;
    // while moving, only a picture about to be shown is prepared (one per frame); the rest waits for a pause
    const movingNow = !!trip || Math.abs(sTarget - s) > 0.002;
    let preparedNow = false;
    for (const p of planes) {
      const c = p.center.clone().add(p.off);
      const d = camera.position.distanceTo(c);
      if (p.state === "none" && !preparedNow && d < (movingNow ? W.picture.far : W.picture.load)) {
        prepare(p);
        preparedNow = true;
      }
      const isHall = p.area === "gorsel-hafiza";
      const isGal = p.area === "kurgu-masasi";
      // at the summit (05) the screens of 04 are gone: only the land below and the quote
      const summitK = 1 - sstep(LY.after[1] + 0.02, LY.after[2] - 0.012, s);
      const isRoom = p.area === "deney-alani";
      const leave = 1 - sstep(LT.crane0 + 0.006, LT.crane0 + 0.03, s); // from the summit only the silhouettes are left
      const shown = isHall ? (inLight ? sstep(0.85, 1, p.write) * leave : 0) : isGal ? (s > LT.tunnel1 ? leave : 0) : isRoom ? (s > LT.gal1 - 0.02 ? leave : 0) : brainK * cutK * summitK;
      const target = p.state === "ready" ? (isHall || isGal || isRoom ? sstep(LY.sharp.far, LY.sharp.near, d) : sstep(W.picture.far, W.picture.near, d)) * shown : 0;
      p.fade += (target - p.fade) * (1 - Math.exp(-dt * 6));
      if (Math.abs(target - p.fade) > 0.004) fadeBusy = true;
      p.mat.opacity = p.fade;
      p.mat.color.setScalar(W.picture.dim + (1 - W.picture.dim) * sstep(W.picture.dimFar, W.picture.dimNear, d));
      p.mesh.visible = p.fade > 0.005;
      if (p.mesh.visible) {
        tmpM.copy(p.basis).scale(sc1.set(1, Math.max(0.001, p.open), 1)).setPosition(c);
        p.mesh.matrix.copy(tmpM);
        p.mesh.matrixWorldNeedsUpdate = true;
      }
      if (p.f.img < MAX_FRAMES) {
        frameC[p.f.img].set(p.f.c[0], p.f.c[1], p.f.c[2], p.fade);
        frameO[p.f.img].set(p.off.x, p.off.y, p.off.z, isHall ? p.write : 1);
        lineU[p.f.img] = p.line;
      }
    }

    const wantPointer = !reduced && !dragging && calmS < 0.3 && level < 3 && performance.now() - lastPointerMove < 900 ? 1 : 0;
    pointerOn += (wantPointer - pointerOn) * (1 - Math.exp(-dt * (wantPointer ? 10 : 4)));
    mat.uniforms.uPointerOn.value = pointerOn;

    placeLabels();
    renderer.render(scene, camera);

    // stations and progress for the page
    const settled = !trip && Math.abs(sTarget - s) < 0.003;
    const near = stations.find((st) => Math.abs(st.t - s) < W.stationReach);
    // the quote (05) and the final (06) stay on screen while the visitor scrolls slowly through them
    const nowStation = near && (settled || near.id === "zirve" || near.id === "birlikte-uretelim") ? near.id : null;
    if (nowStation !== station) {
      station = nowStation;
      if (station && areaColor[station] && !reduced) {
        const spot = guideSpots[station];
        arrival = { o: v3(station === "giris" ? W.core.c : spot), c: v3(areaColor[station]!), t0: time };
      }
      o.onStation(station);
    }
    if (Math.abs(s - lastProgress) > 0.002 && now - lastProgressAt > 80) {
      lastProgress = s;
      lastProgressAt = now;
      o.onProgress(s);
    }
    canvas.dataset.s = s.toFixed(4);
    canvas.dataset.cam = camera.position.toArray().map((x) => x.toFixed(2)).join(",");
    canvas.dataset.frames = String(frames);
    canvas.dataset.q = String(level);
    canvas.dataset.station = station ?? "";
    canvas.dataset.sharp = String(planes.filter((p) => p.fade > 0.9).length);
    canvas.dataset.guide = gpos.toArray().map((x) => x.toFixed(1)).join(",");
    canvas.dataset.morph = gmat.uniforms.uMorph.value.toFixed(2);
    canvas.dataset.time = time.toFixed(2);
    canvas.dataset.sets = `brain${tunnel ? "+tunnel" : ""}${hall ? "+hall" : ""}${gallery ? "+gallery" : ""}${room ? "+room" : ""}${summit ? "+summit" : ""}`;
    canvas.dataset.points = String(world.n + (tunnel?.n ?? 0) + (hall?.n ?? 0) + (gallery?.n ?? 0) + (room?.n ?? 0) + (summit?.n ?? 0));

    const moving =
      trip ||
      dragging ||
      Math.abs(sTarget - s) > 0.00002 ||
      (pathWave > 0.01 && !invite) ||
      pointerOn > 0.01 ||
      Math.abs(yaw - yawT) > 0.0005 ||
      Math.abs(pitch - pitchT) > 0.0005 ||
      Math.abs(calmS - calm) > 0.01 ||
      fadeBusy;
    // with a work open (calm = 1) the world settles and then stops drawing until the panel closes
    const breathing = life > 0 && calm < 1;
    const busy = moving || breathing;
    idleOnly = !moving && breathing;
    if (busy && !document.hidden) raf = requestAnimationFrame(frame);
    else {
      last = 0;
      o.onProgress(s);
    }
    if (!prepTimer && planes.some((p) => p.state === "none")) prepTimer = window.setTimeout(prepNext, 600);
  };
  const onVis = () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else kick();
  };
  document.addEventListener("visibilitychange", onVis);
  canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());

  resize();
  kick();

  return {
    goTo,
    setPaused(p) {
      paused = p;
      reduced = o.reduced || p;
      if (reduced) {
        // cuts, not flights: the camera goes to the nearest stop and stays on stops from now on
        trip = null;
        s = sTarget = stopsT.reduce((best, t) => (Math.abs(t - s) < Math.abs(best - s) ? t : best), stopsT[0]);
      }
      kick();
    },
    setCalm(c) {
      calm = clamp(c, 0, 1);
      kick();
    },
    swipeBy(dy) {
      if (hold || reduced) return;
      if (trip) {
        sTarget = s;
        trip = null;
      }
      sTarget = scrollBy(sTarget, -dy / (height * W.touch.routeScreens));
      lastNav = performance.now();
      first();
      kick();
    },
    swipeEnd(total) {
      if (hold) return;
      if (reduced && Math.abs(total) > 60) stepTo(total < 0 ? 1 : -1);
      kick();
    },
    setHold(h) {
      hold = h;
      if (h) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        dragging = false;
      } else kick();
    },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (prepTimer) window.clearTimeout(prepTimer);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keydown", onKey);
      freeChunk(tunnel);
      freeChunk(hall);
      freeChunk(gallery);
      freeChunk(room);
      freeChunk(summit);
      dawn.geometry.dispose();
      dawnMat.dispose();
      screen.geometry.dispose();
      screenMat.dispose();
      for (const c of [coverMain, ...coverOthers]) {
        c.mesh.geometry.dispose();
        c.m.map?.dispose();
        c.m.dispose();
      }
      glow.geometry.dispose();
      glowMat.dispose();
      canvas.removeEventListener("wheel", onWheel);
      labelLayer?.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      for (const p of planes) {
        p.mesh.geometry.dispose();
        p.mat.dispose();
        p.tex?.dispose();
      }
      geo.dispose();
      mat.dispose();
      ggeo.dispose();
      gmat.dispose();
      renderer.dispose();
    },
  };
}
