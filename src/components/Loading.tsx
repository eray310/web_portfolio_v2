import { useEffect, useRef, useState } from "react";
import "./styles/Loading.css";
import { useLoading } from "../context/LoadingProvider";
import { prefersReducedMotion } from "../utils/motion";

import Marquee from "react-fast-marquee";

// The opening, in the order it always had: the percentage counts up, "Hoş geldin" replaces it
// (600 ms after 100 %), the pill opens (1 s later), the screen slides away (900 ms later) and only
// then the heading is revealed and the 3D character is shown and starts its intro.
const WELCOME_MS = 600;
const OPEN_MS = 1000;
const LEAVE_MS = 900;
// The screen never holds the visitor back for ever: a slow link or a scene that does not start
// ends it after this long (the page is usable, the character shows up when it is ready).
const MAX_WAIT_MS = 12000;

// What waits for the end of the loading screen (the 3D scene starts its intro and shows the
// character then). If the screen is already over, the callback runs at once.
let introStarted = false;
const introWaiters: Array<() => void> = [];
export function whenIntro(callback: () => void) {
  if (introStarted) callback();
  else introWaiters.push(callback);
}
function startIntro() {
  introStarted = true;
  introWaiters.splice(0).forEach((cb) => cb());
}

const Loading = ({ percent }: { percent: number }) => {
  const { setIsLoading } = useLoading();
  const [loaded, setLoaded] = useState(false);
  const [clicked, setClicked] = useState(false);
  const calm = useRef(prefersReducedMotion()).current;
  const [forced, setForced] = useState(false);
  const done = useRef(false);
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // The page's opening effects are fetched as soon as the screen appears, not when it closes: on a
  // slow link the closing frame (the dark fill) would otherwise wait for this download.
  const fx = useRef<Promise<typeof import("./utils/initialFX")> | null>(null);
  if (!fx.current) {
    fx.current = import("./utils/initialFX");
    fx.current.catch(() => {}); // handled in finish(); no "uncaught" report before that
  }

  const finish = () => {
    if (done.current) return;
    done.current = true;
    fx.current!
      .then((module) => module.initialFX?.())
      .catch((error) => {
        // The effects could not be loaded or failed: the screen still ends and the page is usable
        // (scrolling on, static heading) instead of staying on the closing frame for ever.
        console.error(error);
        document.body.style.overflowY = "auto";
        document.documentElement.classList.add("fx-ready");
        import("./Navbar").then((m) => m.smoother?.paused(false)).catch(() => {});
      })
      .finally(() => {
        startIntro();
        setIsLoading(false);
      });
  };

  // 100 % (or the longest wait): run the closing sequence once.
  const ready = percent >= 100 || forced;
  useEffect(() => {
    if (!ready || done.current) return;
    if (calm) {
      // "Hareketi azalt": the still version has no sequence; it just ends.
      setLoaded(true);
      later(finish, 250);
      return;
    }
    later(() => {
      setLoaded(true);
      later(() => {
        setClicked(true);
        later(finish, LEAVE_MS);
      }, OPEN_MS);
    }, WELCOME_MS);
  }, [ready]);

  useEffect(() => {
    later(() => setForced(true), MAX_WAIT_MS);
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const { currentTarget: target } = e;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    target.style.setProperty("--mouse-x", `${x}px`);
    target.style.setProperty("--mouse-y", `${y}px`);
  }

  return (
    <div className={calm ? "loading-still" : undefined} role="status" aria-label={loaded ? "Hoş geldin" : "Yükleniyor"}>
      <div className="loading-header">
        <a href="/#" className="loader-title" data-cursor="disable">
          EÖ
        </a>
        <div className={`loaderGame ${clicked && "loader-out"}`}>
          <div className="loaderGame-container">
            <div className="loaderGame-in">
              {[...Array(27)].map((_, index) => (
                <div className="loaderGame-line" key={index}></div>
              ))}
            </div>
            <div className="loaderGame-ball"></div>
          </div>
        </div>
      </div>
      <div className="loading-screen">
        <div className="loading-marquee" aria-hidden="true" lang="en">
          <Marquee play={!calm}>
            <span>Motion Designer</span> <span>Art Director</span>
            <span>Video Editor</span> <span>AI Artist</span>
          </Marquee>
        </div>
        <div className={`loading-wrap ${clicked && "loading-clicked"}`} onMouseMove={(e) => handleMouseMove(e)}>
          <div className="loading-hover"></div>
          <div className={`loading-button ${loaded && "loading-complete"}`}>
            <div className="loading-container">
              <div className="loading-content">
                <div className="loading-content-in">
                  <span className="loading-text">Yükleniyor…</span>
                  <span className="loading-percent" aria-hidden="true">{Math.min(100, forced ? 100 : percent)}%</span>
                </div>
              </div>
              <div className="loading-box"></div>
            </div>
            <div className="loading-content2">
              <span>Hoş geldin</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loading;

/** Fake progress count shown while the 3D scene loads; the scene finishes it (see Scene.tsx). */
export const setProgress = (setLoading: (value: number) => void) => {
  let percent: number = 0;

  let interval = setInterval(() => {
    if (percent <= 50) {
      let rand = Math.round(Math.random() * 5);
      percent = percent + rand;
      setLoading(percent);
    } else {
      clearInterval(interval);
      interval = setInterval(() => {
        percent = percent + Math.round(Math.random());
        setLoading(percent);
        if (percent > 91) {
          clearInterval(interval);
        }
      }, 2000);
    }
  }, 100);

  function clear() {
    clearInterval(interval);
    setLoading(100);
  }

  function loaded() {
    return new Promise<number>((resolve) => {
      clearInterval(interval);
      interval = setInterval(() => {
        if (percent < 100) {
          percent++;
          setLoading(percent);
        } else {
          resolve(percent);
          clearInterval(interval);
        }
      }, 2);
    });
  }
  /** Stops the fake progress without finishing the loading screen. */
  function stop() {
    clearInterval(interval);
  }

  return { loaded, percent, clear, stop };
};
