/**
 * Videos shown in the window that opens when a logo in the "Çalıştığım Markalar"
 * strip is clicked. This is the ONLY file you need to edit to add videos.
 *
 * Put the files in  public/brand-videos/<brand>/  and list them under the brand
 * name exactly as it is written in src/data/brands.ts. Example:
 *
 *   "Allvex": [
 *     {
 *       title: "Yaz kampanyası reels",
 *       poster: "brand-videos/allvex/yaz-kampanyasi.jpg",          // cover image
 *       preview: "brand-videos/allvex/yaz-kampanyasi-onizleme.mp4", // optional: short silent clip on hover
 *       video: "brand-videos/allvex/yaz-kampanyasi.mp4",           // the full video
 *     },
 *   ],
 *
 * - poster:  required. Loaded only when the brand window opens.
 * - preview: optional, 3-5 s, small (no sound needed). Loaded only while the
 *            mouse is over the card. Without it the cover image stays.
 * - video:   required. Loaded only when the card is clicked.
 * - ratio:   optional (width / height, e.g. 9 / 16 or 16 / 9). Normally not
 *            needed: it is read from the cover image. Set it to avoid any
 *            layout shift.
 *
 * A brand with no entry (or an empty list) shows
 * "Bu markaya ait videolar yakında eklenecek".
 */
export type BrandVideo = {
  title: string;
  poster: string;
  preview?: string;
  video: string;
  ratio?: number;
};

export const brandVideos: Record<string, BrandVideo[]> = {
  // Demo entries that reuse files already in public/portfolio, so the window
  // can be tried. Replace or delete them when the real videos are ready.
  Allvex: [
    {
      title: "Allvex Reels",
      poster: "portfolio/Allvex_Reels4.jpg",
      preview: "portfolio/previews/Allvex_Reels4.mp4",
      video: "portfolio/Allvex_Reels4.mp4",
    },
  ],
  Allesta: [
    {
      title: "Allesta YZ Reklam",
      poster: "portfolio/Allesta_YZReklam.jpg",
      preview: "portfolio/previews/Allesta_YZReklam.mp4",
      video: "portfolio/Allesta_YZReklam.mp4",
    },
  ],
};
