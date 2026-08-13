"use client";

import React, { useState, useEffect } from 'react';
import { NetraEyeScanner } from './NetraEyeScanner';

interface NetraSplashIntroProps {
  onComplete?: () => void;
  autoDismissMs?: number;
}

export const NetraSplashIntro: React.FC<NetraSplashIntroProps> = ({
  onComplete,
  autoDismissMs = 11200, // 11.2s exact master timeline duration
}) => {
  const [isRevealing, setIsRevealing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start silky-smooth progress fill
    const raf = setTimeout(() => {
      setProgress(100);
    }, 80);

    // ESC shortcut to skip if needed
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsRevealing(true);
        setTimeout(() => {
          setIsDone(true);
          if (onComplete) onComplete();
        }, 300);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Trigger reveal fade out when master cycle finishes
    const t1 = setTimeout(() => {
      setIsRevealing(true);
    }, autoDismissMs - 600);

    const t2 = setTimeout(() => {
      setIsDone(true);
      if (onComplete) onComplete();
    }, autoDismissMs);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [autoDismissMs, onComplete]);

  if (isDone) return null;

  const durationMs = autoDismissMs - 800; // ~10.4s smooth glide

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#000000] overflow-hidden select-none transition-all duration-700 ${
        isRevealing ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient Glow Behind Eye */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-r from-cyan-500/15 via-sky-500/5 to-transparent blur-3xl"></div>
      </div>

      {/* Center Container: Master Eye Scanner + Smooth Loading Bar */}
      <div className="flex flex-col items-center justify-center relative z-20">
        
        {/* Eye Vector */}
        <div className="w-[min(80vw,80vh)] h-[min(80vw,80vh)] max-w-[560px] max-h-[560px] flex items-center justify-center">
          <NetraEyeScanner size="100%" />
        </div>

        {/* Silky Smooth Horizontal Cyber Loading Bar (No Text) */}
        <div className="-mt-6 sm:-mt-10 w-44 sm:w-60 h-[2.5px] bg-neutral-950 rounded-full overflow-hidden border border-cyan-500/20 shadow-[0_0_15px_rgba(0,240,255,0.15)] relative">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-sky-300 shadow-[0_0_10px_#00f0ff] rounded-full"
            style={{
              width: `${progress}%`,
              transition: `width ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`,
            }}
          />
        </div>

      </div>
    </div>
  );
};

export default NetraSplashIntro;
