import "./styles/About.css";

const About = () => {
  return (
    <div className="about-section" id="about">
      <div className="about-me">
        <h3 className="title about-accent">Hakkımda</h3>
        <p className="para">
          Ben Eray Ömeroğlu,{" "}
          <span className="about-accent">motion designer</span> ve video
          editörüyüm. Markalar için{" "}
          <span className="about-accent">hareketli grafikler</span>,{" "}
          <span className="about-accent">reklam videoları</span> ve sosyal medya
          içerikleri üretiyorum. After Effects ve Premiere Pro ile animasyon ve
          kurguyu bir araya getiriyorum.
        </p>
      </div>
    </div>
  );
};

export default About;
