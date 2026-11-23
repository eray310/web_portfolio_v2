/**
 * Deep links such as /#work and /#contact (the final links of the About page).
 *
 * The page is driven by a smooth scroller, so the browser's own "scroll to the
 * fragment" and its "restore the old scroll position" both fight it: they scroll
 * the document under the scroller and the page ends up at the top or drifts. The
 * browser's part is switched off here, the hash is taken out of the address for
 * the moment (so there is nothing for the browser to chase), and initialFX goes
 * to the section itself once the intro and the scroller are really ready. The
 * hash is put back in the address afterwards.
 */
if (typeof window !== "undefined" && "scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const isHome = () => !/^\/hakkimda\/?$/i.test(window.location.pathname);

const taken: string =
  typeof window !== "undefined" && isHome() && window.location.hash.length > 1
    ? window.location.hash
    : "";

if (taken) {
  history.replaceState(history.state, "", window.location.pathname + window.location.search);
}

/** The deep-link hash the page was opened with (empty when there was none). */
export const deepLinkHash = taken;

/** Puts the hash back in the address once the page has arrived at its section. */
export function restoreDeepLink() {
  if (!taken) return;
  if (window.location.hash === taken) return;
  history.replaceState(history.state, "", window.location.pathname + window.location.search + taken);
}
