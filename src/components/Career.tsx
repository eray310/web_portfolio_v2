import { enLang } from "../utils/lang";
import { useEffect, useRef, useState } from "react";
import Starters from "./Starters";
import { experience } from "../data/career";
import "./styles/Career.css";


/** How long the line takes to travel from the first to the last point. */
const DRAW_MS = 2200;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const Career = () => {
  const [open, setOpen] = useState<Record<string, boolean>>({ modd: true });
  // "wait": hidden until the section is first seen; "play": drawing; "done": no animation.
  const [phase, setPhase] = useState<"wait" | "play" | "done">(() =>
    prefersReducedMotion() || typeof IntersectionObserver === "undefined"
      ? "done"
      : "wait"
  );
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (phase !== "wait" || !list) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        // Each row appears when the line reaches its point.
        const total = list.offsetHeight || 1;
        list.querySelectorAll<HTMLElement>(".career-row").forEach((row) => {
          const frac = Math.min(1, (row.offsetTop + 14) / total);
          row.style.setProperty("--d", `${Math.round(frac * DRAW_MS)}ms`);
        });
        setPhase("play");
      },
      { threshold: 0.35 }
    );
    io.observe(list);
    return () => io.disconnect();
  }, [phase]);

  return (
    <section className="career-section" id="experience">
      <div className="career-layout">
        <div className="career-container">
          <h2 className="career-title">
            Kariyer <span>&</span> Deneyim
          </h2>
          <ol
            className={`career-list career-${phase}`}
            ref={listRef}
            style={{ ["--draw" as string]: `${DRAW_MS}ms` }}
          >
            <li className="career-line" aria-hidden="true" />
            {experience.map((item) => {
              const isOpen = !!open[item.id];
              return (
                <li
                  className={`career-row${item.current ? " is-current" : ""}${
                    isOpen ? " is-open" : ""
                  }`}
                  key={item.id}
                >
                  <span className="career-dot" aria-hidden="true" />
                  <button
                    type="button"
                    className="career-head"
                    aria-expanded={isOpen}
                    aria-controls={`career-${item.id}`}
                    onClick={() =>
                      setOpen((o) => ({ ...o, [item.id]: !o[item.id] }))
                    }
                    data-cursor="disable"
                  >
                    <span className="career-role" lang={enLang(item.role)}>
                      {item.role}
                    </span>
                    <span className="career-meta">
                      <span className="career-company">{item.company}</span>
                      <span className="career-date">{item.date}</span>
                    </span>
                    <span className="career-chevron" aria-hidden="true" />
                  </button>
                  <div className="career-desc" id={`career-${item.id}`} role="region">
                    <p>{item.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        <Starters />
      </div>
    </section>
  );
};

export default Career;
