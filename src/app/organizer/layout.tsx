"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Bell, User } from "lucide-react";

const NAV = [
  { href: "/organizer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organizer/database", label: "Database", icon: Users },
  { href: "/organizer/notifications", label: "Alerts", icon: Bell },
  { href: "/organizer/profile", label: "Profile", icon: User },
];

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  const hideNav = pathname.startsWith("/organizer/events/");

  return (
    <>
      {children}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-gray-200/80 shadow-[0_-2px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom,0px)]">
          <div className="h-0.5 bg-gradient-to-r from-transparent via-indigo-200/50 to-transparent absolute top-0 left-0 right-0" />
          <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                    className={`flex flex-col items-center justify-center gap-0.5 min-w-0 px-2 py-1 rounded-[18px] transition-all duration-200 ${
                      active
                        ? "text-indigo-700"
                        : "text-gray-400 hover:text-gray-600 active:scale-95"
                    }`}
                >
                   <div className={`relative flex items-center justify-center w-8 h-8 rounded-[18px] transition-all duration-200 ${
                      active ? "bg-indigo-50 scale-110" : ""
                    }`}>
                    <Icon className={`w-5 h-5 transition-all duration-200 ${active ? "scale-100" : ""}`} />
                  </div>
                  <span className={`text-[10px] font-medium leading-tight transition-all duration-200 ${
                    active ? "font-semibold" : ""
                  }`}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
