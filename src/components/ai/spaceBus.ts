/**
 * What the page and the space scene tell each other.
 *
 * Read every frame by the scene (no re-render needed):
 *  - playerOpen: a video player is open; the background calms down so it does not compete with it
 *  - briefOpen:  the brief form covers the page; the scene stops drawing
 *
 * The state of the "Arka planı durdur" control, shared by every copy of it on the page (the opening
 * and the footer) through a tiny store: `live` (the scene is drawing and can be stopped), `paused`.
 */
/**
 * A small particle "stage" drawn inside the page's one renderer (the particle prototype, ?prototip=parcacik):
 * the scene calls it every frame it draws; the stage says where it is on screen and draws into that box.
 */
export type StageHost = {
  /** The box on screen, in viewport px (null when there is nothing to draw). */
  rect: () => { left: number; top: number; width: number; height: number; right: number; bottom: number } | null;
  /** Advances the loop's clock. Called only while the box is on screen. */
  step: (dt: number) => void;
  /** Draws into the already set viewport. */
  render: (renderer: import("three").WebGLRenderer, pixelRatio: number) => void;
};

export const spaceBus = {
  playerOpen: false,
  briefOpen: false,
  stage: null as StageHost | null,
  /** The stage's box is on screen: every frame is drawn, not every second one. */
  stageLive: false,
};

type Listener = () => void;
const listeners = new Set<Listener>();
let state = { live: false, paused: false };

export const spaceControl = {
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  get() {
    return state;
  },
  set(next: Partial<typeof state>) {
    state = { ...state, ...next };
    listeners.forEach((fn) => fn());
  },
};
