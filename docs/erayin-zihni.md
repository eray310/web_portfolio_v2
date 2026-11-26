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

## Isik Yolu, first stretch (branch `design/isik-yolu`, from `design/cinematic-zihnim-ai` at `b1a2681`; local only, not pushed)
Direction: the inside of the mind is dark; a picture exists only where light falls; every point is unfinished work
that light and nearness resolve. The brain is a door: the worlds are far apart, outside it.
Done in this round: outside of the brain -> fissure -> tunnel -> the opening of Gorsel Hafiza (a hall). Kurgu Masasi,
Deney Alani and the final are unchanged inside the brain; a short cut through darkness (route time 0.625-0.655) links
the hall to them. That link is temporary.

- Settings: `light` in `zihnimWorld.ts` (axis, route times `t`, entry camera keys, `mouth`, `view`, `push`,
  `dissolve`, `leak`, `after`, `tunnel`, `hall`, `opening`, `sharp`), `calmStops`, `hallSeen` (layout of the hall as
  seen from its viewing spot; `gorselList` uses it).
- Tempo (route time, what the wheel moves; not evenly spaced): outside 0-0.11, way in 0.11-0.19, tunnel 0.19-0.40
  (about 1150 units, eased: it gathers speed and slows down), opening of the hall 0.40-0.52, look-around 0.52-0.62,
  cut, Kurgu 0.74, Deney 0.87, final 1. The look-around is shorter than the 35 % first asked for: a long stretch where
  the wheel hardly moves the camera felt stuck; the visitor can stop anywhere, so time to look does not need scroll.
- Point sets: the brain (`buildWorld`, 200k desktop / 70k phone, built at start, still holds Kurgu and Deney), the
  tunnel (`buildTunnel`, 20k / 8k, built after the first frames) and the hall (`buildHall`, 46k / 18k, built when the
  visitor starts to move). Tunnel and hall are freed after the cut and rebuilt in the dark of the cut on the way back
  (`wantTunnel`, `wantHall` in `ZihnimScene.ts`; `data-sets` on the canvas shows what exists).
- Tunnel: kind 9. One stretch of beam dust (`tunnel.wrap` x 2 long) repeats around the camera in the shader
  (`uCamAx`, `uWrap`), coloured across its section by the first poster; a few faint streaks outside; no rings. The far
  light is the first work: large points (`BEACON`) and one additive plane (`glow`).
- Hall: kind 10 lines (`LINE_BASE` + picture, `uLine`) come down one after the other; each work (kind 2, `t` = how
  far down the picture) is written from the top (`uFrameO.w`); floor pool under each. All driven by route time
  (`updateMoments`). Only pictures nearer than `sharp` turn into the sharp plane; the layers behind stay points.
- Entry: `uBrain` takes the brain apart point by point between `dissolve` times; the beam leaks out of the fissure
  by `leak` units at the opening frame.
- Guide: 560 points, new bird (line of the leading edge, tapering wings, forked tail); a bird only on the way in
  and in the tunnel (tipped toward the visitor there, a seed for a moment half way), a seed in the worlds.
- Input: keyboard (arrows 0.03, PageUp/PageDown 0.1, Home/End); `wheel.follow` 7.5, `routePx` 8200.
  Calm view ("Sakin gorunum" or reduced motion) now behaves the same: cuts between stops (`stations` + `calmStops`,
  the tunnel is one still frame at 0.30), no ambient motion.
- UI: floating place names are off (`.zh-labels`); the route names every station; links to Ana site, AI Isler,
  Hakkimda at the top (in the Alanlar menu on phones). Main menus (home, AI Isler) have "Zihnim"; under 500 px the home
  menu is a grid of two rows.
- Kurgu Masasi: the right end of the strip recedes instead of running under the route (`filmStrip`, `kurguList`).
- Measured, Chrome on Windows, RTX 4060, 144 Hz, against `b1a2681`: GPU two runs, median 6.9-7.0 ms and p95 7.1 ms in
  both versions for cold start + wheel, button trip, pointer, phone emulation; the new version has one 62-90 ms frame
  at cold start (tunnel and hall are built then). Software WebGL (SwiftShader), one run: cold start 41.6 / 34.7 ms
  median, trip 34.7 / 34.7, pointer 34.7 / 34.7, phone trip 20.9 / 14.0 (old / new).
