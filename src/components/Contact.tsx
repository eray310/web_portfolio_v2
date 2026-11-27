import { MdArrowOutward } from "react-icons/md";
import "./styles/Contact.css";

const Contact = () => {
  return (
    <div className="contact-section section-container" id="contact">
      <div className="contact-container">
        <h3>İletişim</h3>
        <div className="contact-flex">
          <div className="contact-box">
            <h4>Birlikte çalışalım</h4>
            <div className="contact-links">
              {/* The main way to reach Eray: opens the mail app directly. */}
              <a
                href="mailto:omerogluuerayy@gmail.com"
                data-cursor="disable"
                className="contact-social contact-mail"
              >
                omerogluuerayy@gmail.com <MdArrowOutward />
              </a>
              <span className="contact-break" aria-hidden="true" />
              <a
                href="https://www.behance.net/erayomeroglu"
                target="_blank"
                rel="noreferrer"
                data-cursor="disable"
                className="contact-social"
              >
                Behance <MdArrowOutward />
              </a>
              <a
                href="https://www.linkedin.com/in/erayomeroglu"
                target="_blank"
                rel="noreferrer"
                data-cursor="disable"
                className="contact-social"
              >
                LinkedIn <MdArrowOutward />
              </a>
            </div>
          </div>
          <footer className="contact-box contact-sign">
            <p className="contact-signature">
              Tasarım ve motion — <span>Eray Ömeroğlu</span>
            </p>
            <nav className="contact-legal" aria-label="Yasal sayfalar">
              <a href="/cerez-tercihleri">Çerez Tercihleri</a>
            </nav>
            <p className="contact-copy">© {new Date().getFullYear()} Eray Ömeroğlu. Tüm hakları saklıdır.</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Contact;
