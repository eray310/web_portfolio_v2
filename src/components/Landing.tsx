import { PropsWithChildren } from "react";
import "./styles/Landing.css";

const titles = ["Motion Designer", "Art Director", "Video Editor", "AI Artist"];

const Landing = ({ children }: PropsWithChildren) => {
  return (
    <>
      <div className="landing-section" id="landingDiv">
        <div className="landing-container">
          <div className="landing-intro">
            <h2>Merhaba, ben</h2>
            <h1>
              ERAY
              <br />
              <span>ÖMEROĞLU</span>
            </h1>
            <ul className="landing-titles" lang="en">
              {titles.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ul>
          </div>
        </div>
        {children}
      </div>
    </>
  );
};

export default Landing;
