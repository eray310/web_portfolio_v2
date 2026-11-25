/**
 * Everything that has to change when the final character arrives lives here (and nowhere else):
 * the model file, its scale, direction and framing, which parts of it become particles, the pose.
 *
 * The particles are sampled from the SURFACE of the model's meshes, so any GLB / GLTF works as long as
 * the numbers below are adjusted to it. To try a new model:
 *   1. Put the file in public/models/ (an unencrypted .glb needs no `password`).
 *   2. Set `url` (path inside public/) and, for the current encrypted file, `password`.
 *   3. Open /hakkimda?prototip=parcacik&model=debug : the console lists every mesh with its box, so
 *      `include` / `exclude` and the crop can be filled in. `fit.height` sizes the result,
 *      `rotationY` turns it, `offset` moves it, `facing` says which way the front looks.
 *   4. If it has an animation, `pose.clip` and `pose.at` pick the pose that is sampled.
 * The same number of particles is used for every shape, so a new model needs nothing else.
 */
export type ModelConfig = {
  /** Path inside public/. */
  url: string;
  /** Only for the current encrypted file (see Character/utils/decrypt.ts). */
  password?: string;
  /** Mesh names that become particles (exact names). Empty = every mesh except `exclude`. */
  include: string[];
  /** Mesh names that never do (desk, keyboard, ...). */
  exclude: string[];
  /** Keep only triangles inside this box of the MODEL's own units (min / max y, optional x). Per mesh name or "*". */
  crop: Record<string, { minY?: number; maxY?: number; maxAbsX?: number }>;
  /** The result is scaled so that it is this tall (world units of the particle scene) and centred. */
  fit: { height: number };
  /** Turn the result around the vertical axis (radians) after sampling. */
  rotationY: number;
  /** Move the result (world units, after fitting). */
  offset: [number, number, number];
  /** Which way the front of the model looks (model space); triangles that face away are not sampled. */
  facing: [number, number, number];
  /** -1 keeps everything, 0 keeps the front half, 0.2 only what clearly faces the front. */
  minFacing: number;
  /** The pose that is sampled: an animation clip of the file and where in it ("start" | "end" | seconds). */
  pose?: { clip: string; at: "start" | "end" | number };
};

export const characterModel: ModelConfig = {
  url: "models/character.enc?v=2",
  password: "MyCharacter12",
  // Head and shoulders of the current (temporary) character.
  include: ["BODY.SHIRT", "CAP.001", "CAP.002", "Ear.001", "Eyebrow", "EYEs.001", "Face.002", "Hair", "Neck", "Teeth.001"],
  exclude: ["Hand", "Pant", "Shoe", "Sole", "Cube.002", "screenlight", "Keyboard", "Plane", "Plane.002", "Plane.003", "Plane.004", "ground"],
  // minY is in the units of the POSED model (the intro animation leans the character forward)
  crop: { "BODY.SHIRT": { minY: 8.9 } },
  fit: { height: 6.3 },
  rotationY: 0,
  offset: [0, 0, 0],
  facing: [0, 0, 1],
  minFacing: -0.05,
  pose: { clip: "introAnimation", at: "end" },
};

/** Particle counts and sizes by device (the system picks one; see ParticleStory.setQuality). */
export const particleTiers = {
  high: { count: 42000, dpr: 1.5, size: 1.55 },
  mid: { count: 26000, dpr: 1.25, size: 1.7 },
  low: { count: 14000, dpr: 1, size: 1.9 },
};

export const pickTier = (): keyof typeof particleTiers => {
  const w = window.innerWidth;
  const cores = navigator.hardwareConcurrency || 4;
  if (w < 768 || cores < 4 || window.matchMedia("(pointer: coarse)").matches) return "low";
  if (cores < 8) return "mid";
  return "high";
};

/** Colours of the story (the site's palette): off-white and turquoise on the dark ground. */
export const palette = { ground: 0x05070c, offWhite: [0.92, 0.9, 0.93] as const, teal: [0.37, 0.92, 0.83] as const };
