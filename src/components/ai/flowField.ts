/**
 * A small pointer "flow field" shared by /ai-isler (Three.js scene) and /hakkimda (2D canvas).
 *
 * It is a coarse grid (40 x 24 cells, on the CPU) that remembers where the pointer has just been:
 *  - velocity (vx, vy): the pointer's direction, spread round it, plus a push away from it. It dies
 *    out in under a second, so the field settles as soon as the pointer rests.
 *  - trail: how much "wake" is left in a cell. It lasts a little longer and fades out by itself.
 *
 * The strength follows the pointer's speed, but is capped (tanh), and a jump (the pointer leaving
 * and re-entering somewhere else) gives no impulse. Nothing here touches the page: the pointer is
 * read from `window` (passive) and nothing is drawn.
 *
 * `data` is an RGBA byte image (R, G = velocity, B = trail) a shader can sample; `sample` and
 * `mean` serve the 2D canvas and the CSS layers. `energy` is 0 when everything has settled, so
 * callers can stop drawing.
 */
export type FlowSample = { vx: number; vy: number; t: number };

export type FlowField = {
  cols: number;
  rows: number;
  data: Uint8Array;
  /** 0 when the field is at rest; the callers draw only while it is above ~0.003. */
  energy: number;
  /** True when `data` was rewritten by the last update (upload it to the GPU). */
  changed: boolean;
  /** Mean push over the screen, about -1..1 (for CSS parallax layers). */
  mean: { x: number; y: number };
  update: (dt: number) => void;
  sample: (u: number, v: number, out: FlowSample) => void;
  dispose: () => void;
};

