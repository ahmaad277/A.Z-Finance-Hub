import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import App from "./App";
import "./index.css";
import { SplashProvider } from "@/lib/splash-provider";
import { clearCache } from "@/lib/queryClient";
import { APP_VERSION, VERSION_KEY } from "@shared/constants";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silent fail - SW registration is optional
    });
  });
}

function Root() {
  useEffect(() => {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== APP_VERSION) {
      clearCache();
      localStorage.setItem(VERSION_KEY, APP_VERSION);
    }
  }, []);

  return (
    <SplashProvider>
      <App />
    </SplashProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
