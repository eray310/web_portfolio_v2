export type Service = {
  title: string;
  subtitle: string;
  text: string;
  tools?: string[];
};

export const services: Service[] = [
  {
    title: "MOTION & KURGU",
    subtitle: "Hareketli Grafik ve Video Kurgu",
    text: "Markanın mesajını güçlü bir görsel anlatıya dönüştürüyorum. Animasyon, ritim ve kurguyu bir araya getirerek reklam filmleri ve sosyal medya videoları hazırlıyorum.",
    tools: ["After Effects", "Premiere Pro", "CapCut"],
  },
  {
    title: "GRAFİK TASARIM",
    subtitle: "Kampanya ve Dijital Tasarım",
    text: "Markanın kimliğini yansıtan kampanya görselleri, sosyal medya tasarımları ve dijital reklam materyalleri hazırlıyorum. Fikri, farklı mecralarda tutarlı bir görsel dile dönüştürüyorum.",
    tools: ["Photoshop", "Illustrator", "InDesign"],
  },
  {
    title: "ART DIRECTION",
    subtitle: "Yaratıcı Konsept ve Görsel Yön",
    text: "Markanın hedeflerine uygun yaratıcı konseptler geliştiriyor; renk, tipografi ve kompozisyon kararlarını bütünlüklü bir görsel dilde buluşturuyorum. Kampanyaların görsel yönünü fikirden uygulamaya şekillendiriyorum.",
  },
  {
    title: "AI ARTIST",
    subtitle: "Yapay Zekâ Destekli Görsel ve Film",
    text: "Yapay zekâ destekli kısa filmler, reklam videoları ve özgün görsel projeler üretiyorum. Konsept geliştirme, sahne tasarımı ve video üretimini kurgu ve motion tasarımla tamamlıyorum.",
  },
];
