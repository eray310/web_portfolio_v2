import "./styles/Career.css";

const experience = [
  {
    role: "Motion Designer",
    company: "MODD Group",
    year: "2026–",
    text: "Ağustos 2026 – Devam ediyor. Markalar için sosyal medya ve reklam videoları üretiyorum. After Effects ve Premiere Pro ile animasyon, motion graphics ve kurgu süreçlerini yürütüyorum.",
  },
  {
    role: "Grafik Tasarımcı",
    company: "Retro Yazılım",
    year: "2025–26",
    text: "Temmuz 2025 – Mart 2026. 8’den fazla marka için sosyal medya içeriklerini konseptten teslimata kadar hazırladım. Reels, statik görseller ve reklam kampanyaları üzerinde çalıştım.",
  },
  {
    role: "Grafik Tasarımcı",
    company: "More IT",
    year: "2025",
    text: "Şubat 2025 – Mayıs 2025. Farklı markalar için görsel içerik konseptleri geliştirdim. Premiere Pro ile animasyonlu eğitim içerikleri hazırladım.",
  },
];

const Career = () => {
  return (
    <div className="career-section section-container" id="experience">
      <div className="career-container">
        <h2>
          Kariyer <span>&</span>
          <br /> Deneyim
        </h2>
        <div className="career-info">
          <div className="career-timeline">
            <div className="career-dot"></div>
          </div>
          {experience.map((item) => (
            <div className="career-info-box" key={item.company}>
              <div className="career-info-in">
                <div className="career-role">
                  <h4>{item.role}</h4>
                  <h5>{item.company}</h5>
                </div>
                <h3>{item.year}</h3>
              </div>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Career;
