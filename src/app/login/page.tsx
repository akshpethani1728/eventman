"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Mail, ArrowRight, Briefcase, HardHat, CheckCircle,
  Sparkles, ArrowUpRight, Calendar, Clock, MapPin,
  IndianRupee, BadgeCheck, Flame, Users,
  Building2, Bell, Shield, Zap, TrendingUp, User,
  ChevronRight, Search, Star, LayoutDashboard, UserCheck,
  KeyRound, RefreshCw, ArrowDown,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

const supabase = createClient();

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

function FadeIn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}>
      {children}
    </div>
  );
}

function OtpInput({ value, onChange, onComplete }: {
  value: string[]; onChange: (v: string[]) => void; onComplete: (code: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const valRef = useRef(value);
  valRef.current = value;

  const change = (i: number, ch: string) => {
    const digit = ch.replace(/\D/g, "").slice(-1);
    if (!digit && ch) return;
    const next = [...valRef.current];
    next[i] = digit;
    valRef.current = next;
    onChange(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
    if (digit && i === 5) onComplete(next.join(""));
  };

  const keyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !valRef.current[i] && i > 0) {
      const next = [...valRef.current];
      next[i - 1] = "";
      valRef.current = next;
      onChange(next);
      refs.current[i - 1]?.focus();
    }
    if (e.key === "Enter" && valRef.current.join("").length === 6) onComplete(valRef.current.join(""));
  };

  const paste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!p) return;
    e.preventDefault();
    const next = [...valRef.current];
    for (let i = 0; i < p.length; i++) next[i] = p[i];
    valRef.current = next;
    onChange(next);
    refs.current[Math.min(p.length, 5)]?.focus();
    if (p.length === 6) onComplete(next.join(""));
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {value.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={1}
          value={d}
          onChange={e => change(i, e.target.value)}
          onKeyDown={e => keyDown(i, e)}
          onPaste={i === 0 ? paste : undefined}
          className={`h-14 w-11 rounded-[16px] border-2 text-center text-lg font-bold tracking-wider outline-none transition-all ${
            d ? "border-teal-700 bg-teal-50 text-teal-700" : "border-gray-200 bg-gray-50 text-gray-900"
          } focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20`}
        />
      ))}
    </div>
  );
}

