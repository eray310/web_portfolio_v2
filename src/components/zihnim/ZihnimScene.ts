/**
 * The 3D world of /zihnim: ONE WebGL renderer and canvas.
 *
 * - All points (worldGeometry.ts) are drawn on the GPU in one call. Each point has its own colour; the vertex shader
 *   adds the slow life of each place (hanging frames sway, the film strip's light runs along it, the membranes of
 *   the Deney Alanı roll), opens the shell around the camera, and hands real pictures over from particles to
 *   sharp textured planes as the camera comes close (the planes load only when the camera is near).
 * - The camera lives on ONE route (zihnimWorld.ts `route`): the wheel (and trackpad), a vertical drag on a phone and
 *   the place buttons all move the same route position `s` (0..1). A button starts a trip along the route; any wheel
 *   or drag input takes over at once from where the camera is. Dragging with a mouse turns the view a little.
 * - It draws only while something changes, never while the tab is hidden; `dispose()` removes everything.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Raycaster,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import { readyAreas, route, stations, worldConfig as W, works, type StationId, type V3 } from "./zihnimWorld";
import { buildWorld, sampleImage, type Samples } from "./worldGeometry";

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
  dispose: () => void;
};

const MAX_IMG = 32;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep
const sstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const v3 = (a: V3) => new Vector3(a[0], a[1], a[2]);

const VERT = /* glsl */ `
  attribute vec3 aC;
  attribute vec4 aD;
  attribute float aPath;
  attribute float aImg;
  uniform float uTime, uScale, uPR, uMaxPx, uLife, uWaveT, uWaveOn, uWaveSlot;
  uniform float uOpenNear, uOpenFar, uOutside;
  uniform vec4 uHemi;
  uniform float uImgFade[${MAX_IMG}];
  uniform vec2 uPointer;
  uniform float uPointerOn, uAspect, uPRad, uPPush, uPTint;
  uniform vec2 uAnch[4];
  uniform vec3 cTeal, cIce;
  varying vec4 vCol;
  void main() {
    float seed = aD.x;
    float sz = aD.y;
    float kind = aD.z;
    float t = aD.w;
    vec3 p = position;
    vec3 col = aC;
    // the slow life of each place (only where it belongs)
    if (kind > 1.5 && kind < 2.5) p.x += sin(uTime * 0.45 + p.y * 0.04 + p.z * 0.03) * 0.18 * uLife;
    if (kind > 3.5 && kind < 4.5 && aImg < -0.5) p.y += sin(uTime * 0.7 + p.x * 0.11 + p.z * 0.07) * 1.1 * uLife;
    if (kind > 0.5 && kind < 1.5) p += normalize(p - vec3(0.0, 8.0, 0.0) + 0.001) * sin(uTime * 1.2 + seed * 6.28) * 0.12 * uLife;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    float dist = -mv.z;
    vec2 uv = clip.xy / max(clip.w, 0.0001) * 0.5 + 0.5;

    // pointer: a small local opening, never around the places' labels
    vec2 d = (uv - uPointer) * vec2(uAspect, 1.0);
    float infl = (1.0 - smoothstep(0.0, uPRad, length(d))) * uPointerOn;
    for (int i = 0; i < 4; i++) infl *= smoothstep(0.035, 0.11, length((uv - uAnch[i]) * vec2(uAspect, 1.0)));
    clip.xy += normalize(d + vec2(0.0001)) * infl * uPPush * clip.w;
    gl_Position = clip;

    float baseA = kind < 0.5 ? 0.62 : kind < 1.5 ? 0.9 : kind < 4.5 ? 0.9 : kind < 5.5 ? 0.75 : kind < 6.5 ? 0.45 : 0.4;
    float alpha = baseA * smoothstep(2.5, 8.0, dist);
    // the shell, the tracts and the inner dust open around the camera (a corridor of view)
    if (kind < 0.5 || kind > 5.5) alpha *= smoothstep(uOpenNear, uOpenFar, dist);
    // seen from outside, the far side of each lobe stays dim: the near surface (and its folds) reads as a volume
    if (kind < 0.5 && uOutside > 0.001) {
      float sx = p.x < 0.0 ? -1.0 : 1.0;
      vec3 q = p - vec3(sx * uHemi.x, -4.0, 0.0);
      vec3 n = normalize(q / (uHemi.yzw * uHemi.yzw));
      float facing = dot(n, normalize(cameraPosition - p));
      alpha *= mix(1.0, mix(0.16, 1.0, smoothstep(-0.25, 0.35, facing)), uOutside);
    }
    // a real picture hands over from particles to the sharp plane
    if (aImg > -0.5) {
      float f = 0.0;
      for (int i = 0; i < ${MAX_IMG}; i++) if (abs(aImg - float(i)) < 0.5) f = uImgFade[i];
      alpha *= 1.0 - 0.92 * f;
    }
    // the film strip: light runs slowly along it
    if (kind > 2.5 && kind < 3.5 && aImg < -0.5) col *= 1.0 + 0.6 * exp(-pow((fract(t * 3.0 - uTime * 0.04) - 0.5) * 8.0, 2.0)) * uLife;
    // a trip: a wave runs from the core along the path to the place
    if (kind > 4.5 && kind < 5.5) {
      float on = (1.0 - step(0.5, abs(aPath - uWaveSlot))) * uWaveOn;
      float dl = t - uWaveT;
      float w = max(exp(-(dl * dl) / 0.01), dl < 0.0 ? 0.5 * exp(dl / 0.12) : 0.0) * on;
      col = mix(col, mix(cTeal, cIce, 0.3) * 1.2, clamp(w, 0.0, 1.0));
      alpha *= 1.0 + 0.8 * w;
    }
    col = mix(col, cTeal, clamp(infl * uPTint, 0.0, 0.6));
    vCol = vec4(col, alpha);
    gl_PointSize = clamp(sz * uScale * uPR / max(dist, 0.001), 1.1 * uPR, uMaxPx * uPR);
  }
`;
const FRAG = /* glsl */ `
  precision mediump float;
  varying vec4 vCol;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = (1.0 - smoothstep(0.62, 1.0, d)) * vCol.a;
    gl_FragColor = vec4(vCol.rgb * a, a);
  }
`;

