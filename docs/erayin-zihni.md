# Eray'ın Zihni (/zihnim): continuation note

Branch: `design/erayin-zihni`, started from `design/ai-particle-volume` at `eff92c0` ("AI Isler polish").
First prototype: `1698ea1`. Second round (this note): an enterable brain and one wheel route, started from `1698ea1`.
Status: design preview only. It is not linked from the menu or from any page, and it is not published.

## What it is
A brain made of points that you travel through. One WebGL canvas, all points drawn in one call (additive, no bloom), and
one textured plane per work for the sharp picture up close.

- **The brain**: two lobes with volume, a central fissure, a temporal bulge on each side, winding folds (ridged 3D noise
  with a light domain warp: dense, light crests and thin, dim grooves). Colour follows the form: off-white crests, icy
  lower parts and fissure, a little lavender at the back. Seen from outside, the far side of each lobe is dimmed so the near
  surface reads as a volume. Near the camera the shell opens (it never becomes a curtain). The geometry is procedural; no
  external brain model or scan is used, so there is no third-party licence for it.
- **Layers**: inner tracts and dust inside the lobes (near-field parallax while travelling), the shell (middle), a far
  field of dust around everything.

Places (all content is real and already in the repo, nothing invented):
1. **Görsel Hafıza** (left lobe): an archive of 10 frames hung in depth layers with wires above and a dotted floor below.
   Each frame is the work's real cover (`src/data/projects.ts`, `public/portfolio/*.jpg`). Far away it is particles in the
   picture's colours; closer it hands over to the sharp picture. A frame opens its panel only when it is clicked (or
   chosen in the card).
2. **Kurgu Masası** (right lobe): a film strip winding through the lobe (rails, sprocket holes, cells; light runs slowly
   along it) carrying the 6 real video covers. Voop is the largest frame and the calm stop. The panel shows the cover and a
   "Videoyu oynat" button; the video starts only after that press, with sound; closing it removes the video and the
   camera stays.
3. **Deney Alanı** (back, low): three curved particle membranes (contour bands) around a composition of the site's real
   screenshots (desktop home, Hakkımda, phone) and four screens of the concept appointment app (captures of the
   `/ai-isler` app demo, `public/zihnim/app-*.jpg`). Links go to `/ai-isler#web-sitesi`, `/hakkimda`,
   `/ai-isler#uygulama`.

Planned (data only, not shown): Hareket Atölyesi, Birlikte Üretelim (`status: "planned"` in `zihnimWorld.ts`).

## The route and input
One route: overview -> entrance corridor (between the lobes) -> Görsel Hafıza -> over the idea core -> Kurgu Masası ->
down and back -> Deney Alanı. It is a smooth curve of camera positions and a matching curve of look targets
(`route` in `zihnimWorld.ts`, 9 knots, centripetal Catmull-Rom), so the look direction is consistent and backwards
follows the same path. The closest the route comes to any frame is about 15 units (no pass-through).

- **Wheel / trackpad** (only over the canvas, never over the card, panel, menus or video controls): delta normalised
  (pixels, lines, pages), one notch capped; 5200 px of wheel = the whole route. The camera follows with frame-rate
  independent damping and settles in about half a second; no rubber band at either end. You can stop anywhere between
  stations; if you stop close to one (within 0.035 of the route) the camera settles exactly on it.
- **Buttons** (top bar, route indicator, card) travel on the same route (smootherstep, 1.1 to 3 s). A wheel or drag during
  a trip takes over from where the camera is.
- **Phone**: a vertical drag travels the route (3.4 screen heights = the whole route), sideways looks around a little;
  the "Alanlar" menu and the route dots choose a place. A portrait screen sees the overview from higher up.
- **Mouse drag**: limited look-around with resistance at the limit; a short press on a picture opens it.
- **Hareketi azalt** (prefers-reduced-motion): no flights; a wheel notch or swipe goes directly to the next station and a
  button jumps there.