- Open: on a portrait phone the three front works of the hall do not all fit across; the centre of the tunnel is
  close to white where beam dust and the far light overlap; the tail of the bird can read as legs; Kurgu and Deney
  are still inside the brain and built at start. Not tried: real phones, Safari, Firefox, a real trackpad.
  pendereckisgarden.pl could not be entered (its cookie notice offers only "Accept"); no reference images were given.

## Isik Yolu, final brief of the first stretch (branch `design/isik-yolu`; local only, not pushed)
This section replaces the one above where they differ.

### Direction, story, the square
The inside of the mind is dark; a picture exists only where light falls; points are unfinished work. The brain is a
door. The story is Eray's own way into the work, in seven chapters; real works stand in each as evidence. The motif is
the SQUARE: 01 one cover, 02 many squares, 03 squares that begin to move, 04 one square opening into many forms, 05 the
whole road as a landscape of squares seen from above. No bird or figure made of points, no neon tunnel, no speed lines,
no bloom (the site must not resemble ataberksoylu.com).

### Chapters (`stations` in `zihnimWorld.ts`: n, label, title, line, hint, quote, t)
- 00 Kapı: "Her şey bir şarkı kapağıyla başladı." / "Işığı izle; nereye vardığını gör." / hint "Tekerlekle ilerle" (phone: "Kaydırarak ilerle")
- 01 Başlangıç: "Kendi şarkılarıma kapak yapıyordum." / "Bir şarkıya yüz vermek, ilk tasarımlarımdı."
- 02 Görsel Hafıza: "Önce görmeyi öğrendim." / "Kapaklardan markalara: görsel bir dil kurmak." / hint "Bir kareye dokun"
- 03 Hareket: "Grafik tasarım bana yetmedi." / "Hareket daha dinamik, daha etkili geldi."
- 04 Yapay zekâ: "İşimi büyütmek isterken yapay zekâ geldi." / "Bir fikir artık onlarca biçim alabiliyor."
- 05 Zirve: title "Yukarıdan bakınca yol görünüyor." (a working title, not from Eray) and the quote "Dağa tırman, seni dünya
  görsün diye değil, dünyayı görebilmen için." with the credit "— david mccullough jr."
- 06 Ben: "Ben Eray Ömeroğlu." / "Motion Designer · Art Director · Video Editor · AI Artist" / "Sıradaki hikâye senin." / Projeni anlat

Done in full: 00, 01, 02. 03 and 04 keep their scenes inside the brain with the new numbers and texts. 05 and 06 use the
old final (the brain seen from behind): 05 at route time 0.935, 06 at 1.

### What changed against the round before
- No bird. The guide is a seed of light: it runs ahead in the beam, waits, and in the hall it opens and its points
  fly to where the light lines land (`bird` array of `buildGuide` now holds those places; `uMorph` in `updateGuide`).
- The far light of the tunnel is a square cover, not the Motosan poster. No song cover is in the repository, so it is
  an abstract square of points in a warm gradient (`coverColor`, `light.cover`). The beam dust carries its colours.
  At the end of the tunnel its points leave for the screens of the hall (`uSplit`, `light.cover.split`); then all ten
  works are written, Motosan first.
- The centre of the tunnel no longer burns white: far dust is dimmed (`light.tunnel.farDim`), the cover's points give
  less light the farther they are, the glow plane is low (`light.cover.glow`). Measured on a 60 x 60 px crop of the
  centre at 1440 px, route time 0.30: saturation 1.7 before, 19 after; the only white left is the seed.
- Phones: the hall has its own layout (`gorselPortrait`), three near works stepped in height and depth, none cut.
  It is chosen when the page loads; turning the phone afterwards does not change it.
- UI: card with one text pattern; the route on the right shows 00..06 (the name beside the current one); "Bölümler"
  on phones; "Siteye geç"; a door screen once per session (`zihnim-kapi` in sessionStorage); keys 0..6.

### Tempo (route time; `light.t`, `light.after`)
outside 0-0.11, way in 0.11-0.19, tunnel 0.19-0.40, opening of the hall 0.40-0.52, look-around 0.52-0.62, cut
0.625-0.655, 03 at 0.74, 04 at 0.87, 05 at 0.935, 06 at 1. One wheel notch (100 px) moves the route by 0.012.

