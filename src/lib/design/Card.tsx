"use client";

import { CARD } from "./tokens";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  accent?: "none" | "red" | "amber" | "blue" | "purple" | "emerald";
  padding?: "sm" | "md" | "lg" | "none";
  onClick?: () => void;
}

const ACCENT_BORDERS: Record<string, string> = {
  red: "border-red-200/80",
  amber: "border-amber-200/80",
  blue: "border-blue-200/80",
  purple: "border-purple-200/80",
  emerald: "border-emerald-200/80",
};

const PADDING: Record<string, string> = {
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
  none: "",
};

export function Card({ children, className = "", hover = false, accent = "none", padding = "md", onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`${CARD.radius} ${CARD.base} ${PADDING[padding]} ${hover ? CARD.hover + " " + CARD.active : ""} ${accent !== "none" ? ACCENT_BORDERS[accent] : ""} ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex items-center justify-between gap-3 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`font-semibold text-sm text-gray-900 ${className}`}>{children}</h3>;
}

export function CardSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`border-t border-gray-100 pt-4 mt-4 space-y-3 ${className}`}>{children}</div>;
}

const GRID_COLS: Record<number, string> = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

export function CardStats({ children, columns = 3 }: { children: React.ReactNode; columns?: number }) {
  return (
    <div className={`grid ${GRID_COLS[columns] || "grid-cols-3"} gap-3`}>
      {children}
    </div>
  );
}

export function CardStat({ label, value, color = "gray" }: { label: string; value: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray: "text-gray-900",
    blue: "text-blue-600",
    amber: "text-amber-600",
    red: "text-red-600",
    emerald: "text-emerald-600",
    purple: "text-purple-600",
  };
  return (
    <div className="bg-gray-50 rounded-xl p-2.5 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${colors[color] || colors.gray}`}>{value}</p>
    </div>
  );
}
