"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Mail, User, Lock, Eye, EyeOff, ArrowRight, ArrowDown,
  Briefcase, HardHat, Search, Calendar, Users,
  Bell, Shield, Zap, CheckCircle,
  Sparkles, MapPin, UserCheck,
  ChevronRight, TrendingUp, Building2, LayoutDashboard,
  RefreshCw, KeyRound,
} from "lucide-react";
import { Logo } from "@/components/Logo";

const supabase = createClient();

// â”€â”€â”€ TILT HOOK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useTilt(ref: React.RefObject<HTMLDivElement | null>) {
  const style = useRef({ rotateX: 0, rotateY: 0, glowX: 50, glowY: 50, isHovered: false });
  const [render, setRender] = useState(style.current);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    if (isTouch) return;

    let rafId: number | null = null;
    const move = (e: MouseEvent) => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        style.current = {
          rotateX: (y - 0.5) * -8,
          rotateY: (x - 0.5) * 8,
          glowX: x * 100,
          glowY: y * 100,
          isHovered: true,
        };
        setRender({ ...style.current });
      });
    };

    const leave = () => {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      style.current = { rotateX: 0, rotateY: 0, glowX: 50, glowY: 50, isHovered: false };
      setRender({ ...style.current });
    };

    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, [ref]);

  return render;
}

// â”€â”€â”€ TILT CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { rotateX, rotateY, glowX, glowY, isHovered } = useTilt(ref);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-[22px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] shadow-black/[0.03] transition-shadow duration-300 ${isHovered ? "shadow-[0_4px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)]" : ""} ${className}`}
      style={{
        transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${isHovered ? 1.02 : 1})`,
        transition: "transform 0.15s ease-out, box-shadow 0.3s ease",
        willChange: "transform",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-150"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(13,148,136,0.15), transparent 60%)`,
        }}
      />
      {children}
    </div>
  );
}

// â”€â”€â”€ COUNTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const duration = 1500;
          const step = Math.ceil(end / 60);
          let current = 0;
          const interval = setInterval(() => {
            current += step;
            if (current >= end) { current = end; clearInterval(interval); }
            setVal(current);
          }, duration / 60);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);

  return <span ref={ref}>{val}{suffix}</span>;
}

// â”€â”€â”€ SECTION FADE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FadeSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-out will-change-[opacity,transform] ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"} ${className}`}
    >
      {children}
    </div>
  );
}

