/**
 * Grafik Tasarım: Eray's own graphic works (no client work, no video). Covers of his own songs (only the names of the
 * songs) and personal collages, always labelled as personal work. Pictures: public/kapaklar, public/grafik (webp + jpg).
 */
export type Graphic = { file: string; title: string; label: string; w: number; h: number };
export const graphics: Graphic[] = [
  { file: "kapaklar/sabah-olmadan", title: "Sabah Olmadan", label: "Kapak tasarımı · Kişisel çalışma", w: 863, h: 801 },
  { file: "kapaklar/her-gece", title: "Ormandaki Ev", label: "Kapak tasarımı · Kişisel çalışma", w: 850, h: 857 },
  { file: "kapaklar/yeterli-degil", title: "Yeterli Değil", label: "Kapak tasarımı · Kişisel çalışma", w: 855, h: 572 },
  { file: "grafik/kendrick-lamar-kolaj", title: "Kendrick Lamar", label: "Kolaj · Kişisel çalışma", w: 851, h: 820 },
  { file: "grafik/novak-sinner-kolaj", title: "Novak × Sinner", label: "Kolaj · Kişisel çalışma", w: 860, h: 756 },
  { file: "grafik/blonded-radio", title: "blonded radio", label: "Kolaj · Kişisel çalışma", w: 860, h: 470 },
];
