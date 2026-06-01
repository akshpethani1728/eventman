"use client";

import { BADGE } from "./tokens";

type BadgeVariant = keyof typeof BADGE;

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

export function Badge({ children, variant = "pending", icon, pulse = false, className = "" }: BadgeProps) {
  return (
    <span className={`badge-base ${BADGE[variant]} ${pulse ? "animate-pulse" : ""} ${className}`}>
      {icon && <span className="w-3 h-3">{icon}</span>}
      {children}
    </span>
  );
}

interface StatusDotProps {
  variant?: "green" | "amber" | "red" | "blue" | "purple" | "gray";
  pulse?: boolean;
  className?: string;
}

const DOT_COLORS: Record<string, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-indigo-600",
  purple: "bg-purple-500",
  gray: "bg-gray-400",
};

export function StatusDot({ variant = "gray", pulse = false, className = "" }: StatusDotProps) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${DOT_COLORS[variant]} ${pulse ? "animate-pulse" : ""} ${className}`} />
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <div className={`h-px bg-gray-100/80 ${className}`} />;
}
