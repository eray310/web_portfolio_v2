/**
 * The 3D world of /zihnim: ONE WebGL renderer and canvas, all points drawn on the GPU in one draw call.
 *
 * - The world (worldGeometry.ts) is built once; the vertex shader does the breathing, the small changes of the
 *   Deney Alanı, the pointer's local opening, the selection highlight and the colour wave that runs along a
 *   chosen path. The camera is plain JS: a smooth flight between the overview and a place (a curve that bends
 *   toward the core so the trip follows the path), a limited look-around by dragging, and nothing else.
 * - It draws only when something changes (flight, drag, pointer, ambient life that is not paused) and never
 *   while the tab is hidden. `dispose()` removes everything it created.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, PerspectiveCamera, Points, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderer } from "three";
import { areaById, readyAreas, worldConfig as W, worldImages, type AreaId, type V3 } from "./zihnimWorld";
import { buildWorld, sampleImage } from "./worldGeometry";

export type SceneOptions = {
  canvas: HTMLCanvasElement;
  light: boolean;
  reduced: boolean;
  /** The label buttons (by place id and "core"); the scene moves them to the places' screen positions. */
  labels: () => Record<string, HTMLElement | null>;
  /** The camera has settled at a place (null: overview). */
  onArrive: (id: AreaId | null) => void;
  /** False once the page has gone away (the scene then stops before it creates anything). */
  alive: () => boolean;
  /** A place was picked with the pointer on the canvas. */
  onPick: (id: AreaId) => void;
};

export type SceneApi = {
  flyTo: (id: AreaId | null) => void;
  setPaused: (paused: boolean) => void;
  /** 0..1: a panel is open or a video plays; the decorative motion calms down. */
  setCalm: (calm: number) => void;
  dispose: () => void;
};

const TAU = Math.PI * 2;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep
const v3 = (a: V3) => new Vector3(a[0], a[1], a[2]);

