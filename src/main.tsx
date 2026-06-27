import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initSpatialNavigation } from "./input/spatial";
import "./styles/app.css";

initSpatialNavigation();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