- First-use hint "Tekerlekle keşfet · Bir alan seç" (desktop; on phones the line under the title says it); it hides on the
  first input and is remembered (`localStorage` key `zihnim-hint-seen`).

## Accessibility and fallbacks
All places and works are reachable with the keyboard (top bar, route indicator, the card's work buttons). While a panel is
open the rest is `inert`; focus goes to "Kapat" and returns to the opener. Labels never sit under the page's controls.
No WebGL, or the world fails or takes over 15 s: a static map and a list open the same panels. Hidden tab: drawing and
video stop. Adaptive quality: resolution first, then fewer points (the point order is shuffled, so a lower step is an even
sample of every place). Pictures load lazily (within 160 units of the camera); no video exists until it is asked for.

## Run
```
git fetch origin
git switch design/erayin-zihni
npm ci
npm run dev                 # open http://localhost:5173/zihnim
npx tsc -b && npx vite build && npx vite preview
git checkout -- tsconfig.app.tsbuildinfo   # after tsc -b; do not commit it
```

## Where the settings are
- `src/components/zihnim/zihnimWorld.ts`: the route (knots, stations), the portrait overview, wheel/touch/trip numbers,
  look-around limits, picture fade distances, shell opening, palette, places and works. Works of Görsel Hafıza and Deney
  Alanı are placed as seen from their station's camera (`seen(knot, distance, right, up)`), so the composition stays clear
  of the card (lower left) and the route (right). Add a place = route knots + a station + an area + its works here, and
  its geometry in `worldGeometry.ts`.
- `src/components/zihnim/worldGeometry.ts`: how every group of points is generated (seeded; the world is always the same).
- `src/components/zihnim/ZihnimScene.ts`: renderer, shaders, input, route camera, pictures, labels, quality, disposal.
- `src/components/zihnim/ZihnimPage.tsx` and `zihnim.css`: top bar, route indicator, hint, card, panels, static fallback.
- Route of the page: `zihnim/index.html`, `vite.config.ts` (input), `scripts/vite-routes.mjs` (dev), `src/App.tsx`,
  `vercel.json`, `netlify.toml`. The page is its own chunk.
- Debug state on `.zh-canvas`: `data-s` (route 0..1), `data-station`, `data-cam`, `data-frames`, `data-q`, `data-sharp`.

## Assets and licences
- Posters, videos, site screenshots and AI İşler texts: the owner's own works, already in the repo.
- New: `public/zihnim/app-hizmet.jpg`, `app-saat.jpg`, `app-ozet.jpg`, `app-onay.jpg`: screenshots of the site's own
  concept app demo (`/ai-isler`, "Uygulama Prototipleri"); example dates only.
- three.js: MIT (already a dependency). Fonts: the site's own (Geist, OFL). Icons: react-icons (already a dependency).
- The reference site (pendereckisgarden.pl) was only looked at for the idea. No code, structure, brand, music or assets of it
  were used.

## Measured in this round (local, Edge, Windows, RTX 4060; production build)
- QA script: 43 checks pass at 1440x900 and 1366x768 (wheel, trackpad-sized deltas, line-mode deltas, backward, mid
  position, settle time, end clamp, trip takeover, area switch during a trip, panel focus and Escape, wheel over the
  panel, video only on press, keyboard, labels, overflow, hidden tab, reduced motion, no-WebGL, other pages).
- Phones (emulated touch, 390x844 and 340x720): vertical drag, route dots, menu, panel inner scroll, no overflow.
- Frame times, same scenario (overview 5 s, a button trip to Kurgu Masası, 4 s there), old `1698ea1` vs new:
  GPU: both 16.7 ms median, p95 16.8 ms (vsync bound). Software WebGL (SwiftShader): old 40 to 50 ms median, new 50 ms
  median; trip p95 old 70 ms, new 130 ms (textures load during the trip).

## Not done / not measured
Real phones, tablets and low-end GPUs; a real trackpad and a real touch screen (only emulated events); Safari and
Firefox; Hareket Atölyesi and Birlikte Üretelim; sound (none, by choice).
