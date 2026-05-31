"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LogOut, Plus, Copy, Edit3, Trash2, XCircle, Users, MapPin, Calendar,
  Clock, LayoutDashboard, User, AlertTriangle, CheckCircle, Clock3,
  BookTemplate, Bell, Search, IndianRupee, ChevronRight, ArrowUpRight,
  Hourglass
} from "lucide-react";
import { toast } from "sonner";
import type { Profile, Event, Application } from "@/lib/supabase/types";
import CreateEventModal from "./CreateEventModal";
import EditEventModal from "./EditEventModal";
import ApplicantList from "./ApplicantList";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-indigo-50 text-indigo-700",
  filling: "bg-emerald-100 text-emerald-700",
  full: "bg-purple-100 text-purple-700",
  closed: "bg-amber-100 text-amber-700",
  completed: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", published: "Published", filling: "Filling",
  full: "Full", closed: "Closed", completed: "Completed", cancelled: "Cancelled",
};

const CATEGORY_LABELS: Record<string, string> = {
  promotion: "Promotion", event_setup: "Setup", crowd_management: "Crowd Mgmt",
  registration: "Registration", hospitality: "Hospitality", cleaning: "Cleaning",
  security: "Security", other: "Other",
};

export default function OrganizerDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<(Event & {
    applicantCount?: number; approvedCount?: number; pendingCount?: number; waitlistCount?: number; rejectedCount?: number;
    recentProfiles?: { avatar_url: string | null; full_name: string }[];
  })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [createFromTemplate, setCreateFromTemplate] = useState<any>(null);
  const [tab, setTab] = useState<"active" | "past" | "templates">("active");
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => { try { const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (!prof || prof.role !== "organizer") { router.push("/login"); return; }
    setProfile(prof);

    const { data: evts } = await supabase
      .from("events").select("*").eq("organizer_id", user.id).order("created_at", { ascending: false });

    const eventsWithCounts = await Promise.all(
      (evts || []).map(async (event) => {
        const { data: allApps } = await supabase
          .from("applications").select("status, notes, worker_id").eq("event_id", event.id);
        const apps = allApps || [];
        const approved = apps.filter(a => a.status === "approved");
        const pending = apps.filter(a => a.status === "pending" && a.notes !== "waitlisted");
        const waitlisted = apps.filter(a => a.status === "pending" && a.notes === "waitlisted");
        const rejected = apps.filter(a => a.status === "rejected");

        let recentProfiles: { avatar_url: string | null; full_name: string }[] = [];
        if (pending.length > 0) {
          const recentPending = pending.slice(0, 3);
          const { data: p } = await supabase
            .from("profiles").select("avatar_url, full_name").in("user_id", recentPending.map(a => a.worker_id));
          recentProfiles = p || [];
        }

        return {
          ...event,
          applicantCount: apps.length,
          approvedCount: approved.length,
          pendingCount: pending.length,
          waitlistCount: waitlisted.length,
          rejectedCount: rejected.length,
          recentProfiles,
        };
      })
    );

    setEvents(eventsWithCounts);
     } catch (err) { console.error("[OrganizerDashboard] error:", err); } finally { setLoading(false); } };

  const updateEventStatus = async (eventId: string, status: string) => {
    const { error } = await supabase.from("events").update({ status, updated_at: new Date().toISOString() }).eq("id", eventId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Event ${STATUS_LABELS[status]?.toLowerCase() || status}`);
    setActionMenu(null);
    loadData();
  };

  const duplicateEvent = async (event: Event) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("events").insert({
      organizer_id: user.id, title: event.title,
      category: event.category, application_deadline: event.application_deadline,
      location: event.location, date: event.date, time: event.time, end_time: event.end_time,
      worker_count: event.worker_count, gender_requirement: event.gender_requirement,
      min_age: event.min_age, max_age: event.max_age,
      experience_required: event.experience_required, skill_requirements: event.skill_requirements,
      dress_code: event.dress_code, required_documents: event.required_documents,
      grooming_notes: event.grooming_notes, payment_info: event.payment_info,
      food_included: event.food_included, travel_included: event.travel_included,
      overtime_info: event.overtime_info, reporting_details: event.reporting_details,
      instructions: event.instructions, contact_person_notes: event.contact_person_notes,
      google_maps_link: event.google_maps_link, status: "draft",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Event duplicated (draft)");
    loadData();
  };

  const saveAsTemplate = async (event: Event) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const name = prompt("Template name:", event.title);
    if (!name) return;
    const { error } = await supabase.from("events").insert({
      organizer_id: user.id, title: event.title, category: event.category, location: event.location,
      worker_count: event.worker_count, gender_requirement: event.gender_requirement,
      min_age: event.min_age, max_age: event.max_age,
      experience_required: event.experience_required, skill_requirements: event.skill_requirements,
      dress_code: event.dress_code, required_documents: event.required_documents,
      grooming_notes: event.grooming_notes, payment_info: event.payment_info,
      food_included: event.food_included, travel_included: event.travel_included,
      overtime_info: event.overtime_info, reporting_details: event.reporting_details,
      instructions: event.instructions, contact_person_notes: event.contact_person_notes,
      google_maps_link: event.google_maps_link,
      is_template: true, template_name: name, status: "draft",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Template saved!");
    loadData();
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm("Delete permanently?")) return;
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) { toast.error(error.message); return; }
    toast.success("Event deleted");
    setActionMenu(null);
    loadData();
  };

  const signOut = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const todayStr = new Date().toISOString().split("T")[0];
  const pastCutoff = new Date(); pastCutoff.setDate(pastCutoff.getDate() - 1);
  const pastCutoffStr = pastCutoff.toISOString().split("T")[0];

  const activeEvents = events.filter(e =>
    !["completed", "cancelled"].includes(e.status) && !e.is_template && e.date >= pastCutoffStr
  );
  const pastEvents = events.filter(e =>
    (["completed", "cancelled"].includes(e.status) || e.date < pastCutoffStr) && !e.is_template
  );
  const templates = events.filter(e => e.is_template);
  const totalWorkersNeeded = activeEvents.reduce((s, e) => s + Math.max(0, e.worker_count - (e.approvedCount || 0)), 0);
  const totalPendingApprovals = activeEvents.reduce((s, e) => s + (e.pendingCount || 0), 0);

  const getUrgencyScore = (e: typeof activeEvents[number]): number => {
    let score = 0;
    if (e.date === todayStr) score += 100;
    else if (new Date(e.date).getTime() - Date.now() < 86400000 * 2 && new Date(e.date) > new Date()) score += 50;
    const remaining = e.worker_count - (e.approvedCount || 0);
    if (remaining <= 0) score += 0;
    else if (remaining <= 3) score += 40 - remaining * 10;
    if (e.application_deadline === todayStr) score += 80;
    else if (e.application_deadline && new Date(e.application_deadline).getTime() - Date.now() < 86400000 * 3 && new Date(e.application_deadline) > new Date()) score += 30;
    if ((e.pendingCount || 0) > 0) score += 20;
    return score;
  };

  const sortedActive = [...activeEvents].sort((a, b) => getUrgencyScore(b) - getUrgencyScore(a));

  const needsAttention = sortedActive.filter(e => {
    const remaining = e.worker_count - (e.approvedCount || 0);
    return (e.pendingCount || 0) > 0 || remaining <= 3 || e.date === todayStr || e.application_deadline === todayStr;
  });
  const seatsOpen = sortedActive.filter(e => {
    const remaining = e.worker_count - (e.approvedCount || 0);
    return remaining > 0 && !needsAttention.includes(e);
  });

  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 z-20">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-sm">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">EventMan</h1>
              <p className="text-[10px] text-gray-400 -mt-0.5">Organizer</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <Link href="/organizer/notifications" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors relative">
              <Bell className="w-4 h-4" />
            </Link>
            <Link href="/organizer/database" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <Search className="w-4 h-4" />
            </Link>
            <Link href="/organizer/profile" className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[11px] shadow-sm">
                {profile?.full_name?.charAt(0) || "O"}
              </div>
            </Link>
            <button onClick={signOut} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        {/* Welcome + Quick Stats */}
        {profile && (
          <div className="mb-4">
            <p className="text-sm text-gray-500">Good to see you, <span className="font-semibold text-gray-800">{profile.full_name?.split(" ")[0] || "there"}</span></p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200/70 shadow-black/[0.02]">
            <p className="text-2xl font-bold text-gray-900">{activeEvents.length}</p>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Active events</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200/70 shadow-black/[0.02]">
            <p className="text-2xl font-bold text-amber-600">{totalWorkersNeeded}</p>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Workers needed</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200/70 shadow-black/[0.02]">
            <p className="text-2xl font-bold text-indigo-700">{totalPendingApprovals}</p>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Pending approvals</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200/70 shadow-black/[0.02]">
            <p className="text-2xl font-bold text-red-600">{needsAttention.length}</p>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Needs attention</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setCreateFromTemplate(null); setShowCreate(true); }}
            className="flex-1 h-11 rounded-lg bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.97] transition-all duration-150 hover:bg-indigo-800">
            <Plus className="w-4 h-4" /> Create Event
          </button>
          {templates.length > 0 && (
            <button onClick={() => setTab("templates")}
              className={`h-11 px-4 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all ${
                tab === "templates" ? "bg-indigo-700 text-white border-indigo-700 shadow-sm" : "bg-white text-gray-700 border-gray-200/80 shadow-sm active:scale-[0.98]"
              }`}>
              <BookTemplate className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white/80 backdrop-blur-xl rounded-xl p-1 border border-gray-200/60 shadow-sm shadow-black/[0.02]">
          {(["active", "past"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 h-9 rounded-lg text-sm font-medium transition-all capitalize ${
                tab === t ? "bg-indigo-700 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}>
              {t} ({t === "active" ? activeEvents.length : pastEvents.length})
            </button>
          ))}
        </div>

        {/* Templates Tab */}
        {tab === "templates" && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-2">Click a template to create an event instantly.</p>
            {templates.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">No templates yet.</div>
            )}
            {templates.map(tmpl => (
              <div key={tmpl.id} className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-900 truncate">{tmpl.template_name || tmpl.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{tmpl.worker_count} workers Â· {CATEGORY_LABELS[tmpl.category || ""] || tmpl.category || "General"}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => { setCreateFromTemplate(tmpl); setShowCreate(true); }}
                    className="h-8 px-3 rounded-lg bg-indigo-700 text-white text-xs font-medium active:scale-95 transition-all">Use</button>
                  <button onClick={() => deleteEvent(tmpl.id)}
                    className="h-8 px-3 rounded-lg bg-red-50 text-red-600 text-xs active:scale-95 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
            <button onClick={() => setTab("active")} className="text-xs text-indigo-600 mt-1">&larr; Back to active</button>
          </div>
        )}

        {/* Active Tab */}
        {tab === "active" && (
          <div className="space-y-3">
            {sortedActive.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <LayoutDashboard className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">No active events</p>
                <button onClick={() => { setCreateFromTemplate(null); setShowCreate(true); }} className="mt-3 text-sm text-indigo-700 font-medium">Create your first event</button>
              </div>
            )}

            {sortedActive.map(event => {
              const remaining = event.worker_count - (event.approvedCount || 0);
              const fillPercent = Math.min(100, Math.round(((event.approvedCount || 0) / event.worker_count) * 100));
              const daysUntil = Math.ceil((new Date(event.date).getTime() - Date.now()) / 86400000);
              const isToday = event.date === todayStr;
              const isTomorrow = daysUntil === 1;
              const deadlineToday = event.application_deadline === todayStr;
              const deadlineMs = event.application_deadline ? new Date(event.application_deadline).getTime() - Date.now() : null;
              const deadlineSoon = deadlineMs !== null && deadlineMs > 0 && deadlineMs < 86400000 * 3;
              const deadlinePassed = event.application_deadline ? new Date(event.application_deadline).getTime() <= Date.now() : false;
              const isUrgent = isToday || isTomorrow || (remaining <= 3 && event.status !== "full");
              const hasDanger = isToday || deadlineToday;
              const hasWarnings = isTomorrow || deadlineSoon || remaining <= 3;
              const isFilling = event.status === "published" || event.status === "filling";
              const needsApproval = (event.pendingCount || 0) > 0;
              const isFull = event.status === "full";
              const hasWaitlisted = (event.waitlistCount || 0) > 0;

              return (
                <div key={event.id}
                  className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md ${
                    hasDanger ? "border-red-200/80" : hasWarnings ? "border-amber-200/80" : isFull ? "border-purple-200/80" : "border-gray-200/80"
                  }`}>

                  {/* Header */}
                  <div className="px-4 pt-3.5 pb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link href={`/organizer/events/${event.id}`} className="hover:text-indigo-700 transition-colors">
                        <h3 className="font-bold text-base leading-snug text-gray-900 truncate">{event.title}</h3>
                      </Link>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[event.status]}`}>
                          {STATUS_LABELS[event.status]}
                        </span>
                        {event.category && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                            {CATEGORY_LABELS[event.category] || event.category}
                          </span>
                        )}
                        {isToday && <span className="text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">Today</span>}
                        {isTomorrow && <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Tomorrow</span>}
                        {deadlineToday && <span className="text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">Deadline today</span>}
                        {isFull && <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">Full</span>}
                      </div>
                    </div>
                    {/* Action menu */}
                    <div className="relative shrink-0">
                      <button onClick={() => setActionMenu(actionMenu === event.id ? null : event.id)}
                        className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
                      </button>
                      {actionMenu === event.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
                          <div className="absolute right-0 top-9 w-44 bg-white rounded-xl border border-gray-200 shadow-xl z-20 py-1 overflow-hidden">
                            {isFilling && (
                              <button onClick={() => { setEditingEvent(event); setActionMenu(null); }}
                                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                                <Edit3 className="w-3.5 h-3.5" /> Edit Event
                              </button>
                            )}
                            <button onClick={() => { setSelectedEvent(event); setActionMenu(null); }}
                              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                              <Users className="w-3.5 h-3.5" /> View Applicants
                            </button>
                            <Link href={`/organizer/events/${event.id}`} onClick={() => setActionMenu(null)}
                              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                              <ArrowUpRight className="w-3.5 h-3.5" /> Open Detail
                            </Link>
                            <div className="h-px bg-gray-100 my-1" />
                            <button onClick={() => { duplicateEvent(event); setActionMenu(null); }}
                              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                              <Copy className="w-3.5 h-3.5" /> Duplicate
                            </button>
                            <button onClick={() => { saveAsTemplate(event); setActionMenu(null); }}
                              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                              <BookTemplate className="w-3.5 h-3.5" /> Save as Template
                            </button>
                            <div className="h-px bg-gray-100 my-1" />
                            {isFilling && (
                              <button onClick={() => { updateEventStatus(event.id, "closed"); }}
                                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-amber-700 hover:bg-amber-50 transition-colors">
                                <XCircle className="w-3.5 h-3.5" /> Close Event
                              </button>
                            )}
                            {isFilling && (
                              <button onClick={() => { updateEventStatus(event.id, "completed"); }}
                                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                                <CheckCircle className="w-3.5 h-3.5" /> Mark Completed
                              </button>
                            )}
                            <button onClick={() => { deleteEvent(event.id); }}
                              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Main operational section */}
                  <div className="px-4 py-2">
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                        <p className="text-xs text-gray-500">Approved</p>
                        <p className="text-lg font-bold text-gray-900">{event.approvedCount}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                        <p className="text-xs text-gray-500">Pending</p>
                        <p className={`text-lg font-bold ${needsApproval ? "text-amber-600" : "text-gray-900"}`}>{event.pendingCount}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                        <p className="text-xs text-gray-500">Remaining</p>
                        <p className={`text-lg font-bold ${remaining <= 3 && remaining > 0 ? "text-red-600" : remaining === 0 ? "text-gray-400" : "text-gray-900"}`}>
                          {remaining <= 0 ? "Full" : remaining}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-gray-600 font-medium">{event.approvedCount} of {event.worker_count} filled</span>
                        <span className={`font-medium ${fillPercent >= 100 ? "text-purple-600" : fillPercent >= 50 ? "text-emerald-600" : "text-gray-500"}`}>
                          {fillPercent}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${
                          fillPercent >= 100 ? "bg-purple-500" : fillPercent >= 80 ? "bg-emerald-500" : fillPercent >= 50 ? "bg-indigo-600" : "bg-amber-500"
                        }`} style={{ width: `${Math.max(4, fillPercent)}%` }} />
                      </div>
                    </div>

                    {/* Urgency & Operational alerts */}
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {needsApproval && (
                        <button onClick={() => setSelectedEvent(event)}
                          className="text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-indigo-100 transition-colors">
                          <Users className="w-3 h-3" /> {event.pendingCount} pending approval
                        </button>
                      )}
                      {remaining <= 3 && remaining > 0 && (
                        <span className="text-[10px] font-medium bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Only {remaining} seats left
                        </span>
                      )}
                      {deadlineSoon && !deadlineToday && (
                        <span className="text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <Hourglass className="w-3 h-3" /> Deadline closing
                        </span>
                      )}
                      {deadlineToday && (
                        <span className="text-[10px] font-medium bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <Clock3 className="w-3 h-3" /> Deadline today
                        </span>
                      )}
                      {event.status === "draft" && (
                        <button onClick={() => { setEditingEvent(event); }}
                          className="text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-indigo-100 transition-colors">
                          <Edit3 className="w-3 h-3" /> Publish draft
                        </button>
                      )}
                      {event.status === "published" && (
                        <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Published â€” accepting apps
                        </span>
                      )}
                      {deadlinePassed && (
                        <span className="text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Deadline passed
                        </span>
                      )}
                      {hasWaitlisted && (
                        <span className="text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <Users className="w-3 h-3" /> {event.waitlistCount} waitlisted
                        </span>
                      )}
                    </div>

                    {/* Event details row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-2.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{event.date_display || event.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{event.time}{event.end_time ? `-${event.end_time}` : ""}</span>
                      </div>
                      <div className="flex items-center gap-1 truncate max-w-[180px]">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                      {event.payment_info && (
                        <div className="flex items-center gap-1 text-emerald-600 font-medium">
                          <IndianRupee className="w-3.5 h-3.5" />
                          <span>{event.payment_info}</span>
                        </div>
                      )}
                    </div>

                    {/* Requirement chips */}
                    {(event.gender_requirement || event.min_age || event.max_age) && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {event.gender_requirement && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg capitalize">{event.gender_requirement}</span>
                        )}
                        {(event.min_age || event.max_age) && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{event.min_age || 0}-{event.max_age || 99} yrs</span>
                        )}
                        {event.food_included && <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-lg">Food</span>}
                        {event.travel_included && <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg">Travel</span>}
                        {event.dress_code && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{event.dress_code}</span>}
                      </div>
                    )}

                    {/* Applicant preview */}
                    {(event.recentProfiles && event.recentProfiles.length > 0) && (
                      <div className="flex items-center gap-2 py-1.5">
                        <div className="flex -space-x-1.5">
                          {event.recentProfiles.map((p, i) => (
                            <div key={i} className="w-6 h-6 rounded-full bg-slate-200 ring-2 ring-white flex items-center justify-center text-indigo-700 font-bold text-[9px]">
                              {p.avatar_url ? (
                                <img src={p.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                p.full_name?.charAt(0) || "W"
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] text-gray-500">{event.pendingCount} pending applicant{event.pendingCount !== 1 ? "s" : ""}</span>
                        <button onClick={() => { setSelectedEvent(event); }}
                          className="text-[10px] text-indigo-600 font-medium hover:underline ml-auto">
                          Review all â†’
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick action bar */}
                  {isFilling && (
                    <div className="px-4 py-2.5 border-t border-gray-100 flex gap-1.5 overflow-x-auto">
                      <button onClick={() => { setEditingEvent(event); }}
                        className="h-8 px-3 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-200 active:scale-95 transition-all shrink-0">
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => { setSelectedEvent(event); }}
                        className="h-8 px-3 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-200 active:scale-95 transition-all shrink-0">
                        <Users className="w-3.5 h-3.5" /> Applicants
                      </button>
                      <Link href={`/organizer/events/${event.id}`}
                        className="h-8 px-3 rounded-lg bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-indigo-800 active:scale-95 transition-all shrink-0">
                        Manage <ChevronRight className="w-3 h-3" />
                      </Link>
                      {needsApproval && (
                        <button onClick={() => { setSelectedEvent(event); }}
                          className="h-8 px-3 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium flex items-center gap-1.5 hover:bg-amber-100 active:scale-95 transition-all shrink-0">
                          <Hourglass className="w-3.5 h-3.5" /> Review
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Past Tab */}
        {tab === "past" && (
          <div className="space-y-3">
            {pastEvents.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <LayoutDashboard className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">No past events</p>
              </div>
            )}
            {pastEvents.map(event => (
              <div key={event.id}
                className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="px-4 pt-3.5 pb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link href={`/organizer/events/${event.id}`} className="hover:text-indigo-700 transition-colors">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">{event.title}</h3>
                    </Link>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[event.status]}`}>
                        {STATUS_LABELS[event.status]}
                      </span>
                      {event.category && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                          {CATEGORY_LABELS[event.category] || event.category}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{event.date_display || event.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{event.time}{event.end_time ? `-${event.end_time}` : ""}</span>
                      </div>
                      <div className="flex items-center gap-1 truncate max-w-[160px]">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                      {event.payment_info && (
                        <div className="flex items-center gap-1 text-emerald-600 font-medium">
                          <IndianRupee className="w-3 h-3" />
                          <span>{event.payment_info}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-2">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-gray-500">Applicants</p>
                      <p className="text-sm font-bold text-gray-900">{event.applicantCount || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-gray-500">Approved</p>
                      <p className="text-sm font-bold text-emerald-600">{event.approvedCount || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-gray-500">Pending</p>
                      <p className="text-sm font-bold text-amber-600">{event.pendingCount || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-2.5 border-t border-gray-100 flex gap-1.5 overflow-x-auto">
                  <button onClick={() => { setSelectedEvent(event); }}
                    className="h-8 px-3 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-200 active:scale-95 transition-all shrink-0">
                    <Users className="w-3.5 h-3.5" /> View Applicants
                  </button>
                  <Link href={`/organizer/events/${event.id}`}
                    className="h-8 px-3 rounded-lg bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-indigo-800 active:scale-95 transition-all shrink-0">
                    Details <ChevronRight className="w-3 h-3" />
                  </Link>
                  <button onClick={() => { duplicateEvent(event); }}
                    className="h-8 px-3 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-200 active:scale-95 transition-all shrink-0">
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateEventModal
          template={createFromTemplate}
          onClose={() => { setShowCreate(false); setCreateFromTemplate(null); }}
          onCreated={() => { setShowCreate(false); setCreateFromTemplate(null); loadData(); }}
        />
      )}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onUpdated={() => { setEditingEvent(null); loadData(); }}
        />
      )}
      {selectedEvent && (
        <ApplicantList
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}

