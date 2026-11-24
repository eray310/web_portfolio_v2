import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./utils/deepLink";
import App from "./App.tsx";
import "./index.css";
import { applyMotionPreference } from "./utils/motion";

applyMotionPreference();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