type Trip = { from: number; to: number; t: number; dur: number };

export async function createScene(o: SceneOptions): Promise<SceneApi> {
  const { canvas, light, reduced } = o;

  // the pictures become particles; each picture is read once into a small grid
  const samples: Record<string, Samples | null> = {};
  await Promise.all(works.map(async (w) => (samples[w.id] = await sampleImage(w.image))));
  if (!o.alive()) throw new Error("cancelled");
  const world = buildWorld(light ? W.count.light : W.count.desktop, samples);

  const attrs: WebGLContextAttributes = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: light ? "low-power" : "default" };
  const gl = (canvas.getContext("webgl2", attrs) || canvas.getContext("webgl", attrs)) as WebGLRenderingContext | null;
  if (!gl) throw new Error("no WebGL");
  const renderer = new WebGLRenderer({ canvas, context: gl, antialias: false, alpha: false });
  renderer.setClearColor(W.ground, 1);
  const scene = new Scene();
  const camera = new PerspectiveCamera(W.fov, 1, 0.5, 1400);

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(world.pos, 3));
  geo.setAttribute("aC", new BufferAttribute(world.col, 3));
  geo.setAttribute("aD", new BufferAttribute(world.data, 4));
  geo.setAttribute("aPath", new BufferAttribute(world.path, 1));
  geo.setAttribute("aImg", new BufferAttribute(world.img, 1));
  const anch = [0, 1, 2, 3].map(() => new Vector2(-9, -9));
  const fades = new Array(MAX_IMG).fill(0);
  const P = W.palette;
  const mat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 600 },
      uPR: { value: 1 },
      uMaxPx: { value: 6.5 },
      uOutside: { value: 1 },
      uHemi: { value: new Vector4(W.brain.hemiX, W.brain.r[0], W.brain.r[1], W.brain.r[2]) },
      uLife: { value: 1 },
      uWaveT: { value: 0 },
      uWaveOn: { value: 0 },
      uWaveSlot: { value: -1 },
      uOpenNear: { value: W.shellOpen.near },
      uOpenFar: { value: W.shellOpen.far },
      uImgFade: { value: fades },
      uPointer: { value: new Vector2(-9, -9) },
      uPointerOn: { value: 0 },
      uAspect: { value: 1.6 },
      uPRad: { value: W.pointer.radius },
      uPPush: { value: W.pointer.push },
      uPTint: { value: W.pointer.tint },
      uAnch: { value: anch },
      cTeal: { value: v3(P.teal) },
      cIce: { value: v3(P.ice) },
    },
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  // sharp pictures: planes that load their texture only when the camera comes near
  const loader = new TextureLoader();
  const planes = world.frames.map((f) => {
    const m = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, depthTest: false, side: DoubleSide, toneMapped: false });
    const mesh = new Mesh(new PlaneGeometry(f.w, f.h), m);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(new Matrix4().makeBasis(v3(f.right), v3(f.up), v3(f.normal)).setPosition(v3(f.c)));
    mesh.matrixWorldNeedsUpdate = true;
    mesh.renderOrder = 3;
    mesh.visible = false;
    mesh.userData = { id: f.id };
    scene.add(mesh);
    return { f, mesh, mat: m, tex: null as Texture | null, loading: false, center: v3(f.c), fade: 0 };
  });
  const workImage = Object.fromEntries(works.map((w) => [w.id, w.image]));

  // ── the route
  const posCurve = new CatmullRomCurve3(route.map((k) => v3(k.pos)), false, "centripetal");
  const tarCurve = new CatmullRomCurve3(route.map((k) => v3(k.target)), false, "centripetal");
  let s = 0;
  let sTarget = 0;
  let trip: Trip | null = null;
  let yaw = 0;
  let pitch = 0;
  let yawT = 0;
  let pitchT = 0;
  let paused = false;
  let calm = 0;
  let calmS = 0;
  let time = 0;
  let waveOn = 0;
  let waveT = 0;
  let waveSlot = -1;
  let pointerOn = 0;
  let lastPointerMove = 0;
  let disposed = false;
  let raf = 0;
  let last = 0;
  let width = 1;
  let height = 1;
  let level = 0;
  let resScale = 1;
  let ema = 16;
  let frames = 0;
  let station: StationId | null = "genel";
  let lastProgress = -1;
  let lastProgressAt = 0;
  let firstInput = false;
  const first = () => {
    if (firstInput) return;
    firstInput = true;
    o.onFirstInput();
  };

  const applyQuality = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, (light ? 1.3 : 1.75) * resScale);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    mat.uniforms.uPR.value = dpr;
    // fewer points on a phone: each one is drawn a little larger so the surfaces keep their density
    mat.uniforms.uScale.value = (height / (2 * Math.tan((camera.fov * Math.PI) / 360))) * (light ? 1.55 : 1);
    geo.setDrawRange(0, Math.round(world.n * [1, 0.72, 0.5, 0.36][level]));
  };
  const resize = () => {
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    camera.aspect = width / height;
    // a narrow (portrait) screen gets a wider lens so the same part of the world fits across
    camera.fov = W.fov * clamp(1.35 / camera.aspect, 1, 1.55);
    // a portrait screen sees the overview from higher up: the brain's length then runs up the screen and fills it
    const ov = camera.aspect < 0.8 ? W.overviewPortrait : route[0];
    posCurve.points[0].set(...ov.pos);
    tarCurve.points[0].set(...ov.target);
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
    const idx = stations.reduce((best, st, k) => (Math.abs(st.t - s) < Math.abs(stations[best].t - s) ? k : best), 0);
    const next = clamp(idx + dir, 0, stations.length - 1);
    s = sTarget = stations[next].t;
  };
  let reducedAcc = 0;
  /** Last wheel or touch travel: when it stops close to a station, the camera settles exactly on it. */
  let lastNav = 0;
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return; // pinch-zoom of a trackpad: leave it to the browser
    e.preventDefault();
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
    sTarget = clamp(sTarget + dy / W.wheel.routePx, 0, 1);
    lastNav = performance.now();
    kick();
  };
  canvas.addEventListener("wheel", onWheel, { passive: false });

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
    if (e.button > 0 || dragging) return;
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
        sTarget = clamp(sTarget - (e.clientY - lastY) / (height * W.touch.routeScreens), 0, 1);
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

  // ── trips started by a button
  const goTo = (id: StationId) => {
    const st = stations.find((x) => x.id === id);
    if (!st) return;
    first();
    const area = readyAreas.find((a) => a.id === id);
    waveSlot = area ? area.slot : -1;
    waveT = 0;
    if (reduced) {
      trip = null;
      s = sTarget = st.t;
    } else {
      const d = Math.abs(st.t - s);
      if (d < 0.0005) return;
      trip = { from: s, to: st.t, t: 0, dur: clamp(W.trip.perRoute * d * 1.6, W.trip.min, W.trip.max) };
    }
    yawT = 0;
    pitchT = 0;
    kick();
  };

  // ── labels follow the places, without overlapping
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
      anch[i].set(tmp.x * 0.5 + 0.5, tmp.y * 0.5 + 0.5);
      const el = els[id];
      if (!el) return;
      const ok = tmp.z < 1 && Math.abs(tmp.x) < 1.02 && Math.abs(tmp.y) < 1.02 && dist > 26 && dist < 420;
      list.push({ el, x: clamp((tmp.x * 0.5 + 0.5) * width, 70, width - 70), y: clamp((1 - (tmp.y * 0.5 + 0.5)) * height, 70, height - 90), ok });
    });
    const box = (l: { el: HTMLElement }) => ({ w: l.el.offsetWidth || 130, h: l.el.offsetHeight || 36 });
    // never under the page's own controls (route, card, top bar): such a label hides; the buttons stay
    if (frames % 20 === 1 || !avoid) {
      const host = canvas.parentElement;
      const cr = canvas.getBoundingClientRect();
      avoid = host
        ? Array.from(host.querySelectorAll<HTMLElement>(".zh-route-track, .zh-route i, .zh-route .is-on span, .zh-card, .zh-top nav, .zh-motion, .zh-menu-btn, .zh-brand > *, .zh-hint")).map((e) => {
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
    if (disposed || raf || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const look = new Vector3();
  const frame = (now: number) => {
    raf = 0;
    if (disposed) return;
    const raw = last ? Math.min(100, now - last) : 16;
    const dt = raw / 1000;
    last = now;
    frames++;
    ema += (raw - ema) * 0.06;
    // adaptive quality: a slow device steps down within a few seconds (resolution first, then fewer points);
    // a very slow one drops both at once. After a step the average starts again from the limit.
    const limit = light ? 30 : 24;
    if (frames > 24 && frames % 16 === 0 && ema > limit && (resScale > 0.66 || level < 3)) {
      if (ema > limit * 2) {
        resScale = Math.max(0.65, resScale - 0.2);
        level = Math.min(3, level + 1);
      } else if (resScale > 0.7) resScale = Math.max(0.65, resScale - 0.12);
      else level = Math.min(3, level + 1);
      applyQuality();
      ema = limit;
    }
    calmS += (calm - calmS) * (1 - Math.exp(-dt * 3));
    const life = reduced || paused ? 0 : 1 - 0.8 * calmS;
    time += dt * life * W.ambient.speed;
    mat.uniforms.uTime.value = time;
    mat.uniforms.uLife.value = life;

    // route position: a trip eases along the route; otherwise the position follows the wheel and settles quickly
    if (trip) {
      trip.t += dt / trip.dur;
      const k = clamp(trip.t, 0, 1);
      s = sTarget = trip.from + (trip.to - trip.from) * ease(k);
      waveT = clamp(k * 1.15, 0, 1.2);
      if (k >= 1) trip = null;
    } else {
      if (lastNav && !dragging && now - lastNav > W.wheel.snapAfter) {
        const near = stations.find((st) => Math.abs(st.t - sTarget) < W.wheel.snapReach);
        if (near) sTarget = near.t;
        lastNav = 0;
      }
      s += (sTarget - s) * (1 - Math.exp(-dt * W.wheel.follow));
      if (Math.abs(sTarget - s) < 0.00002) s = sTarget;
    }
    const waveGoal = trip ? 1 : 0;
    waveOn += (waveGoal - waveOn) * (1 - Math.exp(-dt * (waveGoal ? 6 : 1.6)));
    mat.uniforms.uWaveOn.value = waveOn;
    mat.uniforms.uWaveT.value = waveT;
    mat.uniforms.uWaveSlot.value = waveSlot;

    // camera on the route, plus the limited look-around
    const kd = 1 - Math.exp(-dt * (dragging ? 22 : W.look.damping));
    yaw += (yawT - yaw) * kd;
    pitch += (pitchT - pitch) * kd;
    posCurve.getPoint(s, camera.position);
    tarCurve.getPoint(s, look);
    const v = look.clone().sub(camera.position);
    v.applyAxisAngle(new Vector3(0, 1, 0), yaw);
    const right = new Vector3().crossVectors(v, new Vector3(0, 1, 0)).normalize();
    v.applyAxisAngle(right, pitch);
    camera.lookAt(camera.position.clone().add(v));
    camera.updateMatrixWorld();
    {
      // 0 inside a lobe, 1 well outside: the far side of the shell dims only when seen from outside
      const c = camera.position;
      const e = Math.min(
        ...[-1, 1].map((sx) => ((c.x - sx * W.brain.hemiX) / W.brain.r[0]) ** 2 + ((c.y + 4) / W.brain.r[1]) ** 2 + (c.z / W.brain.r[2]) ** 2)
      );
      mat.uniforms.uOutside.value = sstep(1.0, 1.6, e);
    }

    // pictures: load when near, fade from particles to the sharp picture when closer
    let fadeBusy = false;
    for (const p of planes) {
      const d = camera.position.distanceTo(p.center);
      if (!p.tex && !p.loading && d < W.picture.load) {
        p.loading = true;
        loader.load(
          workImage[p.f.id],
          (tex) => {
            tex.colorSpace = SRGBColorSpace;
            tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
            p.tex = tex;
            p.mat.map = tex;
            p.mat.needsUpdate = true;
            kick();
          },
          undefined,
          () => {
            /* the particles simply stay */
          }
        );
      }
      const target = p.tex ? sstep(W.picture.far, W.picture.near, d) : 0;
      p.fade += (target - p.fade) * (1 - Math.exp(-dt * 6));
      if (Math.abs(target - p.fade) > 0.004) fadeBusy = true;
      p.mat.opacity = p.fade;
      p.mesh.visible = p.fade > 0.005;
      if (p.f.img < MAX_IMG) fades[p.f.img] = p.fade;
    }

    const wantPointer = !reduced && !dragging && calmS < 0.3 && performance.now() - lastPointerMove < 900 ? 1 : 0;
    pointerOn += (wantPointer - pointerOn) * (1 - Math.exp(-dt * (wantPointer ? 10 : 4)));
    mat.uniforms.uPointerOn.value = pointerOn;

    placeLabels();
    renderer.render(scene, camera);

    // stations and progress for the page
    const settled = !trip && Math.abs(sTarget - s) < 0.003;
    const near = stations.find((st) => Math.abs(st.t - s) < W.stationReach);
    const nowStation = settled && near ? near.id : null;
    if (nowStation !== station) {
      station = nowStation;
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

    const busy =
      trip ||
      dragging ||
      life > 0 ||
      Math.abs(sTarget - s) > 0.00002 ||
      waveOn > 0.01 ||
      pointerOn > 0.01 ||
      Math.abs(yaw - yawT) > 0.0005 ||
      Math.abs(pitch - pitchT) > 0.0005 ||
      Math.abs(calmS - calm) > 0.01 ||
      fadeBusy;
    if (busy && !document.hidden) raf = requestAnimationFrame(frame);
    else {
      last = 0;
      o.onProgress(s);
    }
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
      kick();
    },
    setCalm(c) {
      calm = clamp(c, 0, 1);
      kick();
    },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("wheel", onWheel);
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
      renderer.dispose();
    },
  };
}
