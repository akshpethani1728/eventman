"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LogOut, Plus, Copy, Edit3, Trash2, XCircle, Users, Calendar,
  Clock, CheckCircle,
  BookTemplate, Bell, Search, IndianRupee, ChevronRight,
  Sparkles, Eye, MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import type { Profile, Event } from "@/lib/supabase/types";
import { ConfirmDialog } from "@/lib/design/Modal";
import { STATUS_STYLES, STATUS_LABELS, CATEGORY_LABELS, formatDate } from "@/lib/organizer/constants";
import CreateEventModal from "./CreateEventModal";
import EditEventModal from "./EditEventModal";
import ApplicantList from "./ApplicantList";

function SkeletonDashboard() {
  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-20">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-gray-100 animate-pulse" />
            <div className="space-y-1.5"><div className="w-28 h-3 bg-gray-100 rounded-full animate-pulse" /><div className="w-20 h-2 bg-gray-50 rounded-full animate-pulse" /></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
            <div className="w-8 h-8 rounded-[10px] bg-gray-100 animate-pulse" />
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <div className="w-full h-[180px] rounded-[20px] bg-gradient-to-br from-gray-100 to-gray-50 animate-pulse" />
        <div className="w-full h-12 rounded-[14px] bg-gray-100 animate-pulse" />
        <div className="w-full h-12 rounded-[14px] bg-gray-100 animate-pulse" />
        <div className="w-full h-12 rounded-[14px] bg-gray-100 animate-pulse" />
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, color, attention }: {
  icon: any; value: number | string; label: string; color: string; attention?: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string; dot: string; iconBg: string }> = {
    teal: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", iconBg: "bg-emerald-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", iconBg: "bg-amber-100" },
    red: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", iconBg: "bg-red-100" },
    purple: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", iconBg: "bg-purple-100" },
    blue: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", iconBg: "bg-blue-100" },
  };
  const c = colorMap[color] || colorMap.teal;
  return (
    <div className={`bg-white rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 active:scale-[0.98] ${attention ? "ring-2 ring-red-200/60" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-[12px] ${c.iconBg} flex items-center justify-center`}>
          <Icon className={`w-[18px] h-[18px] ${c.text}`} />
        </div>
        {attention && <span className={`w-2 h-2 rounded-full ${c.dot} animate-pulse`} />}
      </div>
      <p className={`text-2xl font-bold ${c.text} leading-none`}>{value}</p>
      <p className="text-[11px] text-gray-400 font-medium mt-1.5">{label}</p>
    </div>
  );
}

