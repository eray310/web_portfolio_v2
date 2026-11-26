import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pageRoutes from "./scripts/vite-routes.mjs";
import { hasCv } from "./scripts/has-cv.mjs";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  // Real pages ("/", "/hakkimda", "/ai-isler" and "/cerez-tercihleri"), each with its own HTML head; see scripts/vite-routes.mjs.
  appType: "mpa",
  // Hakkımda only asks for the CV (and shows its buttons) when public/cv/Eray_Omeroglu_CV.pdf exists in the build.
  define: { __HAS_CV__: JSON.stringify(hasCv) },
  plugins: [react(), pageRoutes()],
  build: {
    rollupOptions: {
      input: { main: "index.html", hakkimda: "hakkimda/index.html", aiIsler: "ai-isler/index.html", cerez: "cerez-tercihleri/index.html", zihnim: "zihnim/index.html" },
    },
  },
});
