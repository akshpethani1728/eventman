"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Bell, User, Send, CreditCard } from "lucide-react";

const NAV = [
  { href: "/worker/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/worker/dashboard?tab=applied", label: "Applied", icon: Send },
  { href: "/worker/notifications", label: "Alerts", icon: Bell },
  { href: "/worker/plans", label: "Plans", icon: CreditCard },
  { href: "/worker/profile", label: "Profile", icon: User },
];

function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = (href: string) => {
    if (href.includes("?tab=applied")) {
      return pathname === "/worker/dashboard" && searchParams.get("tab") === "applied";
    }
    return pathname === href;
  };

  const hideNav = pathname.startsWith("/worker/events/");
  if (hideNav) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
      <div className="max-w-lg mx-auto flex items-center justify-around h-[68px] px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-1 min-w-0 px-3 py-1 rounded-[12px] transition-all duration-200 ${
                active
                  ? "text-[#0D9488]"
                  : "text-gray-400 hover:text-gray-600"
              }`}>
              <div className={`relative transition-all duration-200 ${
                active ? "-translate-y-0.5" : ""
              }`}>
                <Icon className={`w-[22px] h-[22px] transition-all duration-200 ${
                  active ? "drop-shadow-[0_2px_4px_rgba(13,148,136,0.3)]" : ""
                }`} />
                {active && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#0D9488]" />
                )}
              </div>
              <span className={`text-[9px] leading-tight transition-all duration-200 ${
                active ? "font-bold tracking-wide" : "font-medium"
              }`}>
                {label}
              </span>
              {active && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#0D9488]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </>
  );
}
