
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import "./styles/global.css";

// Restore the saved RIMS theme before rendering.
try {
  const savedTheme = localStorage.getItem("rimsTheme");
  const theme = savedTheme === "dark" ? "dark" : "light";

  document.documentElement.setAttribute("data-theme", theme);
} catch {
  document.documentElement.setAttribute("data-theme", "light");
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
