"use client";

import { CARD } from "./tokens";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  accent?: "none" | "red" | "amber" | "blue" | "purple" | "emerald";
  padding?: "sm" | "md" | "lg" | "none";
  onClick?: () => void;
  variant?: "default" | "inner" | "section" | "floating";
}

const ACCENT_BORDERS: Record<string, string> = {
  red: "border-red-200/70",
  amber: "border-amber-200/70",
  blue: "border-slate-200/70",
  purple: "border-purple-200/70",
  emerald: "border-emerald-200/70",
};

const PADDING: Record<string, string> = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
  none: "",
};

const VARIANT_CLASSES: Record<string, string> = {
  default: `${CARD.base} ${CARD.radius}`,
  inner: CARD.inner,
  section: CARD.section,
  floating: CARD.floating,
};

export function Card({ children, className = "", hover = false, accent = "none", padding = "md", onClick, variant = "default" }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`${VARIANT_CLASSES[variant]} ${PADDING[padding]} ${hover ? CARD.hover + " " + CARD.active : ""} ${accent !== "none" ? ACCENT_BORDERS[accent] : ""} ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex items-center justify-between gap-3 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`font-semibold text-base text-gray-900 ${className}`}>{children}</h3>;
}

export function CardSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`border-t border-gray-100 pt-5 mt-5 space-y-4 ${className}`}>{children}</div>;
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
    blue: "text-indigo-700",
    amber: "text-amber-600",
    red: "text-red-600",
    emerald: "text-emerald-600",
    purple: "text-purple-600",
  };
  return (
    <div className="card-inner p-3.5 text-center">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${colors[color] || colors.gray}`}>{value}</p>
    </div>
  );
}

export function InnerCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`${CARD.inner} ${className}`}>
      {children}
    </div>
  );
}

export function FloatingCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`${CARD.floating} ${className}`}>
      {children}
    </div>
  );
}
