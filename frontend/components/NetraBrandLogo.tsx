"use client";

import React from "react";

interface NetraBrandLogoProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export const NetraBrandLogo: React.FC<NetraBrandLogoProps> = ({ 
  size = 38, 
  className = "",
  glow = false
}) => {
  return (
    <div 
      style={{ width: size, height: size }} 
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <svg 
        viewBox="0 0 600 600" 
        width={size} 
        height={size} 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full ${glow ? "drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]" : ""}`}
      >
        <defs>
          {/* Glowing Vector Outline Gradient */}
          <linearGradient id="netraLogoEyelidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#00f0ff" />
          </linearGradient>

          {/* Iris Donut Gradient */}
          <linearGradient id="netraLogoDonutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#00f0ff" />
          </linearGradient>

          {/* Sclera Clip Path */}
          <clipPath id="netraLogoEyeClip">
            <path d="M 120 300 C 180 170, 420 170, 480 300 C 420 430, 180 430, 120 300 Z" />
          </clipPath>
        </defs>

        {/* Ambient Outer Glow */}
        <circle cx="300" cy="300" r="196" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeOpacity="0.25" />

        {/* Outer HUD Tick Ring (24 Radar Segments) */}
        <g id="outer-tick-ring" stroke="#00f0ff" strokeWidth="6" strokeLinecap="round">
          <line x1="490.0" y1="300.0" x2="502.0" y2="300.0" transform="rotate(90.0, 496.0, 300.0)" />
          <line x1="483.3" y1="350.7" x2="495.3" y2="350.7" transform="rotate(105.0, 489.3, 350.7)" />
          <line x1="463.7" y1="398.0" x2="475.7" y2="398.0" transform="rotate(120.0, 469.7, 398.0)" />
          <line x1="432.6" y1="438.6" x2="444.6" y2="438.6" transform="rotate(135.0, 438.6, 438.6)" />
          <line x1="392.0" y1="469.7" x2="404.0" y2="469.7" transform="rotate(150.0, 398.0, 469.7)" />
          <line x1="344.7" y1="489.3" x2="356.7" y2="489.3" transform="rotate(165.0, 350.7, 489.3)" />
          <line x1="294.0" y1="496.0" x2="306.0" y2="496.0" transform="rotate(180.0, 300.0, 496.0)" />
          <line x1="243.3" y1="489.3" x2="255.3" y2="489.3" transform="rotate(195.0, 249.3, 489.3)" />
          <line x1="196.0" y1="469.7" x2="208.0" y2="469.7" transform="rotate(210.0, 202.0, 469.7)" />
          <line x1="155.4" y1="438.6" x2="167.4" y2="438.6" transform="rotate(225.0, 161.4, 438.6)" />
          <line x1="124.3" y1="398.0" x2="136.3" y2="398.0" transform="rotate(240.0, 130.3, 398.0)" />
          <line x1="104.7" y1="350.7" x2="116.7" y2="350.7" transform="rotate(255.0, 110.7, 350.7)" />
          <line x1="98.0" y1="300.0" x2="110.0" y2="300.0" transform="rotate(270.0, 104.0, 300.0)" />
          <line x1="104.7" y1="249.3" x2="116.7" y2="249.3" transform="rotate(285.0, 110.7, 249.3)" />
          <line x1="124.3" y1="202.0" x2="136.3" y2="202.0" transform="rotate(300.0, 130.3, 202.0)" />
          <line x1="155.4" y1="161.4" x2="167.4" y2="161.4" transform="rotate(315.0, 161.4, 161.4)" />
          <line x1="196.0" y1="130.3" x2="208.0" y2="130.3" transform="rotate(330.0, 202.0, 130.3)" />
          <line x1="243.3" y1="110.7" x2="255.3" y2="110.7" transform="rotate(345.0, 249.3, 110.7)" />
          <line x1="294.0" y1="104.0" x2="306.0" y2="104.0" transform="rotate(360.0, 300.0, 104.0)" />
          <line x1="344.7" y1="110.7" x2="356.7" y2="110.7" transform="rotate(375.0, 350.7, 110.7)" />
          <line x1="392.0" y1="130.3" x2="404.0" y2="130.3" transform="rotate(390.0, 398.0, 130.3)" />
          <line x1="432.6" y1="161.4" x2="444.6" y2="161.4" transform="rotate(405.0, 438.6, 161.4)" />
          <line x1="463.7" y1="202.0" x2="475.7" y2="202.0" transform="rotate(420.0, 469.7, 202.0)" />
          <line x1="483.3" y1="249.3" x2="495.3" y2="249.3" transform="rotate(435.0, 489.3, 249.3)" />
        </g>

        {/* Sclera Body (Eye Cavity) */}
        <g id="eye-body">
          <path d="M 120 300 C 180 170, 420 170, 480 300 C 420 430, 180 430, 120 300 Z" fill="#050c18" />

          {/* Clipped Centered Iris & Pupil */}
          <g clipPath="url(#netraLogoEyeClip)">
            <g id="centered-iris-pupil">
              {/* Cyan Outer Iris Donut Ring (r=56) */}
              <circle cx="300" cy="300" r="56" fill="url(#netraLogoDonutGrad)" />
              
              {/* Dark Inner Cavity (r=32) */}
              <circle cx="300" cy="300" r="32" fill="#02050c" />

              {/* Cyan Accent Halo (r=16) */}
              <circle cx="300" cy="300" r="16" fill="#00f0ff" />

              {/* Pure White Core Pupil (r=12) */}
              <circle cx="300" cy="300" r="12" fill="#ffffff" />
            </g>
          </g>

          {/* Top Eyelid Outline (7.0px Constant Thickness) */}
          <path d="M 120 300 C 180 170, 420 170, 480 300" fill="none" stroke="url(#netraLogoEyelidGrad)" strokeWidth="7.0" strokeLinecap="round" strokeLinejoin="round" />

          {/* Bottom Eyelid Outline (7.0px Constant Thickness) */}
          <path d="M 120 300 C 180 430, 420 430, 480 300" fill="none" stroke="url(#netraLogoEyelidGrad)" strokeWidth="7.0" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
};

export default NetraBrandLogo;
