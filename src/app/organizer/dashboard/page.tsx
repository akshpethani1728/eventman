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

  const upcomingEvents = activeEvents.filter(e => new Date(e.date) > new Date());
  const totalWorkersNeeded = activeEvents.reduce((s, e) => s + Math.max(0, e.worker_count - (e.approvedCount || 0)), 0);
  const totalPendingApprovals = activeEvents.reduce((s, e) => s + (e.pendingCount || 0), 0);

  const todayStr = new Date().toISOString().split("T")[0];
  const alerts = activeEvents.flatMap(e => {
    const items: { eventId: string; eventTitle: string; text: string; type: "urgent" | "warning" | "info" }[] = [];
    const remaining = e.worker_count - (e.approvedCount || 0);
    if (e.date === todayStr) items.push({ eventId: e.id, eventTitle: e.title, text: "Starts today", type: "urgent" });
    else if (new Date(e.date).getTime() - Date.now() < 86400000 * 2 && new Date(e.date) > new Date())
      items.push({ eventId: e.id, eventTitle: e.title, text: "Starts tomorrow", type: "warning" });
    if (remaining <= 3 && remaining > 0)
      items.push({ eventId: e.id, eventTitle: e.title, text: `Only ${remaining} seat${remaining !== 1 ? "s" : ""} left`, type: remaining <= 1 ? "urgent" : "warning" });
    if (remaining <= 0) items.push({ eventId: e.id, eventTitle: e.title, text: "Event full", type: "info" });
    if (e.application_deadline === todayStr)
      items.push({ eventId: e.id, eventTitle: e.title, text: "Deadline today", type: "urgent" });
    else if (e.application_deadline && new Date(e.application_deadline).getTime() - Date.now() < 86400000 * 3 && new Date(e.application_deadline) > new Date())
      items.push({ eventId: e.id, eventTitle: e.title, text: "Deadline closing soon", type: "warning" });
    if ((e.pendingCount || 0) > 0)
      items.push({ eventId: e.id, eventTitle: e.title, text: `${e.pendingCount} pending approval${e.pendingCount !== 1 ? "s" : ""}`, type: "warning" });
    return items;
  });

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
            <p className="text-2xl font-bold text-red-600">{alerts.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Needs attention</p>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-4 space-y-1.5">
            {alerts.slice(0, 4).map((alert, i) => (
              <div key={i}
                className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
                  alert.type === "urgent" ? "bg-red-50 text-red-700 border border-red-200" :
                  alert.type === "warning" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                  "bg-blue-50 text-blue-700 border border-blue-200"
                }`}>
                <span className="font-medium truncate">{alert.eventTitle}:</span> {alert.text}
              </div>
            ))}
          </div>
        )}

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

        {/* Active / Past Events */}
        {(tab === "active" || tab === "past") && (
          <div className="space-y-3">
            {(tab === "active" ? activeEvents : pastEvents).length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <LayoutDashboard className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">{tab === "active" ? "No active events" : "No past events"}</p>
              </div>
            )}

            {(tab === "active" ? activeEvents : pastEvents).map(event => {
              const remaining = event.worker_count - (event.approvedCount || 0);
              const isFull = remaining <= 0;
              const isToday = event.date === todayStr;
              const isTomorrow = new Date(event.date).getTime() - Date.now() < 86400000 * 2 && new Date(event.date) > new Date();
              const deadlineToday = event.application_deadline === todayStr;
              const deadlineSoon = event.application_deadline && new Date(event.application_deadline).getTime() - Date.now() < 86400000 * 3 && new Date(event.application_deadline).getTime() > Date.now();

              return (
                <div key={event.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {/* Top */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-base text-gray-900 truncate">{event.title}</h3>
                          {event.category && (
                            <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full capitalize shrink-0">
                              {event.category.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_STYLES[event.status]}`}>
                            {STATUS_LABELS[event.status]}
                          </span>
                          {isToday && event.status !== "completed" && event.status !== "cancelled" && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <Clock3 className="w-3 h-3" /> Today
                            </span>
                          )}
                          {isTomorrow && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Tomorrow</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setSelectedEvent(event)}
                        className="shrink-0 h-9 px-3 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium flex items-center gap-1.5 active:bg-blue-100">
                        <Users className="w-4 h-4" />
                        {event.applicantCount}
                      </button>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-gray-600 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{event.time}{event.end_time ? `-${event.end_time}` : ""}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>

                    {/* Operational indicators */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {remaining > 0 && event.status !== "completed" && event.status !== "cancelled" && event.status !== "closed" && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          remaining <= 3 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        }`}>
                          {remaining <= 3 ? `Only ${remaining} left` : `${remaining} seats open`}
                        </span>
                      )}
                      {isFull && event.status !== "completed" && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Full</span>
                      )}
                      {deadlineToday && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Deadline today</span>
                      )}
                      {deadlineSoon && !deadlineToday && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Deadline closing</span>
                      )}
                      {event.payment_info && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{event.payment_info}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 px-4 py-2.5 border-t border-gray-100 overflow-x-auto">
                    <button onClick={() => setSelectedEvent(event)}
                      className="h-8 px-3 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium flex items-center gap-1.5 shrink-0 active:bg-blue-100">
                      <Users className="w-3.5 h-3.5" /> {event.applicantCount} applicants
                    </button>
                    <button onClick={() => setEditingEvent(event)}
                      className="h-8 px-3 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium flex items-center gap-1.5 shrink-0 active:bg-gray-200">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => duplicateEvent(event)}
                      className="h-8 px-3 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium flex items-center gap-1.5 shrink-0 active:bg-gray-200">
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                    <button onClick={() => saveAsTemplate(event)}
                      className="h-8 px-3 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium flex items-center gap-1.5 shrink-0 active:bg-gray-200">
                      <BookTemplate className="w-3.5 h-3.5" /> Template
                    </button>
                    {(event.status === "published" || event.status === "filling") && (
                      <button onClick={() => updateEventStatus(event.id, "closed")}
                        className="h-8 px-3 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium flex items-center gap-1.5 shrink-0 active:bg-amber-100">
                        <XCircle className="w-3.5 h-3.5" /> Close
                      </button>
                    )}
                    {event.status === "draft" && (
                      <button onClick={() => updateEventStatus(event.id, "published")}
                        className="h-8 px-3 rounded-lg bg-green-100 text-green-700 text-xs font-medium flex items-center gap-1.5 shrink-0 active:bg-green-200">
                        Publish
                      </button>
                    )}
                    {event.status !== "completed" && event.status !== "cancelled" && event.status !== "draft" && (
                      <button onClick={() => { if (confirm("Mark as completed?")) updateEventStatus(event.id, "completed"); }}
                        className="h-8 px-3 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium flex items-center gap-1.5 shrink-0 active:bg-gray-200">
                        <CheckCircle className="w-3.5 h-3.5" /> Complete
                      </button>
                    )}
                    <button onClick={() => deleteEvent(event.id)}
                      className="h-8 px-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium flex items-center gap-1.5 shrink-0 active:bg-red-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
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
