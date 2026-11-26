# AI İşler + Hakkımda: particle volume and local pointer wave (design branch, not on main, not published)

Branch: `design/ai-particle-volume` (from `main` at `0dc9bf9`). Status: preview only, to be judged visually first.

## What it is
A GPU particle formation behind the AI İşler opening and the Web Sitesi section. It is one extra `Points`
object inside the page's existing WebGL scene (`ai/spaceScene.ts`), so there is no second canvas.
- Opening: a folded, twisting ribbon of fine fibres, dense and thin stretches, dark gaps, a little far dust and a
  few large soft points near the camera.
- Scroll (stop 0 to 1): the same points settle onto lanes (lines of flow) and flat grid panels around the browser
  and phone. Between stop 1 and about 2.2 it fades into the existing background. Reversible, stops anywhere.
- Colour: off-white and pale grey; three soft waves (turquoise, to ice blue, a little lavender) travel along the
  shape and leave a short trail. One loop is 16 s and repeats exactly (all rates are whole multiples), so there is
  no seam. Breathing motion repeats every 64 s for the same reason.
- Pointer (mouse only): near points are pushed along the existing flow field and spread a little, with a little
  turquoise; it settles when the pointer rests. Touch devices get none of it.
- "Hareketi azalt": one still composition (colour frozen at `color.stillAt`). "Arka planı durdur", hidden tab and
  an open brief stop the loop as before. No WebGL: the existing static ground stays.
- Prototype code (`?prototip=parcacik`, character/MOTION/frame and WEB/browser story) is untouched and still off.

## Where the look is set
All visual settings are in **`src/components/ai/volumeConfig.ts`**: particle counts, size and alpha per depth
tier, palette, lavender share, colour loop length and waves, fold/ripple/turn strength, pointer push radius
strength and tint, text-column and behind-box darkening, phone values, scroll fade.
Pointer radius and settle time are in `ai/flowField.ts` (`sigma`, `dv`, `dtk`), shared with Hakkımda.
Geometry and shaders: `src/components/ai/volumeLayer.ts`. Wiring: `src/components/ai/spaceScene.ts`
(search `volume`).

## Run
```
git fetch origin
git switch design/ai-particle-volume
npm ci
npm run dev                       # open /ai-isler
npx tsc -b && npx vite build && npx vite preview
git checkout -- tsconfig.app.tsbuildinfo   # after tsc -b; do not commit it
```
Test hook: `document.querySelector('.ai-space-canvas').__volume.debugSet(loop01, motionSeconds)` freezes the colour
loop and breathing; `debugSet(null)` lets time run.

## Not measured / open
- Real phones and low-end devices were not tried. Frame times were measured on one desktop GPU and on software
  rendering only.
- The mobile formation is deliberately quiet (it mostly sits behind the showreel).
- `public/cv/Eray_Omeroglu_CV.pdf` is still missing (older issue).
- Making this the default look on main, and extending it to the other sections or to Hakkımda, is not done.

## Revision 2 (three changes)
1. **AI İşler, smoke removed.** The turquoise smoke and the curling light threads that followed the pointer were drawn
   by the background shader in `ai/spaceScene.ts` (`BG_FRAG`: the flow-bent texture and the "thin threads" block, fed by
   `uFlow`, `uFlowT`, `uFlowE`). All of that is gone. The pointer reaches only the particles now (volume layer and the old
   near stars). The static nebula and glow were also turned down at stops 0 to 2 (`LOOKS` in `spaceScene.ts`) to keep
   the ground dark and clean.
2. **Reklam Filmi ve Video.** The formation continues: shape A (opening), B (Web Sitesi lanes and panels), C (a wider curl).
   `uMorph` goes 0 to 1 over stops 0 to 1, `uMorph2` 0 to 1 over stops 1 to 2; it fades into the old background between
   `scroll.fadeStart` and `scroll.fadeEnd`. The shape follows the example box (live, also while scrolling), the quiet zone
   for the writing moves from the left to the right (`uSide`), an open full player calms it (`motion.playerAlpha`, eased,
   and only near that section). Same palette and colour waves, same loop. Settings: `volumeConfig.ts` (`scroll`,
   `readability.textColumnSide`, `place`), shape C: `centreC`, `halfWidthC` in `volumeLayer.ts`.
