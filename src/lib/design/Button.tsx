"use client";

import { forwardRef } from "react";
import { VARIANTS, BUTTON } from "./tokens";

type Variant = keyof typeof VARIANTS;
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, children, className = "", disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 ${BUTTON.font} ${BUTTON.radius} ${BUTTON.heights[size]} ${BUTTON.padding[size]} transition-all duration-200 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span className="w-4 h-4 shrink-0">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
    </button>
  )
);
Button.displayName = "Button";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = "ghost", size = "md", label, className = "", ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      className={`inline-flex items-center justify-center shrink-0 rounded-xl transition-all duration-200 ${VARIANTS[variant]} ${size === "sm" ? "w-8 h-8" : "w-10 h-10"} ${className}`}
      {...props}
    />
  )
);
IconButton.displayName = "IconButton";
