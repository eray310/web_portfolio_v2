# /hakkimda: "Albüm iç kapağı" (branch `design/hakkimda-album`, from `design/isik-yolu` at `c8c02d0`; local only, not pushed)

## Idea
/zihnim is the show; /hakkimda is the same story quick, readable and honest: who I am, where I come from, how I work,
what I did, how to reach me. It is laid out like the inner sleeve of a record: warm black ground (#0c0a0b), off-white
type, thin rules, a clear grid, turquoise only in small accents. The cover of the album is Eray himself: a portrait made
of dots. Ordinary scrolling, no pinned stretches, no WebGL. Font: Geist only (no second face was added).

## Files
- `src/components/album/AlbumPage.tsx` (page), `album.css`, `DotPortrait.tsx` (portrait), `albumConfig.ts` (portrait
  settings and all texts: tracks, roles, covers, Allesta frames, principles, quote).
- `src/components/SiteHeader.tsx`: the site's header and main menu, now one component for the home page (`Navbar.tsx`
  uses it with `home`) and for /hakkimda (`active="hakkimda"`).
- `src/data/career.ts`: work experience, one source for the home page (`Career.tsx`) and for /hakkimda.
- `src/App.tsx`: /hakkimda shows the album page. The old page is kept as a file (`OrbitPage.tsx`, its CSS) and can be
  opened at `/hakkimda?eski`; `/hakkimda?prototip=parcacik` is unchanged.
- `hakkimda/index.html`: title, description, og and twitter tags, and a `<noscript>` block with the still dot portrait.

## Sections and texts
Kapak: portrait, "Eray Ömeroğlu", roles, "Markalar için hareketli grafik, reklam filmi, kurgu ve yapay zekâ destekli
görsel üretiyorum.", the track list (real links), the Görünüm menu.
01 Başlangıç "Kendi şarkılarıma kapak yaparak başladım." three covers: Sabah Olmadan, Ormandaki Ev, Yeterli Değil.
02 Dönüm noktası "Grafik tasarım bana yetmedi. Hareket daha dinamik, daha etkili geldi." left: Novak × Sinner
("Kişisel çalışma · Kolaj"); right: Voop (silent preview, no loop, plays in view, visible Oynat / Durdur).
03 Yapay zekâ "İşimi geliştirmek isterken yapay zekâ geldi." four real frames from `public/process/allesta`, the line
about AI tools (no names), link to AI İşler.
04 Nasıl çalışırım: three principles derived from the steps of AI İşler (`aiSteps`).
05 Kariyer: from `data/career.ts`, with dates.
06 Künye: roles, services (one line), tools (`tools.ts`, the "Yapay zekâ" entry as its note), brands (`brands.ts`).
Söz: the quote with its credit "— David McCullough Jr. · sevdiğim söz". Kapanış: "İlk kareyi birlikte kuralım.",
"Projeni anlat" (the existing brief), "Hikâyemi deneyim olarak izle" to /zihnim.

## The portrait
- Original: `source-assets/portre/eray-portre.jpeg` (ignored by git). The site gets only
  `public/hakkimda/portre-kaynak.jpg`: 440 x 440, grayscale, masked with a soft oval (nothing of the car is left),
  made with ffmpeg and `-map_metadata -1`. No background-removal tool was available; the oval mask alone is used.
  Command: crop=1200:1400:0:60, pad to 1400 square, scale 560, gray, eq contrast 1.25, geq oval mask, crop=440:440:60:64.
- `DotPortrait.tsx` reads it once into a grid (one dot per cell, size by brightness, dark cells sparse or empty).
  Settings in `portraitConfig`: `cell`, `minCols`/`maxCols`, `black`, `gamma`, `sparseBelow`, `maxFill`, `jitter`,
  `gatherMs`, `stagger`, `teal`, `pointer`.
- Motion: the dots gather once when the canvas comes into view; with a mouse the dots near the pointer give way a
  little; touch screens, reduced motion and "Sakin görünüm" get the finished portrait. Nothing is drawn at rest.
- Stills: `public/hakkimda/portre-noktalar.jpg` / `.webp` (900 px, for no-JS) and `public/og/hakkimda.jpg` (1200 x 630)
  are screenshots of `/hakkimda?og`; remake them with the capture script after changing the settings.
- Metadata check: ffprobe shows no format or stream tags and the bytes contain no "Exif" or "GPS" marker in the four
  public files.

## Halftone rule
`.alb-ht`: pictures are grey behind a screen of dots until they come into view, then sharp, once (CSS only).

## Measured (Chrome, Windows, RTX 4060)
Height at 1440 x 900: 6208 px (6.9 screens); old page 15210 px there and 12979 px at 1366 x 768. New at 1366: 5800 px
(7.6 screens); at 390: 7542 px; at 340: 7163 px. Scrolling frame time, two runs each: old median 118 and 90 ms, new 6.9 ms.
The load numbers of the script were not comparable (chunks arrive after the load event) and are not reported.

## Open
The side light of the photograph is soft, so the dark half of the face is not strongly lost; hair is not shown (it is
dark on a masked ground). Phones are 9-10 screens tall. Not tried: real phones, Safari, Firefox.
