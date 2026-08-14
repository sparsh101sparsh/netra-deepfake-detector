"use client";

import React from "react";
import { NetraTruthMarkIcon } from "@/components/icons/NetraTruthMarkIcon";

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
    <NetraTruthMarkIcon
      size={size}
      color={color}
      glow={glow}
      withGridDots={withGridDots}
      className={className}
      style={style}
      {...props}
    />
  );
};

export default NetraBrandLogo;
