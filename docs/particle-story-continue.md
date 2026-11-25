# Particle story: continuation note

## Start and return references
- Design start: `design/ai-hakkimda-space` at `e1e61fe` (kept as the backup of that design).
- Production `main` before this release: `875a4e58a7bb8ee15f8e12396115f15896962eb3`
  - backup branch: `backup/main-before-particle-release-20261126`
  - annotated tag: `pre-particle-release-20261126`
  - older tag: `pre-ai-space-redesign`
- Vercel: the CLI and the project were not reachable from the machine that made this release, so no
  deployment id was recorded. Quick rollback: Vercel dashboard → Deployments → the deployment built from
  `875a4e5` → "Promote to Production" (or Instant Rollback).
- One-sentence instruction to send to Claude: "main'i `pre-particle-release-20261126` etiketindeki
  commit'e (875a4e5) geri döndür: yeni bir revert commit'i ile push et ve Vercel dağıtımını doğrula."

## Done
- Shared GPU particle system (`src/components/particles/ParticleStory.ts`): same point count for every
  shape, staggered morph, camera key-frames, local pointer push with soft decay, additive soft dots.
- Hakkımda prototype (`/hakkimda?prototip=parcacik`): character (head and shoulders, sampled from the
  GLB surface with the posed skeleton) → MOTION text → picture frame; scroll goes forward and back on the
  same path; scene menu, brief CTA, still view for reduced motion / no WebGL / model failure.
- AI İşler prototype (`/ai-isler?prototip=parcacik`): WEB → browser frame → the real portfolio picture,
  drawn by the page's own renderer into the stage box (`ai/AiWebParticles.tsx`, hook in `ai/spaceScene.ts`
  and `ai/spaceBus.ts`); CSS version (`WebStage`) as fallback.
- "Tam videoyu aç" button moved under the picture (it covered the caption inside the clip).
- Geist is served from the site (`src/assets/fonts/geist`, OFL) – no Google request.

The prototypes are only on the `?prototip=parcacik` addresses. The normal pages are unchanged.

## Remaining
- Hakkımda: Art Direction (colour fields), Grafik Tasarım (letters + frame), Kurgu (moving strip), AI Artist,
  final constellation; the real scene navigation.
- AI İşler: FİLM (image frame → video preview) and APP (app-flow connections, "Konsept prototip").
- Make the particle versions the default pages after the owner's review.
- `public/cv/Eray_Omeroglu_CV.pdf` is linked from the pages but is not in the repository (404, older issue).
- Not tried on real phones / low-end devices.

## Replacing the character
Everything about the model is in `src/components/particles/config.ts` (`characterModel`):
`url` / `password`, `include` / `exclude` mesh names, `crop` (e.g. cut below the shoulders), `fit.height`,
`rotationY`, `offset`, `facing`, `pose` (clip and moment). Use `?prototip=parcacik&model=debug` to log the
mesh names. Camera framing per scene is `makeCameras()` in `HakkimdaParticles.tsx`.
The normal 3D character of the home page uses `public/models/character.enc` (separate from this).

## Commands
```
npm ci
npm run dev        # then open /hakkimda?prototip=parcacik and /ai-isler?prototip=parcacik
npx tsc -b && npx vite build && npx vite preview
```
(`git checkout -- tsconfig.app.tsbuildinfo` after `tsc -b`; do not commit it.)

## Licences
See `THIRD_PARTY_NOTICES.md`.
