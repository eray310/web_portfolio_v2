export const tools: { name: string; color: string; note?: string }[] = [
  { name: "After Effects", color: "#1b1146" },
  { name: "Premiere Pro", color: "#1d1a4d" },
  { name: "Photoshop", color: "#0b2a4a" },
  { name: "Illustrator", color: "#4a2a0b" },
  { name: "InDesign", color: "#4a0b2e" },
  { name: "CapCut", color: "#10303a" },
  // one entry for all of them, by Eray's wish: no tool is named
  { name: "Yapay zekâ", color: "#12383a", note: "Görsel ve video üretiminde güncel yapay zekâ araçları" },
];

/** The tools that have a ball in the 3D stack of the home page (the general "Yapay zekâ" entry is text only). */
export const ballTools = tools.filter((t) => !t.note);