const VERT = /* glsl */ `
  attribute vec4 aD;
  attribute float aPath;
  attribute vec3 aC;
  uniform float uPhase, uSel, uFocus, uWaveT, uWaveOn, uScale, uPR, uMaxPx, uShellFade, uBreathe, uMorph, uLife;
  uniform vec3 uBlobC;
  uniform vec2 uPointer;
  uniform float uPointerOn, uAspect, uPRad, uPPush, uPTint;
  uniform vec2 uAnch[4];
  uniform vec3 cOff, cGrey, cTeal, cIce, cLav;
  varying vec4 vCol;
  float h11(float n) { return fract(sin(n * 91.345) * 47453.5453); }
  void main() {
    float seed = aD.x;
    float sz = aD.y;
    float kind = aD.z;
    float t = aD.w;
    vec3 p = position;
    // the world breathes very slowly, as one body
    float body = (kind < 1.5 || kind > 4.5) ? 1.0 : 0.0;
    p *= 1.0 + uBreathe * sin(uPhase * 2.0) * body;
    p += vec3(sin(p.y * 0.2 + uPhase * 3.0), sin(p.z * 0.2 + uPhase * 2.0), sin(p.x * 0.2 + uPhase * 4.0)) * 0.1 * uLife;
    // Deney Alani: small, repeating changes of its form
    if (kind > 3.5 && kind < 4.5) {
      vec3 dv = p - uBlobC;
      float rl = length(dv) + 0.001;
      vec3 nb = dv / rl;
      float wob = sin(uPhase * 5.0 + dot(nb, vec3(3.0, 2.0, 1.0)) * 2.0) + 0.5 * sin(uPhase * 7.0 + nb.y * 4.0 + nb.x * 2.0);
      p += nb * wob * uMorph;
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    float dist = -mv.z;
    vec2 uv = clip.xy / max(clip.w, 0.0001) * 0.5 + 0.5;

    // the pointer opens the points around it a little (never around the places' labels)
    vec2 d = (uv - uPointer) * vec2(uAspect, 1.0);
    float dl = length(d);
    float infl = (1.0 - smoothstep(0.0, uPRad, dl)) * uPointerOn;
    for (int i = 0; i < 4; i++) {
      vec2 da = (uv - uAnch[i]) * vec2(uAspect, 1.0);
      infl *= smoothstep(0.035, 0.11, length(da));
    }
    clip.xy += normalize(d + vec2(0.0001)) * infl * uPPush * clip.w;
    gl_Position = clip;

    float slot = kind > 1.5 && kind < 2.5 ? 0.0 : kind > 2.5 && kind < 3.5 ? 1.0 : kind > 3.5 && kind < 4.5 ? 2.0 : kind > 4.5 && kind < 5.5 ? aPath : -1.0;
    float inPlace = slot > -0.5 ? 1.0 : 0.0;
    float isSel = inPlace * (1.0 - step(0.5, abs(slot - uSel)));
    float someSel = uSel > -0.5 ? 1.0 : 0.0;

    float baseA = kind < 0.5 ? 0.5 : kind < 1.5 ? 0.85 : kind < 4.5 ? 0.82 : kind < 5.5 ? 0.4 : 0.3;
    float alpha = baseA * smoothstep(4.0, 16.0, dist);
    if (kind < 0.5) alpha *= mix(1.0, uShellFade, uFocus);
    alpha *= mix(1.0, mix(0.6, 1.35, isSel), someSel * inPlace * uFocus);

    vec3 col = mix(cGrey, cOff, 0.35 + 0.65 * h11(seed * 17.0));
    // points of a real picture keep their own (slightly softened) colour
    float hasC = step(0.001, aC.x + aC.y + aC.z);
    col = mix(col, aC * 1.08, hasC * 0.94);
    if (kind < 0.5) col *= 0.88;
    // the core glows a little, slowly
    if (kind > 0.5 && kind < 1.5) col = mix(col, cTeal, 0.16 + 0.1 * sin(uPhase * 6.0 + seed * 3.0) * uLife);
    // a chosen place takes a faint teal / ice tint; a wave runs along its path
    col = mix(col, mix(cTeal, cIce, 0.45), isSel * uFocus * 0.28);
    if (kind > 4.5 && kind < 5.5) {
      float dlw = t - uWaveT;
      float front = exp(-(dlw * dlw) / 0.012);
      float trail = dlw < 0.0 ? 0.55 * exp(dlw / 0.13) : 0.0;
      float w = max(front, trail) * uWaveOn * isSel;
      vec3 wc = mix(cTeal, cIce, smoothstep(0.0, 1.0, -dlw / 0.35) * 0.8);
      float lav = 0.5 + 0.5 * sin(6.2832 * (t + uPhase * 0.4));
      wc = mix(wc, cLav, 0.22 * lav * lav);
      col = mix(col, wc * 1.1, clamp(w, 0.0, 1.0));
      alpha *= 1.0 + 0.7 * w;
    }
    col = mix(col, cTeal, clamp(infl * uPTint, 0.0, 0.6));
    alpha *= 1.0 + 0.35 * hasC;
    vCol = vec4(col, alpha);
    gl_PointSize = clamp(sz * uScale * uPR / max(dist, 0.001), 1.25 * uPR, uMaxPx * uPR);
  }
`;
const FRAG = /* glsl */ `
  precision mediump float;
  varying vec4 vCol;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float crisp = 1.0 - smoothstep(0.5, 0.98, d);
    float soft = pow(clamp(1.0 - d, 0.0, 1.0), 2.0);
    float a = mix(crisp, soft, 0.5) * vCol.a;
    gl_FragColor = vec4(vCol.rgb * a, a);
  }
`;

type Flight = { t: number; dur: number; aPos: Vector3; aTar: Vector3; bPos: Vector3; bTar: Vector3; ctrl: Vector3; to: AreaId | null };

