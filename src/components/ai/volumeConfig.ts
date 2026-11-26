/**
 * The look of the AI İşler particle volume, in one place.
 *
 * Everything a designer may want to tune is here; `volumeLayer.ts` only reads this file.
 * Sizes are world units of the scene (the camera looks down -z; the formation sits about 70 units away
 * and is about 60 units wide). Colours are linear-ish RGB 0..1 as the shader adds them.
 */
export const volumeConfig = {
  /** Particle counts per device class. The quality steps draw a growing share of them (draw range). */
  count: { desktop: 64000, light: 20000 },
  /** Share of the count: fine far dust / the main formation (the rest is the few large near points). */
  share: { far: 0.14, near: 0.04 },
  /** Where the formation sits: distance in front of the camera, and a slight offset to the right/up. */
  place: { z: -74, x: 0, y: -2.5, scale: 1.6, phoneScale: 0.9 },

  /** Point size in world units per tier (screen size = size * scale / distance), and the clamp in px. */
  size: { far: [0.16, 0.3], main: [0.2, 0.42], near: [0.45, 0.85], maxPx: 14 },
  /** Alpha per tier. Additive blending: keep each point low so dense folds do not burn to white. */
  alpha: { far: 0.34, main: 0.8, near: 0.3 },
  /** Softness of the point edge per tier (0 = crisp core, 1 = fully soft). Near points are the softest. */
  soft: { far: 0.35, main: 0.55, near: 0.95 },

  /** Palette. Most points stay off-white / pale grey; colour only arrives with the waves. */
  palette: {
    offWhite: [0.93, 0.94, 0.92],
    paleGrey: [0.6, 0.65, 0.7],
    teal: [0.2, 0.9, 0.8],
    ice: [0.55, 0.8, 1.0],
    lavender: [0.66, 0.58, 0.96],
  },
  /** How much lavender may appear next to the turquoise (0..1 of the colour range; keep it small). */
  lavenderShare: 0.3,

  /** The looping colour waves. All of them repeat exactly every `loopSeconds`, so the seam is invisible. */
  color: {
    loopSeconds: 16,
    /** Peak share of colour a wave adds to a point (0..1). */
    strength: 0.9,
    /** Waves: how many laps along the formation per loop (whole number), width and trail (0..1 of the length),
     *  where across the width it runs (centre, spread) and where in the loop it starts (0..1). */
    waves: [
      { laps: 1, width: 0.13, trail: 0.3, across: 0.1, spread: 1.0, start: 0.0, hue: 0.0 },
      { laps: 1, width: 0.11, trail: 0.25, across: -0.45, spread: 0.8, start: 0.42, hue: 0.55 },
      { laps: 2, width: 0.1, trail: 0.2, across: 0.5, spread: 0.75, start: 0.73, hue: 0.3 },
    ],
    /** The moment of the loop (0..1) shown by the still picture ("Hareketi azalt"). */
    stillAt: 0.12,
  },

  /** Slow breathing of the folds. Rates are whole multiples of a 4x loop, so motion never jumps either. */
  motion: {
    /** Strength of the large folds (world units). */
    fold: 3.4,
    /** Strength of the small local movement (world units). */
    ripple: 0.55,
    /** Overall speed factor of the breathing (1 = about 20 s per breath). */
    speed: 1,
    /** Slow turn of the whole formation, radians (back and forth, never a full turn). */
    turn: 0.1,
    /** How much the camera/pointer parallax turns the formation, radians at the screen edge. */
    parallax: 0.06,
  },

  /** The pointer (mouse only). Radius is set by the flow field (about 0.1 of the screen height). */
  pointer: {
    /** Displacement of near points, as a share of the screen (flow field units). */
    push: 0.075,
    /** Extra spacing of the points near the pointer (grows their gaps a little). */
    spread: 0.55,
    /** The little colour that goes with the touch (0..1). */
    tint: 0.5,
    /** The flow field itself (flowField.ts) lets the effect fade out in about a third of a second. */
  },

  /** The calm of the writing: how dark the formation is over the left text column and behind media boxes. */
  readability: {
    /** Brightness left over the left column on wide screens (0..1). */
    textColumn: 0.1,
    /** Brightness left behind the example box of a stop (it is covered by the box anyway). */
    behindBox: 0.12,
    /** Extra brightness around the showreel's edge (a soft halo, 0..1). */
    aroundMedia: 1.25,
    /** Phones: overall brightness, and what is left of it over the title zone at the top (0..1). */
    phoneAlpha: 0.85,
    phoneTop: 0.45,
  },

  /** The scroll: the formation is fully shown at stop 0 and 1 and leaves between stop 1 and `fadeEnd`. */
  scroll: { morphEnd: 1, fadeStart: 1.25, fadeEnd: 2.2 },
} as const;

export type VolumeConfig = typeof volumeConfig;
