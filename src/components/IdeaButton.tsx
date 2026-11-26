import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { MdArrowOutward } from "react-icons/md";
import { TbNotes } from "react-icons/tb";
import HoverLinks from "./HoverLinks";
import { lockScroll, unlockScroll } from "./utils/scrollLock";
import "./styles/IdeaButton.css";

// The same three-step brief form that the project cards open (loaded on first use).
const BriefFlow = lazy(() => import("./BriefFlow"));

/** Elements that answer to clicks or hold reading text: the dock steps aside instead of covering them. */
const INTERACTIVE = "a, button, input, select, textarea, video, summary, [role='button'], [tabindex]:not([tabindex='-1'])";

const hasOwnText = (el: Element) =>
  Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent || "").trim().length > 1);

/** Is there a control or a line of text under this fixed element? Looks at a grid of points inside it. */
const coversContent = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  for (let ix = 0; ix < 6; ix++) {
    for (let iy = 0; iy < 3; iy++) {
      const x = r.left - 8 + ((r.width + 16) * (ix + 0.5)) / 6;
      const y = r.top - 6 + ((r.height + 12) * (iy + 0.5)) / 3;
      for (const e of document.elementsFromPoint(x, y)) {
        if (el.contains(e) || e === document.documentElement || e === document.body) continue;
        if (e.matches(INTERACTIVE) || e.closest(INTERACTIVE) || hasOwnText(e)) return true;
        break; // only the topmost real element decides
      }
    }
  }
  return false;
};

/**
 * The two fixed controls of the page, kept together: "Hikâyemi izle" (/zihnim) and "Bir fikrim var".
 * They sit side by side in one row (they can never overlap each other) and the row moves
 * aside while it would cover a control or a line of text of the page. It reappears when it
 * has a keyboard focus, so it can always be reached.
 */
const Dock = () => {
  const [open, setOpen] = useState(false);
  const [tucked, setTucked] = useState(false);
  const dock = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const check = () => {
      const el = dock.current;
      if (!el) return;
      if (document.querySelector(".project-panel-backdrop, .video-modal, .brief-backdrop")) {
        setTucked(true);
        return;
      }
      setTucked(coversContent(el));
      // The Behance icon (bottom left) steps aside the same way.
      const social = document.getElementById("social");
      const holder = social?.parentElement;
      if (social && holder) holder.classList.toggle("is-tucked", coversContent(social));
    };
    check();
    const id = window.setInterval(check, 150);
    window.addEventListener("resize", check);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", check);
    };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => btn.current?.focus());
  }, []);

  return (
    <>
      <div ref={dock} className={`dock${tucked && !open ? " is-tucked" : ""}`}>
        <a className="resume-button" href="/zihnim">
          <HoverLinks text="Hikâyemi izle" />
          <span aria-hidden="true">
            <TbNotes />
          </span>
        </a>
        <button
          type="button"
          ref={btn}
          className="idea-button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          data-cursor="disable"
        >
          Bir fikrim var <MdArrowOutward aria-hidden="true" />
        </button>
      </div>
      {open && (
        <Suspense fallback={null}>
          <BriefFlow onClose={close} lock={lockScroll} unlock={unlockScroll} />
        </Suspense>
      )}
    </>
  );
};

export default Dock;
