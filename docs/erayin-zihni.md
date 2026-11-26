# Eray'ın Zihni (/zihnim): first working prototype

Branch: `design/erayin-zihni`, started from `design/ai-particle-volume` at `eff92c0` ("AI Isler polish").
Status: design preview only. It is not linked from the menu or from any page, and it is not published.

## What it is
A world made of points, explored by camera. From afar: two lobes (a hint of a brain, not anatomy), the idea core in
the middle, fibres (paths) from the core to three places. One WebGL canvas, all points drawn on the GPU in one call.

Working places (all content is real and already in the repo, nothing is invented):
1. **Görsel Hafıza**: frames hanging at different heights; the real cover frames of Motion Graphics works
   (`src/data/projects.ts`, `public/portfolio/*.jpg`) are drawn as particle pictures. The panel shows the same covers.
2. **Kurgu Masası**: a film strip winding through the right lobe; its middle frame is drawn from the Voop cover. The panel shows
   the cover with a "Videoyu oynat" button; the video (`public/portfolio/VoopKarikatür.mp4`) starts only after that
   press, with sound; closing the panel removes the video and the camera stays.
3. **Deney Alanı**: an organic form with satellites that changes a little all the time; the panel summarises the web and app
   examples of `/ai-isler` (from `src/data/aiWorks.ts`) with real links to `/ai-isler`, `#web-sitesi`, `#uygulama`.

Planned (data only, not shown): Hareket Atölyesi, Birlikte Üretelim (`status: "planned"` in `zihnimWorld.ts`).

## Flow
overview -> choose a place (button, label or a short press on the canvas) -> a colour wave runs from the core along the path
while the camera flies there (about 1.2 to 1.8 s, a curve that bends toward the core) -> the panel opens (HTML dialog) ->
Escape or "Kapat" closes it, the place stays selected, the camera stays, focus returns to the control that opened it ->
"Genel görünüm" flies back. Choosing another place during a flight continues from the current camera position.
Dragging turns the view a little (limited, with resistance at the limit). No wheel capture, no free flight.

## Accessibility and fallbacks
All three places are reachable with the keyboard (buttons at the top). While a panel is open the rest is `inert`. A visible
"Hareketi durdur/başlat" button. "Hareketi azalt": no ambient motion, the trip is a very short blend. No WebGL, or the world
fails or takes over 12 s: a static map and a list open the same panels. Hidden tab: the loop and the video stop.

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
- `src/components/zihnim/zihnimWorld.ts`: places (names, anchors, camera poses, panel content, media), the overview camera,
  lobes, point counts, flight time, drag limits, pointer effect, palette, ground colour. Add a place = add an entry here
  (and its geometry in `worldGeometry.ts`).
- `src/components/zihnim/worldGeometry.ts`: how every group of points is generated (seeded; the world is always the same).
- `src/components/zihnim/ZihnimScene.ts`: renderer, shaders, camera flight, drag, labels, quality steps, disposal.
- `src/components/zihnim/ZihnimPage.tsx` and `zihnim.css`: the HTML (top bar, labels, panels, static fallback).
- Route: `zihnim/index.html`, `vite.config.ts` (input), `scripts/vite-routes.mjs` (dev), `src/App.tsx`, `vercel.json`,
  `netlify.toml`. The page is its own chunk; the main bundle is not enlarged.
- Debug state: `.zh-canvas` has `data-cam`, `data-frames`, `data-q`.

## Assets and licences
- Posters, the Voop video and the AI İşler texts: the owner's own works, already in the repo. Nothing new was added.
- three.js: MIT (already a dependency). Fonts: the site's own (Geist, OFL). Icons: react-icons (already a dependency).
- The reference site (pendereckisgarden.pl) was only looked at for the idea (a point-made place explored by hotspots). No code,
  structure, brand, music or assets of it were used.

## Not done / not measured
Real phones and low-end devices; Hareket Atölyesi and Birlikte Üretelim; a deeper "inside the lobes" exploration (the camera
stays around the three places); sound design (none, by choice).