### Draft for the next rounds (not built)
- 03 Hareket (next round): move Kurgu Masası out of the brain onto the axis, after the hall. The link is a shutter: the
  light lines of the hall begin to blink in a slow rhythm tied to the route position, the still squares of the hall
  slide into one row and begin to move a step at a time (a square per "frame"), and the row runs past the camera into
  one large screen: Voop. No curved film strip. The temporary cut after the hall goes away, and the brain no longer has
  to build Kurgu at start.
- 04 Yapay zekâ: the beam passes a prism (a plane where the beam splits into a few thin beams, teal, ice, a little
  lavender). One square (the site) is shown and its SAME points rearrange into desktop, phone and app screens along the
  split beams: one idea, many forms.
- 05 Zirve: the camera climbs steeply above the axis and looks back and down: the cover, the hall, the row of moving
  squares and the prism lie along the axis as a landscape of squares, each a patch of its own colour. The quote stands
  here. 06: the beams join, turn toward the camera for the first time and fall on an empty screen; name, roles, brief.

### Settings
`zihnimWorld.ts`: `stations` (chapters), `light` (axis, times, entry, cover, tunnel, hall, opening, sharp), `coverColor`,
`gorselWide` / `gorselPortrait`, `calmStops`, `guideSpots`. Shaders and loading of point sets: `ZihnimScene.ts`.
Builders: `worldGeometry.ts` (`buildWorld`, `buildTunnel`, `buildHall`, `buildGuide`). Page: `ZihnimPage.tsx`.

### Site fixes in this round
`utils/lang.ts` (`enLang`) and `lang="en"` on English terms (loading marquee, Starters service, Career role, AboutPage
titles and scene headings, OrbitPage scene names, brief service cards); "Hoş geldin"; home title and descriptions with
the four roles; About copy; `zihnim/index.html` meta without noindex; `/zihnim` in the sitemap; main menu with Zihnim;
phone first screen with "İşleri gör" and "Hikâyemi izle"; dark loading screen; `ZihnimDoor` on the home page.

### Measured (Chrome, Windows, RTX 4060, 144 Hz, against `b1a2681`)
GPU, two runs: median 6.9-7.0 ms, p95 7.1-7.2 ms in both versions (cold start + wheel, trip, pointer, phone emulation).
Software WebGL, one run: cold start 34.7 / 34.7 ms median (p95 62.5 / 90.2), trip 34.7 / 34.7, pointer 34.7 / 34.7,
phone trip 20.9 / 13.9 (old / new).

### Open
The far cover reads as a warm glow more than a crisp square until the camera is close; no deep link for the works;
`hallSeen` layout does not follow a rotation of the phone; og image for /zihnim missing; the brain still builds Kurgu
and Deney at start; 60-90 s for the whole journey was not timed. Not tried: real phones, Safari, Firefox, real trackpad.

## Görev A: every chapter as cinematic as the tunnel (branch `design/isik-yolu`; local only, not pushed)
This section replaces the ones above where they differ. Done in this round: the card system (all chapters), 01 with the
real cover, 02 with its hero frame and camera move, the quote of 05 and the card of 06. NOT done: 03 outside the brain
with the shutter, the prism room of 04, the climb of 05, the single screen of 06, the Grafik Tasarım filter on the home
page. They are drafted below.

### The rule
Every chapter: arrival (a change of place), a moment of reveal, a hero frame, the chapter card, a calm pause; its own
place, its own colour of light and ONE signature camera move. All of it follows the route position.

| Chapter | Place | Light | Signature move | State |
| --- | --- | --- | --- | --- |
| 00 Kapı | outside of the brain | off-white, teal in the fissure | still, three-quarter frame | built |
| 01 Başlangıç | narrow tunnel on the axis | the colours of the cover "Sabah Olmadan" | dolly forward | built |
| 02 Görsel dil | tall hall of light lines | off-white (paper) | look up, then settle down onto the hero work | built |
| 03 Hareket | long gallery on the axis, outside the brain | warm projection light | truck sideways | NOT built (old scene in the brain) |
| 04 Yapay zekâ | room of split light (prism) | a little lavender | small slow arc | NOT built (old scene in the brain) |
| 05 Zirve | open sky above the whole road | ice-blue dawn | crane up | only the quote (old view) |
| 06 Ben | one empty screen, light turns to the camera | all colours calm | push in | only the card (old final view) |

