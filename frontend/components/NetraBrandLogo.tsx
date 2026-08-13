"use client";

import React from "react";

interface NetraBrandLogoProps {
  size?: number;
  className?: string;
}

export const NetraBrandLogo: React.FC<NetraBrandLogoProps> = ({ 
  size = 38, 
  className = "" 
}) => {
  return (
    <div 
      style={{ width: size, height: size }} 
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <svg 
        viewBox="0 0 128 128" 
        width={size} 
        height={size} 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_10px_rgba(0,240,255,0.35)]"
      >
        <defs>
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#07152b" />
            <stop offset="50%" stopColor="#030914" />
            <stop offset="100%" stopColor="#02040a" />
          </linearGradient>

          <linearGradient id="logoCyberBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          <linearGradient id="logoIrisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="60%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
        </defs>

        {/* Outer Rounded Squircle */}
        <rect 
          x="6" 
          y="6" 
          width="116" 
          height="116" 
          rx="30" 
          fill="url(#logoBgGrad)" 
          stroke="url(#logoCyberBorder)" 
          strokeWidth="3.5" 
        />

        {/* Ambient Center Glow */}
        <circle cx="64" cy="64" r="26" fill="#00f0ff" fillOpacity="0.16" />

        {/* Crisp Bold Eye Contour */}
        <path 
          d="M 22 64 C 36 38, 92 38, 106 64 C 92 90, 36 90, 22 64 Z" 
          fill="#040e1c" 
          stroke="url(#logoCyberBorder)" 
          strokeWidth="5" 
          strokeLinejoin="round"
        />

        {/* Outer Iris Ring */}
        <circle cx="64" cy="64" r="18" fill="url(#logoIrisGrad)" />

        {/* Inner Pupil Cavity */}
        <circle cx="64" cy="64" r="10" fill="#02050e" />

        {/* Luminous Glowing Pupil Core */}
        <circle cx="64" cy="64" r="5" fill="#00f0ff" />
        <circle cx="68" cy="60" r="2.5" fill="#ffffff" />
      </svg>
    </div>
  );
};

export default NetraBrandLogo;
