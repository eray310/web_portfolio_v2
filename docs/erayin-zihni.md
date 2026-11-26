# Eray'ın Zihni (/zihnim): continuation note

Branch: `design/erayin-zihni`, started from `design/ai-particle-volume` at `eff92c0` ("AI Isler polish").
Rounds: first prototype `1698ea1`; enterable brain and wheel route `e4415b8`; third round (this note), started from
`e4415b8`: particle quality, local life, light waves, and the story "Bir fikrin yolculuğu" with a guide.
Status: design preview only. It is not linked from the menu or from any page, and it is not published.

## The story
One route, one value (`s`, 0..1) for the camera, the guide and the discovery moments, so forwards and backwards tell
the same story and the visitor can stop anywhere (the camera is no longer pulled onto a station).

| Station | Line (card) | Moment |
| --- | --- | --- |
| Genel görünüm | Bir fikrin yolculuğu. Rehberi izle; sırayla ilerle. | the guide is still part of the idea core |
| Fikir Çekirdeği | Bir fikir nereden gelir? | a group of core points gathers into a seed of light |
| Görsel Hafıza | Önce görür, biriktiririm. | frames open layer by layer (near first); the guide waits beside one and takes a few colours of the real covers |
| Kurgu Masası | Sonra parçalar arasında bir ritim bulurum. | the guide's points join the film strip for a moment; frames out of line snap into the strip one after another; it calms at the real covers (Voop sharp, video only on press) |
| Deney Alanı | Peki başka türlü olsaydı? | the guide dissolves into the membranes; the screens rise out of them, pass briefly through another arrangement and settle into one composition (real site screenshots, concept app screens) |
| Birlikte Üretelim (new) | Sıradaki fikir senin olabilir. | the camera leaves through the back and sees the whole brain; each place keeps a calm glow of its colour; the guide rests as an open, coloured light; "Projeni anlat" opens the site's existing three-step brief |

The guide: ~1100 points (a second small Points object in the same renderer, no second canvas). Every point has a home
in the core, a place in the seed, in the bird, on the strip and on a membrane, so each change of form is the same points
moving (staggered per point, no swap of objects). While the route moves on it is an abstract bird (body, swept wings,
fanned tail; the wings bend with the route, not with a clock); it arrives first (`guide.lead` of a segment) and waits as
a seed. In mid-flight it keeps to the visitor's view. With "Hareketi azalt" it is a still seed at each station.

The card shows only the place's name, its line and the next station; while travelling, the next station and its line.
The works list opens with "Çalışmaları gör (n)". The label of the place the camera is at is hidden (the card names it);
inside the brain only nearby labels show; at the final none. A wheel over a label travels too.

## Particle quality (causes found in the code of `e4415b8`, and what changed)
- Dots were 1-3 px sprites with a hard rim (`smoothstep(0.62, 1)` on the radius) and a 1.1 px minimum: far points became
  equal, square-looking specks. Now: anti-aliased rim of `particles.edge` px, a faint body, and a size clamp between
  `minPx` and `maxPx` where a point smaller than the minimum keeps the minimum size with proportionally less light.
- Sizes within a kind spanned only ~2x; now a wide, mostly-small distribution (pow 3).
- Additive blend multiplied alpha twice; it is now premultiplied ONE/ONE with per-kind alpha (`particles.alpha`) and
  `exposure`. The core was ~8k points in a 3.4-unit cloud at alpha 0.9 (white blow-out); now ~3k points on three small
  lobed shells, a sparse heart and faint orbits at low alpha.
- Quality steps lowered the resolution first (to DPR 0.65: big pixels). Now points and effects go first (waves, motion),
  resolution last and never below a floor (max(0.9, 0.7 x base DPR)). Single hitches no longer trigger a step.
- Picture particles kept 8 % light over the sharp picture; now they fade out completely and step aside. Fibre paths and
  frame wires are fewer and dimmer; closed frames are faint lines.

## Life and light
- Local life (`motion`): each point moves around its own place along a smooth field (neighbours together), bounded;
  calmer while the camera travels. Measured with a still camera: the difference to the first frame rises to a plateau
  (12-17 on a 0-765 scale) and stays there over 60 s (no drift).
- Light waves (`waves`): three slots with their own periods (14, 19, 25 s) start at different points of the shell,
  run along it (stronger on the crests), leave a short trail and fade. Mostly teal and ice, rarely lavender; the hue
  changes clearly, the light only a little. Arriving at a place starts a stronger wave there. Measured over 60 s: the
  share of coloured pixels moves between 3.2 % and 6.2 % and its centre moves across the frame.