export async function createScene(o: SceneOptions): Promise<SceneApi> {
  const { canvas, light } = o;
  const reduced = o.reduced;
  // real posters become particle pictures (a failed picture simply stays an empty frame)
  const [frames, key] = await Promise.all([Promise.all(worldImages.frames.map((s) => sampleImage(s))), sampleImage(worldImages.keyFrame, 80)]);
  if (!o.alive()) throw new Error("cancelled");
  const world = buildWorld(light ? W.count.light : W.count.desktop, frames, key);
  // the context is made only now, after the page is sure to stay (a context cannot be reused once it was released)
  const attrs: WebGLContextAttributes = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: light ? "low-power" : "default" };
  const gl = (canvas.getContext("webgl2", attrs) || canvas.getContext("webgl", attrs)) as WebGLRenderingContext | null;
  if (!gl) throw new Error("no WebGL");

  const renderer = new WebGLRenderer({ canvas, context: gl, antialias: false, alpha: false });
  renderer.setClearColor(W.ground, 1);
  const scene = new Scene();
  const camera = new PerspectiveCamera(W.overview.fov, 1, 0.5, 500);

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(world.pos, 3));
  geo.setAttribute("aD", new BufferAttribute(world.data, 4));
  geo.setAttribute("aPath", new BufferAttribute(world.path, 1));
  geo.setAttribute("aC", new BufferAttribute(world.col, 3));
  const P = W.palette;
  const anch = [new Vector2(-9, -9), new Vector2(-9, -9), new Vector2(-9, -9), new Vector2(-9, -9)];
  const mat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uPhase: { value: 0 },
      uSel: { value: -1 },
      uFocus: { value: 0 },
      uWaveT: { value: 0 },
      uWaveOn: { value: 0 },
      uScale: { value: 600 },
      uPR: { value: 1 },
      uMaxPx: { value: 9 },
      uShellFade: { value: W.ambient.shellFade },
      uBreathe: { value: W.ambient.breathe },
      uMorph: { value: 0.45 },
      uLife: { value: 1 },
      uBlobC: { value: v3(world.blob) },
      uPointer: { value: new Vector2(-9, -9) },
      uPointerOn: { value: 0 },
      uAspect: { value: 1.6 },
      uPRad: { value: W.pointer.radius },
      uPPush: { value: W.pointer.push },
      uPTint: { value: W.pointer.tint },
      uAnch: { value: anch },
      cOff: { value: v3(P.offWhite) },
      cGrey: { value: v3(P.grey) },
      cTeal: { value: v3(P.teal) },
      cIce: { value: v3(P.ice) },
      cLav: { value: v3(P.lavender) },
    },
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  // ── state
  const U = mat.uniforms;
  const basePos = v3(W.overview.pos);
  const baseTar = v3(W.overview.target);
  let flight: Flight | null = null;
  let current: AreaId | null = null;
  let paused = false;
  let calm = 0;
  let calmS = 0;
  let focus = 0;
  let sel = -1;
  let waveOn = 0;
  let phase = 0;
  let yaw = 0;
  let pitch = 0;
  let yawT = 0;
  let pitchT = 0;
  let pointerOn = 0;
  let lastPointerMove = 0;
  let dragging = false;
  let disposed = false;
  let raf = 0;
  let last = 0;
  let width = 1;
  let height = 1;
  let level = 0;
  let resScale = 1;
  let ema = 16;
  let frames_ = 0;
  const core = v3(W.core.c);
  const corePt = (a: Vector3, b: Vector3) => a.clone().lerp(b, 0.5).lerp(core, 0.35).add(new Vector3(0, 3, 0));

  const applyQuality = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, (light ? 1.25 : 1.75) * resScale);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    U.uPR.value = dpr;
    U.uScale.value = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
    geo.setDrawRange(0, Math.round(world.n * (level === 0 ? 1 : level === 1 ? 0.75 : 0.5)));
  };
  /** The pose of a view, stepped back on narrow (portrait) screens so the same part of the world fits the width. */
  const poseOf = (a: { camera: { pos: V3; target: V3 } } | null) => {
    const d = a ? a.camera : W.overview;
    const target = v3(d.target);
    const g = clamp(1.25 / camera.aspect, 1, 2.3);
    return { pos: target.clone().add(v3(d.pos).sub(target).multiplyScalar(g)), target };
  };
  const resize = () => {
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    U.uAspect.value = camera.aspect;
    applyQuality();
    if (!flight) {
      // no trip under way: keep the current view, adapted to the new shape of the screen
      const p = poseOf(current ? areaById(current) : null);
      basePos.copy(p.pos);
      baseTar.copy(p.target);
    }
    kick();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // ── camera flights
  const flyTo = (id: AreaId | null) => {
    const a = id ? areaById(id) : null;
    const dest = poseOf(a && a.status === "ready" ? a : null);
    const bPos = dest.pos;
    const bTar = dest.target;
    const dist = basePos.distanceTo(bPos);
    flight = {
      t: 0,
      dur: reduced ? W.flight.reduced : clamp(W.flight.seconds * (0.8 + dist / 120), 1.2, 1.8),
      aPos: basePos.clone(),
      aTar: baseTar.clone(),
      bPos,
      bTar,
      ctrl: corePt(basePos, bPos),
      to: a ? a.id : null,
    };
    current = a ? a.id : null;
    sel = a ? a.slot : -1;
    U.uSel.value = sel;
    yawT = 0;
    pitchT = 0;
    // the wave starts at the core and runs to the place while the camera follows the same way
    U.uWaveT.value = 0;
    waveStart = performance.now();
    kick();
  };
  let waveStart = 0;

  // ── pointer: a limited look-around (drag) and a pick on a short press
  let downX = 0;
  let downY = 0;
  let downYaw = 0;
  let downPitch = 0;
  let moved = 0;
  let activeId = -1;
  const soft = (x: number, lim: number) => lim * Math.tanh(x / lim); // slows down toward the limit, never passes it
  const onDown = (e: PointerEvent) => {
    if (e.button > 0 || dragging) return; // a second finger does not take over a drag
    activeId = e.pointerId;
    dragging = true;
    moved = 0;
    downX = e.clientX;
    downY = e.clientY;
    downYaw = yawT;
    downPitch = pitchT;
    canvas.setPointerCapture(e.pointerId);
    kick();
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "mouse") {
      const r = canvas.getBoundingClientRect();
      U.uPointer.value.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
      lastPointerMove = performance.now();
      kick();
    }
    if (!dragging || e.pointerId !== activeId) return;
    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    moved = Math.max(moved, Math.hypot(dx, dy));
    yawT = soft(downYaw - (dx / width) * 2.4, W.drag.yaw);
    pitchT = soft(downPitch - (dy / height) * 1.6, W.drag.pitch);
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
      // a short press: the nearest place within reach of the finger or pointer
      const r = canvas.getBoundingClientRect();
      let best: { id: AreaId; d: number } | null = null;
      for (const a of readyAreas) {
        const s = project(v3(a.anchor));
        if (!s.front) continue;
        const d = Math.hypot(s.x - (e.clientX - r.left), s.y - (e.clientY - r.top));
        if (d < 64 && (!best || d < best.d)) best = { id: a.id, d };
      }
      if (best) o.onPick(best.id);
    }
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  // ── labels: each place's button follows its position on screen, without overlapping
  const tmp = new Vector3();
  const project = (p: Vector3) => {
    tmp.copy(p).project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * width, y: (1 - (tmp.y * 0.5 + 0.5)) * height, front: tmp.z < 1 && Math.abs(tmp.x) < 1.08 && Math.abs(tmp.y) < 1.08, u: tmp.x * 0.5 + 0.5, v: tmp.y * 0.5 + 0.5 };
  };
  const placeLabels = () => {
    const els = o.labels();
    const list: { id: string; el: HTMLElement; x: number; y: number; ok: boolean }[] = [];
    const anchors: [string, V3][] = [...readyAreas.map((a) => [a.id, a.anchor] as [string, V3]), ["core", W.core.c]];
    anchors.forEach(([id, p], i) => {
      const s = project(v3(p));
      anch[i].set(s.u, s.v);
      const el = els[id];
      if (el) list.push({ id, el, x: s.x, y: s.y, ok: s.front });
    });
    // push overlapping labels apart: real boxes, the lower one moves down, a few passes
    for (const l of list) {
      l.x = clamp(l.x, 70, width - 70);
      l.y = clamp(l.y, 64, height - 84);
    }
    const vis = list.filter((l) => l.ok).sort((p, q) => p.y - q.y);
    const box = (l: { el: HTMLElement; x: number; y: number }) => ({ w: l.el.offsetWidth || 130, h: l.el.offsetHeight || 36 });
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (let i = 1; i < vis.length; i++) {
        for (let j = 0; j < i; j++) {
          const bi = box(vis[i]);
          const bj = box(vis[j]);
          const dx = Math.abs(vis[i].x - vis[j].x);
          const dy = vis[i].y - vis[j].y;
          if (dx < (bi.w + bj.w) / 2 + 6 && Math.abs(dy) < (bi.h + bj.h) / 2 + 4) {
            vis[i].y = vis[j].y + (bi.h + bj.h) / 2 + 6;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
    for (const l of list) {
      const x = l.x;
      const y = Math.min(l.y, height - 30);
      l.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
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
  const frame = (now: number) => {
    raf = 0;
    if (disposed) return;
    const raw = last ? Math.min(100, now - last) : 16;
    const dt = raw / 1000;
    last = now;
    frames_++;
    ema += (raw - ema) * 0.06;
    if (frames_ > 90 && frames_ % 45 === 0 && ema > (light ? 30 : 24)) {
      if (resScale > 0.7) resScale = Math.max(0.65, resScale - 0.12);
      else if (level < 2) level++;
      applyQuality();
    }
    calmS += (calm - calmS) * (1 - Math.exp(-dt * 3));
    const life = reduced || paused ? 0 : 1 - 0.8 * calmS;
    if (life > 0) phase = (phase + dt * W.ambient.speed * life * 0.06) % TAU;
    U.uPhase.value = phase;
    U.uLife.value = life;
    U.uMorph.value = (sel === 2 ? 1.5 : 0.45) * life;
    U.uBreathe.value = W.ambient.breathe * life;

    // flight
    if (flight) {
      flight.t += dt / flight.dur;
      const t = clamp(flight.t, 0, 1);
      const s = ease(t);
      const q = 1 - s;
      basePos.set(q * q * flight.aPos.x + 2 * q * s * flight.ctrl.x + s * s * flight.bPos.x, q * q * flight.aPos.y + 2 * q * s * flight.ctrl.y + s * s * flight.bPos.y, q * q * flight.aPos.z + 2 * q * s * flight.ctrl.z + s * s * flight.bPos.z);
      baseTar.lerpVectors(flight.aTar, flight.bTar, ease(clamp(t * 1.12, 0, 1)));
      if (t >= 1) {
        const to = flight.to;
        flight = null;
        o.onArrive(to);
      }
    }
    // the wave runs from the core to the place (in step with the flight), then fades
    const age = (performance.now() - waveStart) / 1000;
    const wd = flight ? flight.dur : 1.4;
    U.uWaveT.value = clamp(age / Math.max(0.2, wd * 0.95), 0, 1.2);
    const waveGoal = sel >= 0 && age < wd + 1.2 ? 1 : 0;
    waveOn += (waveGoal - waveOn) * (1 - Math.exp(-dt * (waveGoal ? 6 : 2.2)));
    U.uWaveOn.value = waveOn;
    focus += ((sel >= 0 ? 1 : 0) - focus) * (1 - Math.exp(-dt * 3.2));
    U.uFocus.value = focus;

    // look-around
    const kd = 1 - Math.exp(-dt * (dragging ? 22 : W.drag.damping));
    yaw += (yawT - yaw) * kd;
    pitch += (pitchT - pitch) * kd;
    const v = basePos.clone().sub(baseTar);
    v.applyAxisAngle(new Vector3(0, 1, 0), yaw);
    const right = new Vector3().crossVectors(v, new Vector3(0, 1, 0)).normalize();
    v.applyAxisAngle(right, pitch);
    camera.position.copy(baseTar).add(v);
    camera.lookAt(baseTar);
    camera.updateMatrixWorld();

    // pointer influence (mouse only, not while reading, dragging or reduced)
    const wantPointer = !reduced && !dragging && calmS < 0.3 && performance.now() - lastPointerMove < 900 ? 1 : 0;
    pointerOn += (wantPointer - pointerOn) * (1 - Math.exp(-dt * (wantPointer ? 10 : 4)));
    U.uPointerOn.value = pointerOn;

    placeLabels();
    renderer.render(scene, camera);
    // read-only state for tests and debugging
    canvas.dataset.frames = String(frames_);
    canvas.dataset.cam = camera.position.x.toFixed(2) + "," + camera.position.y.toFixed(2) + "," + camera.position.z.toFixed(2);
    canvas.dataset.q = String(level);

    const busy = flight || dragging || life > 0 || waveOn > 0.01 || Math.abs(focus - (sel >= 0 ? 1 : 0)) > 0.002 || pointerOn > 0.01 || Math.abs(yaw - yawT) > 0.0005 || Math.abs(pitch - pitchT) > 0.0005 || Math.abs(calmS - calm) > 0.01;
    if (busy && !document.hidden) raf = requestAnimationFrame(frame);
    else last = 0;
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
    flyTo,
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
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    },
  };
}
