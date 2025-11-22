import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onCompleteRef.current();
    }, 1000);

    const fallbackTimer = setTimeout(() => {
      onCompleteRef.current();
    }, 2000);

    return () => {
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
      <div className="flex flex-col items-center gap-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="relative"
        >
          <img
            src="/icon-192.png"
            alt="A.Z Finance Hub"
            className="h-24 w-24 md:h-32 md:w-32 rounded-2xl shadow-2xl"
            data-testid="img-splash-logo"
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
              delay: 0.3,
            },
            y: { duration: 0.3, delay: 0.3 },
          }}
          className="text-2xl md:text-3xl font-bold text-white tracking-tight text-center px-4"
          data-testid="text-splash-title"
        >
          A.Z Finance Hub
        </motion.h1>
      </div>
    </motion.div>
  );
}
