/** Work experience, newest first. One source for the home page (Career) and for /hakkimda. */
export type Experience = { id: string; role: string; company: string; date: string; current?: boolean; text: string };

export const experience: Experience[] = [
  {
    id: "modd",
    role: "Motion Designer",
    company: "MODD Group",
    date: "Ağu 2026 – Devam ediyor",
    current: true,
    text: "Markalar için sosyal medya ve reklam videoları üretiyorum. After Effects ve Premiere Pro ile animasyon, motion graphics ve kurgu süreçlerini yürütüyorum.",
  },
  {
    id: "retro",
    role: "Grafik Tasarımcı",
    company: "Retro Yazılım",
    date: "2025 – 2026",
    text: "8’den fazla marka için sosyal medya içeriklerini konseptten teslimata kadar hazırladım. Reels, statik görseller ve reklam kampanyaları üzerinde çalıştım.",
  },
  {
    id: "moreit",
    role: "Grafik Tasarımcı",
    company: "More IT",
    date: "2025",
    text: "Farklı markalar için görsel içerik konseptleri geliştirdim. Premiere Pro ile animasyonlu eğitim içerikleri hazırladım.",
  },
];
