/**
 * The look of "Birlikte nasıl çalışırız?" (the process story), in one place. `storyLayer.ts` reads only this.
 *
 * One set of points carries all four steps. Shapes are in scene units around the middle of the box the story
 * is drawn into; the layer scales them to fit that box.
 */
export const storyConfig = {
  /** Point counts: desktop / phone. */
  count: { desktop: 30000, light: 11000 },
  /** Share of the points per role (they sum to 1): core, four orbits (or frames), focal nodes, dust. */
  share: { core: 0.17, r1: 0.15, r2: 0.14, r3: 0.13, r4: 0.11, node: 0.15, dust: 0.15 },

  /** Point size (scene units) and alpha. Additive blending: keep each point low. */
  size: { min: 0.18, max: 0.42, maxPx: 12 },
  alpha: 0.78,
  soft: 0.5,

  /** How much of the box the shapes fill (1 = the widest shape touches the box). */
  fit: 1.0,
  /** Largest extent of the shapes, scene units (width, height), used for fitting. */
  extent: { w: 50, h: 32 },

  /** Motion: slow breathing of the points, and how much of it is left once the story is complete. */
  motion: { fold: 1.5, ripple: 0.35, completeCalm: 0.3, turn: 0.2 },

  /** Pointer push (desktop, mouse only), share of the screen like the volume layer. */
  pointer: { push: 0.06, tint: 0.4 },

  /** The scroll: share of every step's stretch in which nothing moves, at each end (the "dwell"), 0..0.5. */
  dwell: 0.2,
  /** Desktop: scroll length of the pinned story in viewport heights (the whole story, not each step). */
  pinned: 3.2,

  /** Colour: one soft wave per step passes along the shape (turquoise, ice blue, a little lavender). */
  color: { strength: 0.5, waveWidth: 0.16 },
} as const;
