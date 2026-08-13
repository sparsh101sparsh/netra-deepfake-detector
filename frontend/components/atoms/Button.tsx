"use client";

import React, { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const filledShadow = "shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "accent"
  | "danger"
  | "outline"
  | "subtle"
  | "quiet"
  | "success";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary: `bg-ink text-surface hover:opacity-95 dark:bg-ink dark:text-canvas ${filledShadow}`,
  secondary: "bg-surface text-ink shadow-btn hover:bg-inset active:bg-hover border-[1.5px] border-line",
  ghost: "bg-hover text-ink hover:bg-hover-2 border border-transparent",
  accent: `bg-accent text-white hover:brightness-105 active:brightness-95 ${filledShadow}`,
  danger: `bg-red text-white hover:brightness-105 active:brightness-95 ${filledShadow}`,
  outline: "bg-transparent text-ink border-[1.5px] border-line hover:bg-hover hover:border-line-strong",
  subtle: "text-ink-2 hover:text-ink hover:bg-hover",
  quiet: "text-ink hover:bg-hover",
  success: `bg-green text-white hover:brightness-105 active:brightness-95 ${filledShadow}`,
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: "h-7 rounded-full px-2.5 text-[12px] font-normal leading-none gap-1",
  sm: "h-8 px-3 text-[13px] leading-none rounded-full gap-1.5",
  md: "h-9 px-4 text-sm leading-none rounded-full gap-2",
  lg: "h-11 px-5 text-sm font-semibold rounded-xl gap-2.5",
};

export function buttonVariants({
  variant = "secondary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center font-medium select-none transition-[transform,background-color,opacity,border-color,box-shadow] duration-150 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
    variantStyles[variant],
    sizeStyles[size],
    className
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonVariants({ variant, size, className })}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className="size-3.5 shrink-0 rounded-full border-[1.5px] border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      ) : (
        leftIcon && <span className="shrink-0 inline-flex items-center justify-center">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && (
        <span className="shrink-0 inline-flex items-center justify-center">{rightIcon}</span>
      )}
    </button>
  );
}

export default Button;
