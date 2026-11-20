import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";

gsap.registerPlugin(ScrollSmoother);

/**
 * Scrolls to a section. On phones the fixed header stays over the page, so the
 * section is stopped just below it instead of at the very top.
 */
export function scrollToSection(selector: string) {
  const smoother = ScrollSmoother.get();
  if (!smoother) return;
  const header = document.querySelector(".header") as HTMLElement | null;
  const offset =
    window.innerWidth < 768 && header ? Math.round(header.offsetHeight) + 12 : 0;
  smoother.scrollTo(selector, true, offset ? `top ${offset}px` : "top top");
}
