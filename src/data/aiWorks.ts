/**
 * The cards on /ai-isler ("AI İşler").
 *
 * Each card has a title, a short description and a "Projeni anlat" button that opens the
 * brief form with `service` already chosen. `service` must be one of the labels in
 * src/data/brief.ts (the three AI services are already there).
 *
 * To show a real project on a card, put the files in  public/ai-works/<card>/  and add them
 * here. Nothing else needs to change. Example:
 *
 *   {
 *     id: "web-sitesi",
 *     ...
 *     image: "ai-works/web-sitesi/kapak.jpg",      // cover; shown as soon as the page opens
 *     imageAlt: "Örnek web sitesinin ana sayfası",  // what the picture shows (empty = decorative)
 *     video: "ai-works/web-sitesi/tanitim.mp4",     // optional; loaded only when it is played
 *     ratio: 4 / 3,                                  // width / height of the picture or video
 *   },
 *
 * Without `image` (and `video`) the card shows a plain placeholder panel. The texts below are
 * a first draft: edit them freely.
 */
export type AiWork = {
  id: string;
  title: string;
  /** Label of the brief service that "Projeni anlat" chooses (see src/data/brief.ts). */
  service: string;
  text: string;
  /** Path inside public/. Cover image, also used as the video poster. */
  image?: string;
  /** What the image shows, for screen readers. Leave empty for a purely decorative picture. */
  imageAlt?: string;
  /** Path inside public/. Loaded only when the visitor presses play. */
  video?: string;
  /** Width / height of the media box (default 4 / 3). */
  ratio?: number;
};

export const aiWorks: AiWork[] = [
  {
    id: "web-sitesi",
    title: "Web Sitesi",
    service: "Web Sitesi",
    text: "Markanın dilini taşıyan, hızlı açılan ve telefonda rahat kullanılan web siteleri. Yapay zekâ desteğiyle tasarım ve kurulum.",
  },
  {
    id: "reklam-filmi",
    title: "Reklam Filmi ve Video",
    service: "Reklam Filmi ve Video",
    text: "Yapay zekâ destekli görseller, kurgu ve hareketli grafiklerle hazırlanan reklam filmleri ve kısa videolar.",
  },
  {
    id: "uygulama",
    title: "Uygulama Geliştirme",
    service: "Uygulama Geliştirme",
    text: "Fikrini çalışan bir uygulamaya dönüştürme: yapay zekâ destekli tasarım ve geliştirme, ilk sürüme kadar.",
  },
];
