import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";

import { App } from "./app/App";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/shell.css";
import "./styles/recipes.css";
import "./styles/planner.css";
import "./styles/access.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("No se encontró el contenedor principal de la aplicación.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
