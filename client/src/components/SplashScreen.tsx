import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import arrowIcon from "@assets/generated_images/white_upward_arrow_icon.png";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    console.log('[SplashScreen] Mounted, starting timers');
    const timer = setTimeout(() => {
      console.log('[SplashScreen] Primary timer fired (1s)');
      onCompleteRef.current();
    }, 1000);

    const fallbackTimer = setTimeout(() => {
      console.log('[SplashScreen] Fallback timer fired (2s)');
      onCompleteRef.current();
    }, 2000);

    return () => {
      console.log('[SplashScreen] Cleanup');
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center sidebar-gradient"
      data-testid="splash-screen"
    >
      <div className="flex flex-col items-center gap-8">
        <motion.div
          initial={{ scale: 0.3, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5, 
            delay: 0.1,
            type: "spring",
            stiffness: 200
          }}
          className="relative"
        >
          <img
            src={arrowIcon}
            alt="A.Z Finance Hub"
            className="h-32 w-32 md:h-48 md:w-48 drop-shadow-2xl"
            data-testid="img-splash-arrow"
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: [0, 1, 0.7, 1, 0.7, 1],
            y: 0,
          }}
          transition={{
            opacity: {
              duration: 0.6,
              times: [0, 0.2, 0.4, 0.6, 0.8, 1],
              delay: 0.4,
            },
            y: { duration: 0.3, delay: 0.4 },
          }}
          className="text-3xl md:text-4xl font-bold text-sidebar-primary-foreground tracking-tight text-center px-4"
          data-testid="text-splash-title"
        >
          A.Z Finance Hub
        </motion.h1>
      </div>
    </motion.div>
  );
}
