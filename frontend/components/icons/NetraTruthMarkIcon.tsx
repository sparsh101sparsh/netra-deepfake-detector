import React from "react";

export interface NetraTruthMarkIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  withGridDots?: boolean;
  withBackground?: boolean;
  glow?: boolean;
}

export const NetraTruthMarkIcon: React.FC<NetraTruthMarkIconProps> = ({
  size = 48,
  color = "#ffffff",
  withGridDots = true,
  withBackground = false,
  glow = true,
  className = "",
  style,
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      width={size}
      height={size}
      fill="none"
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        ...style,
      }}
      {...props}
    >
      <defs>
        {/* Center Radial Halo */}
        <radialGradient id="netraIconCenterGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="40%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>

        {/* Specular Bloom */}
        {glow && (
          <filter id="netraIconBloom" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
      </defs>

      {/* Optional Dark Background */}
      {withBackground && <rect width="400" height="400" fill="#060608" rx="24" />}

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
      <circle cx="200" cy="200" r="95" fill="url(#netraIconCenterGlow)" />

      {/* Main Emblem Rig */}
      <g filter={glow ? "url(#netraIconBloom)" : undefined}>
        {/* Outer Bold Kite Perimeter */}
        <polygon
          points="200,62 332,200 200,338 68,200"
          stroke={color}
          strokeWidth="5.5"
          strokeLinejoin="miter"
          strokeMiterlimit="10"
        />

        {/* Inner Concentric Diamond */}
        <polygon
          points="200,126 256,200 200,274 144,200"
          stroke={color}
          strokeWidth="3.5"
          strokeLinejoin="miter"
          strokeMiterlimit="10"
        />

        {/* Facet Connector Lines */}
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

        {/* Horizontal Telemetry Axis */}
        <line
          x1="68"
          y1="200"
          x2="332"
          y2="200"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Central Opaque Aperture Dot Core */}
        <circle cx="200" cy="200" r="22" fill={color} stroke={color} strokeWidth="1" />
      </g>
    </svg>
  );
};

export default NetraTruthMarkIcon;
