import { useSyncExternalStore } from "react";
import { spaceControl } from "./spaceBus";

/**
 * "Arka planı durdur / başlat": a small, plain text button. It sits in the normal flow of the page
 * (under the opening call and in the footer), never over the writing or over the showreel. Every copy
 * shares one state. It is not shown when the background is a still picture (no WebGL, "Hareketi azalt").
 */
const SpaceToggle = ({ className = "" }: { className?: string }) => {
  const s = useSyncExternalStore(spaceControl.subscribe, spaceControl.get, spaceControl.get);
  if (!s.live) return null;
  return (
    <button type="button" className={`ai-space-ctl ${className}`} aria-pressed={s.paused} onClick={() => spaceControl.set({ paused: !s.paused })} data-cursor="disable">
      {s.paused ? "Arka planı başlat" : "Arka planı durdur"}
    </button>
  );
};

export default SpaceToggle;
