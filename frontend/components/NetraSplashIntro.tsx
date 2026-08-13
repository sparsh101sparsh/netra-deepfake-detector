"use client";

import React from "react";
import { SplashIntro, SplashIntroProps } from "./layout/SplashIntro";

export interface NetraSplashIntroProps extends SplashIntroProps {}

/**
 * NetraSplashIntro — Re-exports optimized ~2.5s SplashIntro with ESC/click skip.
 */
export const NetraSplashIntro: React.FC<NetraSplashIntroProps> = (props) => {
  return <SplashIntro {...props} />;
};

export default NetraSplashIntro;