### The chapter card (`Chapter` in `zihnimWorld.ts`, card in `ZihnimPage.tsx`, styles at the end of `zihnim.css`)
A printed slip: thin top rule, square corners, no glass and no glow. Number, label and `meta` (period, place), a title
of at most two lines, one sentence, `facts` (two or three lines of real data), one hint, at most one link. It fades in
after the arrival (`zhCardIn`), shrinks to "→ nn label" while travelling, and shows at once in the calm view. On phones
it sits at the bottom and shows only the first fact. 05 has no title: the quote is the chapter, centred, with the
credit "— David McCullough Jr. · sevdiğim söz"; the wheel passes through it. 06 is a little larger and has the
signature line "Dünyayı görebilmek için tırmanıyorum.", "Sıradaki hikâye senin.", "Projeni anlat" and "Siteye dön".
Facts come from Career.tsx (MODD Group, Retro Yazılım), tools.ts and the covers. AI tools: a placeholder line, no names.

### 01 with the real cover (`light.cover`)
`public/kapaklar/sabah-olmadan.jpg` is sampled once. The beam dust takes only its coloured cells (`vivid` in
`worldGeometry.ts`), so the beam is turquoise, blue and a little orange, not the pale paper. The far square has a thin
edge of points (a fifth of the cover points), its paper points are kept low (never white). At the arrival the real
picture is sharp (`cover.sharp`), then "Her Gece" and "Yeterli Değil" join it, smaller (`cover.others`, `cover.join`):
three squares; then all leave for the screens of the hall (`cover.split`).

### 02 with personal graphic works (`PERSONAL`, `gorselWide`, `gorselPortrait`)
Kendrick Lamar collage in the middle, Novak × Sinner and blonded radio beside it; client works behind as points.
Collages carry the tag "Kişisel çalışma · Kolaj" in the panel and "kişisel çalışma" in the list; they are not in any
list of brands. Camera: `light.hallMove` (look up 46 units, 7 higher, both gone at the viewing spot).

### Other changes
- Every work panel has an address: `/zihnim?is=<work id>`. Opening it goes to the chapter of the work with the panel
  open; Back closes the panel.
- A phone that is turned reloads at the same route position (`zihnim-s` in sessionStorage) with the hall laid out for
  the new shape (`isPortrait`).
- `public/og/zihnim.jpg` (1200 x 630): the tunnel just before the arrival, only "Sabah Olmadan" in frame. Meta added.
- `wheel.routePx` 10400. A scripted run (one 100 px notch every 0.4 s, 2.6 s rest at seven stops) took 47 s at 8200;
  with 10400 the travelling part is about a quarter longer. It was not timed by a person.
- New images: webp and jpg beside the originals in `public/kapaklar` and `public/grafik` (the png originals are untouched).

### Drafts for the next round
- 03: a fourth point set on the axis after the hall. Shutter: the light lines of the hall dim and return in a slow
  rhythm tied to the route position (low amplitude). The squares slide into one row and begin to move one step at a
  time; the camera trucks sideways and stays calm, the row runs past it; Voop is the large screen at the end. The cut
  after the hall goes away and the brain stops building Kurgu at start (report the point counts before and after).
- 04: one square (the Allesta ad) opens into several versions along a few thin beams; lavender; a slow arc.
- 05: crane up above the axis; the places below as a landscape of squares, each a calm patch of its own colour.
- 06: the colours gather on one empty screen; the light turns to the camera; push in.
- Home page: "Grafik Tasarım" filter in Seçili İşler with the three covers and three collages (image-only cards).

### Measured (Chrome, Windows, RTX 4060, 144 Hz, against `b1a2681`)
GPU, two runs: median 6.9-7.0 ms, p95 7.1 ms in both versions. Software WebGL, one run: cold start 34.7 / 34.8 ms
median (p95 69.4 / 90.3), trip 34.7 / 34.7, pointer 34.7 / 34.7, phone trip 20.8 / 13.9 (old / new).

