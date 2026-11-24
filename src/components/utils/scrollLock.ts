import { smoother } from "../Navbar";

/**
 * Pauses the smooth scroller while any overlay (detail panel, video player) is
 * open. A counter lets overlays stack: the page only scrolls again when the
 * last one has closed.
 */
let locks = 0;

export function lockScroll() {
  if (locks++ === 0) {
    if (smoother) smoother.paused(true);
    else document.body.style.overflowY = "hidden"; // native scrolling (reduced motion)
  }
}

export function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (locks === 0) {
    if (smoother) smoother.paused(false);
    else document.body.style.overflowY = "auto";
  }
}
