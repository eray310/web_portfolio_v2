import { PropsWithChildren } from "react";
import { TbNotes } from "react-icons/tb";
import { scrollToSection } from "./utils/scrollToSection";
import "./styles/Landing.css";

const titles = ["Motion Designer", "Art Director", "AI Artist"];

const Landing = ({ children }: PropsWithChildren) => {
  return (
    <>
      <div className="landing-section" id="landingDiv">
        <div className="landing-container">
          <div className="landing-intro">
            <h2>Merhaba, ben</h2>
            <h1 aria-label="Eray Ömeroğlu">
              ERAY
              <br />
              <span>ÖMEROĞLU</span>
            </h1>
            <ul className="landing-titles" lang="en">
              {titles.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ul>
            {/* Phones only: the line and the two links fill the room between the roles and the character. */}
            <p className="landing-line">Görsele hareket, hikâyeye karakter.</p>
            <a
              className="landing-cta"
              href="#work"
              data-cursor="disable"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("#work");
              }}
            >
              İşleri gör
              <TbNotes aria-hidden="true" />
            </a>
            <a className="landing-cta landing-cta-story" href="/zihnim" data-cursor="disable">
              Hikâyemi izle
            </a>
          </div>
        </div>
        {children}
      </div>
    </>
  );
};

export default Landing;
