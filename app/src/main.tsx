import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { FocusTimerProvider } from "./context/FocusTimerContext";
import { ThemeProvider } from "./context/ThemeProvider";
import { initTheme } from "./lib/theme";
import "./index.css";

initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <FocusTimerProvider>
        <App />
      </FocusTimerProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
