import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./index.css";
import "./theme.css";
import "./theme-dark.css";
import "./theme-components.css";
import "./theme-effects.css";
import "./theme-layout.css";
import "./theme-polish.css";
import "./theme-admin.css";
import "./theme-extreme.css";
import { ToastProvider } from "./components/Toast";

/* Apply saved theme before first paint */
const savedTheme = localStorage.getItem("hostelTheme");
if (savedTheme === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
}

/* Guard against missing DOM root element - prevents headless/minimal-DOM crash */
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error(
    "[HOSTEL-HUB] UI startup failed: #root element not found. " +
    "The app cannot mount without a DOM root."
  );
  throw new Error("HostelHub: Missing #root element in DOM.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
