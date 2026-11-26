import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { MdTune } from "react-icons/md";
import { prefersReducedMotion } from "../utils/motion";
import { viewMode } from "../utils/viewMode";
import "./styles/ViewMenu.css";

/**
 * "Görünüm": one small menu with one setting, "Sakin görünüm". It replaces the separate "Hareketi durdur" and
 * "Arka planı durdur" buttons of /zihnim and /ai-isler. With the system's "Hareketi azalt" setting the calm view is
 * already on, and the switch says so.
 */
const ViewMenu = ({ className = "" }: { className?: string }) => {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const chosen = useSyncExternalStore(viewMode.subscribe, viewMode.chosen, () => false);
  const system = useRef(prefersReducedMotion()).current;
  const on = chosen || system;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      btn.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={wrap} className={`vm ${className}`}>
      <button ref={btn} type="button" className="vm-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        <MdTune aria-hidden="true" />
        <span>Görünüm</span>
      </button>
      {open && (
        <div id={id} className="vm-pop">
          <button type="button" className="vm-switch" role="switch" aria-checked={on} disabled={system} onClick={() => viewMode.set(!chosen)}>
            <span className="vm-label">Sakin görünüm</span>
            <span className="vm-track" aria-hidden="true">
              <i />
            </span>
          </button>
          <p className="vm-note">{system ? "Cihazındaki “Hareketi azalt” ayarı açık olduğu için sakin görünüm kullanılıyor." : "Sürekli hareketleri ve otomatik döngüleri durdurur. Videolar ve alan seçimi çalışmaya devam eder."}</p>
        </div>
      )}
    </div>
  );
};

export default ViewMenu;
