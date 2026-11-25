import { useEffect, useState, type RefObject } from "react";

/**
 * True while the element is on screen and the tab is visible. The live explanations on /ai-isler
 * (and anything else that moves) run only while this is true: they stop the moment the section is
 * scrolled out of view or the tab is hidden, and start again when it comes back.
 */
export function useActive(ref: RefObject<Element>, threshold = 0.25): boolean {
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(typeof document === "undefined" ? true : !document.hidden);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  useEffect(() => {
    const on = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return inView && visible;
}
