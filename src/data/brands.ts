/**
 * Brands shown in the "Çalıştığım Markalar" strip.
 *
 * Add a brand with ONE line: put its PNG in `public/brands/` and write the
 * brand name and the file path below. Example:
 *
 *   { name: "DBH Group", logo: "brands/dbh-group.png" },
 *
 * (that file is `public/brands/dbh-group.png`). Use a transparent PNG; any
 * wide or square logo works, it is scaled to fit a fixed box.
 *
 * While the list is empty the strip is hidden on the published site. On the
 * local dev server (npm run dev) a row of empty slots is shown instead so the
 * layout can be previewed.
 */
export type Brand = {
  /** Brand name; used as the image description. */
  name: string;
  /** Path of the logo inside `public/`, e.g. "brands/dbh-group.png". */
  logo: string;
};

export const brands: Brand[] = [];
