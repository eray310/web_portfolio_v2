/**
 * Material for the "choose to open" interactions. Everything here comes from the works
 * themselves: the cover images, colours sampled from those covers and a region of the
 * cover that holds the lettering.
 * The code that uses it is loaded only when a visitor opens an interaction.
 */

/** A rectangle in percent of the cover (x, y = top left). */
export type Rect = { x: number; y: number; w: number; h: number };

export type LayersSpec = {
  /** Cover inside public/portfolio/ */
  poster: string;
  /** Colours sampled from the cover. */
  palette: string[];
  /** The part of the cover that carries the lettering. */
  type: Rect;
  /** Short name shown on the view. */
  title: string;
};

export type GravitySpec = {
  poster: string;
  palette: string[];
  type: Rect;
  title: string;
};

export type ProjectInteractions = {
  layers?: LayersSpec;
  gravity?: GravitySpec;
};

/** The Allesta work carries the Hakkımda story. */
export const allesta = {
  layers: {
    poster: "Allesta_YZReklam.jpg",
    palette: ["#051110", "#748a8d", "#cec7ae", "#e4ab65"],
    type: { x: 8, y: 59, w: 84, h: 15 },
    title: "Allesta",
  } satisfies LayersSpec,
};

/** Works in Seçili İşler that get an interaction (chosen for what their covers and clips show). */
export const projectInteractions: Record<string, ProjectInteractions> = {
  // Big lettering and a strong colour field: good for opening the layers.
  "Next Telekom": {
    layers: {
      poster: "next-telekom.jpg",
      palette: ["#11064f", "#2e086e", "#182f96", "#e8203c"],
      type: { x: 0, y: 22, w: 100, h: 34 },
      title: "Next Telekom",
    },
  },
  // A cover made of clear parts: a pink palette, a character, a logo line.
  "Voop — Karikatür": {
    gravity: {
      poster: "voop-karikatur.jpg",
      palette: ["#ecced2", "#d6aab0", "#ca8e96", "#faefeb"],
      type: { x: 25, y: 85, w: 50, h: 8 },
      title: "Voop",
    },
  },
};
