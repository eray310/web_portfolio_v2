import { SplitText } from "gsap/SplitText";
import gsap from "gsap";
import { smoother } from "../Navbar";
import { watchNameGradient } from "./nameGradient";
import { scrollToSection, sectionGap } from "./scrollToSection";
import { prefersReducedMotion } from "../../utils/motion";
import { deepLinkHash, restoreDeepLink } from "../../utils/deepLink";

export function initialFX() {
  const calm = prefersReducedMotion();
  document.body.style.overflowY = "auto";
  smoother?.paused(false);
  document.documentElement.classList.add("fx-ready");
  if (calm) {
    gsap.set("body", { backgroundColor: "#0a0e17" });
  } else {
    document.getElementsByTagName("main")[0].classList.add("main-active");
    gsap.to("body", {
      backgroundColor: "#0a0e17",
      duration: 0.5,
      delay: 1,
    });
  }

  var landingText = new SplitText([".landing-intro h2", ".landing-intro h1"], {
    type: "chars,lines",
    linesClass: "split-line",
    charsClass: "split-char",
  });
  // SplitText labels the heading with its letters run together ("ERAYÖMEROĞLU"); say it properly.
  document.querySelector(".landing-intro h1")?.setAttribute("aria-label", "Eray Ömeroğlu");
  // Colour fade on the name; must be in place before the letters start moving.
  watchNameGradient();
  // "Hareketi azalt": the heading is simply there; no letter or fade animations.
  if (calm) return followHash();
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

  followHash();
}

function followHash() {
  // A link such as /#work or /#contact (for example from the About page): once the
  // intro is over and the smooth scroller is running, go to that section. The page
  // can still grow while the 3D scene finishes setting up (its pinned scroll
  // sections add height), which would leave the first jump short of the target, so
  // the position is checked a few times and corrected until it holds, without the
  // visitor having to touch the wheel. Any scroll, touch or key press by the
  // visitor ends this at once.
  const hash = deepLinkHash || window.location.hash;
  if (hash.length > 1) {
    let done = false;
    let tries = 0;
    let lastGap = Infinity;
    const events = ["wheel", "touchstart", "keydown", "mousedown"] as const;
    const finish = () => {
      done = true;
      restoreDeepLink();
      events.forEach((e) => window.removeEventListener(e, finish));
    };
    events.forEach((e) => window.addEventListener(e, finish, { passive: true }));
    const aim = () => {
      if (done) return;
      let gap: number | null = null;
      try {
        gap = sectionGap(hash);
      } catch {
        /* not a valid selector: stay at the top */
        return finish();
      }
      if (gap === null) {
        // Not there yet (the scroller is still starting); try again shortly.
        if (tries++ < 12) window.setTimeout(aim, 500);
        else finish();
        return;
      }
      const arrived = Math.abs(gap) <= 6;
      // Re-aim only when the section has come to rest away from its place, so a
      // scroll that is still running is never restarted.
      if (!arrived && Math.abs(gap - lastGap) < 1) scrollToSection(hash);
      lastGap = gap;
      if (arrived) {
        restoreDeepLink();
        // Hold for a few more checks in case the layout changes again, then stop.
        if (tries++ >= 6) return finish();
      } else if (tries++ >= 14) {
        return finish();
      }
      window.setTimeout(aim, 700);
    };
    window.setTimeout(() => {
      if (done) return;
      try {
        if (document.querySelector(hash)) scrollToSection(hash);
      } catch {
        return finish();
      }
      window.setTimeout(aim, 900);
    }, 1400);
  }
}
