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
export const spaceBus = {
  playerOpen: false,
  briefOpen: false,
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
