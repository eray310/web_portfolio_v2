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
  const offset = topOffset();
  if (!smoother) {
    // Native scrolling ("Hareketi azalt"): jump, no animation.
    const el = document.querySelector(selector);
    if (el) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - offset, behavior: "auto" });
    return;
  }
  smoother.scrollTo(selector, true, offset ? `top ${offset}px` : "top top");
}

/**
 * How far (px) a section still is from where scrollToSection puts it, measured on
 * screen: positive when it is still below that line. Null when the page is not
 * ready yet. At the very end of the page a section that cannot reach the line
 * counts as arrived.
 */
export function sectionGap(selector: string): number | null {
  const smoother = ScrollSmoother.get();
  const el = document.querySelector(selector);
  if (!el || (!smoother && !document.documentElement.classList.contains("fx-ready"))) return null;
  const gap = el.getBoundingClientRect().top - topOffset();
  const top = smoother ? smoother.scrollTop() : window.scrollY;
  const atEnd = top >= ScrollTrigger.maxScroll(window) - 6;
  return atEnd && gap > 0 ? 0 : gap;
}
