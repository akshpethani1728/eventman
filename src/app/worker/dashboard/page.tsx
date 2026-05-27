"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LogOut, MapPin, Calendar, Clock, Users, IndianRupee, User, Star, ShieldCheck, UtensilsCrossed, Car, Shirt, Timer, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { Profile, Event, Application } from "@/lib/supabase/types";

const CATEGORY_THEMES: Record<string, { gradient: string; bg: string; text: string; light: string }> = {
  promotion:      { gradient: "from-blue-600 to-blue-400", bg: "bg-blue-50", text: "text-blue-700", light: "bg-blue-100" },
  event_setup:   { gradient: "from-violet-600 to-purple-400", bg: "bg-purple-50", text: "text-purple-700", light: "bg-purple-100" },
  crowd_management: { gradient: "from-orange-600 to-amber-400", bg: "bg-orange-50", text: "text-orange-700", light: "bg-orange-100" },
  registration:  { gradient: "from-emerald-600 to-green-400", bg: "bg-green-50", text: "text-green-700", light: "bg-green-100" },
  hospitality:   { gradient: "from-amber-600 to-yellow-400", bg: "bg-amber-50", text: "text-amber-700", light: "bg-amber-100" },
  cleaning:      { gradient: "from-cyan-600 to-teal-400", bg: "bg-cyan-50", text: "text-cyan-700", light: "bg-cyan-100" },
  security:      { gradient: "from-red-600 to-rose-400", bg: "bg-red-50", text: "text-red-700", light: "bg-red-100" },
  other:         { gradient: "from-gray-600 to-gray-400", bg: "bg-gray-50", text: "text-gray-700", light: "bg-gray-100" },
};