- "Hareketi durdur" stops the world time (breathing, waves, the guide's idle motion); travel still works.
  "Hareketi azalt": no ambient motion and no waves; jumps instead of flights; each place shows its completed composition.
- While the brief is open nothing moves or draws; closing it continues from the same place and returns focus.

## Input (unchanged unless noted)
Wheel/trackpad on the canvas (and its labels), normalised, damped, no rubber band; 6400 px = whole route; no snapping
(`wheel.snapReach: 0`). Phone: vertical drag (3.4 screen heights = whole route), Alanlar menu, route dots. Buttons travel
on the route; wheel or drag takes over mid-trip. Panel, card, menus and video controls keep their own scroll.

## Settings (all in `src/components/zihnim/zihnimWorld.ts`)
- `route`, `stations`, `story` (the lines), `guideSpots` (where the guide waits), `overviewPortrait`.
- `worldConfig.particles` size, softness, exposure, alpha per kind, near-camera softening.
- `worldConfig.motion` amplitude per kind, speed, field scale, calm while moving.
- `worldConfig.waves` periods, reach, width, trail, strength, colours (weighted), arrival boost.
- `worldConfig.guide` count, seed size, wing span, lead, point size, how far ahead of the camera mid-flight.
- `worldConfig.moments` when the discovery moments run before each station.
- Geometry: `worldGeometry.ts` (`buildWorld`, `buildGuide`); rendering, input, moments, guide: `ZihnimScene.ts`;
  page: `ZihnimPage.tsx`, `zihnim.css`. Debug state on `.zh-canvas`: `data-s`, `-station`, `-guide`, `-morph`, `-time`,
  `-q`, `-sharp`, `-frames`.

## Performance
One renderer. Pictures are decoded and uploaded while the camera rests (one at a time, nearest places first; while
moving only a picture about to be shown), capped at 1280 px (960 on phones). Measured, same scenario as `e4415b8`
(overview 5 s, button trip to Kurgu Masası, 4 s there, Voop video playing 4 s), Edge on Windows:
- GPU (RTX 4060): old and new both 16.7 ms median, p95 16.8-16.9 ms in every phase; both have one 83 ms frame when the
  video starts. New stays at full quality.
- Software WebGL (SwiftShader, CPU): overview old 40 / new 50 ms median (p95 60 / 90); trip p95 old 80 / new 70; at
  Kurgu old 40 / new 50; video old 50 / new 60. A trip started 0.3 s after load is slow in both (p95 old 190 / new 200,
  max 230 / 500); after an idle moment the same trip has p95 70 ms, so preparation at start-up matters there; the
  quality steps also have not settled yet at that point, so the remainder is not attributed to one cause.

## Run
```
git fetch origin
git switch design/erayin-zihni
npm ci
npm run dev                 # open http://localhost:5173/zihnim
npx tsc -b && npx vite build && npx vite preview
git checkout -- tsconfig.app.tsbuildinfo   # after tsc -b; do not commit it
```

## Assets and licences
No new assets in this round. Posters, videos, site screenshots, the app captures in `public/zihnim/` and the brief form
are the site's own. The brain, the guide and all forms are procedural (no external model or animation). three.js MIT.

## Not done / not measured
Real phones, tablets, low-end GPUs; real trackpad and touch screen (emulated events only); Safari and Firefox; sound
(none, by choice). The reference images mentioned in the brief of this round were not attached to the message, so they
were not compared.

## Cinematic round (branch `design/cinematic-zihnim-ai`, from `main` at `297e619`; preview only, not merged)
Supersedes the notes above where they differ.
- Opening frame: three-quarter view (`route[0]`, `route[1]`), the brain fills the frame. Lobes moved closer
  (`brain.hemiX` 40), wider folds, dark patches in the surface (`patch` noise in `worldGeometry.ts`).
- Points: soft-centred dot (`exp` falloff in `FRAG`), size knee (`particles.knee`, `slope`), smaller `maxPx`,
  shell dimmer from inside (`insideShell`). Kind 8 = near motes along the route (`particles.bokeh`): large, soft, few.
  Far dust lies in banks with gaps.
- Görsel Hafıza: a veil (`veil` in `zihnimWorld.ts`, `VEIL_PATH`) parts before the station; three leading works,
  two dimmer layers behind (`gorselList`; `picture.dim*` darkens far pictures).
- Kurgu Masası: the strip is laid out from the station with `seen(6, ...)` (`filmStrip`, `kurguList`). The covers
  were mirrored (left-handed basis in `worldGeometry.ts`); fixed. Rails are dim.
- A slow light runs along the entrance fibres while the camera is at the opening frame (`ZihnimScene.ts`, `pathGoal`).
- UI: "Hareketi durdur" and the row of place buttons are gone on wide screens (the route on the right is the place
  menu; phones keep "Alanlar"). One "Görünüm" menu (`components/ViewMenu.tsx`, state in `utils/viewMode.ts`, key
  `gorunum-sakin`) with "Sakin görünüm": world time stops, travel, panels, videos and the brief still work.
  "Hareketi azalt" switches it on and locks the switch. Labels are quiet names with a dot.
- Input: `wheel.follow` 6.5, `wheel.routePx` 6800, trips `perRoute` 3.4 (min 1.6, max 4.2). Final knot is closer.
- Measured (Chrome, RTX 4060, 144 Hz, one run each, baseline `297e619`): cold start + wheel, button trip, pointer,
  phone emulation: median 6.9-7.0 ms and p95 7.1 ms in both. Software WebGL (SwiftShader): cold start 41.7 / 41.6 ms
  median, trip 34.8 / 34.8, pointer 34.7 / 41.6, phone trip 20.8 / 27.8 (old / new); differences are one frame step
  and were not repeated, so no cause is claimed.
- Not done: the guide bird was not redesigned (only its waiting spots moved); Deney Alanı kept its moment; no depth
  blur pass. The main reference (pendereckisgarden.pl) was seen only up to its entry screen; the particle reference
  images were not attached. Real phones, Safari, Firefox, real trackpad: not tried.