3. **Hakkımda.** The threads of light (and nothing else of the old wake) are removed from `ai/OrbitFlow.tsx`. In their
   place: a "local particle wave" on the same small 2D canvas (no WebGL): about 1100 faint stars plus 64 near ones, each with
   a depth; near the pointer they spread along the flow, swell (size, brightness, small parallax) and take a faint ice
   blue / turquoise tint; they are back in place about a second after the pointer stops. Settings: `ai/orbitWaveConfig.ts`.
   Touch screens and "Hareketi azalt": resting picture only; the loop sleeps when nothing moves.

## Revision 3 (process story, web demo, app demo)
1. **"Birlikte nasıl çalışırız?"** is one continuous particle story (`ai/ProcessStory.tsx`, `ai/storyLayer.ts`, settings in
   `ai/storyConfig.ts`). It uses the real four steps of `aiSteps` (data/aiWorks.ts): 1 Brief'i anlat (scattered clusters
   gather into one linked core), 2 Kapsamı netleştirelim (orbits and linked focal points), 3 Tasarla, üret, geliştir
   (the orbit points flow into nested frames), 4 Teslim et (the layers line up into one calm composition). Every point
   has a place in all five shapes and moves along a curved, visible path. It lives in the page's one WebGL scene (one more `Points`
   object), no extra canvas. The page writes `spaceBus.story` (position `u` 0..4, box, visibility); the scene reads it.
   - Wide screens: two columns, text left, picture right, both pinned for about 3.2 screens of NATIVE scrolling (CSS
     `position: sticky`; `--ai-pinned` in AiStory.css, `pinned` in the config). No wheel capture, no snapping.
     Step k is settled at `u = k + 1`. The step titles are buttons (keyboard and pointer go to that step).
   - Phones: no pinning; each step has its own picture box under its text, and the one set of points travels from box to box.
   - "Hareketi azalt": only settled shapes, one still frame per step. No WebGL: a dotted SVG per step (`ai/StoryArt.tsx`).
     The step text is plain HTML in all cases.
2. **Web Sitesi demo** (`WebStage` in `ai/stages.tsx`, CSS in `AiStages.css`): about 16 s. Browser is set up, home page,
   menu click on AI İşler, the real AI İşler page scrolls, menu click on Hakkımda, a calm end of about 4 s, soft restart; the
   phone shows the same pages. Pictures are real captures in `public/ai-works/web-sitesi/` (`portfolyo-ai-masaustu.jpg`,
   `portfolyo-ai-mobil.jpg` are new; made with the page itself, the Web Sitesi stage of the capture hidden). The only
   additions are a small pointer and a ring where the menu is clicked.
3. **Uygulama Prototipleri demo** (`ai/AppDemo.tsx`, `styles/AiApp.css`): a concept meeting-booking flow of a design studio,
   about 17 s: choose a topic, day, time, summary, confirm, processing, success, rest, soft restart. Labeled "Konsept prototip",
   the sample days and times are marked as examples. Visible "Demoyu durdur / oynat" button; the picture takes no focus.
   Runs only on screen and with a visible tab; "Hareketi azalt" shows the completed screen.

Not done / not measured: real phones and low-end devices; the step-title buttons are not in the tab order of the old page
(they are new); extending the story to Hakkımda is not done.

## Cinematic round (branch `design/cinematic-zihnim-ai`, from `main` at `297e619`; preview only, not merged)
- "Arka planı durdur" (opening and footer) and "Demoyu durdur" are removed (`ai/SpaceToggle.tsx` deleted). The header
  has the shared "Görünüm" menu (`components/ViewMenu.tsx`, `utils/viewMode.ts`). "Sakin görünüm": the scene keeps no
  ambient motion and no pointer push but still follows the scroll (`setCalm` in `ai/spaceScene.ts`, it draws only
  while the page moves); the web and app demos show their finished state; the silent previews stop; the showreel
  waits for its own Play; "Tam videoyu aç" still works. "Hareketi azalt" switches it on.
- Ground: the same warm black as /zihnim (`BG_FRAG` base colours, `#0c0a0b` in `AiWorksPage.css` and the still picture).
- The title "AI İşler" is one colour (the gradient on one word is gone).
- Not done in this round: new opening composition of the volume, a longer web demo, shared-element transitions in the
  app demo, stronger shapes for "Birlikte nasıl çalışırız", typography scale review. The demos and content are as before.
