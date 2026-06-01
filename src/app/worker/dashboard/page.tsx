"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LogOut, MapPin, Calendar, Clock, Users, IndianRupee, ShieldCheck,
  UtensilsCrossed, Car, Timer, TrendingUp, Zap, CheckCircle, BadgeCheck,
  XCircle, Hourglass, ArrowUpRight, Clock3, Send, AlertCircle,
  Heart, Flame, Gauge, Bell, Phone, Info, ListChecks, ListPlus, ListMinus, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import type { Profile, Event, Application } from "@/lib/supabase/types";
import { Logo } from "@/components/Logo";
import { checkPlanStatus } from "@/lib/subscription";

function isWaitlisted(app: Application) { return app.status === "pending" && app.notes === "waitlisted"; }
function isRemovedByOrganizer(app: Application) { return app.status === "cancelled" && app.notes === "removed_by_organizer"; }

type ApplicationStatusDisplay = "pending" | "approved" | "rejected" | "cancelled" | "waitlisted";

const STATUS_CONFIG: Record<ApplicationStatusDisplay, { label: string; badge: string; icon: any; accent: string; message: string }> = {
  pending:   { label: "Pending",   badge: "bg-amber-100 text-amber-700", icon: Hourglass,   accent: "bg-amber-400", message: "Awaiting organizer response" },
  approved:  { label: "Selected",  badge: "bg-emerald-100 text-emerald-700", icon: CheckCircle, accent: "bg-emerald-500", message: "You're confirmed for this event" },
  rejected:  { label: "Not Selected", badge: "bg-gray-200 text-gray-600", icon: XCircle,    accent: "bg-gray-300",  message: "Not selected this time" },
  cancelled: { label: "Cancelled", badge: "bg-gray-100 text-gray-400", icon: XCircle,    accent: "bg-gray-200",  message: "Application withdrawn" },
  waitlisted: { label: "Waitlisted", badge: "bg-purple-100 text-purple-700", icon: ListPlus, accent: "bg-purple-400", message: "On waitlist — spot may open up" },
};

const CATEGORY_LABELS: Record<string, string> = {
  promotion: "Promotion", event_setup: "Setup", crowd_management: "Crowd Mgmt",
  registration: "Registration", hospitality: "Hospitality", cleaning: "Cleaning",
  security: "Security", other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  promotion: "bg-teal-500/10 text-teal-600", event_setup: "bg-violet-500/10 text-violet-600",
  crowd_management: "bg-orange-500/10 text-orange-600", registration: "bg-emerald-500/10 text-emerald-600",
  hospitality: "bg-amber-500/10 text-amber-600", cleaning: "bg-cyan-500/10 text-cyan-600",
  security: "bg-red-500/10 text-red-600", other: "bg-gray-500/10 text-gray-600",
};

