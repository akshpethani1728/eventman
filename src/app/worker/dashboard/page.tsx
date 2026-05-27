"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LogOut, MapPin, Calendar, Clock, Users, IndianRupee, Star, ShieldCheck,
  UtensilsCrossed, Car, Shirt, Timer, TrendingUp, Zap, CheckCircle,
  XCircle, Hourglass, ArrowUpRight, Clock3, Send, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import type { Profile, Event, Application } from "@/lib/supabase/types";

type ApplicationStatusDisplay = "pending" | "approved" | "rejected" | "cancelled";

const STATUS_CONFIG: Record<ApplicationStatusDisplay, { label: string; bg: string; text: string; icon: any; border: string }> = {
  pending:   { label: "Pending",   bg: "bg-amber-50", text: "text-amber-700", icon: Hourglass,  border: "border-amber-200" },
  approved:  { label: "Approved",  bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle, border: "border-emerald-200" },
  rejected:  { label: "Rejected",  bg: "bg-red-50", text: "text-red-700", icon: XCircle,  border: "border-red-200" },
  cancelled: { label: "Cancelled", bg: "bg-gray-50", text: "text-gray-500", icon: XCircle, border: "border-gray-200" },
};

const CATEGORY_LABELS: Record<string, string> = {
  promotion: "Promotion", event_setup: "Setup", crowd_management: "Crowd Mgmt",
  registration: "Registration", hospitality: "Hospitality", cleaning: "Cleaning",
  security: "Security", other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  promotion: "bg-blue-500/10 text-blue-600", event_setup: "bg-violet-500/10 text-violet-600",
  crowd_management: "bg-orange-500/10 text-orange-600", registration: "bg-emerald-500/10 text-emerald-600",
  hospitality: "bg-amber-500/10 text-amber-600", cleaning: "bg-cyan-500/10 text-cyan-600",
  security: "bg-red-500/10 text-red-600", other: "bg-gray-500/10 text-gray-600",
};

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const cls = size === "sm" ? "w-3.5 h-3.5" : "w-3 h-3";
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`${cls} ${rating >= s ? "fill-amber-400 text-amber-400" : rating >= s - 0.5 ? "fill-amber-200 text-amber-300" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return <span className="text-red-600 font-medium">Deadline passed</span>;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 7) return <span>{days} days left</span>;
  if (days > 0) return <span className="text-amber-600 font-medium">{days}d {hours}h left</span>;
  return <span className="text-red-600 font-medium">{hours}h left</span>;
}

export default function WorkerDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<(Event & {
    application?: Application;
    approved_count?: number;
    total_applications?: number;
    organizer?: Profile;
    organizer_rating?: number;
    organizer_past_events?: number;
  })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"browse" | "applied">("browse");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ appId: string; title: string; status: string; eventId: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (!prof || prof.role !== "worker") { router.push("/login"); return; }
    setProfile(prof);

    const { data: apps } = await supabase.from("applications").select("*").eq("worker_id", user.id);
    const appMap: Record<string, Application> = {};
    apps?.forEach((a: Application) => { appMap[a.event_id] = a; });

    const { data: evts } = await supabase
      .from("events").select("*").in("status", ["published", "filling"]).order("date", { ascending: true });

    if (!evts || evts.length === 0) { setEvents([]); setLoading(false); return; }

    const eventIds = evts.map(e => e.id);

    const { data: counts } = await supabase
      .from("applications").select("event_id, status").in("event_id", eventIds);
    const approvedMap: Record<string, number> = {};
    const totalMap: Record<string, number> = {};
    counts?.forEach((c: any) => {
      totalMap[c.event_id] = (totalMap[c.event_id] || 0) + 1;
      if (c.status === "approved") approvedMap[c.event_id] = (approvedMap[c.event_id] || 0) + 1;
    });

    const orgIds = [...new Set(evts.map(e => e.organizer_id))];
    const { data: orgProfiles } = await supabase.from("profiles").select("*").in("user_id", orgIds);
    const orgMap: Record<string, Profile> = {};
    orgProfiles?.forEach(p => { orgMap[p.user_id] = p; });

    const { data: reviews } = await supabase.from("reviews").select("to_id, rating").in("to_id", orgIds);
    const ratingSums: Record<string, { sum: number; count: number }> = {};
    reviews?.forEach(r => {
      if (!ratingSums[r.to_id]) ratingSums[r.to_id] = { sum: 0, count: 0 };
      ratingSums[r.to_id].sum += r.rating;
      ratingSums[r.to_id].count++;
    });
    const ratingMap: Record<string, number> = {};
    Object.entries(ratingSums).forEach(([id, v]) => { ratingMap[id] = Math.round((v.sum / v.count) * 10) / 10; });

    const { data: pastCounts } = await supabase
      .from("events").select("organizer_id").in("organizer_id", orgIds).in("status", ["completed", "cancelled"]);
    const pastCountMap: Record<string, number> = {};
    pastCounts?.forEach((e: any) => {
      pastCountMap[e.organizer_id] = (pastCountMap[e.organizer_id] || 0) + 1;
    });

    const enriched = evts.map(e => ({
      ...e,
      application: appMap[e.id] || undefined,
      approved_count: approvedMap[e.id] || 0,
      total_applications: totalMap[e.id] || 0,
      organizer: orgMap[e.organizer_id],
      organizer_rating: ratingMap[e.organizer_id] || 0,
      organizer_past_events: pastCountMap[e.organizer_id] || 0,
    }));

    setEvents(enriched);
    setLoading(false);
  };

  const apply = async (eventId: string) => {
    setApplyingId(eventId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setApplyingId(null); return; }
    const existing = events.find(e => e.id === eventId)?.application;
    if (existing && existing.status === "cancelled") {
      const { error } = await supabase.from("applications").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", existing.id);
      setApplyingId(null);
      if (error) { toast.error(error.message); return; }
      toast.success("Re-applied successfully!");
    } else {
      const { error } = await supabase.from("applications").insert({
        event_id: eventId, worker_id: user.id, status: "pending",
      });
      setApplyingId(null);
      if (error) { toast.error(error.message); return; }
      toast.success("Applied successfully!");
    }
    loadData();
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const ev = events.find(e => e.id === cancelTarget.eventId);
    if (!ev) return;
    setCancelling(true);
    setCancelTarget(null);
    const s = createClient();
    await s.from("applications").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", cancelTarget.appId);
    await s.from("notifications").insert({
      user_id: ev.organizer_id, title: "Application Cancelled",
      message: `A worker has cancelled their application for "${ev.title}".`,
    });
    if (ev.status === "full") {
      await s.from("events").update({ status: "published", updated_at: new Date().toISOString() }).eq("id", ev.id);
    }
    setCancelling(false);
    toast.success("Cancelled successfully");
    loadData();
  };

  const signOut = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const appliedIds = new Set(events.filter(e => e.application && e.application.status !== "cancelled").map(e => e.id));
  const allCategories = [...new Set(events.map(e => e.category).filter(Boolean))] as string[];
  let browseEvents = events.filter(e => !e.application || e.application.status === "cancelled");
  if (categoryFilter) browseEvents = browseEvents.filter(e => e.category === categoryFilter);
  const appliedEvents = events.filter(e => e.application && e.application.status !== "cancelled");

  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Finding events for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-2xl border-b border-gray-200/60 z-20">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">EventMan</h1>
              <p className="text-[10px] text-gray-400 -mt-0.5">Find work near you</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {profile && (
              <Link href="/worker/profile" className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-[11px] shadow-sm">
                  {profile.full_name?.charAt(0) || "W"}
                </div>
              </Link>
            )}
            <button onClick={signOut} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 pb-28">
        {/* Welcome banner */}
        {profile && tab === "browse" && browseEvents.length > 0 && (
          <div className="mb-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-lg shadow-blue-600/20">
            <p className="text-sm opacity-90">Hey <span className="font-semibold">{profile.full_name?.split(" ")[0] || "there"}</span></p>
            <p className="text-lg font-bold mt-0.5">{browseEvents.length} event{browseEvents.length !== 1 ? "s" : ""} available</p>
            <p className="text-xs opacity-75 mt-0.5">Find the perfect opportunity today</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 bg-white/80 backdrop-blur-xl rounded-2xl p-1 border border-gray-200/60 shadow-sm">
          <button onClick={() => setTab("browse")}
            className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all ${
              tab === "browse" ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-gray-500 hover:text-gray-800"
            }`}>
            Browse {browseEvents.length > 0 && `(${browseEvents.length})`}
          </button>
          <button onClick={() => setTab("applied")}
            className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all ${
              tab === "applied" ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-gray-500 hover:text-gray-800"
            }`}>
            Applied {appliedEvents.length > 0 && `(${appliedEvents.length})`}
          </button>
        </div>

        {/* Browse Events */}
        {tab === "browse" && (
          <>
            {/* Category filter */}
            {allCategories.length > 0 && (
              <div className="mb-3 overflow-x-auto -mx-4 px-4 scrollbar-none">
                <div className="flex gap-2 min-w-max pb-1">
                  <button onClick={() => setCategoryFilter("")}
                    className={`h-9 px-4 rounded-xl text-xs font-medium transition-all ${
                      !categoryFilter ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20" : "bg-white text-gray-600 border border-gray-200/80 hover:border-gray-300 shadow-sm"
                    }`}>All</button>
                  {allCategories.map(cat => (
                    <button key={cat} onClick={() => setCategoryFilter(cat)}
                      className={`h-9 px-4 rounded-xl text-xs font-medium capitalize transition-all whitespace-nowrap ${
                        categoryFilter === cat ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20" : "bg-white text-gray-600 border border-gray-200/80 hover:border-gray-300 shadow-sm"
                      }`}>{CATEGORY_LABELS[cat] || cat.replace(/_/g, " ")}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {browseEvents.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-base font-semibold text-gray-900">No events right now</p>
                <p className="text-sm text-gray-500 mt-1">Check back soon for new opportunities</p>
                {categoryFilter && (
                  <button onClick={() => setCategoryFilter("")} className="mt-4 h-10 px-5 rounded-xl bg-blue-600 text-white text-sm font-medium shadow-sm">
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Event Cards */}
            <div className="space-y-4">
              {browseEvents.map(event => {
                const remaining = event.worker_count - (event.approved_count || 0);
                const fillPercent = Math.min(100, Math.round(((event.approved_count || 0) / event.worker_count) * 100));
                const daysUntil = Math.ceil((new Date(event.date).getTime() - Date.now()) / 86400000);
                const isUrgent = daysUntil <= 2 && daysUntil > 0;
                const isToday = daysUntil === 0;
                const hoursUntilEvent = Math.round((new Date(event.date).getTime() - Date.now()) / 3600000);
                const isNew = new Date(event.created_at).getTime() > Date.now() - 86400000 * 2;
                const isPopular = (event.total_applications || 0) >= 5;
                const deadlineSoon = event.application_deadline && new Date(event.application_deadline).getTime() - Date.now() < 86400000 * 3 && new Date(event.application_deadline).getTime() > Date.now();
                const org = event.organizer;
                const orgRating = event.organizer_rating || 0;

                return (
                  <Link key={event.id} href={`/worker/events/${event.id}`}
                    className="block bg-white rounded-2xl border border-gray-200/70 overflow-hidden shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-200 active:scale-[0.99]">

                    {/* === TRUST BAR === */}
                    <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {org?.avatar_url ? (
                          <img src={org.avatar_url} alt="" className="w-8 h-8 rounded-xl object-cover ring-1 ring-gray-100 shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                            {org?.full_name?.charAt(0) || "O"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-gray-900 truncate">{org?.full_name || "Event Organizer"}</span>
                            {org?.is_trusted_organizer && (
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {orgRating > 0 && (
                              <div className="flex items-center gap-0.5">
                                <StarRating rating={orgRating} size="xs" />
                                <span className="text-[10px] text-gray-500">{orgRating}</span>
                              </div>
                            )}
                            {event.organizer_past_events && event.organizer_past_events > 0 && (
                              <span className="text-[10px] text-gray-400">{event.organizer_past_events} past event{event.organizer_past_events !== 1 ? "s" : ""}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {event.category && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg capitalize ${CATEGORY_COLORS[event.category] || "bg-gray-100 text-gray-600"}`}>
                            {CATEGORY_LABELS[event.category] || event.category}
                          </span>
                        )}
                        {isNew && (
                          <span className="text-[10px] font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-0.5 rounded-lg shadow-sm">
                            New
                          </span>
                        )}
                      </div>
                    </div>

                    {/* === MAIN CONTENT === */}
                    <div className="px-4 py-2">
                      {/* Urgency badges */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {isToday && (
                          <span className="text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <Timer className="w-3 h-3" /> Today
                          </span>
                        )}
                        {isUrgent && !isToday && (
                          <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <Clock3 className="w-3 h-3" /> {daysUntil === 1 ? "Tomorrow" : `${daysUntil} days`}
                          </span>
                        )}
                        {deadlineSoon && (
                          <span className="text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Deadline soon
                          </span>
                        )}
                        {isPopular && (
                          <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Popular
                          </span>
                        )}
                        {remaining <= 3 && (
                          <span className="text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <Users className="w-3 h-3" /> Only {remaining} left
                          </span>
                        )}
                      </div>

                      {/* Event title */}
                      <h3 className="font-bold text-base leading-snug text-gray-900 mb-2">{event.title}</h3>

                      {/* Payment — HERO */}
                      {event.payment_info && (
                        <div className="mb-2.5">
                          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/60 rounded-xl px-3 py-1.5">
                            <IndianRupee className="w-4 h-4 text-emerald-600" />
                            <span className="text-base font-bold text-emerald-700">{event.payment_info}</span>
                          </div>
                        </div>
                      )}

                      {/* Date / Time / Location */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                          <span className="font-medium">{event.date_display || new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                          <span className="text-gray-300">·</span>
                          <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                          <span>{event.time}{event.end_time ? `-${event.end_time}` : ""}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>

                      {/* Seats progress */}
                      <div className="mb-2.5">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <span className={`font-medium ${remaining === 0 ? "text-red-600" : remaining <= 3 ? "text-amber-600" : "text-gray-700"}`}>
                              {remaining} of {event.worker_count} remaining
                            </span>
                          </div>
                          <span className="text-gray-400">{fillPercent}% filled</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              fillPercent >= 80 ? "bg-red-500" : fillPercent >= 50 ? "bg-amber-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Requirement chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {event.gender_requirement && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg capitalize">{event.gender_requirement}</span>
                        )}
                        {(event.min_age || event.max_age) && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{event.min_age || 0}-{event.max_age || 99} yrs</span>
                        )}
                        {event.food_included && (
                          <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <UtensilsCrossed className="w-3 h-3" /> Food
                          </span>
                        )}
                        {event.travel_included && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <Car className="w-3 h-3" /> Travel
                          </span>
                        )}
                        {event.dress_code && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{event.dress_code}</span>
                        )}
                        {event.skill_requirements && event.skill_requirements.length > 0 && (
                          <span className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-lg">
                            {event.skill_requirements.slice(0, 2).join(", ")}{event.skill_requirements.length > 2 ? ` +${event.skill_requirements.length - 2}` : ""}
                          </span>
                        )}
                      </div>

                      {/* Application deadline countdown */}
                      {event.application_deadline && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-500">
                          <Clock className="w-3 h-3" />
                          Apply by {new Date(event.application_deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ·
                          <CountdownTimer targetDate={event.application_deadline} />
                        </div>
                      )}
                    </div>

                    {/* === DIVIDER === */}
                    <div className="h-px bg-gray-100 mx-4" />

                    {/* === CTA SECTION === */}
                    <div className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {event.total_applications && event.total_applications > 0 && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {formatCount(event.total_applications)} applicant{event.total_applications !== 1 ? "s" : ""}
                          </span>
                        )}
                        {hoursUntilEvent > 0 && hoursUntilEvent < 48 && !isToday && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock3 className="w-3 h-3" />
                            In {hoursUntilEvent}h
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); apply(event.id); }}
                        disabled={applyingId === event.id}
                        className={`h-10 px-5 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-60 ${
                          isUrgent
                            ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30"
                            : "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30"
                        }`}>
                        {applyingId === event.id ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            {event.application?.status === "cancelled" ? "Re-apply" : "Apply Now"} <ArrowUpRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Applied Events */}
        {tab === "applied" && appliedEvents.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-4">
              <Send className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-base font-semibold text-gray-900">No applications yet</p>
            <p className="text-sm text-gray-500 mt-1">Browse events and apply to get started</p>
            <button onClick={() => setTab("browse")} className="mt-4 h-10 px-6 rounded-xl bg-blue-600 text-white text-sm font-medium shadow-sm">
              Browse Events
            </button>
          </div>
        )}

        {tab === "applied" && appliedEvents.length > 0 && (
          <div className="space-y-3">
            {appliedEvents.map((event, idx) => {
              const app = event.application!;
              const cfg = STATUS_CONFIG[app.status as ApplicationStatusDisplay] || STATUS_CONFIG.pending;
              const StatusIcon = cfg.icon;
              const org = event.organizer;
              const hoursUntil = (new Date(event.date).getTime() - Date.now()) / 3600000;
              const canCancel = hoursUntil >= 12;
              const fillPercent = event.worker_count ? Math.min(100, Math.round(((event.approved_count || 0) / event.worker_count) * 100)) : 0;

              return (
                <Link key={event.id} href={`/worker/events/${event.id}`}
                  className="block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 active:scale-[0.99] animate-slide-up"
                  style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}>
                  {/* Premium status gradient bar */}
                  <div className={`h-2 ${app.status === "approved" ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" : "bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400"}`} />

                  <div className="p-4">
                    {/* Top row: org + title + badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {org?.avatar_url ? (
                          <img src={org.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover ring-2 ring-gray-100 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                            {org?.full_name?.charAt(0) || "E"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 truncate">{event.title}</h3>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm shrink-0 ${
                        app.status === "approved"
                          ? "bg-gradient-to-br from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200"
                          : "bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 border border-amber-200"
                      }`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </div>
                    </div>

                    {/* Payment & Schedule */}
                    <div className="flex items-center justify-between mb-2.5">
                      {event.payment_info && (
                        <div className="flex items-center gap-1 text-emerald-700 text-sm font-bold">
                          <IndianRupee className="w-3.5 h-3.5" />
                          {event.payment_info}
                        </div>
                      )}
                      <div className={`flex items-center gap-1 text-xs font-medium ${hoursUntil > 24 ? "text-gray-600" : "text-red-600"}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {hoursUntil > 72
                            ? `${Math.floor(hoursUntil / 24)} days away`
                            : hoursUntil > 24
                              ? `${Math.floor(hoursUntil / 24)}d ${Math.floor(hoursUntil % 24)}h away`
                              : hoursUntil > 12
                                ? `${Math.floor(hoursUntil)}h away`
                                : "< 12 hours"}
                        </span>
                      </div>
                    </div>

                    {/* Info chips row */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-50 text-[10px] text-gray-600">
                        <Calendar className="w-3 h-3" />
                        {event.date_display || event.date}
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-50 text-[10px] text-gray-600">
                        <span>{event.time}</span>
                      </div>
                      {event.category && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-50 text-[10px] text-gray-600 capitalize">
                          {CATEGORY_LABELS[event.category] || event.category}
                        </div>
                      )}
                    </div>

                    {/* Staffing progress */}
                    {event.worker_count > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-gray-500">Staffing progress</span>
                          <span className="font-medium text-gray-700">{event.approved_count || 0}/{event.worker_count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${
                            app.status === "approved"
                              ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                              : "bg-gradient-to-r from-amber-400 to-orange-400"
                          }`} style={{ width: `${fillPercent}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Organizer trust strip */}
                    {org && (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-100 mb-3">
                        <span className="text-[10px] text-gray-400 font-medium">by</span>
                        <span className="text-xs text-gray-700 font-semibold truncate">{org.full_name}</span>
                        {(event.organizer_rating ?? 0) > 0 && (
                          <div className="flex items-center gap-0.5 ml-auto">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="text-[10px] font-medium text-gray-600">{event.organizer_rating}</span>
                          </div>
                        )}
                        {org.is_trusted_organizer && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                      </div>
                    )}

                    {/* Cancel section */}
                    {(app.status === "pending" || app.status === "approved") && (
                      <div className="pt-3 border-t border-gray-100">
                        {canCancel ? (
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCancelTarget({ appId: app.id, title: event.title, status: app.status, eventId: event.id }); }}
                            className="w-full h-10 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-center gap-2 hover:from-red-100 hover:to-rose-100 active:scale-[0.98] transition-all duration-200 shadow-sm">
                            <XCircle className="w-4 h-4" />
                            Cancel {app.status === "approved" ? "Participation" : "Application"}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-[10px] text-gray-500 leading-tight">
                              {hoursUntil < 0
                                ? "Event has already started"
                                : "Cancellation unavailable within 12 hours of reporting time"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setCancelTarget(null)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Cancel Application?</h3>
              <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
                Withdraw from <span className="font-medium text-gray-700">&ldquo;{cancelTarget.title}&rdquo;</span>?
              </p>
              <p className="text-xs text-gray-400 mt-2">Releasing your slot for other workers.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCancelTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Keep application
              </button>
              <button onClick={confirmCancel} disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {cancelling ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Cancelling</>
                ) : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
