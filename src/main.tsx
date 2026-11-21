import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/legacy.css";
import { legacyMarkup } from "./legacyMarkup";
import { initLegacy } from "./legacy";
import { runSelfTests } from "./detection/selfTests";

function App() {
  useEffect(() => {
    runSelfTests();
    (window as any).runSelfTests = runSelfTests;
    initLegacy();
  }, []);
  return <div dangerouslySetInnerHTML={{ __html: legacyMarkup }} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <App />
);

/* App-shell only: public/sw.js caches the HTML, manifest and hashed assets.
   It never caches POST bodies or /analyze responses. Production builds only. */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
