/**
 * Paints the "Kariyer & Deneyim" colour fade (bottom #0d9488 to top #ffffff)
 * across the intro name.
 *
 * The name is split into one element per letter for the opening animation, and
 * `background-clip: text` does not work through animated (transformed) child
 * elements. So every letter carries its own copy of the gradient, sized and
 * offset to match the whole heading, which makes the letters join up into one
 * continuous fade, also while they are still animating in.
 */
const TEAL = "#0d9488";
const WHITE = "#ffffff";

export function paintNameGradient() {
  const heading = document.querySelector<HTMLElement>(".landing-intro h1");
  if (!heading) return;
  const width = heading.offsetWidth;
  const height = heading.offsetHeight;
  // A little room above and below so accents (Ö, Ğ) stay inside the fade.
  const pad = parseFloat(getComputedStyle(heading).fontSize) * 0.5;
  // The colours run over the heading itself; the extra room stays solid.
  const gradient = `linear-gradient(0deg, ${TEAL} ${pad}px, ${WHITE} ${pad + height}px)`;

  heading.querySelectorAll<HTMLElement>(".split-char").forEach((letter) => {
    // Position inside the heading, ignoring any transform of a running animation.
    let x = 0;
    let y = 0;
    let el: HTMLElement | null = letter;
    while (el && el !== heading) {
      x += el.offsetLeft;
      y += el.offsetTop;
      el = el.offsetParent as HTMLElement | null;
    }
    letter.style.backgroundImage = gradient;
    letter.style.backgroundSize = `${width}px ${height + pad * 2}px`;
    letter.style.backgroundPosition = `${-x}px ${-(y + pad)}px`;
  });
}

let watching = false;

/** Paints now, and again when web fonts arrive or the window is resized. */
export function watchNameGradient() {
  paintNameGradient();
  if (watching) return;
  watching = true;
  document.fonts?.ready.then(paintNameGradient);
  let timer: number | undefined;
  window.addEventListener("resize", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(paintNameGradient, 100);
  });
}