const PAGE_SIZE = 20;

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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async () => { try { const { data: { user } } = await supabase.auth.getUser();
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
     } catch (err) { console.error("[OrganizerDashboard] error:", err); } finally { setLoading(false); } }, []);

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
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) { toast.error(error.message); return; }
    toast.success("Event deleted");
    setActionMenu(null);
    setDeleteConfirm(null);
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
  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const visibleEvents = sortedActive.slice(0, visibleCount);
  const hasMore = visibleCount < sortedActive.length;

  if (loading) return <SkeletonDashboard />;

  return (
    <div className="min-h-screen bg-[#F8F8F6] pb-28">
      <header className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-[rgba(0,0,0,0.04)] z-20">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[#0D9488] to-[#0F766E] flex items-center justify-center shadow-[0_2px_6px_rgba(13,148,136,0.2)]">
              <span className="text-white text-[11px] font-black tracking-tight">E</span>
            </div>
            <span className="text-[13px] font-bold text-gray-900 tracking-tight">EventMan</span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/organizer/database" aria-label="Search talent" className="w-8 h-8 rounded-[10px] flex items-center justify-center text-gray-400 hover:text-[#0D9488] hover:bg-[#0D9488]/10 transition-all active:scale-90">
              <Search className="w-[16px] h-[16px]" />
            </Link>
            <Link href="/organizer/notifications" aria-label="Notifications" className="relative w-8 h-8 rounded-[10px] flex items-center justify-center text-gray-400 hover:text-[#0D9488] hover:bg-[#0D9488]/10 transition-all active:scale-90">
              <Bell className="w-[16px] h-[16px]" />
            </Link>
            <Link href="/organizer/profile" className="ml-0.5">
              <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[#0D9488] to-[#0F766E] flex items-center justify-center text-white font-bold text-[10px] shadow-[0_2px_6px_rgba(13,148,136,0.2)]">
                {profile?.full_name?.charAt(0) || "O"}
              </div>
            </Link>
            <button onClick={signOut} aria-label="Sign out" className="w-8 h-8 rounded-[10px] flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90">
              <LogOut className="w-[16px] h-[16px]" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        <div className="bg-gradient-to-r from-[#0D9488] to-[#0F766E] rounded-[16px] px-4 py-3.5 mb-4 shadow-[0_4px_16px_rgba(13,148,136,0.2)]">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-white text-[11px] font-semibold uppercase tracking-[0.08em]">Command Center</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.5)]" />
              <span className="text-emerald-200 text-[9px] font-medium">Live</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white/10 rounded-[12px] px-2.5 py-2 text-center backdrop-blur-sm">
              <p className="text-white text-base font-bold leading-none">{activeEvents.length}</p>
              <p className="text-white/60 text-[8px] font-semibold mt-1 uppercase tracking-wider">Active</p>
            </div>
            <div className="bg-white/10 rounded-[12px] px-2.5 py-2 text-center backdrop-blur-sm">
              <p className="text-white text-base font-bold leading-none">{totalPendingApprovals}</p>
              <p className="text-white/60 text-[8px] font-semibold mt-1 uppercase tracking-wider">Pending</p>
            </div>
            <div className="bg-white/10 rounded-[12px] px-2.5 py-2 text-center backdrop-blur-sm">
              <p className="text-white text-base font-bold leading-none">{needsAttention.length}</p>
              <p className="text-white/60 text-[8px] font-semibold mt-1 uppercase tracking-wider">Urgent</p>
            </div>
            <div className="bg-white/10 rounded-[12px] px-2.5 py-2 text-center backdrop-blur-sm">
              <p className="text-white text-base font-bold leading-none">
                {activeEvents.length > 0
                  ? Math.round(activeEvents.reduce((s, e) => s + (e.approvedCount || 0), 0) / Math.max(1, activeEvents.reduce((s, e) => s + e.worker_count, 0)) * 100)
                  : 0}%
              </p>
              <p className="text-white/60 text-[8px] font-semibold mt-1 uppercase tracking-wider">Filled</p>
            </div>
          </div>
        </div>

        <button onClick={() => { setCreateFromTemplate(null); setShowCreate(true); }}
          className="w-full h-14 mb-5 rounded-[16px] bg-gradient-to-r from-[#0D9488] to-[#0F766E] text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-[0_4px_16px_rgba(13,148,136,0.3)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(13,148,136,0.4)] active:scale-[0.98]">
          <Plus className="w-5 h-5" /> Create New Event
        </button>

        <div className="flex gap-2 mb-5">
          {(["active", "past"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setVisibleCount(PAGE_SIZE); }}
              className={`flex-1 h-10 rounded-[12px] text-sm font-semibold transition-all active:scale-[0.97] ${
                tab === t
                  ? "bg-[#0D9488] text-white shadow-[0_4px_12px_rgba(13,148,136,0.25)]"
                  : "bg-white text-gray-500 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:text-gray-800"
              }`}>
              {t === "active" ? "Active" : "Past"} ({t === "active" ? activeEvents.length : pastEvents.length})
            </button>
          ))}
          {templates.length > 0 && (
            <button onClick={() => setTab("templates")}
              className={`h-10 px-4 rounded-[12px] text-sm font-semibold transition-all active:scale-[0.97] ${
                tab === "templates"
                  ? "bg-[#0D9488] text-white shadow-[0_4px_12px_rgba(13,148,136,0.25)]"
                  : "bg-white text-gray-500 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:text-gray-800"
              }`}>
              <BookTemplate className="w-4 h-4" />
            </button>
          )}
        </div>

        {tab === "templates" && (
          <div className="space-y-2 animate-fade-in">
            <p className="text-xs text-gray-500 mb-3">Click a template to create a new event instantly.</p>
            {templates.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-4">
                  <BookTemplate className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-lg font-bold text-gray-900">No templates</p>
                <p className="text-sm text-gray-500 mt-1.5 max-w-xs mx-auto leading-relaxed">Save an event as a template from the action menu to reuse it later.</p>
              </div>
            )}
            {templates.map(tmpl => (
              <div key={tmpl.id} className="bg-white rounded-[14px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-between gap-3 transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-900 truncate">{tmpl.template_name || tmpl.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{tmpl.worker_count} workers · {CATEGORY_LABELS[tmpl.category || ""] || tmpl.category || "General"}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => { setCreateFromTemplate(tmpl); setShowCreate(true); }}
                    className="h-8 px-4 rounded-[10px] bg-[#0D9488] text-white text-xs font-semibold hover:bg-teal-700 transition-all active:scale-95">Use</button>
                  <button onClick={() => setDeleteConfirm(tmpl.id)}
                    className="h-8 w-8 rounded-[10px] bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-all active:scale-90"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
            <button onClick={() => setTab("active")} className="text-xs text-[#0D9488] font-medium hover:text-[#0F766E] transition-colors active:scale-[0.97]">← Back to active</button>
          </div>
        )}

        {tab === "active" && (
          <div className="space-y-3">
            {sortedActive.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-[#0D9488]" />
                </div>
                <p className="text-lg font-bold text-gray-900">No active events</p>
                <p className="text-sm text-gray-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  Your first event is the beginning of great operations. Create one to start receiving applications.
                </p>
                <button onClick={() => { setCreateFromTemplate(null); setShowCreate(true); }}
                  className="mt-6 h-11 px-6 rounded-[14px] bg-[#0D9488] text-white text-sm font-semibold hover:bg-teal-700 transition-all active:scale-[0.97] shadow-[0_4px_12px_rgba(13,148,136,0.25)]">
                  <Plus className="w-4 h-4" /> Create Event
                </button>
              </div>
            )}

            {visibleEvents.map(event => {
              const remaining = event.worker_count - (event.approvedCount || 0);
              const fillPercent = Math.min(100, Math.round(((event.approvedCount || 0) / event.worker_count) * 100));
              const daysUntil = Math.ceil((new Date(event.date).getTime() - Date.now()) / 86400000);
              const isToday = event.date === todayStr;
              const isTomorrow = daysUntil === 1;
              const deadlineToday = event.application_deadline === todayStr;
              const deadlineMs = event.application_deadline ? new Date(event.application_deadline).getTime() - Date.now() : null;
              const deadlineSoon = deadlineMs !== null && deadlineMs > 0 && deadlineMs < 86400000 * 3;
              const needsApproval = (event.pendingCount || 0) > 0;
              const isFull = event.status === "full";

              return (
                <div key={event.id}
                  className="bg-white rounded-[16px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] active:scale-[0.99]">
                  
                  <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link href={`/organizer/events/${event.id}`} className="block active:scale-[0.99] transition-all">
                        <h3 className="font-bold text-[15px] text-gray-900 leading-snug hover:text-[#0D9488] transition-colors">{event.title}</h3>
                      </Link>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[event.status]}`}>
                          {STATUS_LABELS[event.status]}
                        </span>
                        {event.category && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                            {CATEGORY_LABELS[event.category] || event.category}
                          </span>
                        )}
                        {isToday && <span className="text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" />Today</span>}
                        {isTomorrow && <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Tomorrow</span>}
                        {isFull && <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">Full</span>}
                      </div>
                    </div>
                    <div className="relative shrink-0">
                      <button onClick={() => setActionMenu(actionMenu === event.id ? null : event.id)}
                        className="w-8 h-8 rounded-[10px] hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-all active:scale-90" aria-label="Event actions" aria-haspopup="true">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {actionMenu === event.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
                          <div className="absolute right-0 top-9 w-48 bg-white rounded-[12px] shadow-[0_12px_48px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)] z-20 py-1.5 overflow-hidden animate-scale-in" role="menu">
                            <div className="px-3 pb-1.5 mb-1 border-b border-[rgba(0,0,0,0.06)]">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Actions</p>
                            </div>
                            {["draft", "published", "filling"].includes(event.status) && (
                              <button onClick={() => { setEditingEvent(event); setActionMenu(null); }} role="menuitem"
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all rounded-[10px] active:scale-[0.97]">
                                <Edit3 className="w-3.5 h-3.5" /> Edit Event
                              </button>
                            )}
                            <button onClick={() => { setSelectedEvent(event); setActionMenu(null); }} role="menuitem"
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all rounded-[10px] active:scale-[0.97]">
                              <Users className="w-3.5 h-3.5" /> View Applicants
                            </button>
                            <Link href={`/organizer/events/${event.id}`} onClick={() => setActionMenu(null)} role="menuitem"
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all rounded-[10px] active:scale-[0.97]">
                              <Eye className="w-3.5 h-3.5" /> Open Detail
                            </Link>
                            <div className="h-px bg-[rgba(0,0,0,0.06)] my-1 mx-3" />
                            <button onClick={() => { duplicateEvent(event); setActionMenu(null); }} role="menuitem"
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all rounded-[10px] active:scale-[0.97]">
                              <Copy className="w-3.5 h-3.5" /> Duplicate
                            </button>
                            <button onClick={() => { saveAsTemplate(event); setActionMenu(null); }} role="menuitem"
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all rounded-[10px] active:scale-[0.97]">
                              <BookTemplate className="w-3.5 h-3.5" /> Save as Template
                            </button>
                            <div className="h-px bg-[rgba(0,0,0,0.06)] my-1 mx-3" />
                            {["draft", "published", "filling"].includes(event.status) && (
                              <button onClick={() => { updateEventStatus(event.id, "closed"); }} role="menuitem"
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-amber-700 hover:bg-amber-50 transition-all rounded-[10px] active:scale-[0.97]">
                                <XCircle className="w-3.5 h-3.5" /> Close Event
                              </button>
                            )}
                            {["draft", "published", "filling"].includes(event.status) && (
                              <button onClick={() => { updateEventStatus(event.id, "completed"); }} role="menuitem"
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-all rounded-[10px] active:scale-[0.97]">
                                <CheckCircle className="w-3.5 h-3.5" /> Mark Completed
                              </button>
                            )}
                            <button onClick={() => { setActionMenu(null); setDeleteConfirm(event.id); }} role="menuitem"
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-all rounded-[10px] active:scale-[0.97]">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="px-4 flex items-center gap-3 text-[13px]">
                    {event.payment_info && (
                      <div className="flex items-center gap-1 text-emerald-700 font-bold">
                        <IndianRupee className="w-4 h-4" />
                        <span>{event.payment_info}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-gray-500 text-[11px] ml-auto">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span>{formatDate(event.date, event.date_display)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-[11px]">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{event.time}{event.end_time ? `-${event.end_time}` : ""}</span>
                    </div>
                  </div>

                  <div className="px-4 mt-3 grid grid-cols-4 gap-2">
                    <div className="bg-emerald-50 rounded-[10px] p-2.5 text-center">
                      <p className="text-sm font-bold text-emerald-700 leading-none">{event.approvedCount || 0}</p>
                      <p className="text-[9px] text-emerald-600/70 mt-0.5 font-medium">Approved</p>
                    </div>
                    <div className="bg-amber-50 rounded-[10px] p-2.5 text-center">
                      <p className="text-sm font-bold text-amber-700 leading-none">{event.pendingCount || 0}</p>
                      <p className="text-[9px] text-amber-600/70 mt-0.5 font-medium">Pending</p>
                    </div>
                    <div className={`rounded-[10px] p-2.5 text-center ${remaining <= 0 ? "bg-purple-50" : remaining <= 3 ? "bg-red-50" : "bg-gray-50"}`}>
                      <p className={`text-sm font-bold leading-none ${remaining <= 0 ? "text-purple-700" : remaining <= 3 ? "text-red-700" : "text-gray-700"}`}>
                        {remaining <= 0 ? "Full" : remaining}
                      </p>
                      <p className="text-[9px] text-gray-500/70 mt-0.5 font-medium">Seats Left</p>
                    </div>
                    <div className="bg-blue-50 rounded-[10px] p-2.5 text-center">
                      <p className="text-sm font-bold text-blue-700 leading-none">{fillPercent}%</p>
                      <p className="text-[9px] text-blue-600/70 mt-0.5 font-medium">Filled</p>
                    </div>
                  </div>

                  <div className="px-4 mt-3">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        remaining <= 0 ? "bg-purple-500" : fillPercent >= 80 ? "bg-emerald-500" : fillPercent >= 50 ? "bg-[#0D9488]" : "bg-amber-500"
                      }`} style={{ width: `${Math.max(2, fillPercent)}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] font-medium ${remaining <= 3 && remaining > 0 ? "text-red-600" : remaining <= 0 ? "text-purple-600" : "text-gray-400"}`}>
                        {remaining > 0 ? `${remaining} of ${event.worker_count} spots remaining` : "All spots filled"}
                      </span>
                      <span className="text-[10px] text-gray-400">{event.approvedCount}/{event.worker_count}</span>
                    </div>
                  </div>

                  <div className="px-4 py-3 mt-3 border-t border-[rgba(0,0,0,0.06)] flex gap-2">
                    <button onClick={() => { setEditingEvent(event); }}
                      className="flex-1 h-9 rounded-[10px] border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all active:scale-[0.97] flex items-center justify-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => { setSelectedEvent(event); }}
                      className="flex-1 h-9 rounded-[10px] border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all active:scale-[0.97] flex items-center justify-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Applicants
                    </button>
                    <Link href={`/organizer/events/${event.id}`}
                      className="flex-1 h-9 rounded-[10px] bg-[#0D9488] text-white text-xs font-semibold hover:bg-teal-700 transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(13,148,136,0.2)]">
                      Manage <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="w-full h-12 rounded-[14px] bg-white border border-[rgba(0,0,0,0.08)] text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-all active:scale-[0.98]">
                Show {Math.min(PAGE_SIZE, sortedActive.length - visibleCount)} more events
              </button>
            )}
          </div>
        )}

        {tab === "past" && (
          <div className="space-y-3 animate-fade-in">
            {pastEvents.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-lg font-bold text-gray-900">No past events</p>
                <p className="text-sm text-gray-500 mt-1.5">Completed and cancelled events will appear here.</p>
              </div>
            )}
            {pastEvents.map(event => (
              <div key={event.id}
                className="bg-white rounded-[14px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <div className="px-4 pt-4 pb-1 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link href={`/organizer/events/${event.id}`} className="hover:text-[#0D9488] transition-colors active:scale-[0.99]">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">{event.title}</h3>
                    </Link>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[event.status]}`}>
                        {STATUS_LABELS[event.status]}
                      </span>
                      {event.category && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                          {CATEGORY_LABELS[event.category] || event.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-x-3 gap-y-1 text-[10px] text-gray-500 mt-1.5">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400" />{formatDate(event.date, event.date_display)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-400" />{event.time}{event.end_time ? `-${event.end_time}` : ""}</span>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-gray-500">{event.applicantCount || 0} applicants</span>
                    <span className="text-emerald-600 font-medium">{event.approvedCount || 0} approved</span>
                  </div>
                </div>
                <div className="px-4 py-2.5 border-t border-[rgba(0,0,0,0.06)] flex gap-1.5">
                  <button onClick={() => { setSelectedEvent(event); }}
                    className="flex-1 h-8 rounded-[10px] border border-gray-200 text-gray-600 text-[11px] font-semibold hover:bg-gray-50 transition-all active:scale-[0.97] flex items-center justify-center gap-1">
                    <Users className="w-3 h-3" /> Applicants
                  </button>
                  <Link href={`/organizer/events/${event.id}`}
                    className="flex-1 h-8 rounded-[10px] bg-[#0D9488] text-white text-[11px] font-semibold hover:bg-teal-700 transition-all active:scale-[0.97] flex items-center justify-center gap-1 shadow-[0_2px_8px_rgba(13,148,136,0.2)]">
                    Details <ChevronRight className="w-3 h-3" />
                  </Link>
                  <button onClick={() => { duplicateEvent(event); }}
                    className="h-8 px-3 rounded-[10px] border border-gray-200 text-gray-600 text-[11px] font-semibold hover:bg-gray-50 transition-all active:scale-[0.97] flex items-center justify-center gap-1">
                    <Copy className="w-3 h-3" /> Duplicate
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
      <ConfirmDialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { if (deleteConfirm) deleteEvent(deleteConfirm); }}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone. All associated applications will also be removed."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
