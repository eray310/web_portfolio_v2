# AI İşler: particle volume (design branch, not on main, not published)

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
