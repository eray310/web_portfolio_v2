import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pageRoutes from "./scripts/vite-routes.mjs";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  // Two real pages ("/" and "/hakkimda"), each with its own HTML head; see scripts/vite-routes.mjs.
  appType: "mpa",
  plugins: [react(), pageRoutes()],
  build: {
    rollupOptions: {
      input: { main: "index.html", hakkimda: "hakkimda/index.html" },
    },
  },
});
