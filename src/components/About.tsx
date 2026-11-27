import "./styles/About.css";

const About = () => {
  return (
    <div className="about-section" id="about">
      <div className="about-me">
        <h3 className="title about-label">Hakkımda</h3>
        <h2 className="about-heading">Görsele hareket, hikâyeye karakter.</h2>
        <p className="para about-name">Ben Eray Ömeroğlu.</p>
        <p className="para about-role">Motion designer, art director ve AI artist olarak çalışıyorum.</p>
        <p className="para about-text">
          Markalar için hareketli grafikler, reklam filmleri ve sosyal medya
          içerikleri tasarlıyorum. After Effects, Premiere Pro ve yapay zekâ
          destekli üretimle tasarımı hareketle buluşturuyorum. Bu işe kendi
          şarkılarıma kapak yaparak başladım.
        </p>
        <a className="about-more" href="/hakkimda" data-cursor="disable">
          <span className="about-more-text">İşin arkasındaki Eray’ı tanı</span>
          <span className="about-more-arrow" aria-hidden="true">
            →
          </span>
        </a>
      </div>
    </div>
  );
};

export default About;