## Transitions round (branch `design/isik-yolu`; local only, not pushed)
This section replaces the ones above where they differ.

### Eray's answers, applied
- "Ormandaki Ev" is the SONG title of the second cover (the words "Her Gece" are not used as a title).
- AI tools: one line, no names: "Görsel ve video üretiminde güncel yapay zekâ araçları" (card of 04; `data/tools.ts` has one
  entry "Yapay zekâ" with this note; it also becomes one more ball in the tool stack of the home page).
- 02 carries no year and no employer. 03 says "MODD Group · Motion Designer" without dates.
- Helper text (facts, "Kişisel çalışma · Kolaj") is 13 px at 62 % of the ink colour (about 6.6:1 on the ground).
- The png originals live in `source-assets/` (ignored); the site serves the webp and jpg versions.

### Transitions (route time; `light.t`, `light.after`, `light.gallery`)
| Transition | Camera | Light | Share of the route | State |
| --- | --- | --- | --- | --- |
| 00 -> 01 | swing to the fissure, in | the brain comes apart, the beam opens | 0 - 0.19 | built |
| 01 -> 02 | dolly along the axis, then look up and settle | cover colours, then off-white lines | 0.19 - 0.52 | built |
| 02 -> 03 "the motion waiting behind comes forward" | down from the hall to the row, then truck sideways | lines of the hall in a slow shutter, warm rails | 0.60 - 0.74 | built |
| 03 -> 04 | none: the place changes under a soft veil of light | lavender and ice veil (`.zh-veil`) | 0.775 - 0.805 | NOT a camera move yet |
| 04 -> 05 "the climb" | crane up out of the room of 04 to high above the brain | the screens of 04 fade, the land stays | 0.87 - 0.935 | built in a plain form |
| 05 -> 06 | from above down behind the brain (old final view) | unchanged | 0.935 - 1 | old |

02 -> 03 in detail: the six video covers of 03 are a point set of their own (`buildGallery`, frames 10..15,
`galleryFrames`). They wait high up behind the works of the hall as faint points (`galleryStart`), come forward one after
the other into ONE row (`gallery.gather`), and once in the row they move one step at a time with the route position
(`gallery.step`; Voop comes to rest). The lines of the hall dim and return in a shallow rhythm (`gallery.shutter`,
`uShutA`, `uShutP`). The camera blends from the pose of the hall to the start of the row (`camAt`, `galCam`), then trucks
to Voop, which is the large screen. No curved strip. In the calm view there is no shutter and no stepping.

### Point sets
The brain no longer holds Kurgu: 173k points at start on a desktop (was 200k), 60k on a phone (was 70k). With the tunnel
the page starts with 193k points (was 220k). Tunnel 20k, hall 46k, gallery 24k are made on the way and freed after the
veil; the largest total is 263k at 02 (brain + tunnel + hall + gallery). `data-points` on the canvas shows the total.

### Not done in this round
The prism room of 04 and a camera move from 03 into it; the landscape of all places under 05 (only the brain lies below);
the single screen of 06 and the light that turns to the camera; 05 -> 06 is the old flight.

### Other
- `public/og/zihnim.jpg` was looked at and made again: the first cover alone, sharp, no interface (`/zihnim?og` hides the
  two other covers for this picture).
- `wheel.routePx` 15600. Scripted timing, one 100 px notch every 0.3 s and 3.5 s rest at six chapters: 62 s (125 notches).
- Phone first screen of the home page: a line "Görsele hareket, hikâyeye karakter." and the two links under the roles.
  Measured on the emulated pictures: gap between the text block and the visible top of the cap 26 px at 390 x 844 and
  22 px at 340 x 740. On Eray's phone the cap was measured at about 460 px; the emulation shows it at about 368 px, so
  the real gap has to be looked at on the device.
- Measured against `b1a2681`: GPU two runs, median 6.9-7.0 ms, p95 7.1 ms in both. Software WebGL one run: cold start
  34.8 / 34.7 ms median, trip 34.7 / 27.8, pointer 34.7 / 27.8, phone trip 20.9 / 13.9 (old / new).

### Next round
Görev B: /hakkimda as an album inner sleeve (see the brief), on a new branch from the last commit here.

