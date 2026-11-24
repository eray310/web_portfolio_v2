import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MdClose } from "react-icons/md";
import type { GravitySpec, LayersSpec, Rect } from "../../data/interactive";
import "./creative.css";

const BASE = import.meta.env.BASE_URL;
const file = (path: string) => `${BASE}${path.split("/").map(encodeURIComponent).join("/")}`;
const cover = (name: string) => file(`portfolio/${name}`);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Dialog: opens on request, traps focus, Escape closes and focus goes back ─
const Dialog = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => {
  const box = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null);

  useEffect(() => {
    const prev = opener.current;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.querySelector<HTMLElement>("[data-first]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Only this dialog closes, not a panel behind it.
        e.stopPropagation();
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !box.current) return;
      const items = Array.from(
        box.current.querySelectorAll<HTMLElement>('button, input, [href], [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.hasAttribute("disabled"));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = bodyOverflow;
      prev?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="cx-backdrop" onClick={onClose}>
      <div className="cx-dialog" role="dialog" aria-modal="true" aria-label={title} ref={box} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="cx-close" onClick={onClose} aria-label="Kapat" data-first data-cursor="disable">
          <MdClose />
        </button>
        <h3 className="cx-title">{title}</h3>
        {children}
      </div>
    </div>,
    document.body
  );
};

const cropStyle = (poster: string, r: Rect): React.CSSProperties => ({
  left: `${r.x}%`,
  top: `${r.y}%`,
  width: `${r.w}%`,
  height: `${r.h}%`,
  backgroundImage: `url("${cover(poster)}")`,
  backgroundSize: `${(100 / r.w) * 100}% ${(100 / r.h) * 100}%`,
  backgroundPosition: `${r.w >= 100 ? 0 : (r.x / (100 - r.w)) * 100}% ${r.h >= 100 ? 0 : (r.y / (100 - r.h)) * 100}%`,
});

// ── 1. Kareyi aç: drag the handle, the frame opens into image, colour and type ─
const LayerPeel = ({ spec }: { spec: LayersSpec }) => {
  const [v, setV] = useState(0);
  const [settling, setSettling] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Let go: the layers sit back one after another, in a short rhythm.
  const settle = () => {
    timers.current.forEach(clearTimeout);
    if (reducedMotion()) return setV(0);
    setSettling(true);
    timers.current = [0.66, 0.34, 0.12, 0].map((s, i) => window.setTimeout(() => setV(s), 150 * (i + 1)));
    timers.current.push(window.setTimeout(() => setSettling(false), 150 * 5));
  };

  return (
    <div className="lp">
      <div className={"lp-stage" + (settling ? " settling" : "")} style={{ "--o": v } as React.CSSProperties}>
        <div className="lp-layer lp-l1">
          <img src={cover(spec.poster)} alt="" draggable={false} />
          <span className="lp-tag">Görsel</span>
        </div>
        <div className="lp-layer lp-l2">
          {spec.palette.map((c) => (
            <i key={c} style={{ background: c }} />
          ))}
          <span className="lp-tag">Renk</span>
        </div>
        <div className="lp-layer lp-l3">
          <span className="lp-type" style={cropStyle(spec.poster, spec.type)} />
          <span className="lp-tag" style={{ left: `${spec.type.x}%`, top: `${spec.type.y + spec.type.h}%` }}>
            Tipografi
          </span>
        </div>
      </div>
      <label className="cx-slider">
        <span>Tutamacı sürükle: kareyi aç</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={v}
          aria-label="Katmanları aç"
          aria-valuetext={`${Math.round(v * 100)} yüzde açık`}
          onChange={(e) => {
            timers.current.forEach(clearTimeout);
            setSettling(false);
            setV(Number(e.target.value));
          }}
          onPointerUp={settle}
          onKeyUp={(e) => (e.key === "Enter" || e.key === " ") && settle()}
        />
      </label>
      <button type="button" className="cx-btn" onClick={settle}>
        Yerine oturt
      </button>
      <p className="cx-note">
        Katman gösterimi: {spec.title} kapağından türetilmiş bir görünüm. Orijinal üretim katmanları değildir.
      </p>
    </div>
  );
};

// ── 2. Projeyi keşfet: parts of the real cover are drawn to a point you steer ─
type Piece = { el: HTMLElement | null; x: number; y: number; vx: number; vy: number; tx: number; ty: number; r: number; a: number; w: number; h: number };

const COLS = 3;
const ROWS = 4;

const Gravity = ({ spec }: { spec: GravitySpec }) => {
  const stage = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(reducedMotion());
  const doneRef = useRef(done);
  doneRef.current = done;
  const pieces = useRef<Piece[]>([]);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const attractor = useRef({ x: 0, y: 0 });
  const dims = useRef({ w: 0, h: 0, cw: 0, ch: 0, cx: 0, cy: 0 });

  // Piece list: tiles of the cover, the lettering line, and the palette.
  const items = useMemo(() => {
    const list: { kind: "tile" | "type" | "chip"; col?: number; row?: number; color?: string }[] = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) list.push({ kind: "tile", col: c, row: r });
    list.push({ kind: "type" });
    spec.palette.forEach((color) => list.push({ kind: "chip", color }));
    return list;
  }, [spec.palette]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const ch = h * 0.86;
    const cw = ch * (9 / 16);
    dims.current = { w, h, cw, ch, cx: (w - cw) / 2, cy: (h - ch) / 2 };
    attractor.current = { x: w / 2, y: h / 2 };
    el.style.setProperty("--cw", `${cw}px`);
    el.style.setProperty("--ch", `${ch}px`);
    const nodes = Array.from(el.querySelectorAll<HTMLElement>("[data-piece]"));
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    pieces.current = nodes.map((node, i) => {
      const it = items[i];
      const pw = it.kind === "tile" ? cw / COLS : it.kind === "type" ? cw * (spec.type.w / 100) : 26;
      const ph = it.kind === "tile" ? ch / ROWS : it.kind === "type" ? ch * (spec.type.h / 100) : 26;
      let tx = 0;
      let ty = 0;
      if (it.kind === "tile") {
        tx = dims.current.cx + (it.col as number) * pw;
        ty = dims.current.cy + (it.row as number) * ph;
      } else if (it.kind === "type") {
        tx = dims.current.cx + cw * (spec.type.x / 100);
        ty = dims.current.cy + ch * (spec.type.y / 100);
      } else {
        const k = i - (COLS * ROWS + 1);
        tx = dims.current.cx + cw + 12;
        ty = dims.current.cy + 6 + k * 34;
      }
      return { el: node, x: rnd(0, w - pw), y: rnd(0, h - ph), vx: 0, vy: 0, tx, ty, r: rnd(-30, 30), a: rnd(0, Math.PI * 2), w: pw, h: ph };
    });
    if (doneRef.current) pieces.current.forEach((p) => ((p.x = p.tx), (p.y = p.ty), (p.r = 0)));

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const at = pointer.current ?? attractor.current;
      pieces.current.forEach((p, i) => {
        let gx: number;
        let gy: number;
        if (doneRef.current) {
          gx = p.tx;
          gy = p.ty;
          p.r += (0 - p.r) * Math.min(1, dt * 10);
        } else {
          // A loose ring around the point you steer.
          p.a += dt * (0.5 + (i % 4) * 0.12);
          const ring = 46 + (i % 5) * 20;
          gx = at.x + Math.cos(p.a + i) * ring - p.w / 2;
          gy = at.y + Math.sin(p.a + i) * ring - p.h / 2;
          p.r += (Math.sin(p.a * 2 + i) * 14 - p.r) * Math.min(1, dt * 3);
        }
        const k = doneRef.current ? 70 : 16;
        p.vx += (gx - p.x) * k * dt;
        p.vy += (gy - p.y) * k * dt;
        const damp = Math.exp(-(doneRef.current ? 11 : 4.2) * dt);
        p.vx *= damp;
        p.vy *= damp;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.el) p.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) rotate(${p.r.toFixed(1)}deg)`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [items, spec.type]);

  const toPoint = (e: React.PointerEvent) => {
    const r = stage.current!.getBoundingClientRect();
    pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const move = (dx: number, dy: number) => {
    const { w, h } = dims.current;
    attractor.current = { x: clamp(attractor.current.x + dx, 20, w - 20), y: clamp(attractor.current.y + dy, 20, h - 20) };
  };

  return (
    <div className="gv">
      <div
        className={"gv-stage" + (done ? " is-done" : "")}
        ref={stage}
        tabIndex={0}
        role="group"
        aria-label="Çekim merkezi: oklarla taşı, Enter ile kapağı oluştur"
        onPointerMove={(e) => {
          if (e.pointerType === "mouse" || e.buttons) toPoint(e);
        }}
        onPointerDown={(e) => {
          toPoint(e);
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerUp={() => (pointer.current = null)}
        onPointerLeave={() => (pointer.current = null)}
        onKeyDown={(e) => {
          const s = 36;
          if (e.key === "ArrowLeft") (e.preventDefault(), move(-s, 0));
          else if (e.key === "ArrowRight") (e.preventDefault(), move(s, 0));
          else if (e.key === "ArrowUp") (e.preventDefault(), move(0, -s));
          else if (e.key === "ArrowDown") (e.preventDefault(), move(0, s));
          else if (e.key === "Enter") (e.preventDefault(), setDone((d) => !d));
        }}
      >
        {items.map((it, i) => (
          <span
            key={i}
            data-piece
            className={`gv-piece gv-${it.kind}`}
            style={
              it.kind === "tile"
                ? {
                    width: `calc(var(--cw) / ${COLS})`,
                    height: `calc(var(--ch) / ${ROWS})`,
                    backgroundImage: `url("${cover(spec.poster)}")`,
                    backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
                    backgroundPosition: `${((it.col as number) / (COLS - 1)) * 100}% ${((it.row as number) / (ROWS - 1)) * 100}%`,
                  }
                : it.kind === "type"
                  ? {
                      width: `calc(var(--cw) * ${spec.type.w / 100})`,
                      height: `calc(var(--ch) * ${spec.type.h / 100})`,
                      backgroundImage: `url("${cover(spec.poster)}")`,
                      backgroundSize: `${(100 / spec.type.w) * 100}% ${(100 / spec.type.h) * 100}%`,
                      backgroundPosition: `${(spec.type.x / (100 - spec.type.w)) * 100}% ${(spec.type.y / (100 - spec.type.h)) * 100}%`,
                    }
                  : { background: it.color }
            }
          />
        ))}
      </div>
      <div className="gv-controls">
        <button type="button" className="cx-btn" onClick={() => setDone((d) => !d)}>
          {done ? "Parçaları dağıt" : "Kapağı oluştur"}
        </button>
        <span className="gv-pad" role="group" aria-label="Çekim merkezini taşı">
          <button type="button" className="cx-btn" onClick={() => move(0, -48)} aria-label="Yukarı">↑</button>
          <button type="button" className="cx-btn" onClick={() => move(-48, 0)} aria-label="Sola">←</button>
          <button type="button" className="cx-btn" onClick={() => move(48, 0)} aria-label="Sağa">→</button>
          <button type="button" className="cx-btn" onClick={() => move(0, 48)} aria-label="Aşağı">↓</button>
        </span>
      </div>
      <p className="cx-note">
        {spec.title} kapağının gerçek parçaları: görsel kareler, tipografi satırı ve örneklenmiş renkler. İmleci
        ya da parmağı sürükleyerek çekim merkezini taşı.
      </p>
    </div>
  );
};

// ── Host: one entry point, loaded only when an interaction is opened ────────
export type CreativeRequest =
  | { kind: "layers"; spec: LayersSpec }
  | { kind: "gravity"; spec: GravitySpec };

const TITLES = { layers: "Kareyi aç", gravity: "Projeyi keşfet" } as const;

const CreativeHost = ({ request, onClose }: { request: CreativeRequest; onClose: () => void }) => (
  <Dialog title={TITLES[request.kind]} onClose={onClose}>
    {request.kind === "layers" && <LayerPeel spec={request.spec} />}
    {request.kind === "gravity" && <Gravity spec={request.spec} />}
  </Dialog>
);

export default CreativeHost;
