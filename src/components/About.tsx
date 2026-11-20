import "./styles/About.css";

const About = () => {
  return (
    <div className="about-section" id="about">
      <div className="about-me">
        <h3 className="title about-label">Hakkımda</h3>
        <h2 className="about-heading">Görsele hareket, hikâyeye karakter.</h2>
        <p className="para about-intro">
          <span>Ben Eray Ömeroğlu.</span> <span>Motion designer ve video editörüyüm.</span>
        </p>
        <p className="para about-text">
          Markalar için hareketli grafikler, reklam filmleri ve sosyal medya
          içerikleri tasarlıyorum. After Effects ve Premiere Pro ile tasarımı
          hareketle buluşturuyorum.
        </p>
      </div>
    </div>
  );
};

export default About;
