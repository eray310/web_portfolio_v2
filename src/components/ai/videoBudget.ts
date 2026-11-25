/**
 * At most one video decodes at a time on /ai-isler. A video that starts to play first asks here;
 * every other registered video is paused. (The opening showreel and the preview in the middle of
 * the page are rarely on screen together, but a fast scroll can have both near the edge.)
 */
const players = new Map<string, () => void>();

export const videoBudget = {
  /** Registers a pause function; returns a function that takes the video out again. */
  register(id: string, pause: () => void) {
    players.set(id, pause);
    return () => {
      players.delete(id);
    };
  },
  /** Called right before `id` plays: pauses all the others. */
  claim(id: string) {
    players.forEach((pause, key) => {
      if (key !== id) pause();
    });
  },
};