// ─── SIMPLE AUTH FORM ──────────────────────────────────────────
function AuthSection({ onRedirect }: { onRedirect: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp" | "profile">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"worker" | "organizer">("worker");

  const inputRef = useRef<HTMLInputElement>(null);
  const signedInRef = useRef(false);

  // Handle auth state changes (magic link clicks)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session && !signedInRef.current) {
        signedInRef.current = true;
        const { data: profile } = await supabase
          .from("profiles").select("role").eq("user_id", session.user.id).maybeSingle();
        if (profile) {
          router.push(profile.role === "admin" ? "/admin" : `/${profile.role}/dashboard`);
        } else {
          setStep("profile");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => { if (resendTimer > 0) { const t = setInterval(() => setResendTimer(p => p - 1), 1000); return () => clearInterval(t); } }, [resendTimer]);
  useEffect(() => { if (step === "email") inputRef.current?.focus(); }, [step]);

  const sendOtp = async () => {
    setError("");
    const trimmed = email.trim();
    if (!trimmed) { setError("Enter your email"); return; }
    setLoading(true);
    const { error: sendError } = await supabase.auth.signInWithOtp({ email: trimmed });
    setLoading(false);
    if (sendError) { setError(sendError.message); return; }
    setResendTimer(30);
    setStep("otp");
  };

  const verifyOtpCode = async (code?: string) => {
    const token = code || otp.join("");
    if (token.length < 6) { setError("Enter the 6-digit code"); return; }
    setError("");
    setLoading(true);
    const { error: verError } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
    setLoading(false);
    if (verError) {
      if (verError.message.includes("expired")) setError("Code expired. Request a new one.");
      else if (verError.message.includes("Invalid") || verError.message.includes("otp")) setError("Wrong code. Try again.");
      else setError(verError.message);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("user_id", user.id).maybeSingle();
      if (profile) {
        router.push(profile.role === "admin" ? "/admin" : `/${profile.role}/dashboard`);
        return;
      }
    }
    setStep("profile");
  };

  const resendCode = async () => {
    if (resendTimer > 0) return;
    setError("");
    const { error: sendError } = await supabase.auth.signInWithOtp({ email: email.trim() });
    if (sendError) { setError(sendError.message); return; }
    setResendTimer(30);
    setOtp(["", "", "", "", "", ""]);
  };

  const createProfile = async () => {
    setError("");
    if (!name.trim()) { setError("Enter your name"); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Session expired. Login again."); setLoading(false); setStep("email"); return; }
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const { error: insError } = await supabase.from("profiles").insert({
      user_id: user.id, full_name: name.trim(), role, email: user.email, status: "unverified",
      plan_status: "trial", trial_start_date: now.toISOString(), trial_end_date: trialEnd,
    });
    setLoading(false);
    if (insError) {
      if (insError.message.includes("duplicate")) {
        const { data } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
        if (data) { router.push(data.role === "admin" ? "/admin" : `/${data.role}/dashboard`); return; }
      }
      setError(insError.message);
      return;
    }
    router.replace(`/${role}/dashboard`);
  };

  const ic = "w-full h-12 pl-10 pr-3 rounded-[16px] border border-gray-200 bg-white text-sm outline-none transition-all focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20";

  return (
    <section className="bg-[#F8F8F6] py-20 md:py-28" id="auth">
      <div className="mx-auto max-w-md px-4">
        {step === "email" && (
          <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-teal-600 to-teal-700" />
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-[20px] bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-700/20">
                <Mail className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Welcome to EventMan</h2>
              <p className="mt-1.5 text-sm text-gray-500">Enter your email to get started</p>

              {error && (
                <div className="mt-5 rounded-[16px] bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="mt-6 text-left">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="email" value={email}
                    onChange={e => { setEmail(e.target.value); setError(""); }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={ic}
                    onKeyDown={e => { if (e.key === "Enter") sendOtp(); }}
                  />
                </div>
              </div>

              <button onClick={sendOtp} disabled={loading}
                className="mt-5 w-full h-12 rounded-[16px] bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</> : <>Send Code <ArrowRight className="w-4 h-4" /></>}
              </button>

              <p className="mt-4 text-xs text-gray-400">
                We&apos;ll send a 6-digit code to your email.{" "}
                <Link href="/terms" className="text-teal-700 underline">Terms</Link>
              </p>
            </div>
          </div>
        )}

        {step === "otp" && (
          <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-teal-600 to-teal-700" />
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-[20px] bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-700/20">
                <KeyRound className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Check Your Email</h2>
              <p className="mt-1.5 text-sm text-gray-500">
                We sent a code to <span className="font-semibold text-gray-700">{email}</span>
              </p>

              {error && (
                <div className="mt-5 rounded-[16px] bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="mt-6">
                <OtpInput value={otp} onChange={setOtp} onComplete={verifyOtpCode} />
              </div>

              {loading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-teal-700">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
                </div>
              )}

              <div className="mt-5">
                {resendTimer > 0 ? (
                  <span className="text-sm text-gray-400">Resend in <span className="font-semibold text-gray-600">{resendTimer}s</span></span>
                ) : (
                  <button onClick={resendCode} className="text-sm font-semibold text-teal-700 hover:text-teal-800">
                    Resend code
                  </button>
                )}
              </div>

              <button onClick={() => { setStep("email"); setError(""); setOtp(["", "", "", "", "", ""]); }}
                className="mt-4 text-xs text-gray-400 underline hover:text-gray-600">
                Use a different email
              </button>
            </div>
          </div>
        )}

        {step === "profile" && (
          <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 w-14 h-14 rounded-[20px] bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-700/20">
                  <User className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Almost Done!</h2>
                <p className="mt-1.5 text-sm text-gray-500">Just your name and role</p>

                {error && (
                  <div className="mt-4 rounded-[16px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
                )}
              </div>

              <div className="text-left">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name</label>
                <input type="text" value={name} onChange={e => { setName(e.target.value); setError(""); }}
                  placeholder="Your full name" className={ic} />
              </div>

              <div className="mt-5 text-left">
                <label className="mb-2 block text-sm font-medium text-gray-700">I want to join as</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["worker", "organizer"] as const).map(r => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      className={`flex h-16 flex-col items-center justify-center gap-1 rounded-[16px] border-2 transition-all ${
                        role === r ? "border-teal-700 bg-teal-50 text-teal-700" : "border-gray-200 bg-gray-50 text-gray-500"
                      }`}>
                      {r === "worker" ? <HardHat className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                      <span className="text-xs font-semibold capitalize">{r}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={createProfile} disabled={loading}
                className="mt-6 w-full h-12 rounded-[16px] bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Setting up...</> : <>Continue <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── PREVIEW CARDS ──────────────────────────────────────────────
const previewCards = [
  {
    id: "feed", label: "Worker Feed", icon: Search,
    content: (
      <div className="p-4 space-y-3 w-[320px]">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-700">
            <Sparkles className="w-3 h-3" /> Trial · 10d left
          </div>
          <span className="text-[11px] font-medium text-[#0D9488] flex items-center gap-0.5">Details <ChevronRight className="w-3 h-3" /></span>
        </div>
        <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Search, value: "12", label: "Available", color: "bg-teal-50", iconColor: "text-[#0D9488]" },
              { icon: ArrowUpRight, value: "3", label: "Applied", color: "bg-emerald-50", iconColor: "text-emerald-600" },
              { icon: Sparkles, value: "Trial", label: "Plan", color: "bg-amber-50", iconColor: "text-amber-600" },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="text-center">
                  <div className={`w-8 h-8 rounded-[10px] ${s.color} flex items-center justify-center mx-auto mb-1.5`}>
                    <Icon className={`w-4 h-4 ${s.iconColor}`} />
                  </div>
                  <p className="text-[16px] font-bold text-[#1A1A1A] leading-none">{s.value}</p>
                  <p className="text-[9px] text-[#6B6B6B] mt-0.5 font-medium">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-9 rounded-[12px] bg-[#0D9488] text-white text-sm font-semibold flex items-center justify-center shadow-[0_4px_12px_rgba(13,148,136,0.25)]">Browse (12)</div>
          <div className="flex-1 h-9 rounded-[12px] bg-white text-[#6B6B6B] text-sm font-semibold flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">Applied (3)</div>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {["All", "Photography", "Setup", "Hospitality"].map((c, i) => (
            <span key={i} className={`h-7 px-3.5 rounded-full text-[10px] font-semibold whitespace-nowrap flex items-center ${i === 0 ? "bg-[#0D9488] text-white" : "bg-white text-[#6B6B6B] border border-gray-200/60"}`}>{c}</span>
          ))}
        </div>
        {(() => {
          const ev = { org: "DreamCatcher Events", category: "Photography", trusted: true, title: "Wedding Photography Coverage", date: "Sat, May 30", time: "8:00 AM", end_time: "6:00 PM", location: "The Grand Palace, Ahmedabad", payment: "₹1,500", spots: 20, filled: 12, hoursSinceCreated: 3, gender_req: "any", min_age: 18, max_age: 45, food: true, skills: ["Photography", "Videography"], isNew: true, isHighDemand: true };
          const remaining = ev.spots - ev.filled;
          const fillPercent = Math.round((ev.filled / ev.spots) * 100);
          return (
            <div className="block bg-white rounded-[16px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="px-4 pt-3.5 pb-1 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm shrink-0">D</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5"><span className="text-sm font-semibold text-[#1A1A1A] truncate">{ev.org}</span><BadgeCheck className="w-3.5 h-3.5 text-[#0D9488] shrink-0" /></div>
                    <span className="text-[10px] font-semibold text-teal-600">Photography</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0"><div className="flex items-center gap-0.5 text-emerald-700 font-bold text-sm"><IndianRupee className="w-3.5 h-3.5" />{ev.payment}</div></div>
              </div>
              <div className="px-4 py-1.5 flex flex-wrap gap-1.5">
                {ev.isNew && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500 text-white border border-teal-600"><Sparkles className="w-3 h-3" /> New</span>}
                {ev.isHighDemand && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60"><Flame className="w-3 h-3" /> High Demand</span>}
              </div>
              <div className="px-4"><h3 className="text-[16px] font-bold leading-snug text-[#1A1A1A]">{ev.title}</h3></div>
              <div className="px-4 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#6B6B6B]">
                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0 text-[#A1A1AA]" /><span>{ev.date}</span></div>
                <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 shrink-0 text-[#A1A1AA]" /><span>{ev.time}-{ev.end_time}</span></div>
                <div className="flex items-center gap-1.5 truncate max-w-[140px]"><MapPin className="w-3.5 h-3.5 shrink-0 text-[#A1A1AA]" /><span className="truncate">{ev.location}</span></div>
              </div>
              <div className="px-4 mt-3 flex flex-wrap gap-1.5">
                <span className="text-[10px] font-medium bg-gray-50 text-[#6B6B6B] px-2.5 py-0.5 rounded-full capitalize">{ev.gender_req}</span>
                <span className="text-[10px] font-medium bg-gray-50 text-[#6B6B6B] px-2.5 py-0.5 rounded-full">{ev.min_age}-{ev.max_age} yrs</span>
                <span className="text-[10px] font-medium bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full">Food</span>
                {ev.skills.map((s, i) => <span key={i} className="text-[10px] font-medium bg-violet-50 text-violet-700 px-2.5 py-0.5 rounded-full">{s}</span>)}
              </div>
              <div className="px-4 mt-3">
                <div className="flex items-center justify-between text-[11px] mb-1.5"><span className="font-medium text-[#6B6B6B]">{remaining} of {ev.spots} spots</span><span className="text-[#A1A1AA]">{fillPercent}%</span></div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#0D9488]" style={{ width: `${Math.max(2, fillPercent)}%` }} /></div>
              </div>
              <div className="px-4 py-3.5 flex items-center justify-end border-t border-[rgba(0,0,0,0.04)] mt-3">
                <div className="h-9 px-4 rounded-[10px] bg-[#0D9488] text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-[0_4px_12px_rgba(13,148,136,0.25)]"><ArrowUpRight className="w-3.5 h-3.5" /> Apply</div>
              </div>
            </div>
          );
        })()}
      </div>
    ),
  },
  {
    id: "dashboard", label: "Organizer Dashboard", icon: LayoutDashboard,
    content: (
      <div className="space-y-3 px-4 pt-4 pb-4 w-[320px]">
        <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-gray-700">Management Hub</span><span className="text-[8px] font-medium text-teal-600">Last 30 days</span></div>
        <div className="grid grid-cols-3 gap-2">
          {[{ label: "Active", value: "4", color: "text-teal-700", bg: "bg-teal-50" }, { label: "Filling", value: "7", color: "text-amber-700", bg: "bg-amber-50" }, { label: "Hired", value: "43", color: "text-emerald-700", bg: "bg-emerald-50" }].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-[14px] p-2.5 text-center`}><p className={`text-base font-black ${s.color}`}>{s.value}</p><p className="text-[8px] text-gray-500 font-medium mt-0.5">{s.label}</p></div>
          ))}
        </div>
        <div className="space-y-2">
          <span className="text-[9px] font-semibold text-gray-600">Event Fill Progress</span>
          {[{ title: "Wedding at The Grand", filled: 18, total: 20, color: "bg-emerald-500" }, { title: "Tech Conference 2026", filled: 9, total: 15, color: "bg-amber-500" }, { title: "Music Festival Prep", filled: 28, total: 30, color: "bg-teal-500" }].map((ev, i) => (
            <div key={i} className="rounded-[14px] bg-white border border-gray-100/80 p-2.5"><div className="flex items-center justify-between mb-1.5"><p className="text-[9px] font-semibold text-gray-700 truncate mr-2">{ev.title}</p><span className="text-[8px] font-bold text-gray-400 shrink-0">{ev.filled}/{ev.total}</span></div><div className="h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className={`h-full rounded-full ${ev.color}`} style={{ width: `${(ev.filled / ev.total) * 100}%` }} /></div></div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-[14px] bg-gradient-to-r from-teal-600 to-teal-700 p-2.5"><div className="flex items-center gap-2"><Bell className="h-3 w-3 text-white/80" /><span className="text-[9px] font-semibold text-white">12 pending approvals</span></div><ChevronRight className="h-3 w-3 text-white/60" /></div>
      </div>
    ),
  },
  {
    id: "profile", label: "Worker Profile", icon: UserCheck,
    content: (
      <div className="px-4 pt-4 pb-4 w-[320px]">
        <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-[16px] p-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg ring-2 ring-white/30">RS</div><div className="flex-1 min-w-0"><p className="text-sm font-bold text-white">Rahul Sharma</p><div className="flex items-center gap-1.5 mt-0.5"><div className="flex items-center gap-1 text-[9px] text-white/70"><MapPin className="h-2.5 w-2.5" />Ahmedabad</div><span className="w-1 h-1 rounded-full bg-white/30" /><div className="flex items-center gap-1 text-[9px] text-white/70"><Star className="h-2.5 w-2.5 text-amber-300" />4.8</div></div></div></div></div>
        <div className="flex items-center justify-around mt-3 py-2 bg-gray-50/80 rounded-[14px]">
          {[{ label: "Events", value: "24", icon: Calendar }, { label: "Rating", value: "4.8", icon: Star }, { label: "Hired", value: "92%", icon: TrendingUp }].map((s, i) => {
            const Icon = s.icon;
            return (<div key={i} className="text-center"><Icon className="h-3 w-3 text-teal-600 mx-auto mb-0.5" /><p className="text-xs font-black text-gray-900">{s.value}</p><p className="text-[7px] text-gray-400 font-medium uppercase tracking-wider">{s.label}</p></div>);
          })}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">{["Photography", "Videography", "Editing", "Lighting"].map((s, i) => (<span key={i} className="rounded-full bg-teal-50 border border-teal-200/50 px-2.5 py-1 text-[8px] font-semibold text-teal-700">{s}</span>))}</div>
      </div>
    ),
  },
  {
    id: "notifications", label: "Live Updates", icon: Bell,
    content: (
      <div className="space-y-1 px-4 pt-4 pb-4 w-[320px]">
        <div className="flex items-center justify-between mb-1"><span className="text-[11px] font-bold text-gray-700">Recent Activity</span><span className="flex items-center gap-1 text-[8px] font-medium text-teal-600"><span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />Live</span></div>
        {[
          { icon: CheckCircle, text: "Approved for Wedding Photography at The Grand", time: "2 min ago", color: "text-emerald-600", bg: "bg-emerald-50" },
          { icon: Sparkles, text: "New match: Corporate Gala Night in your area", time: "15 min ago", color: "text-teal-600", bg: "bg-teal-50" },
          { icon: Users, text: "Concert Setup needs 5 more workers urgently", time: "1 hour ago", color: "text-amber-600", bg: "bg-amber-50" },
          { icon: Bell, text: "Organizer sent you a message about Saturday", time: "2 hours ago", color: "text-violet-600", bg: "bg-violet-50" },
        ].map((n, i) => {
          const Icon = n.icon;
          return (<div key={i} className="flex items-start gap-2.5 rounded-[14px] bg-white border border-gray-100/80 p-2.5"><div className={`mt-0.5 w-7 h-7 rounded-[10px] ${n.bg} flex items-center justify-center shrink-0`}><Icon className={`h-3 w-3 ${n.color}`} /></div><div className="flex-1 min-w-0"><p className="text-[9px] font-medium text-gray-700 leading-relaxed">{n.text}</p><p className="mt-0.5 text-[8px] text-gray-400">{n.time}</p></div>{i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" />}</div>);
        })}
      </div>
    ),
  },
];

const features = [
  { icon: Shield, title: "Verified Organizers", desc: "Every event creator is verified so you can work with confidence" },
  { icon: Lock, title: "Privacy First", desc: "Your contact stays private until you are approved for an event" },
  { icon: Bell, title: "Instant Alerts", desc: "Real-time notifications for approvals, new events, and updates" },
  { icon: Zap, title: "Smart Matching", desc: "Get events that match your skills, location, and availability" },
  { icon: Users, title: "Build Your Network", desc: "Connect with Ahmedabad's top event organizers and workers" },
  { icon: TrendingUp, title: "Earn More", desc: "Get rated higher, unlock better events, and grow your income" },
];

export default function LoginPage() {
  const router = useRouter();
  const authRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from("profiles").select("role").eq("user_id", session.user.id).maybeSingle().then(({ data }) => {
          if (data) router.replace(data.role === "admin" ? "/admin" : `/${data.role}/dashboard`);
        });
      }
    });
  }, [router]);

  const scrollToAuth = useCallback(() => authRef.current?.scrollIntoView({ behavior: "smooth" }), []);

  return (
    <div className="min-h-dvh bg-[#F8F8F6]">
      {/* HERO */}
      <section className="relative flex min-h-[90dvh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-teal-900 via-teal-800 to-teal-950">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-500/15 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-teal-600/15 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <div className="mb-6 inline-flex items-center gap-3 rounded-[22px] bg-white/10 px-5 py-2.5 backdrop-blur-md">
            <Logo showText={false} />
            <span className="text-sm font-bold tracking-wide text-white">EventMan</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">
            Ahmedabad&apos;s Event<br />
            <span className="bg-gradient-to-r from-teal-100 to-teal-200 bg-clip-text text-transparent">Manpower Platform</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-teal-100/80">
            Find event jobs or hire trusted staff &mdash; all in one place.
          </p>
          <button onClick={scrollToAuth}
            className="mt-10 inline-flex items-center gap-2.5 rounded-[22px] bg-white px-8 py-4 text-base font-bold text-teal-700 transition-all hover:scale-105 active:scale-[0.97]">
            Get Started <ArrowDown className="h-4 w-4" />
          </button>
          <div className="mt-12 flex items-center justify-center gap-4 sm:gap-8 text-teal-100/70">
            <div className="flex items-center gap-2 text-xs"><Shield className="h-3.5 w-3.5" /> Verified</div>
            <div className="flex items-center gap-2 text-xs"><Users className="h-3.5 w-3.5" /> 380+ Workers</div>
            <div className="flex items-center gap-2 text-xs"><Building2 className="h-3.5 w-3.5" /> 50+ Organizers</div>
          </div>
        </div>
      </section>

      {/* PREVIEW */}
      <section className="py-20 md:py-28 bg-[#F8F8F6]">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <span className="inline-block rounded-full bg-teal-700 px-4 py-1 text-[11px] font-semibold tracking-wide text-white uppercase">Ecosystem Preview</span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 md:text-4xl">See the Platform in Action</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-500">Real app screens you will use every day</p>
        </div>
        <div className="mt-12 mx-auto max-w-7xl px-4">
          <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 scroll-smooth scrollbar-none md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 md:overflow-visible md:pb-0">
            {previewCards.map(card => (
              <div key={card.id} className="w-[78vw] shrink-0 snap-center md:w-auto rounded-[22px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                {card.content}
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-center gap-1.5 md:hidden">
            {previewCards.map((_, i) => {
              const isFirst = i === 0;
              return <span key={i} className={`rounded-full ${isFirst ? "w-5 h-0.5 bg-teal-700" : "w-1.5 h-1.5 bg-teal-300"}`} />;
            })}
          </div>
        </div>
      </section>

      {/* TRUST + FEATURES */}
      <section className="bg-gradient-to-b from-white to-gray-50 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4">
          <FadeIn>
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-4xl">Trusted by Ahmedabad&apos;s Event Ecosystem</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-500">A growing community of workers and organizers using EventMan</p>
            </div>
          </FadeIn>
          <FadeIn className="mt-12">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
              {[
                { icon: Calendar, value: 28, label: "Active Events", suffix: "" },
                { icon: Users, value: 380, label: "Workers Available", suffix: "+" },
                { icon: Building2, value: 52, label: "Verified Organizers", suffix: "" },
                { icon: TrendingUp, value: 1250, label: "Successful Placements", suffix: "+" },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="rounded-[22px] bg-white p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-gray-100">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-teal-50 to-teal-50">
                      <Icon className="h-6 w-6 text-teal-700" />
                    </div>
                    <p className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl"><AnimatedCounter end={s.value} suffix={s.suffix} /></p>
                    <p className="mt-1 text-sm text-gray-500">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </FadeIn>
          <FadeIn className="mt-16">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="rounded-[18px] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-gray-100">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[18px] bg-teal-50"><Icon className="h-5 w-5 text-teal-700" /></div>
                    <h3 className="text-sm font-semibold text-gray-900">{f.title}</h3>
                    <p className="mt-1 text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* AUTH */}
      <div ref={authRef}>
        <AuthSection onRedirect={scrollToAuth} />
      </div>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <Logo muted />
          <p className="mt-2 text-xs text-gray-400">Ahmedabad&apos;s Event Workforce Platform</p>
          <div className="mt-4 flex items-center justify-center gap-4 text-[11px]">
            <Link href="/terms" className="text-gray-400 hover:text-gray-600">Terms</Link>
            <span className="text-gray-200">|</span>
            <Link href="/privacy" className="text-gray-400 hover:text-gray-600">Privacy</Link>
            <span className="text-gray-200">|</span>
            <Link href="/refund-policy" className="text-gray-400 hover:text-gray-600">Refunds</Link>
          </div>
          <p className="mt-3 text-[10px] text-gray-300">&copy; {new Date().getFullYear()} EventMan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