export function createFlowField(opts: { cols?: number; rows?: number; enabled?: () => boolean; onWake?: () => void } = {}): FlowField {
  const cols = opts.cols ?? 40;
  const rows = opts.rows ?? 24;
  const n = cols * rows;
  const vx = new Float32Array(n);
  const vy = new Float32Array(n);
  const tr = new Float32Array(n);
  const tmpX = new Float32Array(n);
  const tmpY = new Float32Array(n);
  const data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    data[i * 4] = 128;
    data[i * 4 + 1] = 128;
    data[i * 4 + 3] = 255;
  }
  const field: FlowField = { cols, rows, data, energy: 0, changed: false, mean: { x: 0, y: 0 }, update, sample, dispose };

  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  let has = false;

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return; // fingers scroll the page; they never steer the field
    if (opts.enabled && !opts.enabled()) return;
    const W = window.innerWidth || 1;
    const H = window.innerHeight || 1;
    const nx = e.clientX / W;
    const ny = 1 - e.clientY / H;
    const now = e.timeStamp || performance.now();
    if (!has || now - lastT > 120) {
      // first move, or the pointer was away for a while: no impulse from the jump
      has = true;
      lastX = nx;
      lastY = ny;
      lastT = now;
      return;
    }
    const asp = W / H;
    const dx = (nx - lastX) * asp; // in screen heights
    const dy = ny - lastY;
    const dist = Math.hypot(dx, dy);
    const dtMs = Math.max(8, now - lastT);
    lastX = nx;
    lastY = ny;
    lastT = now;
    if (dist < 0.0015 || dist > 0.6) return; // tiny jitter, or a jump: ignore
    const speed = (dist / dtMs) * 1000; // screen heights per second
    const strength = Math.tanh(speed * 0.75); // 0..1, never more than 1 whatever the speed
    const ux = dx / dist;
    const uy = dy / dist;
    const sigma = 0.1; // size of the soft area round the pointer, in screen heights
    const reach = Math.ceil((sigma * 3 * rows) / 1); // cells
    const cx = nx * cols;
    const cy = ny * rows;
    const x0 = Math.max(0, Math.floor(cx - reach)) | 0;
    const x1 = Math.min(cols - 1, Math.ceil(cx + reach)) | 0;
    const y0 = Math.max(0, Math.floor(cy - reach)) | 0;
    const y1 = Math.min(rows - 1, Math.ceil(cy + reach)) | 0;
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        const px = ((i + 0.5) / cols - nx) * asp;
        const py = (j + 0.5) / rows - ny;
        const d2 = px * px + py * py;
        const w = Math.exp(-d2 / (2 * sigma * sigma));
        if (w < 0.02) continue;
        const d = Math.sqrt(d2) || 1;
        const k = strength * w;
        const idx = j * cols + i;
        // along the pointer's way, plus a gentle push outwards (screen space: x is stretched by the aspect)
        vx[idx] = Math.max(-1, Math.min(1, vx[idx] + (ux * 0.85 + (px / d) * 0.45) * k));
        vy[idx] = Math.max(-1, Math.min(1, vy[idx] + (uy * 0.85 + (py / d) * 0.45) * k));
        tr[idx] = Math.min(1, tr[idx] + k * 0.7);
      }
    }
    const wasRest = field.energy === 0;
    field.energy = Math.max(field.energy, Math.max(0.01, strength));
    if (wasRest && opts.onWake) opts.onWake();
  };
  const onLeave = () => {
    has = false;
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  window.addEventListener("blur", onLeave);

  function update(dt: number) {
    field.changed = false;
    if (field.energy === 0) return; // at rest: nothing to do
    const dv = Math.exp(-dt * 2.8); // velocity: about a third of a second
    const dtk = Math.exp(-dt * 1.15); // wake: about a second, visible for two
    tmpX.set(vx);
    tmpY.set(vy);
    let sx = 0;
    let sy = 0;
    let peak = 0;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const idx = j * cols + i;
        // soften: blend each cell with its four neighbours (the area spreads and smooths)
        const l = i > 0 ? idx - 1 : idx;
        const r = i < cols - 1 ? idx + 1 : idx;
        const u = j > 0 ? idx - cols : idx;
        const d = j < rows - 1 ? idx + cols : idx;
        const ax = (tmpX[l] + tmpX[r] + tmpX[u] + tmpX[d]) * 0.25;
        const ay = (tmpY[l] + tmpY[r] + tmpY[u] + tmpY[d]) * 0.25;
        vx[idx] = (tmpX[idx] * 0.78 + ax * 0.22) * dv;
        vy[idx] = (tmpY[idx] * 0.78 + ay * 0.22) * dv;
        tr[idx] *= dtk;
        const o = idx * 4;
        data[o] = 128 + Math.round(Math.max(-1, Math.min(1, vx[idx])) * 127);
        data[o + 1] = 128 + Math.round(Math.max(-1, Math.min(1, vy[idx])) * 127);
        data[o + 2] = Math.round(Math.min(1, tr[idx]) * 255);
        sx += vx[idx];
        sy += vy[idx];
        const a = Math.abs(vx[idx]) + Math.abs(vy[idx]) + tr[idx];
        if (a > peak) peak = a;
      }
    }
    field.mean.x = (sx / n) * 14;
    field.mean.y = (sy / n) * 14;
    field.energy = Math.min(1, peak);
    field.changed = true;
    if (peak < 0.003) {
      // settled: clear once, so nothing lingers, and report rest
      vx.fill(0);
      vy.fill(0);
      tr.fill(0);
      for (let i = 0; i < n; i++) {
        data[i * 4] = 128;
        data[i * 4 + 1] = 128;
        data[i * 4 + 2] = 0;
      }
      field.mean.x = 0;
      field.mean.y = 0;
      field.energy = 0;
    }
  }

  function sample(u: number, v: number, out: FlowSample) {
    const fx = Math.min(cols - 1.001, Math.max(0, u * cols - 0.5));
    const fy = Math.min(rows - 1.001, Math.max(0, v * rows - 0.5));
    const i = fx | 0;
    const j = fy | 0;
    const a = fx - i;
    const b = fy - j;
    const i00 = j * cols + i;
    const i10 = i00 + 1;
    const i01 = i00 + cols;
    const i11 = i01 + 1;
    const w00 = (1 - a) * (1 - b);
    const w10 = a * (1 - b);
    const w01 = (1 - a) * b;
    const w11 = a * b;
    out.vx = vx[i00] * w00 + vx[i10] * w10 + vx[i01] * w01 + vx[i11] * w11;
    out.vy = vy[i00] * w00 + vy[i10] * w10 + vy[i01] * w01 + vy[i11] * w11;
    out.t = tr[i00] * w00 + tr[i10] * w10 + tr[i01] * w01 + tr[i11] * w11;
  }

  function dispose() {
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("blur", onLeave);
  }

  return field;
}