// â”€â”€â”€ PREVIEW CARDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const previewCards = [
  {
    id: "feed",
    label: "Worker Feed",
    icon: Search,
    color: "from-teal-500 to-teal-600",
    content: (
      <div className="space-y-2.5 p-4">
        <div className="flex items-center gap-2 rounded-[18px] bg-gray-100 px-3 py-2 text-xs text-gray-400">
          <Search className="h-3.5 w-3.5" />
          Search events near you...
        </div>
        {[
          { title: "Wedding Photography", date: "May 30", pay: "â‚¹1,500 - 2,500", status: "filling" },
          { title: "Corporate Gala", date: "Jun 2", pay: "â‚¹2,000 - 3,500", status: "new" },
          { title: "Concert Setup", date: "Jun 5", pay: "â‚¹1,800 - 2,800", status: "filling" },
        ].map((ev, i) => (
          <div key={i} className="rounded-[18px] border border-gray-100 bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-900">{ev.title}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                  <Calendar className="h-3 w-3" />
                  {ev.date}
                  <MapPin className="ml-1 h-3 w-3" />
                  Ahmedabad
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                ev.status === "new" ? "bg-green-100 text-green-700" : "bg-teal-50 text-teal-700"
              }`}>{ev.status === "new" ? "NEW" : "Filling"}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-700">{ev.pay}</span>
              <button className="rounded-[18px] bg-teal-700 px-3 py-1 text-[9px] font-medium text-white">Apply</button>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "dashboard",
    label: "Organizer Dashboard",
    icon: LayoutDashboard,
    color: "from-teal-500 to-teal-600",
    content: (
      <div className="space-y-2.5 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-900">Your Events (4)</p>
          <span className="text-[9px] text-teal-600">View All</span>
        </div>
        {[
          { title: "Wedding", filled: 12, total: 20, color: "bg-emerald-500" },
          { title: "Conference", filled: 5, total: 15, color: "bg-amber-500" },
          { title: "Concert", filled: 24, total: 30, color: "bg-teal-500" },
        ].map((ev, i) => (
          <div key={i} className="rounded-[18px] border border-gray-100 bg-white p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium text-gray-700">{ev.title}</p>
              <span className="text-[9px] text-gray-400">{ev.filled}/{ev.total} filled</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full ${ev.color} transition-all`} style={{ width: `${(ev.filled / ev.total) * 100}%` }} />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-[18px] bg-teal-50 p-2">
          <span className="text-[9px] font-medium text-teal-700">12 pending approvals</span>
          <ChevronRight className="h-3 w-3 text-slate-500" />
        </div>
      </div>
    ),
  },
  {
    id: "profile",
    label: "Worker Profile",
    icon: UserCheck,
    color: "from-emerald-500 to-emerald-600",
    content: (
      <div className="space-y-2.5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">RS</div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Rahul Sharma</p>
              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                <CheckCircle className="h-3 w-3 text-emerald-500" /> 12 Events
              </div>
            </div>
          </div>
        <div className="flex flex-wrap gap-1.5">
          {["Photography", "Videography", "Editing"].map((s, i) => (
            <span key={i} className="rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-medium text-teal-700">{s}</span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Ahmedabad</div>
          <div className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" /> 12 Events</div>
        </div>
      </div>
    ),
  },
  {
    id: "notifications",
    label: "Live Updates",
    icon: Bell,
    color: "from-amber-500 to-orange-500",
    content: (
      <div className="space-y-2.5 p-4">
        {[
          { text: "You're approved for Wedding Photography", time: "2 min ago", color: "text-emerald-600", icon: CheckCircle },
          { text: "New: Corporate Gala accepting applications", time: "15 min ago", color: "text-teal-700", icon: Sparkles },
          { text: "Concert Setup needs more workers", time: "1 hour ago", color: "text-amber-600", icon: Users },
        ].map((n, i) => {
          const Icon = n.icon;
          return (
            <div key={i} className="flex items-start gap-2.5 rounded-[18px] border border-gray-100 bg-white p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
              <div className={`mt-0.5 ${n.color}`}><Icon className="h-3.5 w-3.5" /></div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-700">{n.text}</p>
                <p className="mt-0.5 text-[9px] text-gray-400">{n.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    ),
  },
];

// â”€â”€â”€ FEATURES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const features = [
  { icon: Shield, title: "Verified Organizers", desc: "Every event creator is verified for trust and reliability" },
  { icon: Lock, title: "Contact Privacy", desc: "Your contact stays private until you're approved for an event" },
  { icon: Bell, title: "Real-time Updates", desc: "Instant notifications for approvals, events, and changes" },
  { icon: Zap, title: "Smart Matching", desc: "Find events matching your skills and location" },
  { icon: Users, title: "Professional Network", desc: "Join Ahmedabad's growing event workforce ecosystem" },
  { icon: TrendingUp, title: "Grow Faster", desc: "Build your profile, get rated, and earn more" },
];

// â”€â”€â”€ DASHBOARD MOCKUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EcosystemPreview() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="relative overflow-hidden bg-[#F8F8F6] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeSection>
          <div className="text-center">
            <span className="inline-block rounded-full bg-teal-700 px-4 py-1 text-[11px] font-semibold tracking-wide text-white uppercase">Ecosystem Preview</span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 md:text-4xl">See the Platform in Action</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-500 md:text-base">
              Real interfaces you will use every day â€” worker feed, organizer dashboard, profile, and live notifications
            </p>
          </div>
        </FadeSection>

        <FadeSection className="mt-12">
          <div
            ref={scrollRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 md:overflow-visible md:pb-0"
          >
            {previewCards.map((card) => {
              const Icon = card.icon;
              return (
                <TiltCard key={card.id} className="w-[85vw] shrink-0 snap-center md:w-auto">
                  <div className={`bg-gradient-to-r ${card.color} px-4 py-3`}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-white" />
                      <span className="text-xs font-semibold text-white">{card.label}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50/50 pb-1">{card.content}</div>
                </TiltCard>
              );
            })}
          </div>
        </FadeSection>

        {/* Mobile hint */}
        <p className="mt-6 text-center text-[10px] text-gray-400 md:hidden">Swipe to explore all cards</p>
      </div>
    </section>
  );
}

// â”€â”€â”€ ROLE SELECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const roleCards = [
  {
    type: "worker" as const,
    icon: HardHat,
    title: "I'm a Worker",
    subtitle: "Find event work & earn",
    features: ["Browse event opportunities", "Apply in one tap", "Build a trusted profile", "Get approved faster"],
    gradient: "from-teal-600 to-teal-700",
    shadow: "shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]",
  },
  {
    type: "organizer" as const,
    icon: Briefcase,
    title: "I'm an Organizer",
    subtitle: "Hire & manage staff",
    features: ["Create & manage events", "Find workers instantly", "Track manpower live", "Approve with one click"],
    gradient: "from-teal-500 to-teal-600",
    shadow: "shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]",
  },
];

function RoleSelection({ selected, onSelect }: { selected: string; onSelect: (r: "worker" | "organizer") => void }) {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <FadeSection>
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-4xl">Choose Your Path</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500">
              Whether you are looking for event work or need to hire staff, EventMan is built for you
            </p>
          </div>
        </FadeSection>

        <FadeSection className="mt-10 grid gap-5 md:grid-cols-2 md:gap-8">
          {roleCards.map((role) => {
            const Icon = role.icon;
            const active = selected === role.type;
            return (
              <button
                key={role.type}
                type="button"
                onClick={() => onSelect(role.type)}
                className={`group relative overflow-hidden rounded-[22px] border-2 p-6 text-left transition-all duration-300 ${
                  active
                    ? "border-teal-700 bg-teal-50 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] scale-[1.02]"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] hover:scale-[1.01]"
                }`}
              >
                {active && (
                  <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 animate-scale-in">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br ${role.gradient} text-white shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] shadow-black/[0.03] transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${active ? "scale-110 rotate-3" : ""}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{role.title}</h3>
                <p className="mt-0.5 text-sm text-gray-500">{role.subtitle}</p>
                <ul className="mt-4 space-y-2">
                  {role.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className={`h-4 w-4 ${active ? "text-teal-700" : "text-gray-300"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </FadeSection>
      </div>
    </section>
  );
}

// â”€â”€â”€ TRUST & FEATURES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TrustSection() {
  const stats = [
    { icon: Calendar, value: 28, label: "Active Events", suffix: "" },
    { icon: Users, value: 380, label: "Workers Available", suffix: "+" },
    { icon: Building2, value: 52, label: "Verified Organizers", suffix: "" },
    { icon: TrendingUp, value: 1250, label: "Successful Placements", suffix: "+" },
  ];

  return (
    <section className="bg-gradient-to-b from-white to-gray-50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeSection>
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-4xl">Trusted by Ahmedabad&apos;s Event Ecosystem</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-500">
              Growing community of workers and organizers using EventMan to coordinate manpower
            </p>
          </div>
        </FadeSection>

        {/* Live counters */}
        <FadeSection className="mt-12">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="group relative rounded-[22px] bg-white p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] ring-1 ring-gray-100 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)]">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-teal-50 to-teal-50">
                    <Icon className="h-6 w-6 text-teal-700" />
                  </div>
                  <p className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
                    <AnimatedCounter end={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{s.label}</p>
                  <div className="absolute inset-x-0 bottom-0 mx-auto h-0.5 w-12 rounded-full bg-slate-200 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              );
            })}
          </div>
        </FadeSection>

        {/* Feature cards */}
        <FadeSection className="mt-16">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="rounded-[18px] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] ring-1 ring-gray-100 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)]">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[18px] bg-teal-50">
                    <Icon className="h-5 w-5 text-teal-700" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{f.title}</h3>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </FadeSection>
      </div>
    </section>
  );
}

// â”€â”€â”€ OTP INPUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OtpInput({ value, onChange, onComplete }: {
  value: string[];
  onChange: (v: string[]) => void;
  onComplete: (code: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const valRef = useRef(value);
  valRef.current = value;

  const handleChange = (i: number, ch: string) => {
    const digit = ch.replace(/\D/g, "").slice(-1);
    if (!digit && !ch) return;
    const next = [...valRef.current];
    next[i] = digit;
    valRef.current = next;
    onChange(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
    if (digit && i === 5) onComplete(next.join(""));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !valRef.current[i] && i > 0) {
      const next = [...valRef.current];
      next[i - 1] = "";
      valRef.current = next;
      onChange(next);
      refs.current[i - 1]?.focus();
    }
    if (e.key === "Enter" && valRef.current.join("").length === 6) {
      onComplete(valRef.current.join(""));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!paste) return;
    e.preventDefault();
    const next = [...valRef.current];
    for (let i = 0; i < paste.length; i++) next[i] = paste[i];
    valRef.current = next;
    onChange(next);
    const focusIdx = Math.min(paste.length, 5);
    refs.current[focusIdx]?.focus();
    if (paste.length === 6) onComplete(next.join(""));
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {value.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className={`h-12 w-[38px] sm:w-12 rounded-[18px] border-2 text-center text-lg font-bold tracking-wider outline-none transition-all sm:h-14 sm:text-xl ${
            d ? "border-teal-700 bg-teal-50 text-teal-700" : "border-gray-200 bg-gray-50 text-gray-900"
          } focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20`}
        />
      ))}
    </div>
  );
}

function AuthForm({ step, onStepChange }: { step: "auth" | "otp" | "profile"; onStepChange: (s: "auth" | "otp" | "profile") => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"worker" | "organizer">("worker");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const signedInRef = useRef(false);
  const otpFlowRef = useRef(false);
  const pendingPasswordRef = useRef("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session && !signedInRef.current) {
        signedInRef.current = true;
        // OTP verification flow handles password + redirect itself
        if (otpFlowRef.current) return;
        const { data: profile } = await supabase
          .from("profiles").select("role").eq("user_id", session.user.id).maybeSingle();
        if (profile) {
          router.push(profile.role === "admin" ? "/admin" : `/${profile.role}/dashboard`);
        } else {
          onStepChange("profile");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [router, onStepChange]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  useEffect(() => { if (step === "auth") inputRef.current?.focus(); }, [step]);

  const handleSignIn = async () => {
    setError("");
    const trimmed = email.trim();
    if (!trimmed) { setError("Please enter your email"); return; }
    if (!password) { setError("Please enter your password"); return; }
    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    setLoading(false);
    if (signInError) {
      if (signInError.message.includes("Invalid login")) {
        setError("Wrong email or password. Try again, or use Create Account.");
      } else if (signInError.message.includes("fetch") || signInError.message === "NetworkError") {
        setError("Network error. Check your connection and try again.");
      } else {
        setError(signInError.message);
      }
      return;
    }
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("user_id", data.user?.id).maybeSingle();
    if (profile) {
      router.push(profile.role === "admin" ? "/admin" : `/${profile.role}/dashboard`);
    } else {
      onStepChange("profile");
    }
  };

  const handleCreateAccount = async () => {
    setError("");
    const trimmed = email.trim();
    if (!trimmed) { setError("Please enter your email"); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    pendingPasswordRef.current = password;
    setLoading(true);
    // signInWithOtp creates user if not exists + sends OTP in one call
    const { error: otpError } = await supabase.auth.signInWithOtp({ email: trimmed });
    setLoading(false);
    if (otpError) {
      if (otpError.message.includes("already")) {
        setError("An account with this email already exists. Please sign in.");
      } else {
        setError(otpError.message);
      }
      return;
    }
    setResendTimer(30);
    onStepChange("otp");
  };

  const handleVerifyOtp = async (prefilledCode?: string) => {
    const token = prefilledCode || otp.join("");
    if (token.length < 6) { setError("Please enter the complete 6-digit code"); return; }
    setError("");
    setLoading(true);
    otpFlowRef.current = true;
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });
    if (verifyError) {
      otpFlowRef.current = false;
      setLoading(false);
      if (verifyError.message.includes("expired")) {
        setError("Code expired. Request a new one.");
      } else if (verifyError.message.includes("Invalid") || verifyError.message.includes("otp")) {
        setError("Wrong code. Try again.");
      } else {
        setError(verifyError.message);
      }
      return;
    }
    // Set the password the user chose during registration
    if (pendingPasswordRef.current) {
      await supabase.auth.updateUser({ password: pendingPasswordRef.current });
      pendingPasswordRef.current = "";
    }
    setLoading(false);
    // Check profile and redirect
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("user_id", user.id).maybeSingle();
      if (profile) {
        router.push(profile.role === "admin" ? "/admin" : `/${profile.role}/dashboard`);
        return;
      }
    }
    onStepChange("profile");
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError("");
    const { error: sendError } = await supabase.auth.signInWithOtp({ email: email.trim() });
    if (sendError) { setError(sendError.message); return; }
    setResendTimer(30);
    setOtp(["", "", "", "", "", ""]);
  };

  const createProfile = async () => {
    try {
      setError("");
      if (!name.trim()) { setError("Please enter your name"); return; }
      if (!agreeToTerms) { setError("Please agree to the Terms & Conditions and Privacy Policy"); return; }
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Session expired. Please login again.");
        setLoading(false);
        onStepChange("auth");
        return;
      }
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const profileData: Record<string, any> = {
        user_id: user.id, full_name: name.trim(), role, email: user.email, status: "unverified",
        plan_status: "trial",
        trial_start_date: now.toISOString(),
        trial_end_date: trialEnd,
      };

      const { error: insertError } = await supabase.from("profiles").insert(profileData);
      setLoading(false);
      if (insertError) {
        if (insertError.message.includes("duplicate")) {
          const { data } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
          if (data) { router.push(data.role === "admin" ? "/admin" : `/${data.role}/dashboard`); return; }
        }
        setError(insertError.message);
        return;
      }
      router.replace(`/${role}/dashboard`);
    } catch (err) {
      console.error("[LoginPage] error:", err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-12 pl-10 pr-3 rounded-[18px] border border-gray-200 bg-white text-sm outline-none transition-all focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20";
  const inputIconClass = "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400";

  return (
    <section className="bg-[#F8F8F6] py-20 md:py-28" id="auth">
      <div className="mx-auto max-w-md px-4 sm:px-6">
        <FadeSection>
          {step === "auth" && (
            <div className="relative card-base">
              <div className="overflow-hidden rounded-[16px]"><div className="h-1 bg-gradient-to-r from-teal-600 to-teal-700" /></div>
              <div className="p-6 sm:p-8">
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setError(""); }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Back to home
                </button>

                <div className="text-center mb-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[22px] bg-gradient-to-br from-teal-600 to-teal-700 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Welcome to EventMan</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Sign in or create your account
                  </p>
                </div>

                {error && (
                  <div className="animate-slide-down mb-5 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Sign In Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gray-100" />
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Sign In</span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Email address</label>
                    <div className="relative">
                      <Mail className={inputIconClass} />
                      <input
                        ref={inputRef}
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(""); }}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                    <div className="relative">
                      <Lock className={inputIconClass} />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError(""); }}
                        placeholder="Your password"
                        autoComplete="current-password"
                        className="w-full h-12 pl-10 pr-10 rounded-[18px] border border-gray-200 bg-white text-sm outline-none transition-all focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer group mb-1">
                    <input
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={e => setAgreeToTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-700 focus:ring-teal-500/30 focus:ring-offset-0"
                    />
                    <span className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-700 transition-colors">
                      I agree to the{" "}
                      <Link href="/terms" target="_blank" className="text-teal-700 hover:text-slate-900 underline font-medium">Terms &amp; Conditions</Link>
                      {" "}and{" "}
                      <Link href="/privacy" target="_blank" className="text-teal-700 hover:text-slate-900 underline font-medium">Privacy Policy</Link>
                    </span>
                  </label>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSignIn}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-[18px] bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 transition-all active:scale-[0.98] disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      <>Sign In <ArrowRight className="h-4 w-4" /></>
                    )}
                  </button>
                </div>

                {/* Divider */}
                <div className="my-6 flex items-center gap-3">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">or</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                {/* Create Account Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gray-100" />
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Create Account</span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>

                  <p className="text-xs text-gray-400 text-center -mt-1">
                    New here? Set up your account in seconds
                  </p>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleCreateAccount}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-[18px] border-2 border-teal-700 bg-white text-sm font-semibold text-teal-700 transition-all active:scale-[0.98] hover:bg-teal-50 disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Creating account...
                      </span>
                    ) : (
                      <>Create Account <ArrowRight className="h-4 w-4" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "otp" && (
            <div className="relative card-base">
              <div className="overflow-hidden rounded-[16px]"><div className="h-1 bg-gradient-to-r from-teal-600 to-teal-700" /></div>
              <div className="p-6 sm:p-8">
                <button
                  type="button"
                  onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setError(""); }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Back to home
                </button>

            <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }} className="space-y-5">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[22px] bg-gradient-to-br from-teal-600 to-teal-700 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
                  <KeyRound className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Check Your Email</h2>
                <p className="mt-1 text-sm text-gray-500">
                  We sent a code to <span className="font-medium text-gray-700">{email}</span>
                </p>
              </div>

              {error && (
                <div className="animate-slide-down rounded-[18px] border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label className="mb-3 block text-center text-sm font-medium text-gray-700">Verification code</label>
                <OtpInput value={otp} onChange={setOtp} onComplete={handleVerifyOtp} />
              </div>

              <button
                type="submit"
                disabled={loading || otp.join("").length < 6}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[18px] bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  <>Verify & Sign In <ArrowRight className="h-4 w-4" /></>
                )}
              </button>

              <p className="text-center text-xs text-gray-400 leading-relaxed">
                You can also click the sign-in link sent to your email
              </p>

              <p className="text-center text-sm text-gray-500">
                {resendTimer > 0 ? (
                  <span className="text-gray-400">Resend code in <span className="font-semibold text-gray-600">{resendTimer}s</span></span>
                ) : (
                  <>
                    Didn&apos;t receive it?{" "}
                    <button
                      type="button"
                      onClick={handleResend}
                      className="font-semibold text-teal-700 transition-colors hover:text-slate-900"
                    >
                      Resend code
                    </button>
                  </>
                )}
              </p>

              <p className="text-center text-xs text-gray-400">
                <button
                  type="button"
                  onClick={() => { onStepChange("auth"); setError(""); setOtp(["", "", "", "", "", ""]); }}
                  className="underline hover:text-gray-600"
                >
                  Use a different email
                </button>
              </p>
            </form>
              </div>
            </div>
          )}

          {step === "profile" && (
            <div className="relative card-base">
              <div className="overflow-hidden rounded-[16px]"><div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" /></div>
              <div className="p-6 sm:p-8">
                <button
                  type="button"
                  onClick={() => { onStepChange("auth"); setError(""); }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Back to sign in
                </button>

            <form onSubmit={(e) => { e.preventDefault(); createProfile(); }} className="space-y-5">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[22px] bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] shadow-black/[0.03]">
                  <User className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Complete Profile</h2>
                <p className="mt-1 text-sm text-gray-500">Just a few more details to get started</p>
              </div>

              {error && (
                <div className="animate-slide-down rounded-[18px] border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); setError(""); }}
                    placeholder="Your full name"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">I want to join as</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["worker", "organizer"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex h-16 flex-col items-center justify-center gap-1 rounded-[18px] border-2 transition-all ${
                        role === r
                          ? "border-teal-700 bg-teal-50 text-teal-700"
                          : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {r === "worker" ? <HardHat className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
                      <span className="text-xs font-semibold">{r === "worker" ? "Worker" : "Organizer"}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[18px] bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Creating...
                  </span>
                ) : "Continue"}
              </button>
            </form>
              </div>
            </div>
          )}
        </FadeSection>
      </div>
    </section>
  );
}

// â”€â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HeroSection({ onCta }: { onCta: () => void }) {
  return (
    <section className="relative flex min-h-[90dvh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-teal-900 via-teal-800 to-teal-950">
      {/* Animated bg orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-500/15 blur-3xl animate-float" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-teal-600/15 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-white/5 blur-3xl animate-pulse-soft" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
        {/* Brand */}
        <FadeSection>
          <div className="mb-6 inline-flex items-center gap-3 rounded-[22px] bg-white/10 px-5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] shadow-black/[0.03] backdrop-blur-md">
            <Logo showText={false} />
            <span className="text-sm font-bold tracking-wide text-white">EventMan</span>
          </div>
        </FadeSection>

        {/* Headline */}
        <FadeSection className="mt-2">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl lg:text-7xl">
            Ahmedabad&apos;s Event<br />
            <span className="bg-gradient-to-r from-teal-100 to-teal-200 bg-clip-text text-transparent">Workforce Platform</span>
          </h1>
        </FadeSection>

        {/* Subheading */}
        <FadeSection className="mt-6">
          <p className="mx-auto max-w-xl text-base leading-relaxed text-teal-100/80 md:text-lg">
            Find event work or hire trusted staff â€” all in one place.
            No WhatsApp groups. No confusion. Just professional manpower coordination.
          </p>
        </FadeSection>

        {/* CTA */}
        <FadeSection className="mt-10">
          <button
            onClick={onCta}
            className="group inline-flex items-center gap-2.5 rounded-[22px] bg-white px-8 py-4 text-base font-bold text-teal-700 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:scale-105 active:scale-[0.97]"
          >
            Get Started
            <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
          </button>
        </FadeSection>

        {/* Trust bump */}
        <FadeSection className="mt-12">
          <div className="flex items-center justify-center gap-4 sm:gap-8 text-teal-100/70">
            <div className="flex items-center gap-2 text-xs">
              <Shield className="h-3.5 w-3.5" />
              Verified
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Users className="h-3.5 w-3.5" />
              380+ Workers
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              50+ Organizers
            </div>
          </div>
        </FadeSection>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-float">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-medium tracking-wide text-teal-100/60 uppercase">Scroll</span>
          <div className="flex flex-col items-center gap-0.5">
            <div className="h-1 w-1 rounded-full bg-teal-100/40" />
            <div className="h-1 w-1 rounded-full bg-teal-100/40" />
            <div className="h-1 w-1 rounded-full bg-teal-100/60" />
          </div>
        </div>
      </div>
    </section>
  );
}

// â”€â”€â”€ MAIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"auth" | "otp" | "profile">("auth");
  const previewRef = useRef<HTMLDivElement>(null);
  const authRef = useRef<HTMLDivElement>(null);

  // Scroll to top on mount
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [selectedRole, setSelectedRole] = useState<"worker" | "organizer">("worker");
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from("profiles").select("role").eq("user_id", session.user.id).maybeSingle().then(({ data }) => {
          if (data) {
            router.replace(data.role === "admin" ? "/admin" : `/${data.role}/dashboard`);
          } else {
            setStep("profile");
          }
        });
      }
    });
  }, [router]);

  const scrollToAuth = useCallback(() => {
    authRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="min-h-dvh bg-[#F8F8F6]">
      {/* HERO */}
      <HeroSection onCta={scrollToAuth} />

      {/* ECOSYSTEM PREVIEW */}
      <div ref={previewRef}>
        <EcosystemPreview />
      </div>

      {/* ROLE SELECTION */}
      <RoleSelection selected={selectedRole} onSelect={setSelectedRole} />

      {/* TRUST & FEATURES */}
      <TrustSection />

      {/* AUTH */}
      <div ref={authRef}>
        <AuthForm step={step} onStepChange={setStep} />
      </div>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <Logo muted />
          <p className="mt-2 text-xs text-gray-400">
            Ahmedabad&apos;s Event Workforce Platform &mdash; Professional manpower coordination
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-[11px]">
            <Link href="/terms" className="text-gray-400 hover:text-gray-600 transition-colors">Terms</Link>
            <span className="text-gray-200">|</span>
            <Link href="/privacy" className="text-gray-400 hover:text-gray-600 transition-colors">Privacy</Link>
            <span className="text-gray-200">|</span>
            <Link href="/refund-policy" className="text-gray-400 hover:text-gray-600 transition-colors">Refunds</Link>
          </div>
          <p className="mt-3 text-[10px] text-gray-300">&copy; {new Date().getFullYear()} EventMan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