const AVAIL_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  available_today: { label: "Available Today", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  available_this_week: { label: "Available This Week", dot: "bg-indigo-600", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  available: { label: "Available", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  weekends: { label: "Weekends", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  evenings: { label: "Evenings", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700 border-purple-200" },
  busy: { label: "Busy", dot: "bg-red-500", badge: "bg-red-100 text-red-700 border-red-200" },
  unavailable: { label: "Unavailable", dot: "bg-gray-400", badge: "bg-gray-100 text-gray-500 border-gray-200" },
};

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return <span className="text-red-600 font-medium">Deadline passed</span>;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 7) return <span>{days} days left</span>;
  if (days > 0) return <span className="text-amber-600 font-medium">{days}d {hours}h left</span>;
  return <span className="text-red-600 font-medium">{hours}h left</span>;
}

function computePriorityScore(event: any): number {
  const now = Date.now();
  const eventDate = new Date(event.date).getTime();
  const hoursUntil = (eventDate - now) / 3600000;
  const daysUntil = hoursUntil / 24;
  const createdAt = new Date(event.created_at).getTime();
  const hoursSinceCreated = (now - createdAt) / 3600000;
  const remaining = event.worker_count - (event.approved_count || 0);
  const fillPercent = event.worker_count ? ((event.approved_count || 0) / event.worker_count) * 100 : 0;
  let score = 0;

  if (hoursUntil >= 0 && hoursUntil < 96) {
    if (hoursUntil < 12) score += 35;
    else if (hoursUntil < 24) score += 30;
    else if (hoursUntil < 48) score += 22;
    else if (hoursUntil < 72) score += 12;
    else score += 6;
  }

  if (fillPercent >= 95) score += 28;
  else if (fillPercent >= 80) score += 22;
  else if (fillPercent >= 60) score += 15;
  else if (fillPercent >= 40) score += 8;
  else if (fillPercent >= 20) score += 3;

  if (event.organizer?.is_trusted_organizer) score += 18;

  if (hoursSinceCreated < 12) score += 18;
  else if (hoursSinceCreated < 24) score += 14;
  else if (hoursSinceCreated < 48) score += 8;
  else if (hoursSinceCreated < 72) score += 3;

  const totalApps = event.total_applications || 0;
  if (totalApps >= 15) score += 12;
  else if (totalApps >= 10) score += 8;
  else if (totalApps >= 5) score += 5;
  else if (totalApps >= 2) score += 2;

  if (event.application_deadline) {
    const deadlineMs = new Date(event.application_deadline).getTime();
    const hoursUntilDeadline = (deadlineMs - now) / 3600000;
    if (hoursUntilDeadline > 0 && hoursUntilDeadline < 12) score += 14;
    else if (hoursUntilDeadline < 24) score += 10;
    else if (hoursUntilDeadline < 48) score += 6;
    else if (hoursUntilDeadline < 96) score += 3;
  }

  if (remaining <= 1) score += 10;
  else if (remaining <= 3) score += 6;
  else if (remaining <= 5) score += 2;

  return score;
}

function SkeletonCard() {
  return (
    <div className="card-base rounded-[16px] overflow-hidden">
      <div className="px-4 pt-3.5 pb-2 flex items-center gap-3">
        <div className="w-8 h-8 rounded-[10px] bg-gray-200 animate-pulse shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="w-28 h-3 rounded bg-gray-200 animate-pulse" />
          <div className="w-20 h-2.5 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="w-16 h-5 rounded-[10px] bg-gray-200 animate-pulse" />
      </div>
      <div className="px-4 py-1">
        <div className="flex gap-1.5 mb-3">
          <div className="w-16 h-5 rounded-[10px] bg-gray-100 animate-pulse" />
          <div className="w-20 h-5 rounded-[10px] bg-gray-100 animate-pulse" />
        </div>
        <div className="w-3/4 h-5 rounded bg-gray-200 animate-pulse mb-3" />
        <div className="w-32 h-7 rounded bg-gray-100 animate-pulse mb-3" />
        <div className="w-full h-3 rounded bg-gray-100 animate-pulse mb-2" />
        <div className="flex gap-1.5 mb-3">
          <div className="w-14 h-5 rounded-[10px] bg-gray-100 animate-pulse" />
          <div className="w-16 h-5 rounded-[10px] bg-gray-100 animate-pulse" />
        </div>
        <div className="w-full h-1.5 rounded-full bg-gray-100 animate-pulse" />
      </div>
      <div className="px-4 py-3">
        <div className="w-full h-10 rounded-[10px] bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}

function EventBadge({ children, variant, pulse }: { children: React.ReactNode; variant: "red" | "amber" | "blue" | "purple" | "green" | "orange" | "slate" | "emerald"; pulse?: boolean }) {
  const styles: Record<string, string> = {
    red: "bg-red-50 text-red-700 border-red-200/60",
    amber: "bg-amber-50 text-amber-700 border-amber-200/60",
    blue: "bg-indigo-50 text-indigo-700 border-indigo-200/60",
    purple: "bg-purple-50 text-purple-700 border-purple-200/60",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    orange: "bg-orange-50 text-orange-700 border-orange-200/60",
    slate: "bg-gray-50 text-gray-600 border-gray-200/60",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border ${styles[variant]} ${pulse ? "animate-pulse" : ""}`}>
      {children}
    </span>
  );
}

function DashboardContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<(Event & {
    application?: Application;
    approved_count?: number;
    total_applications?: number;
    organizer?: Profile;
    organizer_past_events?: number;
  })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"browse" | "applied">("browse");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "applied") setTab("applied");
  }, [searchParams]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profRaw } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!profRaw || profRaw.role !== "worker") { router.push("/login"); return; }

      const prof = profRaw;

      setProfile(prof);
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false);
      setUnreadNotifCount(count || 0);

      const { data: apps } = await supabase.from("applications").select("*").eq("worker_id", user.id);
      const appMap: Record<string, Application> = {};
      apps?.forEach((a: Application) => { appMap[a.event_id] = a; });
      const appliedEventIds = Object.keys(appMap);

      const browseCutoff = new Date(); browseCutoff.setDate(browseCutoff.getDate() - 1);
      const browseCutoffStr = browseCutoff.toISOString().split("T")[0];
      const { data: browseEvts } = await supabase
        .from("events").select("*").in("status", ["published", "filling"]).gte("date", browseCutoffStr).order("date", { ascending: true });

      let appliedEvts: any[] = [];
      if (appliedEventIds.length > 0) {
        const { data } = await supabase.from("events").select("*").in("id", appliedEventIds);
        appliedEvts = data || [];
      }

      const seen = new Set<string>();
      const allEvts: any[] = [];
      for (const e of [...(browseEvts || []), ...appliedEvts]) {
        if (!seen.has(e.id)) { seen.add(e.id); allEvts.push(e); }
      }

      if (allEvts.length === 0) { setEvents([]); setLoading(false); return; }

      const allEventIds = allEvts.map(e => e.id);

      const { data: counts } = await supabase
        .from("applications").select("event_id, status").in("event_id", allEventIds);
      const approvedMap: Record<string, number> = {};
      const totalMap: Record<string, number> = {};
      counts?.forEach((c: any) => {
        totalMap[c.event_id] = (totalMap[c.event_id] || 0) + 1;
        if (c.status === "approved") approvedMap[c.event_id] = (approvedMap[c.event_id] || 0) + 1;
      });

      const orgIds = [...new Set(allEvts.map(e => e.organizer_id))];
      const { data: orgProfiles } = await supabase.from("profiles").select("*").in("user_id", orgIds);
      const orgMap: Record<string, Profile> = {};
      orgProfiles?.forEach(p => { orgMap[p.user_id] = p; });

      const { data: pastCounts } = await supabase
        .from("events").select("organizer_id").in("organizer_id", orgIds).in("status", ["completed", "cancelled"]);
      const pastCountMap: Record<string, number> = {};
      pastCounts?.forEach((e: any) => {
        pastCountMap[e.organizer_id] = (pastCountMap[e.organizer_id] || 0) + 1;
      });

      const enriched = allEvts.map(e => ({
        ...e,
        application: appMap[e.id] || undefined,
        approved_count: approvedMap[e.id] || 0,
        total_applications: totalMap[e.id] || 0,
        organizer: orgMap[e.organizer_id],
        organizer_past_events: pastCountMap[e.organizer_id] || 0,
      }));

      enriched.sort((a, b) => computePriorityScore(b) - computePriorityScore(a));

      setEvents(enriched);
    } catch (err) {
      console.error("[Dashboard] loadData error:", err);
    } finally {
      setLoading(false);
    }
  };

  const apply = async (eventId: string) => {
    if (profile && !checkPlanStatus(profile).canApply) {
      toast.error("Your plan has expired. Subscribe to continue applying.");
      router.push("/worker/plans");
      return;
    }
    setApplyingId(eventId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setApplyingId(null); return; }
    const existing = events.find(e => e.id === eventId)?.application;
    if (existing && (existing.status === "cancelled" || existing.status === "rejected" || isRemovedByOrganizer(existing))) {
      const { error } = await supabase.from("applications").update({ status: "pending", notes: null, updated_at: new Date().toISOString() }).eq("id", existing.id);
      setApplyingId(null);
      if (error) { toast.error(error.message); return; }
      toast.success("Re-applied successfully!");
    } else if (!existing) {
      const { error } = await supabase.from("applications").insert({
        event_id: eventId, worker_id: user.id, status: "pending",
      });
      setApplyingId(null);
      if (error) { toast.error(error.message); return; }
      toast.success("Applied successfully!");
    } else {
      setApplyingId(null);
      toast.error("You already have an active application for this event");
    }
    loadData();
  };

  const joinWaitlist = async (eventId: string) => {
    if (profile && !checkPlanStatus(profile).canApply) {
      toast.error("Your plan has expired. Subscribe to continue applying.");
      router.push("/worker/plans");
      return;
    }
    setApplyingId(eventId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setApplyingId(null); return; }
    const { error } = await supabase.from("applications").insert({
      event_id: eventId, worker_id: user.id, status: "pending", notes: "waitlisted",
    });
    setApplyingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Added to waitlist!");
    loadData();
  };

  const leaveWaitlist = async (app: Application) => {
    setApplyingId(app.event_id);
    const { error } = await supabase.from("applications").delete().eq("id", app.id);
    setApplyingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed from waitlist");
    loadData();
  };

  const signOut = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const allCategories = [...new Set(events.map(e => e.category).filter(Boolean))] as string[];

  // Browse: events the worker has not actively applied to (no app, cancelled, or waitlisted)
  let browseEvents = events.filter(e => {
    const app = e.application;
    if (!app) return true;
    if (isWaitlisted(app)) return true;
    if (app.status === "cancelled") return true;
    return false;
  });
  if (categoryFilter) browseEvents = browseEvents.filter(e => e.category === categoryFilter);

  // Applied: events the worker has a non-cancelled, non-waitlisted application for
  const appliedEvents = events.filter(e => {
    const app = e.application;
    if (!app) return false;
    if (isWaitlisted(app)) return false;
    if (app.status === "cancelled") return false;
    return true;
  });

  const planCheck = profile ? checkPlanStatus(profile) : null;
  const canApply = planCheck?.canApply ?? true;

  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F6]">
        <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-20">
          <div className="h-0.5 bg-gradient-to-r from-[#0D9488]/20 via-[#0D9488] to-[#0D9488]/20" />
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-sm">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#1A1A1A]">EventMan</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse" />
              <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse" />
              <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-4">
          <div className="w-full h-24 rounded-[16px] bg-gradient-to-br from-teal-200 to-teal-100 animate-pulse" />
          <div className="w-full h-11 rounded-[10px] bg-gray-200 animate-pulse" />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </main>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-20">
        <div className="h-0.5 bg-gradient-to-r from-[#0D9488]/20 via-[#0D9488] to-[#0D9488]/20" />
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-[#0D9488] flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="text-[#1A1A1A] font-bold text-sm">EventMan</div>
          </div>
          <div className="flex items-center gap-1.5">
            {profile && (
              <>
                <Link href="/worker/notifications" className="btn-base relative p-2 text-[#6B6B6B] hover:text-[#1A1A1A] rounded-[10px] hover:bg-gray-100 transition-colors">
                  <Bell className="w-4 h-4" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center shadow-sm">
                      {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                    </span>
                  )}
                </Link>
                <Link href="/worker/profile" className="btn-base relative flex items-center gap-2 p-1 hover:bg-gray-100 rounded-[10px] transition-colors">
                  <div className="w-7 h-7 rounded-full bg-[#0D9488] flex items-center justify-center text-white font-bold text-[11px] shadow-sm">
                    {profile.full_name?.charAt(0) || "W"}
                  </div>
                  {profile.availability && AVAIL_CONFIG[profile.availability] && (
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-white ${AVAIL_CONFIG[profile.availability].dot}`} />
                  )}
                </Link>
                <button onClick={signOut} className="btn-base p-2 text-[#6B6B6B] hover:text-[#1A1A1A] rounded-[10px] hover:bg-gray-100 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 pb-28">
        {/* Subscription status banner */}
          {profile && profile.plan_status && (
            <div className={`mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold ${
              profile.plan_status === "active"
                ? "bg-emerald-100 text-emerald-700"
                : profile.plan_status === "trial"
                  ? "bg-teal-100 text-teal-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {profile.plan_status === "active" ? (
                <><CreditCard className="w-3 h-3" /> Active Plan</>
              ) : profile.plan_status === "trial" ? (
                <><Clock className="w-3 h-3" /> Free Trial {profile.trial_end_date ? `· ${Math.ceil((new Date(profile.trial_end_date).getTime() - Date.now()) / 86400000)}d left` : ""}</>
              ) : (
                <><AlertCircle className="w-3 h-3" /> Plan Expired <Link href="/worker/plans" className="underline ml-1">Renew</Link></>
              )}
            </div>
          )}
        {/* Welcome banner */}
          {profile && tab === "browse" && browseEvents.length > 0 && (
            <div className="mb-3 bg-gradient-to-br from-[#0D9488] to-teal-800 rounded-[16px] p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
              <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/5" />
              <p className="text-sm opacity-90">Hey <span className="font-semibold">{profile.full_name?.split(" ")[0] || "there"}</span></p>
              <p className="text-xl font-bold mt-0.5">{browseEvents.length} event{browseEvents.length !== 1 ? "s" : ""} available</p>
              <div className="flex items-center gap-2 mt-2">
                {profile.availability && AVAIL_CONFIG[profile.availability] ? (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-[10px] bg-white/20 text-white`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${AVAIL_CONFIG[profile.availability].dot}`} />
                    {AVAIL_CONFIG[profile.availability].label}
                  </span>
                ) : (
                  <Link href="/worker/profile" className="text-[10px] opacity-75 underline">Set your availability</Link>
                )}
                {profile.availability === "busy" && <span className="text-[10px] opacity-75">— you&apos;re marked as unavailable</span>}
              </div>
            </div>
          )}

        {/* Tabs */}
        <div className="flex gap-1.5 mb-4 bg-gray-100/80 rounded-[10px] p-1">
          <button onClick={() => setTab("browse")}
            className={`btn-base flex-1 h-9 rounded-[10px] text-sm font-medium transition-all ${
              tab === "browse" ? "bg-white text-[#0D9488] shadow-sm" : "text-[#6B6B6B] hover:text-[#1A1A1A]"
            }`}>
            Browse {browseEvents.length > 0 && `(${browseEvents.length})`}
          </button>
          <button onClick={() => setTab("applied")}
            className={`btn-base flex-1 h-9 rounded-[10px] text-sm font-medium transition-all ${
              tab === "applied" ? "bg-white text-[#0D9488] shadow-sm" : "text-[#6B6B6B] hover:text-[#1A1A1A]"
            }`}>
            Applied {appliedEvents.length > 0 && `(${appliedEvents.length})`}
          </button>
        </div>

        {/* ========== BROWSE TAB ========== */}
        {tab === "browse" && (
          <>
            {/* Category filter */}
            {allCategories.length > 0 && (
              <div className="mb-3 overflow-x-auto -mx-4 px-4 scrollbar-none">
                <div className="flex gap-2 min-w-max pb-1">
                  <button onClick={() => setCategoryFilter("")}
                    className={`btn-base h-8 px-3.5 rounded-[10px] text-xs font-medium transition-all whitespace-nowrap ${
                      !categoryFilter ? "bg-[#0D9488] text-white shadow-sm" : "bg-white text-[#6B6B6B] border border-gray-200 hover:border-gray-300"
                    }`}>All</button>
                  {allCategories.map(cat => (
                    <button key={cat} onClick={() => setCategoryFilter(cat)}
                      className={`btn-base h-8 px-3.5 rounded-[10px] text-xs font-medium capitalize transition-all whitespace-nowrap ${
                        categoryFilter === cat ? "bg-[#0D9488] text-white shadow-sm" : "bg-white text-[#6B6B6B] border border-gray-200 hover:border-gray-300"
                      }`}>{CATEGORY_LABELS[cat] || cat.replace(/_/g, " ")}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {browseEvents.length === 0 && (
              <div className="text-center py-16 px-4">
                <div className="w-20 h-20 rounded-[16px] bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mx-auto mb-5">
                  <Gauge className="w-9 h-9 text-[#0D9488]" />
                </div>
                <p className="text-lg font-bold text-[#1A1A1A]">
                  {categoryFilter ? "No events match this category" : "No events available"}
                </p>
                <p className="text-sm text-[#6B6B6B] mt-1.5 leading-relaxed max-w-xs mx-auto">
                  {categoryFilter
                    ? "Try a different category or clear the filter to see all opportunities"
                    : "New opportunities are added daily. Check back soon or adjust your preferences."}
                </p>
                {categoryFilter && (
                  <button onClick={() => setCategoryFilter("")}
                    className="btn-base mt-5 h-11 px-6 rounded-[10px] bg-[#0D9488] text-white text-sm font-semibold hover:bg-teal-700 transition-all active:scale-[0.97]">
                    Clear filter
                  </button>
                )}
              </div>
            )}

            {/* Event Cards */}
            <div className="space-y-4">
              {browseEvents.map((event, idx) => {
                const remaining = event.worker_count - (event.approved_count || 0);
                const fillPercent = Math.min(100, Math.round(((event.approved_count || 0) / event.worker_count) * 100));
                const daysUntil = Math.ceil((new Date(event.date).getTime() - Date.now()) / 86400000);
                const hoursUntilEvent = Math.round((new Date(event.date).getTime() - Date.now()) / 3600000);
                const isUrgent = daysUntil <= 2 && daysUntil > 0;
                const isToday = daysUntil === 0;
                const isNew = new Date(event.created_at).getTime() > Date.now() - 86400000 * 2;
                const isPopular = (event.total_applications || 0) >= 5;
                const isHighDemand = (event.total_applications || 0) >= 10;
                const deadlineSoon = event.application_deadline && new Date(event.application_deadline).getTime() - Date.now() < 86400000 * 3 && new Date(event.application_deadline).getTime() > Date.now();
                const deadlineToday = event.application_deadline && new Date(event.application_deadline).getTime() - Date.now() < 86400000 && new Date(event.application_deadline).getTime() > Date.now();
                const org = event.organizer;
                const hoursSinceCreated = (Date.now() - new Date(event.created_at).getTime()) / 3600000;
                const isNewlyPosted = hoursSinceCreated < 6;
                const isFillingFast = fillPercent >= 70;
                const isNearlyFull = remaining <= 3;
                const isFull = remaining <= 0;
                const deadlinePassed = event.application_deadline ? new Date(event.application_deadline).getTime() <= Date.now() : false;
                const waitlisted = event.application ? isWaitlisted(event.application) : false;
                const isTrusted = org?.is_trusted_organizer;
                const orgStatus = org?.status;
                const isProfileVerified = orgStatus === "trusted" || orgStatus === "basic_verified";
                const isVerified = isTrusted || isProfileVerified;
                const score = computePriorityScore(event);

                let cardAccent = "border-gray-200/70";
                let shadowBoost = "";
                if (isToday || hoursUntilEvent < 12) {
                  cardAccent = "border-red-200/80";
                  shadowBoost = "shadow-red-500/5";
                } else if (isNearlyFull || isFillingFast) {
                  cardAccent = "border-amber-200/80";
                  shadowBoost = "shadow-amber-500/5";
                } else if (isTrusted) {
                  cardAccent = "border-indigo-200/80";
                  shadowBoost = "shadow-indigo-500/5";
                }

                return (
                  <Link key={event.id} href={`/worker/events/${event.id}`}
                    className="block card-elevated overflow-hidden transition-all duration-300 active:scale-[0.99] animate-slide-up"
                    style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "both" }}>

                    {/* === ACCENT BAR === */}
                    <div className={`h-1 ${
                      isToday || hoursUntilEvent < 12
                        ? "bg-red-500"
                        : isNearlyFull
                          ? "bg-amber-500"
                          : isFillingFast
                            ? "bg-amber-400"
                            : isTrusted
                              ? "bg-[#0D9488]"
                              : isNew
                                ? "bg-[#0D9488]"
                                : "bg-gray-200"
                    }`} />

                    {/* === ORGANIZER ROW === */}
                    <div className="px-4 pt-3.5 pb-2 flex items-center gap-3">
                      <div className="relative shrink-0">
                        {org?.avatar_url ? (
                          <img src={org.avatar_url} alt="" className="w-8 h-8 rounded-[10px] object-cover ring-2 shrink-0 ring-gray-100" />
                        ) : (
                          <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                            isTrusted
                              ? "bg-gradient-to-br from-emerald-500 to-[#0D9488]"
                              : "bg-gradient-to-br from-[#0D9488] to-teal-700"
                          }`}>
                            {org?.full_name?.charAt(0) || "O"}
                          </div>
                        )}
                        {isTrusted && (
                          <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#0D9488] border-[2.5px] border-white flex items-center justify-center shadow-sm">
                            <BadgeCheck className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-[#1A1A1A] truncate">{org?.full_name || "Event Organizer"}</span>
                          {isTrusted && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#0D9488] bg-teal-50 px-1.5 py-0.5 rounded-[10px]">
                              <BadgeCheck className="w-2.5 h-2.5" />
                              Trusted
                            </span>
                          )}
                          {!isTrusted && isProfileVerified && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-[#0D9488] bg-teal-50 px-1.5 py-0.5 rounded-[10px]">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              Verified
                            </span>
                          )}
                        </div>
                        {(event.organizer_past_events ?? 0) > 0 && (
                          <span className="text-[10px] text-[#6B6B6B] flex items-center gap-0.5">
                            <CheckCircle className="w-2.5 h-2.5 text-[#A1A1AA]" />
                            {event.organizer_past_events} event{event.organizer_past_events !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {event.category && (
                          <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-[10px] capitalize ${CATEGORY_COLORS[event.category] || "bg-gray-50 text-[#6B6B6B]"}`}>
                            {CATEGORY_LABELS[event.category] || event.category}
                          </span>
                        )}
                        {isNewlyPosted && (
                          <span className="text-[10px] font-semibold bg-[#0D9488] text-white px-2.5 py-0.5 rounded-[10px] animate-pulse">
                            New
                          </span>
                        )}
                        {!isNewlyPosted && isNew && !deadlinePassed && (
                          <span className="text-[10px] font-semibold bg-[#0D9488] text-white px-2.5 py-0.5 rounded-[10px]">
                            New
                          </span>
                        )}
                        {deadlinePassed && (
                          <span className="text-[10px] font-semibold bg-gray-100 text-[#A1A1AA] px-2.5 py-0.5 rounded-[10px]">
                            Deadline Passed
                          </span>
                        )}
                        {!deadlinePassed && isFull && (
                          <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-[10px]">
                            Full
                          </span>
                        )}
                        {waitlisted && (
                          <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-[10px]">
                            Waitlisted
                          </span>
                        )}
                      </div>
                    </div>

                    {/* === INTELLIGENCE BADGES ROW === */}
                    <div className="px-4 py-1 flex flex-wrap gap-1.5">
                      {isToday && (
                        <EventBadge variant="red" pulse><Flame className="w-3 h-3" /> Starts Today</EventBadge>
                      )}
                      {daysUntil === 1 && !isToday && (
                        <EventBadge variant="amber"><Clock3 className="w-3 h-3" /> Starts Tomorrow</EventBadge>
                      )}
                      {isUrgent && !isToday && daysUntil !== 1 && (
                        <EventBadge variant="amber"><Clock3 className="w-3 h-3" /> {daysUntil} days away</EventBadge>
                      )}
                      {isFillingFast && !isNearlyFull && (
                        <EventBadge variant="orange"><TrendingUp className="w-3 h-3" /> Filling Fast</EventBadge>
                      )}
                      {isNearlyFull && (
                        <EventBadge variant="red" pulse><Users className="w-3 h-3" /> Only {remaining} Left</EventBadge>
                      )}
                      {deadlineToday && (
                        <EventBadge variant="red" pulse><AlertCircle className="w-3 h-3" /> Deadline Today</EventBadge>
                      )}
                      {deadlineSoon && !deadlineToday && (
                        <EventBadge variant="amber"><Clock className="w-3 h-3" /> Deadline Soon</EventBadge>
                      )}
                      {isHighDemand && (
                        <EventBadge variant="purple"><Flame className="w-3 h-3" /> High Demand</EventBadge>
                      )}
                      {isPopular && !isHighDemand && (
                        <EventBadge variant="purple"><TrendingUp className="w-3 h-3" /> Popular</EventBadge>
                      )}
                    </div>

                    {/* === EVENT TITLE === */}
                    <div className="px-4 mt-1">
                      <h3 className="font-bold text-[16px] leading-snug text-[#1A1A1A]">{event.title}</h3>
                    </div>

                    {/* === PAYMENT === */}
                    {event.payment_info && (
                      <div className="px-4 mt-1.5">
                        <div className="inline-flex items-center gap-1">
                          <IndianRupee className="w-5 h-5 text-emerald-600" />
                          <span className="text-lg font-bold text-emerald-700">{event.payment_info}</span>
                        </div>
                      </div>
                    )}

                    {/* === DATE / TIME / LOCATION === */}
                    <div className="px-4 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B6B6B]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-[#A1A1AA]" />
                        <span>{event.date_display || new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0 text-[#A1A1AA]" />
                        <span>{event.time}{event.end_time ? `-${event.end_time}` : ""}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-[#A1A1AA]" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>

                    {/* === REQUIREMENTS CHIPS === */}
                    <div className="px-4 mt-3 flex flex-wrap gap-1.5">
                      {event.gender_requirement && (
                        <span className="text-[10px] font-medium bg-gray-50 text-[#6B6B6B] px-2.5 py-0.5 rounded-[10px] capitalize">{event.gender_requirement}</span>
                      )}
                      {(event.min_age || event.max_age) && (
                        <span className="text-[10px] font-medium bg-gray-50 text-[#6B6B6B] px-2.5 py-0.5 rounded-[10px]">{event.min_age || 0}-{event.max_age || 99} yrs</span>
                      )}
                      {event.food_included && (
                        <span className="text-[10px] font-medium bg-green-50 text-green-700 px-2.5 py-0.5 rounded-[10px] flex items-center gap-1">
                          <UtensilsCrossed className="w-3 h-3" /> Food
                        </span>
                      )}
                      {event.travel_included && (
                        <span className="text-[10px] font-medium bg-teal-50 text-[#0D9488] px-2.5 py-0.5 rounded-[10px] flex items-center gap-1">
                          <Car className="w-3 h-3" /> Travel
                        </span>
                      )}
                      {event.dress_code && (
                        <span className="text-[10px] font-medium bg-gray-50 text-[#6B6B6B] px-2.5 py-0.5 rounded-[10px]">{event.dress_code}</span>
                      )}
                      {event.skill_requirements && event.skill_requirements.length > 0 && (
                        <span className="text-[10px] font-medium bg-violet-50 text-violet-700 px-2.5 py-0.5 rounded-[10px]">
                          {event.skill_requirements.slice(0, 2).join(", ")}{event.skill_requirements.length > 2 ? ` +${event.skill_requirements.length - 2}` : ""}
                        </span>
                      )}
                    </div>

                    {/* === STAFFING PROGRESS === */}
                    <div className="px-4 mt-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#A1A1AA]" />
                          <span className={`font-medium ${remaining === 0 ? "text-red-600" : remaining <= 3 ? "text-amber-600" : "text-[#6B6B6B]"}`}>
                            {remaining} of {event.worker_count} remaining
                          </span>
                        </div>
                        <span className="text-[#A1A1AA]">{fillPercent}% filled</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            fillPercent >= 80 ? "bg-red-500" : fillPercent >= 50 ? "bg-amber-500" : "bg-[#0D9488]"
                          } ${isNearlyFull ? "animate-pulse" : ""}`}
                          style={{ width: `${Math.max(2, fillPercent)}%` }}
                        />
                      </div>
                    </div>

                    {/* === DEADLINE COUNTDOWN === */}
                    {event.application_deadline && (
                      <div className="px-4 mt-2 flex items-center gap-1 text-[10px] text-[#A1A1AA]">
                        <Clock className="w-3 h-3" />
                        Apply by {new Date(event.application_deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ·
                        <CountdownTimer targetDate={event.application_deadline} />
                      </div>
                    )}

                    {/* === CTA SECTION === */}
                    <div className="px-4 py-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {event.total_applications && event.total_applications > 0 && (
                            <span className="text-[10px] text-[#A1A1AA] flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {formatCount(event.total_applications)} applicant{event.total_applications !== 1 ? "s" : ""}
                            </span>
                          )}
                          {hoursUntilEvent > 0 && hoursUntilEvent < 48 && !isToday && (
                            <span className="text-[10px] text-[#A1A1AA] flex items-center gap-1">
                              <Clock3 className="w-3 h-3" />
                              In {hoursUntilEvent}h
                            </span>
                          )}
                        </div>
                      </div>
                      {deadlinePassed ? (
                        <div className="btn-base w-full h-10 rounded-[10px] bg-gray-100 text-[#A1A1AA] text-xs font-semibold flex items-center justify-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Applications Closed
                        </div>
                      ) : waitlisted ? (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); leaveWaitlist(event.application!); }}
                          disabled={applyingId === event.id}
                          className="btn-base w-full h-10 rounded-[10px] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] bg-purple-50 text-purple-700 border border-purple-200/60 hover:bg-purple-100">
                          {applyingId === event.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <><ListMinus className="w-3.5 h-3.5" /> Leave Waitlist</>
                          )}
                        </button>
                      ) : !canApply ? (
                        <Link href="/worker/plans"
                          onClick={(e) => { e.stopPropagation(); }}
                          className="btn-base w-full h-10 rounded-[10px] font-semibold text-xs flex items-center justify-center gap-1.5 bg-amber-600 text-white hover:bg-amber-700 transition-all active:scale-[0.97]">
                          <CreditCard className="w-3.5 h-3.5" /> Subscribe
                        </Link>
                      ) : isFull ? (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); joinWaitlist(event.id); }}
                          disabled={applyingId === event.id}
                          className="btn-base w-full h-10 rounded-[10px] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] disabled:opacity-60 bg-purple-600 text-white hover:bg-purple-700">
                          {applyingId === event.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <><ListPlus className="w-3.5 h-3.5" /> Join Waitlist</>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); apply(event.id); }}
                          disabled={applyingId === event.id}
                          className={`btn-base w-full h-10 rounded-[10px] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] disabled:opacity-60 ${
                            isToday || hoursUntilEvent < 12
                              ? "bg-red-600 text-white hover:bg-red-700"
                              : isNearlyFull
                                ? "bg-amber-600 text-white hover:bg-amber-700"
                                : "bg-[#0D9488] text-white hover:bg-teal-700"
                          }`}>
                          {applyingId === event.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <><ArrowUpRight className="w-3.5 h-3.5" /> {(event.application && (event.application.status === "cancelled" || event.application.status === "rejected")) ? "Re-apply" : "Apply"}</>
                          )}
                        </button>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* ========== APPLIED TAB ========== */}
        {tab === "applied" && appliedEvents.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 rounded-[16px] bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mx-auto mb-5">
              <Send className="w-9 h-9 text-[#0D9488]" />
            </div>
            <p className="text-lg font-bold text-[#1A1A1A]">No applications yet</p>
            <p className="text-sm text-[#6B6B6B] mt-2 leading-relaxed max-w-xs mx-auto">
            You haven&apos;t applied to any events yet. Browse available opportunities and send your first application to get started.
            </p>
            <button onClick={() => setTab("browse")}
              className="btn-base mt-6 h-11 px-6 rounded-[10px] bg-[#0D9488] text-white text-sm font-semibold hover:bg-teal-700 transition-all active:scale-[0.97]">
              Browse Events
            </button>
          </div>
        )}

        {tab === "applied" && appliedEvents.length > 0 && (
          <div className="space-y-3">
            {appliedEvents.map((event, idx) => {
              const app = event.application!;
              const statusKey: ApplicationStatusDisplay = isWaitlisted(app) ? "waitlisted" : (app.status as ApplicationStatusDisplay);
              const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
              const StatusIcon = cfg.icon;
              const org = event.organizer;
              const hoursUntil = (new Date(event.date).getTime() - Date.now()) / 3600000;
              const fillPercent = event.worker_count ? Math.min(100, Math.round(((event.approved_count || 0) / event.worker_count) * 100)) : 0;
              const daysUntil = Math.ceil(hoursUntil / 24);
              const isUrgent = hoursUntil > 0 && hoursUntil < 24;

              return (
                <Link key={event.id} href={`/worker/events/${event.id}`}
                  className="block card-elevated overflow-hidden transition-all duration-300 active:scale-[0.99] animate-slide-up"
                  style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}>

                  {/* Accent bar — distinct per status */}
                  <div className={`h-1 ${isWaitlisted(app) ? "bg-purple-400" : cfg.accent}`} />

                  <div className="p-4">
                    {/* Header: avatar, title, status badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {org?.avatar_url ? (
                          <img src={org.avatar_url} alt="" className="w-9 h-9 rounded-[10px] object-cover ring-2 shrink-0 ring-gray-100" />
                        ) : (
                          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center font-bold text-sm shrink-0 ${
                            app.status === "approved"
                              ? "bg-gradient-to-br from-emerald-500 to-[#0D9488] text-white"
                              : "bg-gradient-to-br from-[#0D9488] to-teal-700 text-white"
                          }`}>
                            {org?.full_name?.charAt(0) || "E"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-[#1A1A1A] truncate">{event.title}</h3>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#6B6B6B] mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] text-xs font-semibold shrink-0 ${cfg.badge}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </div>
                    </div>

                    {/* Date/time chips */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-[10px] bg-gray-50 text-[10px] text-[#6B6B6B]">
                        <Calendar className="w-3 h-3" />
                        {event.date_display || event.date}
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-[10px] bg-gray-50 text-[10px] text-[#6B6B6B]">
                        <span>{event.time}</span>
                      </div>
                      {event.category && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-[10px] bg-gray-50 text-[10px] text-[#6B6B6B] capitalize">
                          {CATEGORY_LABELS[event.category] || event.category}
                        </div>
                      )}
                    </div>

                    {/* Payment & countdown */}
                    <div className="flex items-center justify-between mb-3">
                      {event.payment_info && (
                        <div className="flex items-center gap-1 text-emerald-700 text-sm font-bold">
                          <IndianRupee className="w-3.5 h-3.5" />
                          {event.payment_info}
                        </div>
                      )}
                      {!event.payment_info && <div />}
                      {app.status !== "cancelled" && app.status !== "rejected" && (
                        <div className={`flex items-center gap-1 text-xs font-medium ${isUrgent ? "text-red-600" : "text-[#6B6B6B]"}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {hoursUntil <= 0
                              ? "Event started"
                              : hoursUntil > 72
                                ? `${Math.floor(hoursUntil / 24)} days away`
                                : hoursUntil > 24
                                  ? `${Math.floor(hoursUntil / 24)}d ${Math.floor(hoursUntil % 24)}h away`
                                  : hoursUntil > 12
                                    ? `${Math.floor(hoursUntil)}h away`
                                    : hoursUntil > 0
                                      ? "< 12 hours"
                                      : "Event started"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    {event.worker_count > 0 && (app.status === "pending" || app.status === "approved") && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#A1A1AA]">Staffing</span>
                          <span className="font-medium text-[#6B6B6B]">{event.approved_count || 0}/{event.worker_count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${
                            app.status === "approved" && fillPercent >= 80
                              ? "bg-emerald-500"
                              : "bg-amber-400"
                          }`} style={{ width: `${fillPercent}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Status-specific sections */}

                    {/* --- APPROVED: Readiness section --- */}
                    {app.status === "approved" && (
                      <div className="space-y-2">
                        {/* Countdown banner */}
                        {hoursUntil > 0 && (
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-[10px] ${
                            isUrgent
                              ? "bg-red-50 text-red-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}>
                            <Timer className={`w-4 h-4 ${isUrgent ? "animate-pulse" : ""}`} />
                            <span className="text-xs font-semibold">
                              {isUrgent
                                ? hoursUntil < 12
                                  ? "Starting in less than 12 hours — be prepared!"
                                  : `Starting in ${Math.floor(hoursUntil)}h`
                                : `Event in ${Math.floor(hoursUntil / 24)} days`}
                            </span>
                          </div>
                        )}

                        {/* Contact information */}
                        {org?.phone && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-white border border-emerald-100">
                            <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-xs font-medium text-[#6B6B6B]">Contact:</span>
                            <span className="text-xs font-semibold text-[#1A1A1A]">{org.phone}</span>
                          </div>
                        )}

                        {/* Reporting info */}
                        {event.reporting_details && (
                          <div className="flex items-start gap-2 px-3 py-2 rounded-[10px] bg-gray-50 border border-gray-100">
                            <Info className="w-4 h-4 text-[#A1A1AA] shrink-0 mt-0.5" />
                            <div className="text-xs text-[#6B6B6B] leading-relaxed">{event.reporting_details}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* --- PENDING: Status message --- */}
                    {app.status === "pending" && (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-amber-50">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        <span className="text-xs text-amber-700 font-medium">{cfg.message}</span>
                      </div>
                    )}

                    {/* --- REJECTED: Respectful message + reapply option --- */}
                    {app.status === "rejected" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-gray-50">
                          <Info className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                          <span className="text-xs text-[#6B6B6B]">{cfg.message}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-teal-50">
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                          <span className="text-xs text-[#0D9488] font-medium">Browse other opportunities</span>
                        </div>
                      </div>
                    )}

                    {/* --- WAITLISTED: Calm purple info --- */}
                    {isWaitlisted(app) && (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-purple-50">
                        <ListPlus className="w-4 h-4 text-purple-500 shrink-0" />
                        <span className="text-xs text-purple-700">On waitlist — may get a spot if someone drops out</span>
                      </div>
                    )}

                    {/* --- REMOVED BY ORGANIZER --- */}
                    {isRemovedByOrganizer(app) && (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-red-50">
                        <Info className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="text-xs text-red-600">Removed by organizer — you can re-apply</span>
                      </div>
                    )}

                    {/* --- CANCELLED: Clear neutral message --- */}
                    {app.status === "cancelled" && !isRemovedByOrganizer(app) && (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-gray-50">
                        <Info className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                        <span className="text-xs text-[#6B6B6B]">{cfg.message}</span>
                      </div>
                    )}

                    {/* Organizer info row */}
                    {org && !isWaitlisted(app) && app.status !== "cancelled" && app.status !== "rejected" && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        <span className="text-[10px] text-[#A1A1AA]">by</span>
                        <span className="text-xs text-[#6B6B6B] font-semibold truncate">{org.full_name}</span>
                        {org.is_trusted_organizer && <BadgeCheck className="w-3 h-3 text-[#0D9488] shrink-0" />}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>


    </div>
  );
}

export default function WorkerDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse mx-auto" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mx-auto" />
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