const DEFAULT_THEME = CATEGORY_THEMES["other"];

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const cls = size === "sm" ? "w-3.5 h-3.5" : "w-3 h-3";
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`${cls} ${rating >= s ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
      ))}
    </div>
  );
}

type ApplicationStatusDisplay = "pending" | "approved" | "rejected" | "cancelled";

function StatusBadge({ status }: { status: ApplicationStatusDisplay }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

export default function WorkerDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<(Event & { application?: Application; approved_count?: number; organizer?: Profile; organizer_rating?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"browse" | "applied">("browse");
  const [categoryFilter, setCategoryFilter] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: prof } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).single();
    if (!prof || prof.role !== "worker") { router.push("/login"); return; }
    setProfile(prof);

    const { data: apps } = await supabase
      .from("applications").select("event_id, status, id, notes, created_at, updated_at").eq("worker_id", user.id);
    const appMap: Record<string, any> = {};
    apps?.forEach((a: any) => { appMap[a.event_id] = a; });

    const { data: evts } = await supabase
      .from("events").select("*").in("status", ["published", "filling"]).order("date", { ascending: true });

    if (!evts || evts.length === 0) { setEvents([]); setLoading(false); return; }

    const { data: counts } = await supabase
      .from("applications").select("event_id, status").in("event_id", evts.map(e => e.id)).eq("status", "approved");
    const countMap: Record<string, number> = {};
    counts?.forEach((c: any) => { countMap[c.event_id] = (countMap[c.event_id] || 0) + 1; });

    const orgIds = [...new Set(evts.map(e => e.organizer_id))];
    const { data: orgProfiles } = await supabase
      .from("profiles").select("*").in("user_id", orgIds);
    const orgMap: Record<string, Profile> = {};
    orgProfiles?.forEach(p => { orgMap[p.user_id] = p; });

    const { data: reviews } = await supabase
      .from("reviews").select("to_id, rating").in("to_id", orgIds);
    const ratingSums: Record<string, { sum: number; count: number }> = {};
    reviews?.forEach(r => {
      if (!ratingSums[r.to_id]) ratingSums[r.to_id] = { sum: 0, count: 0 };
      ratingSums[r.to_id].sum += r.rating;
      ratingSums[r.to_id].count++;
    });
    const ratingMap: Record<string, number> = {};
    Object.entries(ratingSums).forEach(([id, v]) => { ratingMap[id] = Math.round((v.sum / v.count) * 10) / 10; });

    const enriched = evts.map(e => ({
      ...e,
      application: appMap[e.id] || undefined,
      approved_count: countMap[e.id] || 0,
      organizer: orgMap[e.organizer_id],
      organizer_rating: ratingMap[e.organizer_id] || 0,
    }));

    setEvents(enriched);
    setLoading(false);
  };

  const apply = async (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("applications").insert({
      event_id: eventId, worker_id: user.id, status: "pending",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Applied successfully!");
    loadData();
  };

  const signOut = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const appliedIds = new Set(events.filter(e => e.application).map(e => e.id));
  const allCategories = [...new Set(events.map(e => e.category).filter(Boolean))] as string[];
  let browseEvents = events.filter(e => !appliedIds.has(e.id));
  if (categoryFilter) browseEvents = browseEvents.filter(e => e.category === categoryFilter);
  const appliedEvents = events.filter(e => appliedIds.has(e.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-gray-200/80 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-lg">
            <span className="text-blue-600">Event</span>Man
          </h1>
          <div className="flex items-center gap-1">
            {profile && (
              <Link href="/worker/profile" className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                  {profile.full_name?.charAt(0) || "W"}
                </div>
              </Link>
            )}
            <button onClick={signOut} className="p-2 text-gray-500 hover:text-gray-900"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 pb-24">
        {/* Welcome */}
        {profile && tab === "browse" && (
          <div className="mb-4">
            <p className="text-sm text-gray-500">Hello, <span className="font-semibold text-gray-800">{profile.full_name?.split(" ")[0] || "there"}</span></p>
            <p className="text-xs text-gray-400 mt-0.5">{browseEvents.length} event{browseEvents.length !== 1 ? "s" : ""} available for you</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 bg-white rounded-xl p-1 border border-gray-200/80">
          <button onClick={() => setTab("browse")}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${
              tab === "browse" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}>
            Browse {browseEvents.length > 0 && `(${browseEvents.length})`}
          </button>
          <button onClick={() => setTab("applied")}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${
              tab === "applied" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}>
            Applied {appliedEvents.length > 0 && `(${appliedEvents.length})`}
          </button>
        </div>

        {/* Browse Events */}
        {tab === "browse" && (
          <>
            {/* Category filter */}
            {allCategories.length > 0 && (
              <div className="mb-3 overflow-x-auto -mx-4 px-4">
                <div className="flex gap-2 min-w-max pb-1">
                  <button onClick={() => setCategoryFilter("")}
                    className={`h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                      !categoryFilter ? "bg-blue-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                    }`}>All</button>
                  {allCategories.map(cat => (
                    <button key={cat} onClick={() => setCategoryFilter(cat)}
                      className={`h-8 px-3 rounded-full text-xs font-medium capitalize transition-colors ${
                        categoryFilter === cat ? "bg-blue-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                      }`}>{cat.replace(/_/g, " ")}</button>
                  ))}
                </div>
              </div>
            )}

            {browseEvents.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-base font-medium text-gray-900">No events right now</p>
                <p className="text-sm text-gray-500 mt-1">Check back later for new opportunities</p>
              </div>
            )}

            {browseEvents.map(event => {
              const remaining = event.worker_count - (event.approved_count || 0);
              const fillPercent = Math.min(100, Math.round(((event.approved_count || 0) / event.worker_count) * 100));
              const theme = CATEGORY_THEMES[event.category || "other"] || DEFAULT_THEME;
              const daysUntil = Math.ceil((new Date(event.date).getTime() - Date.now()) / 86400000);
              const isUrgent = daysUntil <= 2 && daysUntil > 0;
              const isDeadlineSoon = event.application_deadline && new Date(event.application_deadline).getTime() - Date.now() < 86400000 * 3 && new Date(event.application_deadline) > new Date();

              return (
                <Link key={event.id} href={`/worker/events/${event.id}`}
                  className="block bg-white rounded-2xl border border-gray-200/80 overflow-hidden mb-4 hover:shadow-lg hover:border-gray-300 transition-all duration-200 active:scale-[0.98]">

                  {/* Color accent strip */}
                  <div className={`h-1.5 bg-gradient-to-r ${theme.gradient}`} />

                  <div className="p-4 space-y-3">
                    {/* Urgency badge */}
                    {isUrgent && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full w-fit">
                        <Timer className="w-3 h-3" /> {daysUntil === 0 ? "Happening today!" : daysUntil === 1 ? "Tomorrow!" : "In 2 days"}
                      </div>
                    )}

                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base leading-snug text-gray-900">{event.title}</h3>
                        {event.category && (
                          <span className={`text-[10px] font-medium ${theme.text} ${theme.light} px-2 py-0.5 rounded-full capitalize mt-1.5 inline-block`}>
                            {event.category.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Payment - prominent */}
                    {event.payment_info && (
                      <div className="flex items-center gap-1.5">
                        <IndianRupee className="w-4 h-4 text-emerald-600" />
                        <span className="text-lg font-bold text-emerald-700">{event.payment_info}</span>
                      </div>
                    )}

                    {/* Date/Time/Location row */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <span>{event.date_display || event.date}</span>
                        <span className="text-gray-300">·</span>
                        <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <span>{event.time}{event.end_time ? `-${event.end_time}` : ""}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>

                    {/* Progress bar - seats */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className={`font-medium ${remaining === 0 ? "text-red-600" : remaining <= 3 ? "text-amber-600" : "text-gray-700"}`}>
                            {remaining} of {event.worker_count} left
                          </span>
                        </div>
                        <span className="text-gray-400">{fillPercent}% filled</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${theme.gradient}`}
                          style={{ width: `${fillPercent}%` }} />
                      </div>
                    </div>

                    {/* Perks row */}
                    {(event.food_included || event.travel_included || event.dress_code || event.skill_requirements) && (
                      <div className="flex flex-wrap gap-1.5">
                        {event.food_included && <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1"><UtensilsCrossed className="w-3 h-3" />Food</span>}
                        {event.travel_included && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Car className="w-3 h-3" />Travel</span>}
                        {event.dress_code && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1"><Shirt className="w-3 h-3" />{event.dress_code}</span>}
                        {event.skill_requirements && event.skill_requirements.length > 0 && (
                          <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{event.skill_requirements.length} skill{event.skill_requirements.length > 1 ? "s" : ""} needed</span>
                        )}
                      </div>
                    )}

                    {/* Organizer trust strip */}
                    {event.organizer && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                        <div className="flex items-center gap-2 min-w-0">
                          {event.organizer.avatar_url ? (
                            <img src={event.organizer.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover ring-1 ring-gray-200" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-[10px]">
                              {event.organizer.full_name?.charAt(0) || "O"}
                            </div>
                          )}
                          <span className="text-xs text-gray-600 truncate">{event.organizer.full_name}</span>
                          {event.organizer.is_trusted_organizer && (
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          )}
                        </div>
                        {(event.organizer_rating || 0) > 0 && (
                          <div className="flex items-center gap-1">
                            <StarRating rating={event.organizer_rating || 0} size="xs" />
                            <span className="text-[10px] text-gray-400">{event.organizer_rating || ""}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Apply Button */}
                    <button onClick={(e) => apply(e, event.id)}
                      className={`w-full h-11 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] ${
                        isUrgent
                          ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md hover:shadow-lg"
                          : "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm hover:shadow-md"
                      }`}>
                      {isUrgent ? "Apply Now — Hurry!" : "Apply Now"}
                      <Users className="w-4 h-4" />
                    </button>
                  </div>
                </Link>
              );
            })}
          </>
        )}

        {/* Applied Events */}
        {tab === "applied" && appliedEvents.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-base font-medium text-gray-900">No applications yet</p>
            <p className="text-sm text-gray-500 mt-1">Browse events and apply to get started</p>
            <button onClick={() => setTab("browse")} className="mt-4 h-10 px-6 rounded-xl bg-blue-600 text-white text-sm font-medium active:bg-blue-700">
              Browse Events
            </button>
          </div>
        )}

        {tab === "applied" && appliedEvents.map(event => {
          const theme = CATEGORY_THEMES[event.category || "other"] || DEFAULT_THEME;
          return (
            <Link key={event.id} href={`/worker/events/${event.id}`}
              className="block bg-white rounded-2xl border border-gray-200/80 overflow-hidden mb-3 hover:shadow-md transition-all duration-200 active:scale-[0.98]">
              <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-gray-900">{event.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5">
                      <Calendar className="w-3 h-3 shrink-0 text-gray-400" />
                      <span>{event.date_display || event.date}</span>
                      <span className="text-gray-300">·</span>
                      <Clock className="w-3 h-3 shrink-0 text-gray-400" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  </div>
                  <StatusBadge status={event.application!.status as ApplicationStatusDisplay} />
                </div>
                {event.organizer && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400">by</span>
                    <span className="text-xs text-gray-600 truncate">{event.organizer.full_name}</span>
                    {event.organizer.is_trusted_organizer && <ShieldCheck className="w-3 h-3 text-blue-500" />}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </main>
    </div>
  );
}
