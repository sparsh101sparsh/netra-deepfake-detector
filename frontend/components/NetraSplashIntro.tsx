"use client";

import React, { useState, useEffect } from 'react';
import { NetraEyeScanner } from './NetraEyeScanner';

interface NetraSplashIntroProps {
  onComplete?: () => void;
  autoDismissMs?: number;
}

export const NetraSplashIntro: React.FC<NetraSplashIntroProps> = ({
  onComplete,
  autoDismissMs = 8500,
}) => {
  const [isRevealing, setIsRevealing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setIsRevealing(true);
    }, autoDismissMs - 700);

    const t2 = setTimeout(() => {
      setIsDone(true);
      if (onComplete) onComplete();
    }, autoDismissMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [autoDismissMs, onComplete]);

  if (isDone) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#000000] overflow-hidden select-none transition-all duration-700 ${
        isRevealing ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <div className="w-[min(88vw,88vh)] h-[min(88vw,88vh)] max-w-[840px] max-h-[840px] flex items-center justify-center relative z-20">
        <NetraEyeScanner size="100%" />
      </div>

      <button
        onClick={() => {
          setIsRevealing(true);
          setTimeout(() => {
            setIsDone(true);
            if (onComplete) onComplete();
          }, 300);
        }}
        className="fixed bottom-6 right-6 z-50 text-xs font-mono font-bold text-neutral-400 hover:text-sky-300 uppercase tracking-widest px-4 py-2 rounded-xl border border-neutral-800 bg-black/90 backdrop-blur-xl shadow-2xl transition-all"
      >
        Skip [ESC] &rarr;
      </button>
    </div>
  );
};

export default NetraSplashIntro;
