import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollSmoother, ScrollTrigger);

/** Offset kept above a section on phones, where the fixed header stays over the page. */
function topOffset() {
  const header = document.querySelector(".header") as HTMLElement | null;
  return window.innerWidth < 768 && header ? Math.round(header.offsetHeight) + 12 : 0;
}

/**
 * Scrolls to a section. On phones the fixed header stays over the page, so the
 * section is stopped just below it instead of at the very top.
 */
export function scrollToSection(selector: string) {
  const smoother = ScrollSmoother.get();
  if (!smoother) return;
  const offset = topOffset();
  smoother.scrollTo(selector, true, offset ? `top ${offset}px` : "top top");
}

/** Where the page has to be scrolled for a section to sit where scrollToSection puts it (null: not ready). */
export function sectionScrollTop(selector: string): number | null {
  const smoother = ScrollSmoother.get();
  if (!smoother || !document.querySelector(selector)) return null;
  const offset = topOffset();
  const want = smoother.offset(selector, offset ? `top ${offset}px` : "top top");
  return Math.min(want, ScrollTrigger.maxScroll(window));
}
