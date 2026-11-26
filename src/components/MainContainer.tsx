import ZihnimDoor from "./ZihnimDoor";
import HomeShowreel from "./HomeShowreel";
import { lazy, PropsWithChildren, Suspense, useEffect, useState } from "react";
import About from "./About";
import Brands from "./Brands";
import Career from "./Career";
import Contact from "./Contact";
import Faq from "./Faq";
import VideoReview from "./VideoReview";
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

// last, so its overrides come after the styles of the sections
import "./styles/home-polish.css";

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

  // The opening (Loading) runs initialFX when it ends: the heading is revealed and scrolling is
  // switched on then, not before.

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
            <HomeShowreel />
            <About />
            <WhatIDo />
            <Brands />
            <Career />
            <Work />
            <ZihnimDoor />
            {hasWebGL() ? (
              <ErrorBoundary fallback={<ToolsFallback />}>
                <Suspense fallback={<div className="techstack" aria-hidden="true" />}>
                  <TechStack />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <ToolsFallback />
            )}
            <Faq />
            <VideoReview />
            <Contact />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainContainer;
