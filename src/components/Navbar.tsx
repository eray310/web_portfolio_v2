import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HoverLinks from "./HoverLinks";
import { scrollToSection } from "./utils/scrollToSection";
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import "./styles/Navbar.css";

gsap.registerPlugin(ScrollSmoother, ScrollTrigger);
export let smoother: ScrollSmoother;

const Navbar = () => {
  useEffect(() => {
    // Mouse wheel on a desktop: the content moves half of what the wheel gave in the
    // first version (speed 0.5) and comes to rest quickly (smooth 0.8 s). Touch screens
    // keep the finger-following setting they had.
    const wheel = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)").matches;
    smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: wheel ? 0.8 : 1.7,
      speed: wheel ? 0.5 : 1,
      effects: true,
      autoResize: true,
      ignoreMobileResize: true,
    });

    smoother.scrollTop(0);
    smoother.paused(true);

    let links = document.querySelectorAll(".header ul a");
    links.forEach((elem) => {
      let element = elem as HTMLAnchorElement;
      element.addEventListener("click", (e) => {
        e.preventDefault();
        let elem = e.currentTarget as HTMLAnchorElement;
        let section = elem.getAttribute("data-href");
        if (section) scrollToSection(section);
      });
    });
    window.addEventListener("resize", () => {
      ScrollSmoother.refresh(true);
    });
  }, []);
  return (
    <>
      <div className="header">
        <a href="/#" className="navbar-title" data-cursor="disable">
          EÖ
        </a>
        <a
          href="https://www.behance.net/erayomeroglu"
          className="navbar-connect"
          data-cursor="disable"
          target="_blank"
          rel="noreferrer"
        >
          behance.net/erayomeroglu
        </a>
        <ul>
          <li>
            <a data-href="#work" href="#work">
              <HoverLinks text="SEÇİLİ İŞLER" />
            </a>
          </li>
          <li>
            <a data-href="#about" href="#about">
              <HoverLinks text="HAKKIMDA" />
            </a>
          </li>
          <li>
            <a data-href="#contact" href="#contact">
              <HoverLinks text="İLETİŞİM" />
            </a>
          </li>
        </ul>
      </div>

      <div className="landing-circle1"></div>
      <div className="landing-circle2"></div>
      <div className="nav-fade"></div>
    </>
  );
};

export default Navbar;
