"use client";

import React from "react";

export interface NetraBrandLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  className?: string;
  glow?: boolean;
  withGridDots?: boolean;
}

/**
 * NetraBrandLogo — Official NETRA Truth Mark Kite / Diamond Emblem
 * Exact vector geometry matching the Architecture of Truth.
 */
export const NetraBrandLogo: React.FC<NetraBrandLogoProps> = ({ 
  size = 36, 
  color = "#ffffff",
  className = "",
  glow = true,
  withGridDots = true,
  style,
  ...props
}) => {
  return (
    <div 
      style={{ width: size, height: size }} 
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <svg 
        viewBox="0 0 400 400" 
        width="100%" 
        height="100%" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{
          display: "inline-block",
          verticalAlign: "middle",
          ...style,
        }}
        {...props}
      >
        <defs>
          {/* Center Radial Halo */}
          <radialGradient id="netraLogoCenterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="40%" stopColor={color} stopOpacity="0.12" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>

          {/* Specular Bloom */}
          {glow && (
            <filter id="netraLogoBloom" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          )}
        </defs>

        {/* Coordinate Dot Matrix Grid */}
        {withGridDots && (
          <g fill={color} opacity="0.18">
            <circle cx="35" cy="75" r="2.2" />
            <circle cx="100" cy="75" r="2.2" />
            <circle cx="165" cy="75" r="2.2" />
            <circle cx="235" cy="75" r="2.2" />
            <circle cx="300" cy="75" r="2.2" />
            <circle cx="365" cy="75" r="2.2" />

            <circle cx="35" cy="155" r="2.2" />
            <circle cx="100" cy="155" r="2.2" />
            <circle cx="300" cy="155" r="2.2" />
            <circle cx="365" cy="155" r="2.2" />

            <circle cx="35" cy="245" r="2.2" />
            <circle cx="100" cy="245" r="2.2" />
            <circle cx="300" cy="245" r="2.2" />
            <circle cx="365" cy="245" r="2.2" />

            <circle cx="35" cy="325" r="2.2" />
            <circle cx="100" cy="325" r="2.2" />
            <circle cx="165" cy="325" r="2.2" />
            <circle cx="235" cy="325" r="2.2" />
            <circle cx="300" cy="325" r="2.2" />
            <circle cx="365" cy="325" r="2.2" />
          </g>
        )}

        {/* Center Ambient Halo Glow */}
        <circle cx="200" cy="200" r="95" fill="url(#netraLogoCenterGlow)" />

        {/* Main Emblem Rig */}
        <g filter={glow ? "url(#netraLogoBloom)" : undefined}>
          {/* 1. Outer Bold Kite / Diamond Perimeter */}
          <polygon
            points="200,62 332,200 200,338 68,200"
            stroke={color}
            strokeWidth="5.5"
            strokeLinejoin="miter"
            strokeMiterlimit="10"
          />

          {/* 2. Inner Concentric Diamond */}
          <polygon
            points="200,126 256,200 200,274 144,200"
            stroke={color}
            strokeWidth="3.5"
            strokeLinejoin="miter"
            strokeMiterlimit="10"
          />

          {/* 3. Facet Connector Lines */}
          <g stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="miter">
            <line x1="200" y1="62" x2="144" y2="200" />
            <line x1="200" y1="62" x2="256" y2="200" />
            <line x1="200" y1="338" x2="144" y2="200" />
            <line x1="200" y1="338" x2="256" y2="200" />
            <line x1="68" y1="200" x2="200" y2="126" />
            <line x1="68" y1="200" x2="200" y2="274" />
            <line x1="332" y1="200" x2="200" y2="126" />
            <line x1="332" y1="200" x2="200" y2="274" />
          </g>

          {/* 4. Horizontal Telemetry Axis */}
          <line
            x1="68"
            y1="200"
            x2="332"
            y2="200"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* 5. Central Opaque Aperture Dot Core */}
          <circle cx="200" cy="200" r="22" fill={color} stroke={color} strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
};

export default NetraBrandLogo;
