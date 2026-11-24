import { useEffect, useState } from "react";
import "./styles/Loading.css";

/**
 * A small status note while the 3D scene downloads. It never covers the page: the heading,
 * the menu and the scroll are usable from the first moment (the old full-screen loader is gone).
 */
const Loading = ({ percent }: { percent: number }) => {
  const [gone, setGone] = useState(false);
  const done = percent >= 100;

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setGone(true), 1600);
    return () => window.clearTimeout(t);
  }, [done]);

  // If the scene never arrives the page simply stays in its static view; do not leave a note up.
  useEffect(() => {
    const t = window.setTimeout(() => setGone(true), 30000);
    return () => window.clearTimeout(t);
  }, []);

  if (gone) return null;
  return (
    <div className={`load-chip${done ? " load-chip-done" : ""}`} role="status" aria-live="polite">
      <span className="load-chip-dot" aria-hidden="true" />
      <span>{done ? "3D sahne hazır" : `3D sahne hazırlanıyor · ${percent}%`}</span>
    </div>
  );
};

export default Loading;

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
