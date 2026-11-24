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

/**
 * Own list, separate from the "Seçili İşler" gallery data (src/data/projects.ts): a change
 * there does not touch this window and the other way round.
 *
 * Each entry below is a video made for that brand (the work descriptions in the gallery
 * name the brand: "Allvex için", "Allesta için", "Voop için"). It points at the same files
 * on disk, nothing is copied. A brand with no entry shows the empty state.
 */
export const brandVideos: Record<string, BrandVideo[]> = {
  Allvex: [
    {
      title: "Allvex | Sosyal Medya Videosu",
      poster: "portfolio/Allvex_Reels4.jpg",
      preview: "portfolio/previews/Allvex_Reels4.mp4",
      video: "portfolio/web/Allvex_Reels4.mp4",
    },
  ],
  Allesta: [
    {
      title: "Allesta | Yapay Zekâ Destekli Reklam",
      poster: "portfolio/Allesta_YZReklam.jpg",
      preview: "portfolio/previews/Allesta_YZReklam.mp4",
      video: "portfolio/web/Allesta_YZReklam.mp4",
    },
  ],
  Voop: [
    {
      title: "Voop — Karikatür",
      poster: "portfolio/voop-karikatur.jpg",
      preview: "portfolio/previews/voop-karikatur.mp4",
      video: "portfolio/VoopKarikatür.mp4",
    },
  ],
};
