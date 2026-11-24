import { lazy, PropsWithChildren, Suspense, useEffect, useState } from "react";
import About from "./About";
import Brands from "./Brands";
import Career from "./Career";
import Contact from "./Contact";
import Cursor from "./Cursor";
import Landing from "./Landing";
import Navbar from "./Navbar";
import SocialIcons from "./SocialIcons";
import IdeaButton from "./IdeaButton";
import WhatIDo from "./WhatIDo";
import Work from "./Work";
import setSplitText from "./utils/splitText";
import ErrorBoundary from "./ErrorBoundary";
import ToolsFallback from "./ToolsFallback";
import { hasWebGL } from "../utils/webgl";
import { initialFX } from "./utils/initialFX";

let fxStarted = false;

const TechStack = lazy(() => import("./TechStack"));

const MainContainer = ({ children }: PropsWithChildren) => {
  const [isDesktopView, setIsDesktopView] = useState<boolean>(
    window.innerWidth > 1024
  );

  useEffect(() => {
    const resizeHandler = () => {
      setSplitText();
      setIsDesktopView(window.innerWidth > 1024);
    };
    resizeHandler();
    window.addEventListener("resize", resizeHandler);
    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, [isDesktopView]);

  // The first screen does not wait for the 3D scene: once the fonts are in (or after 1.2 s at
  // most) the heading is revealed and scrolling is on, whatever the character is doing.
  useEffect(() => {
    if (fxStarted) return;
    fxStarted = true;
    let ran = false;
    const start = () => {
      if (ran) return;
      ran = true;
      initialFX();
    };
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    let t = 0;
    const once = () => {
      window.clearTimeout(t);
      start();
    };
    t = window.setTimeout(once, 1200);
    if (fonts?.ready) fonts.ready.then(() => window.setTimeout(once, 0));
  }, []);

  return (
    <div className="container-main">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus({ preventScroll: true });
        }}
      >
        İçeriğe geç
      </a>
      <Cursor />
      <Navbar />
      <SocialIcons />
      <IdeaButton />
      {isDesktopView && children}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <div className="container-main">
            <Landing>{!isDesktopView && children}</Landing>
            <About />
            <WhatIDo />
            <Brands />
            <Career />
            <Work />
            {hasWebGL() ? (
              <ErrorBoundary fallback={<ToolsFallback />}>
                <Suspense fallback={<div className="techstack" aria-hidden="true" />}>
                  <TechStack />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <ToolsFallback />
            )}
            <Contact />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainContainer;
