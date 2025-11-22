import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";

interface SplashContextType {
  showSplash: boolean;
  hideSplash: () => void;
  resetSplash: () => void;
}

const SplashContext = createContext<SplashContextType | undefined>(undefined);

const SPLASH_SHOWN_KEY = "azfinance-splash-shown";

export function SplashProvider({ children }: { children: ReactNode }) {
  const [showSplash, setShowSplash] = useState(() => {
    const shown = sessionStorage.getItem(SPLASH_SHOWN_KEY);
    return !shown;
  });
  
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const hideSplash = () => {
    sessionStorage.setItem(SPLASH_SHOWN_KEY, "true");
    setShowSplash(false);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const resetSplash = () => {
    sessionStorage.removeItem(SPLASH_SHOWN_KEY);
    setShowSplash(true);
  };

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  return (
    <SplashContext.Provider value={{ showSplash, hideSplash, resetSplash }}>
      {children}
    </SplashContext.Provider>
  );
}

export function useSplash() {
  const context = useContext(SplashContext);
  if (!context) {
    throw new Error("useSplash must be used within SplashProvider");
  }
  return context;
}
