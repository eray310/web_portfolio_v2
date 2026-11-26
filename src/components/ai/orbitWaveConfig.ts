/** The look of the /hakkimda pointer wave (OrbitFlow.tsx): all settings in one place. */
export const orbitWave = {
  /** Faint stars on the canvas: desktop / phone (a phone only gets the resting picture). */
  count: { desktop: 1100, light: 260 },
  /** Brighter near stars among them. */
  near: 64,
  /** Largest sideways push in px for a star at full depth (the flow field's own strength is capped). */
  push: 46,
  /** How far a star rises out of the sky at most (1 = radius grows by `grow`, alpha by `glow`). */
  grow: 2.0,
  glow: 2.4,
  /** Sideways shift of a risen star away from the screen centre, share of its distance (parallax). */
  parallax: 0.014,
  /** Speed (per second) at which a star follows the flow, and at which it settles when the flow is gone. */
  follow: 18,
  settle: 11,
  /** Colour of the wave: from the star's own colour to ice blue to turquoise (rgb). */
  ice: [170, 214, 255],
  teal: [94, 234, 212],
  /** Largest share of the tint (0..1). */
  tint: 0.7,
};
