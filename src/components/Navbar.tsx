import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SiteHeader from "./SiteHeader";
import { scrollToSection } from "./utils/scrollToSection";
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { prefersReducedMotion } from "../utils/motion";
import "./styles/Navbar.css";

gsap.registerPlugin(ScrollSmoother, ScrollTrigger);
export let smoother: ScrollSmoother;

const Navbar = () => {
  useEffect(() => {
    // Mouse wheel on a desktop: the content moves a little over half of what the wheel gave
    // in the first version (speed 0.55, up from 0.5) and comes to rest quickly (smooth 0.8 s).
    // Touch screens keep the finger-following setting they had.
    const wheel = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)").matches;
    // "Hareketi azalt": the browser's own scrolling, no smoother (see also scrollLock / scrollToSection).
    const calm = prefersReducedMotion();
    if (!calm) {
      smoother = ScrollSmoother.create({
        wrapper: "#smooth-wrapper",
        content: "#smooth-content",
        smooth: wheel ? 0.8 : 1.7,
        speed: wheel ? 0.55 : 1,
        effects: true,
        autoResize: true,
        ignoreMobileResize: true,
      });

      smoother.scrollTop(0);
      smoother.paused(true);
    }

    let links = document.querySelectorAll(".header ul a");
    links.forEach((elem) => {
      let element = elem as HTMLAnchorElement;
      element.addEventListener("click", (e) => {
        let elem = e.currentTarget as HTMLAnchorElement;
        let section = elem.getAttribute("data-href");
        if (!section) return; // a real page link (AI İşler)
        e.preventDefault();
        scrollToSection(section);
      });
    });
    if (!calm) {
      window.addEventListener("resize", () => {
        ScrollSmoother.refresh(true);
      });
    }
  }, []);
  return (
    <>
      <SiteHeader home />

      <div className="nav-fade"></div>
    </>
  );
};

export default Navbar;
