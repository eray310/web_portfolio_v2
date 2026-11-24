/**
 * "Hareketi azalt" (prefers-reduced-motion). Read once per page load: the home page picks
 * its scroll mode (native scrolling, no scroll-driven scene) from it before anything moves.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Marks the page so CSS can follow "Hareketi azalt" (class `reduce-motion` on <html>). */
export const applyMotionPreference = () => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("reduce-motion", prefersReducedMotion());
};
