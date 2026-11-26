import { useSyncExternalStore } from "react";
import { prefersReducedMotion } from "./motion";

/**
 * "Sakin görünüm": the visitor's own choice to stop the continuous decorative motion and the automatic demo loops of
 * /zihnim and /ai-isler (set from the "Görünüm" menu, remembered on this device). The system's "Hareketi azalt"
 * setting always counts as calm; the choice here only adds to it.
 */
const KEY = "gorunum-sakin";
const read = () => {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
let chosen = typeof window !== "undefined" ? read() : false;
const listeners = new Set<() => void>();

export const viewMode = {
  /** The visitor's own choice. */
  chosen: () => chosen,
  /** Calm for any reason: the choice, or the system setting. */
  calm: () => chosen || prefersReducedMotion(),
  set(next: boolean) {
    if (next === chosen) return;
    chosen = next;
    try {
      window.localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* private mode: the choice lasts for this visit */
    }
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

/** True while the page should show still, finished compositions (the visitor's choice or the system setting). */
export const useCalmView = (): boolean => useSyncExternalStore(viewMode.subscribe, viewMode.calm, () => false);
