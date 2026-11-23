import { SplitText } from "gsap/SplitText";
import gsap from "gsap";
import { smoother } from "../Navbar";
import { watchNameGradient } from "./nameGradient";
import { scrollToSection } from "./scrollToSection";

export function initialFX() {
  document.body.style.overflowY = "auto";
  smoother.paused(false);
  document.getElementsByTagName("main")[0].classList.add("main-active");
  gsap.to("body", {
    backgroundColor: "#0a0e17",
    duration: 0.5,
    delay: 1,
  });

  var landingText = new SplitText([".landing-intro h2", ".landing-intro h1"], {
    type: "chars,lines",
    linesClass: "split-line",
    charsClass: "split-char",
  });
  // Colour fade on the name; must be in place before the letters start moving.
  watchNameGradient();
  gsap.fromTo(
    landingText.chars,
    { opacity: 0, y: 80, filter: "blur(5px)" },
    {
      opacity: 1,
      duration: 1.2,
      filter: "blur(0px)",
      ease: "power3.inOut",
      y: 0,
      stagger: 0.025,
      delay: 0.3,
    }
  );

  // Four titles appear one after another and stay visible together.
  gsap.fromTo(
    ".landing-titles li",
    { opacity: 0, y: 30, filter: "blur(5px)" },
    {
      opacity: 1,
      duration: 1,
      filter: "blur(0px)",
      ease: "power3.out",
      y: 0,
      stagger: 0.3,
      delay: 0.9,
    }
  );

  gsap.fromTo(
    ".landing-cta",
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 2.1 }
  );

  gsap.fromTo(
    [".header", ".icons-section", ".nav-fade"],
    { opacity: 0 },
    {
      opacity: 1,
      duration: 1.2,
      ease: "power1.inOut",
      delay: 0.1,
    }
  );

  // A link such as /#work or /#contact (for example from the About page): once the
  // intro is over and the smooth scroller is running, go to that section.
  const hash = window.location.hash;
  if (hash.length > 1) {
    window.setTimeout(() => {
      try {
        if (document.querySelector(hash)) scrollToSection(hash);
      } catch {
        /* not a valid selector: stay at the top */
      }
    }, 1400);
  }
}