## The rest of the route (branch `design/isik-yolu`; local only, not pushed)
This section replaces the ones above where they differ. The whole journey is now one continuous camera path on the
light path: no dark cut and no veil anywhere (the old cut times in `light.t` are parked beyond 1; the brain's inner
route, `route` knots 7..10, is no longer travelled).

| Transition | Camera | Light | Route time |
| --- | --- | --- | --- |
| 00 -> 01 | swing to the fissure, in | the brain comes apart, the beam opens | 0 - 0.19 |
| 01 -> 02 | dolly along the axis, look up, settle | cover colours, then off-white lines | 0.19 - 0.52 |
| 02 -> 03 | down to the row, truck sideways | shutter of the hall's lines, warm beam on Voop | 0.60 - 0.74 |
| 03 -> 04 "the light splits" | the truck goes on to Allesta, then a small slow arc | a thin prism, thin lavender / ice / teal beams | 0.74 - 0.885 |
| 04 -> 05 "the climb" | crane up, the look tips back along the road | the places stay below as silhouettes | 0.885 - 0.935 |
| 05 -> 06 "the light turns to you" | push in to one empty screen | the screen's light comes up | 0.945 - 1 |

- 04 (`light.room`, `roomFrames`, `buildRoom`, frames 16..20): the Allesta poster in the middle and four REAL frames of
  its making around it (`public/process/allesta/kurgu-kesit-1..3.jpg`, `kurgu-final-kare.jpg`), which open out of it
  one after the other (`room.open`) and breathe a very little at rest (not in the calm view). The "colour trials" of
  the old Hakkımda page are the same poster with CSS filters, not separate pictures, so they are NOT used as versions.
  The old screens of 04 (site captures, concept app) are no longer in /zihnim.
- 05 (`light.summit`, `buildSummit`): the camera stands high beyond the end of the road and looks back. Silhouettes made
  only here (11k points desktop, 5k phone): the brain far away, the tunnel as a thin line, and the squares of the hall
  (off-white), the gallery (warm) and the room (lavender). No ice-blue dawn light was built.
- 06 (`light.screen`, `screenMat`): one empty rectangle of light that faces the visitor; the camera stops in front of
  it; the final card stands before it. Nothing flows from the landscape into the screen yet.
- 03: a warm beam of points from above and beside the row down onto Voop (`gallery.beam`). The frames come forward
  earlier and over a longer stretch (`gallery.gather` 0.548 - 0.675, `gallery.each`); the share comes from the
  look-around of the hall. Shutter: `gallery.shutter.amp` 0.62, only the light lines and their pools, tied to the route
  position, none in the calm view.
- `data/tools.ts`: the "Yapay zekâ" entry is text only (`ballTools` feeds the 3D stack of the home page).

Point sets on a desktop (`data-points`): 193k at the start (brain 173k + tunnel 20k); the largest total is 263k at 02
(brain + tunnel + hall + gallery); 258k at 03, 223k at 04, 199k at 05, 184k at 06. The brain stays in memory (hidden)
for the whole journey after the way in; freeing it past the tunnel is open.

Measured against `b1a2681` (Chrome, Windows, RTX 4060, 144 Hz): GPU two runs, median 6.9-7.0 ms, p95 7.1 ms in both.
Software WebGL one run: cold start 34.7 / 41.6 ms median, trip 34.7 / 27.8, pointer 34.7 / 27.9, phone trip 20.9 / 14.0
(old / new). Scripted journey, one 100 px notch every 0.3 s and 3.5 s rest at six chapters: 62 s.

Open: the landscape of 05 is thin and has no dawn light; 05 -> 06 has no light that flows to the screen; the prism is a
plain sheet of points; on phones the fan of 04 is cut at the sides; the first wheel notch moves the route by 0.008.
Next round: Görev B (/hakkimda, the album inner sleeve) on a new branch `design/hakkimda-album` from the last commit here.
For it: Career data is still inside `Career.tsx` (to be moved to a data file), the covers and collages are in
`public/kapaklar` and `public/grafik` (webp + jpg), `utils/lang.ts`, `ViewMenu`, `utils/viewMode.ts` and the main menu of
`Navbar.tsx` are ready to reuse; the old page is `OrbitPage.tsx`.
