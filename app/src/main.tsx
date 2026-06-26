import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { FocusTimerProvider } from "./context/FocusTimerContext";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { ThemeProvider } from "./context/ThemeProvider";
import { initTheme } from "./lib/theme";
import "./index.css";

initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <FocusTimerProvider>
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </FocusTimerProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
