<div align="center">

<h1>Eray Ömeroğlu — Portfolyo</h1>

<p><strong>Motion designer ve art director Eray Ömeroğlu'nun interaktif 3D portfolyosu: fizik tabanlı araç topları, scroll animasyonları ve video galerisi.</strong></p>

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Three.js](https://img.shields.io/badge/Three.js-r168-000000?logo=three.js)](https://threejs.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?logo=vite)](https://vitejs.dev)
[![Behance](https://img.shields.io/badge/Behance-erayomeroglu-1769ff?logo=behance)](https://www.behance.net/erayomeroglu)

</div>

---

# Links

- 🎨 **Behance:** [behance.net/erayomeroglu](https://www.behance.net/erayomeroglu)
- 🖥️ **Repository:** [github.com/eray310/web_portfolio_v2](https://github.com/eray310/web_portfolio_v2)

---

# Overview

Eray Ömeroğlu için hazırlanmış, motion design, reklam videoları ve sosyal medya içeriklerini sergileyen interaktif bir portfolyo sitesi.

**Design goals:**
- Immersive 3D presence without sacrificing performance
- Scroll-driven narrative that feels like a guided tour
- Zero external API dependencies — ships as a static bundle
- Clear presentation of selected work, skills, and experience

---

# Features

| Category | Details |
|----------|---------|
| **3D Character** | Interactive character with mouse-driven head rotation, eyebrow hover, typing animation, and blinking. |
| **Encrypted Model** | GLB model AES-256 encrypted at rest (`character.enc`), decrypted client-side before rendering. |
| **Physics TechStack** | 30 spheres labelled with the design tools used (After Effects, Premiere Pro, Photoshop, Illustrator, InDesign, CapCut), collision physics via `@react-three/rapier`, and N8AO post-processing. |
| **Scroll Animations** | GSAP `ScrollTrigger` + `SplitText` for character/camera transitions and text reveals. |
| **Custom Cursor** | Smooth-following cursor with state-aware hover effects. |
| **Video Gallery** | Drag-to-navigate carousel of portfolio videos; each card opens a video player dialog with playback controls. |
| **Loading Screen** | Animated loading sequence with marquee text and progress simulation. |
| **Career Timeline** | Vertical timeline with scroll-triggered dot indicator. |
| **Responsive** | Adaptive layouts from 375px mobile to 1950px+ ultrawide. 3D canvas hidden below 1024px. |
| **Static Export** | Zero-config deploy to Vercel, Netlify, or GitHub Pages. |

---

# Tech Stack

<div align="center">

| Frontend | 3D & Graphics | Animation | Styling | Build |
|----------|---------------|-----------|---------|-------|
| [React 18](https://react.dev) | [Three.js r168](https://threejs.org) | [GSAP 3.12](https://gsap.com) | Plain CSS | [Vite 5.4](https://vitejs.dev) |
| [TypeScript 5.5](https://www.typescriptlang.org) | [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) | [@gsap/react](https://gsap.com) | CSS Variables | [esbuild](https://esbuild.github.io) |
| | [@react-three/drei](https://docs.pmnd.rs/drei) | [react-fast-marquee](https://www.npmjs.com/package/react-fast-marquee) | | |
| | [@react-three/rapier](https://docs.pmnd.rs/rapier) | | | |
| | [@react-three/postprocessing](https://docs.pmnd.rs/postprocessing) | | | |
| | [three-stdlib](https://github.com/mrdoob/three.js/tree/dev/examples/jsm) | | | |

**Icons:** [react-icons](https://react-icons.github.io/react-icons/) &nbsp;|&nbsp; **Analytics:** [@vercel/analytics](https://vercel.com/docs/concepts/analytics)

</div>

---

# Project Structure

```
.
├── public/
│   ├── portfolio/                  # Portfolio videos (.mp4)
│   ├── images/                     # Image assets
│   ├── models/
│   │   ├── character.enc           # AES-256 encrypted GLB
│   │   ├── char_enviorment.hdr     # HDR environment map
│   │   └── encrypt.cjs             # Encryption script
│   └── draco/                      # DRACO decoder binaries
├── src/
│   ├── components/
│   │   ├── Character/              # 3D scene, GLTF loading, lighting, animations
│   │   │   └── utils/
│   │   │       ├── character.ts    # DRACO + decrypt pipeline
│   │   │       ├── lighting.ts     # HDR environment + lights
│   │   │       ├── animationUtils.ts
│   │   │       ├── mouseUtils.ts
│   │   │       └── resizeUtils.ts
│   │   ├── styles/                 # Per-component CSS
│   │   ├── utils/                  # GSAP scroll/text utilities
│   │   ├── context/
│   │   │   └── LoadingProvider.tsx # Global loading state
│   │   ├── Landing.tsx             # Hero section
│   │   ├── About.tsx               # Bio
│   │   ├── WhatIDo.tsx             # Service cards
│   │   ├── Career.tsx              # Experience timeline
│   │   ├── Work.tsx                # Video gallery
│   │   ├── VideoModal.tsx          # Video player dialog
│   │   ├── TechStack.tsx           # 3D physics spheres
│   │   ├── Contact.tsx
│   │   ├── Navbar.tsx
│   │   ├── Cursor.tsx
│   │   └── SocialIcons.tsx
│   ├── data/
│   │   └── boneData.ts             # Animation bone mappings
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                   # Global variables + reset
├── .github/workflows/
│   └── deploy.yml                  # GitHub Pages CI
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json / netlify.toml      # Platform configs
```

<details>
<summary><strong>Architecture highlights</strong></summary>

- `MainContainer` composes sections and manages `ScrollTrigger` layout animations.
- `LoadingProvider` gates the app until 3D assets and fonts are ready.
- `TechStack` uses `Environment` + `EffectComposer` + `Physics` for a performant interactive scene.
- `Works` carousel uses pointer events with velocity-based swipe detection.
- All asset paths resolve through `import.meta.env.BASE_URL` for subpath-safe deployments.

</details>

---

# Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/eray310/web_portfolio_v2.git
cd web_portfolio_v2
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`.

### Production Build

```bash
npm run build
```

Validates with TypeScript, bundles with Vite, and outputs to `dist/`.

### Preview Production Build

```bash
npm run preview
```

---

# Performance

- **Vite + esbuild** — sub-second cold starts and optimized production bundles.
- **DRACO Compression** — 3D model shipped as compressed + encrypted binary.
- **Lazy Loading** — `React.lazy()` + `Suspense` for non-critical sections.
- **Asset Hashing** — Static assets fingerprinted for long-term caching.
- **N8AO** — Screen-space ambient occlusion rendered efficiently via post-processing.

---

# Design System

| Element | Value |
|---------|-------|
| **Background** | `#0a0e17` (dark blue) |
| **Accent** | `#5eead4` (teal/cyan) |
| **Text** | `#eae5ec` (off-white) |
| **Font** | Geist (Google Fonts) |
| **Base unit** | `clamp()` + viewport-relative sizing |

- Breakpoints: `500px`, `768px`, `900px`, `1024px`, `1200px`, `1400px`, `1600px`, `1950px`
- 3D canvas hidden below `1024px` to preserve mobile performance
- CSS Micro-interactions via transitions + keyframes
- Complex motion handled by GSAP timelines

---

# Customization

<details>
<summary>Edit personal content</summary>

Update text and data directly in component files:
- `src/components/Landing.tsx` — name and titles
- `src/components/About.tsx` — bio
- `src/components/Career.tsx` — experience entries
- `src/components/Work.tsx` — video cards (files live in `public/portfolio/`)
- `src/data/boneData.ts` — animation bone names

</details>

<details>
<summary>Replace images and models</summary>

- Videos: add files to `public/portfolio/` and list them in `Work.tsx`.
- Tool balls: edit the `tools` list in `TechStack.tsx`.
- 3D Model: replace `public/models/character.enc` (must match decrypt password in `src/components/Character/utils/decrypt.ts`).
- Environment: replace `public/models/char_enviorment.hdr`.

</details>

<details>
<summary>Change colors and theme</summary>

Edit CSS variables in `src/index.css`:
- `--accentColor`
- `--backgroundColor`

</details>

<details>
<summary>Adjust 3D behavior</summary>

- Scene logic: `src/components/Character/utils/`
- Physics: `TechStack.tsx` — sphere count, collider size, pointer force
- Animation timelines: `src/components/utils/GsapScroll.ts`

</details>

---

# Deployment

### Vercel (primary)

The site is built with `base: "/"`, so it is served from the domain root. Import the repository in Vercel and configure:
- **Framework:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

`vercel.json` and `netlify.toml` are included for SPA fallback routing. Videos, the 3D model and images are served from `public/` through `import.meta.env.BASE_URL`.

---

# Roadmap

- [ ] Sound effects on hover / interaction
- [ ] Project detail modal instead of carousel
- [ ] Dark / light theme toggle
- [ ] Blog / writing section
- [ ] Contact form with email integration
- [ ] Reduced motion media query support
- [ ] WebXR / VR preview mode

---

# Contributing

This is a personal portfolio. Open an issue for bugs or suggestions.

---

# Credits

Built from the original template [Vansh281999/web_portfolio_v2](https://github.com/Vansh281999/web_portfolio_v2) (MIT License).

---

# License

[MIT](LICENSE)

---

# Contact

<div align="center">

[![Behance](https://img.shields.io/badge/Behance-erayomeroglu-1769ff?logo=behance)](https://www.behance.net/erayomeroglu)

</div>
