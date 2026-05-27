"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LogOut, Plus, Copy, Edit3, Trash2, XCircle, Users, MapPin, Calendar,
  Clock, LayoutDashboard, User, AlertTriangle, CheckCircle, Clock3,
  BookTemplate, Bell, Search
} from "lucide-react";
import { toast } from "sonner";
import type { Profile, Event } from "@/lib/supabase/types";
import CreateEventModal from "./CreateEventModal";
import EditEventModal from "./EditEventModal";
import ApplicantList from "./ApplicantList";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-blue-100 text-blue-700",
  filling: "bg-green-100 text-green-700",
  full: "bg-purple-100 text-purple-700",
  closed: "bg-amber-100 text-amber-700",
  completed: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", published: "Published", filling: "Filling",
  full: "Full", closed: "Closed", completed: "Completed", cancelled: "Cancelled",
};

export default function OrganizerDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<(Event & { applicantCount?: number; approvedCount?: number; pendingCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [createFromTemplate, setCreateFromTemplate] = useState<any>(null);
  const [tab, setTab] = useState<"active" | "past" | "templates">("active");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (!prof || prof.role !== "organizer") { router.push("/login"); return; }
    setProfile(prof);

    const { data: evts } = await supabase
      .from("events")
      .select("*")
      .eq("organizer_id", user.id)
      .order("created_at", { ascending: false });

    const eventsWithCounts = await Promise.all(
      (evts || []).map(async (event) => {
        const { count: totalCount } = await supabase
          .from("applications").select("*", { count: "exact", head: true }).eq("event_id", event.id);
        const { count: approvedCount } = await supabase
          .from("applications").select("*", { count: "exact", head: true }).eq("event_id", event.id).eq("status", "approved");
        const { count: pendingCount } = await supabase
          .from("applications").select("*", { count: "exact", head: true }).eq("event_id", event.id).eq("status", "pending");
        return { ...event, applicantCount: totalCount || 0, approvedCount: approvedCount || 0, pendingCount: pendingCount || 0 };
      })
    );

    setEvents(eventsWithCounts);
    setLoading(false);
  };

  const updateEventStatus = async (eventId: string, status: string) => {
    const { error } = await supabase.from("events").update({ status, updated_at: new Date().toISOString() }).eq("id", eventId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Event marked as ${STATUS_LABELS[status]?.toLowerCase() || status}`);
    loadData();
  };

  const duplicateEvent = async (event: Event) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!confirm("Duplicate this event?")) return;

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
      organizer_id: user.id, title: event.title,
      category: event.category, location: event.location,
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
    if (!confirm("Delete this event permanently?")) return;
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) { toast.error(error.message); return; }
    toast.success("Event deleted");
    loadData();
  };

  const signOut = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const activeEvents = events.filter(e =>
    !["completed", "cancelled"].includes(e.status) && !e.is_template
  );
  const pastEvents = events.filter(e =>
    ["completed", "cancelled"].includes(e.status) && !e.is_template
  );
  const templates = events.filter(e => e.is_template);

  const todayStr = new Date().toISOString().split("T")[0];
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

  // Insight groups
  const needsAttention = sortedActive.filter(e => {
    const remaining = e.worker_count - (e.approvedCount || 0);
    return (e.pendingCount || 0) > 0 || remaining <= 3 || e.date === todayStr || e.application_deadline === todayStr;
  });
  const startingSoon = sortedActive.filter(e => {
    const diff = new Date(e.date).getTime() - Date.now();
    return diff > 0 && diff < 86400000 * 3;
  });
  const seatsOpen = sortedActive.filter(e => {
    const remaining = e.worker_count - (e.approvedCount || 0);
    return remaining > 0 && !needsAttention.includes(e);
  });
  const pendingApprovals = sortedActive.filter(e => (e.pendingCount || 0) > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-lg">EventMan</h1>
          <div className="flex items-center gap-1">
            <Link href="/organizer/notifications" className="p-2 text-gray-500 hover:text-gray-900 relative">
              <Bell className="w-4 h-4" />
            </Link>
            <Link href="/organizer/database" className="p-2 text-gray-500 hover:text-gray-900">
              <Search className="w-4 h-4" />
            </Link>
            <Link href="/organizer/profile" className="p-2 text-gray-500 hover:text-gray-900">
              <User className="w-4 h-4" />
            </Link>
            <button onClick={signOut} className="p-2 text-gray-500 hover:text-gray-900">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {/* Operational Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-2xl font-bold text-gray-900">{activeEvents.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Active events</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-2xl font-bold text-amber-600">{totalWorkersNeeded > 0 ? totalWorkersNeeded : 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Workers needed</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-2xl font-bold text-blue-600">{totalPendingApprovals}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pending approvals</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-2xl font-bold text-red-600">{needsAttention.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Needs attention</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setCreateFromTemplate(null); setShowCreate(true); }}
            className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-sm font-medium flex items-center justify-center gap-2 active:bg-blue-700">
            <Plus className="w-4 h-4" /> Create Event
          </button>
          {templates.length > 0 && (
            <button onClick={() => setTab("templates")}
              className={`h-11 px-4 rounded-xl border text-sm font-medium flex items-center gap-2 ${
                tab === "templates" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"
              }`}>
              <BookTemplate className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          {(["active", "past"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`h-9 px-4 text-sm font-medium transition-colors border-b-2 capitalize ${
                tab === t ? "text-blue-600 border-blue-600" : "text-gray-500 border-transparent hover:text-gray-700"
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
              <div key={tmpl.id} className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm text-gray-900">{tmpl.template_name || tmpl.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{tmpl.worker_count} workers · {tmpl.category || "General"}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => { setCreateFromTemplate(tmpl); setShowCreate(true); }}
                    className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium active:bg-blue-700">Use</button>
                  <button onClick={() => deleteEvent(tmpl.id)}
                    className="h-8 px-3 rounded-lg bg-red-50 text-red-600 text-xs active:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
            <button onClick={() => setTab("active")} className="text-xs text-blue-600 mt-1">← Back</button>
          </div>
        )}

        {/* Active Tab */}
        {tab === "active" && (
          <div className="space-y-4">
            {/* Insight sections */}
            {pendingApprovals.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2"><Users className="w-3.5 h-3.5 text-blue-600" /><span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Pending Approvals</span></div>
                <div className="space-y-2">
                  {pendingApprovals.map(event => (
                    <Link key={event.id} href={`/organizer/events/${event.id}`} className="block bg-white border border-blue-200 rounded-xl p-3 active:bg-blue-50">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm text-gray-900 truncate">{event.title}</p>
                        <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">{event.pendingCount} pending</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{event.date_display || event.date} · {event.time}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{event.location}{event.payment_info ? ` · ${event.payment_info}` : ""}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {needsAttention.length > 0 && needsAttention.length !== pendingApprovals.length && (
              <div>
                <div className="flex items-center gap-1.5 mb-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /><span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Needs Attention</span></div>
                <div className="space-y-2">
                  {needsAttention.filter(e => !pendingApprovals.includes(e)).map(event => {
                    const rem = event.worker_count - (event.approvedCount || 0);
                    return (
                      <Link key={event.id} href={`/organizer/events/${event.id}`} className="block bg-white border border-amber-200 rounded-xl p-3 active:bg-amber-50">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm text-gray-900 truncate">{event.title}</p>
                          <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">{rem <= 3 ? `Only ${rem} left` : "Attention"}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{event.date_display || event.date} · {event.time}{event.application_deadline === todayStr ? " · Deadline today" : ""}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{event.location}{event.payment_info ? ` · ${event.payment_info}` : ""}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {seatsOpen.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2"><Clock3 className="w-3.5 h-3.5 text-green-600" /><span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Seats Open</span></div>
                <div className="space-y-2">
                  {seatsOpen.map(event => (
                    <Link key={event.id} href={`/organizer/events/${event.id}`} className="block bg-white border border-gray-200 rounded-xl p-3 active:bg-gray-50">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm text-gray-900 truncate">{event.title}</p>
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full shrink-0">{event.worker_count - (event.approvedCount || 0)} seats</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{event.date_display || event.date} · {event.time}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{event.location}{event.payment_info ? ` · ${event.payment_info}` : ""}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {sortedActive.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <LayoutDashboard className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No active events</p>
                <button onClick={() => { setCreateFromTemplate(null); setShowCreate(true); }} className="mt-2 text-xs text-blue-600">Create your first event</button>
              </div>
            )}
          </div>
        )}

        {/* Past Tab */}
        {tab === "past" && (
          <div className="space-y-2">
            {pastEvents.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <LayoutDashboard className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No past events</p>
              </div>
            )}
            {pastEvents.map(event => (
              <Link key={event.id} href={`/organizer/events/${event.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-3.5 active:bg-gray-50">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-900 truncate">{event.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{event.date_display || event.date} · {event.time}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{event.location}{event.payment_info ? ` · ${event.payment_info}` : ""}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[event.status]}`}>
                    {STATUS_LABELS[event.status]}
                  </span>
                </div>
              </Link>
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
