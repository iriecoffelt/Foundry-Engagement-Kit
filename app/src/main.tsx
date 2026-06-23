import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { FocusTimerProvider } from "./context/FocusTimerContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <FocusTimerProvider>
      <App />
    </FocusTimerProvider>
  </React.StrictMode>,
);
