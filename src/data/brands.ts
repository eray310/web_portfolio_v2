/**
 * Brands shown in the "Çalıştığım Markalar" strip.
 *
 * The strip shows every logo as plain white on the dark page. For each brand
 * there are two files:
 *   - public/brands/<name>.png        the original colour logo (kept as is)
 *   - public/brands/white/<name>.png  the white copy that the site uses
 *
 * Add a brand with ONE line pointing at its white PNG (transparent background,
 * empty margin trimmed). Example:
 *
 *   { name: "DBH Group", logo: "brands/white/dbh-group.png" },
 *
 * White copies are made from the colour PNG: every coloured part becomes white,
 * near-white parts become gaps, and two-colour marks (like the Neomarin fish)
 * keep their inner detail as gaps.
 *
 * A logo whose file is missing is left out instead of showing a broken image.
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

export const brands: Brand[] = [
  { name: "Allvex", logo: "brands/white/allvex.png" },
  { name: "MAB Turkey", logo: "brands/white/mabturkey.png" },
  { name: "Neomarin", logo: "brands/white/neomarin.png" },
  { name: "Çamsan Park", logo: "brands/white/camsanpark.png" },
  { name: "Dağ Holding", logo: "brands/white/dagholding.png" },
  { name: "Üçay Mühendislik", logo: "brands/white/ucaymuhendislik.png" },
  { name: "Üçay 360", logo: "brands/white/ucay360.png" },
  { name: "Allesta", logo: "brands/white/allesta.png" },
  { name: "Genç MÜSİAD", logo: "brands/white/gencmusiad.png" },
];
