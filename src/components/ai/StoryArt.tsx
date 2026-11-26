/**
 * A still, dotted picture of each step of "Birlikte nasıl çalışırız?" (the same four settled shapes the
 * particles take). It is shown only where the WebGL scene is not drawing (no WebGL, or it has not started
 * yet). Decorative: the step text next to it says everything.
 */
const dots = { strokeLinecap: "round" as const, fill: "none" };

const D = ({ children, w = 2.6, gap = 6.5, o = 0.8 }: { children: React.ReactNode; w?: number; gap?: number; o?: number }) => (
  <g stroke="#dbe8ff" strokeWidth={w} strokeDasharray={`0.1 ${gap}`} strokeOpacity={o} {...dots}>
    {children}
  </g>
);
const Teal = ({ children }: { children: React.ReactNode }) => (
  <g stroke="#5eead4" strokeWidth={3} strokeDasharray="0.1 7" strokeOpacity={0.9} {...dots}>
    {children}
  </g>
);

const art = [
  // 1: one linked core
  <g key="a">
    <D w={3.2} gap={5}>
      <circle cx="200" cy="150" r="14" />
      <circle cx="200" cy="150" r="30" />
      <circle cx="200" cy="150" r="48" />
    </D>
    <Teal>
      <circle cx="178" cy="132" r="22" />
    </Teal>
    <D w={2} gap={9} o={0.5}>
      <circle cx="200" cy="150" r="76" />
      <circle cx="200" cy="150" r="104" />
    </D>
  </g>,
  // 2: orbits and linked points
  <g key="b">
    <D w={3.2} gap={5}>
      <circle cx="200" cy="150" r="10" />
      <circle cx="200" cy="150" r="22" />
    </D>
    <D>
      <ellipse cx="200" cy="150" rx="70" ry="30" />
      <ellipse cx="200" cy="150" rx="110" ry="48" />
      <ellipse cx="200" cy="150" rx="150" ry="66" />
    </D>
    <Teal>
      <circle cx="255" cy="132" r="10" />
      <circle cx="120" cy="176" r="10" />
      <circle cx="300" cy="180" r="10" />
    </Teal>
  </g>,
  // 3: nested frames
  <g key="c">
    <D>
      <rect x="62" y="64" width="190" height="112" rx="8" />
      <rect x="236" y="88" width="62" height="118" rx="8" />
      <rect x="92" y="128" width="112" height="74" rx="8" />
    </D>
    <Teal>
      <rect x="120" y="100" width="130" height="80" rx="8" />
    </Teal>
  </g>,
  // 4: one aligned composition
  <g key="d">
    <D>
      <rect x="64" y="70" width="196" height="120" rx="8" />
      <rect x="274" y="70" width="56" height="120" rx="8" />
      <path d="M64 226 H330" />
    </D>
    <D w={2} gap={7} o={0.55}>
      <path d="M80 100 H244 M80 130 H244 M80 160 H244" />
    </D>
    <Teal>
      <circle cx="96" cy="226" r="3" />
    </Teal>
  </g>,
];

const StoryArt = ({ step }: { step: number }) => (
  <svg className="ai-flow-art" viewBox="0 0 400 300" aria-hidden="true" focusable="false">
    {art[Math.min(3, Math.max(0, step))]}
  </svg>
);

export default StoryArt;
