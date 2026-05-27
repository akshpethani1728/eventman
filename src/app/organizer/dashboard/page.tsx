"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LogOut, Plus, Copy, Edit3, Trash2, XCircle, Users, MapPin, Calendar,
  Clock, LayoutDashboard, User, AlertTriangle, CheckCircle, Clock3,
  FileText, Download, BookTemplate
} from "lucide-react";
import { toast } from "sonner";
import type { Profile, Event, Application } from "@/lib/supabase/types";
import CreateEventModal from "./CreateEventModal";
import EditEventModal from "./EditEventModal";
import ApplicantList from "./ApplicantList";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-blue-100 text-blue-700",
  filling: "bg-green-100 text-green-700",
  full: "bg-purple-100 text-purple-700",
  closed: "bg-amber-100 text-amber-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", published: "Published", filling: "Filling",
  full: "Full", closed: "Closed", completed: "Completed", cancelled: "Cancelled",
};

export default function OrganizerDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<(Event & { applicantCount?: number; approvedCount?: number })[]>([]);
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
    toast.success(`Event ${STATUS_LABELS[status]?.toLowerCase() || status}`);
    loadData();
  };

  const duplicateEvent = async (event: Event) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!confirm("Duplicate this event?")) return;

    const { error } = await supabase.from("events").insert({
      organizer_id: user.id, title: event.title,
      category: event.category, application_deadline: event.application_deadline,
      location: event.location, date: event.date, time: event.time,
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
    !["completed", "cancelled", "draft"].includes(e.status) && !e.is_template
  );
  const pastEvents = events.filter(e =>
    ["completed", "cancelled"].includes(e.status) && !e.is_template
  );
  const templates = events.filter(e => e.is_template);

  const totalWorkersNeeded = activeEvents.reduce((s, e) => s + (e.worker_count - (e.approvedCount || 0)), 0);
  const totalPendingApprovals = events.reduce((s, e) => s + ((e as any).pendingCount || 0), 0);
  const startingSoon = activeEvents.filter(e => {
    const diff = new Date(e.date).getTime() - Date.now();
    return diff > 0 && diff < 86400000 * 2;
  }).length;
  const closingSoon = activeEvents.filter(e => {
    if (!e.application_deadline) return false;
    const diff = new Date(e.application_deadline).getTime() - Date.now();
    return diff > 0 && diff < 86400000 * 3;
  }).length;

  const todayStr = new Date().toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-gray-950/95 backdrop-blur border-b border-gray-800 z-10">
        <div className="max-w-4xl mx-auto px-3 h-14 flex items-center justify-between">
          <h1 className="font-bold text-base text-white">EventMan</h1>
          <div className="flex items-center gap-1">
            <Link href="/organizer/profile" className="p-2 text-gray-400 hover:text-white">
              <User className="w-4 h-4" />
            </Link>
            <button onClick={signOut} className="p-2 text-gray-400 hover:text-white">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 py-4">
        {/* Intelligence Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-2xl font-bold text-white">{activeEvents.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Active events</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-2xl font-bold text-amber-400">{totalWorkersNeeded > 0 ? totalWorkersNeeded : 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">Workers needed</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-2xl font-bold text-blue-400">{totalPendingApprovals}</p>
            <p className="text-xs text-gray-400 mt-0.5">Pending approvals</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-2xl font-bold text-green-400">{startingSoon + closingSoon}</p>
            <p className="text-xs text-gray-400 mt-0.5">Needs attention</p>
          </div>
        </div>

        {/* Create Button + Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setCreateFromTemplate(null); setShowCreate(true); }}
            className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-sm font-medium flex items-center justify-center gap-2 active:bg-blue-700">
            <Plus className="w-4 h-4" /> Create Event
          </button>
          {templates.length > 0 && (
            <button onClick={() => setTab("templates")}
              className={`h-11 px-4 rounded-xl border text-sm font-medium flex items-center gap-2 ${
                tab === "templates" ? "bg-blue-600 text-white border-blue-600" : "border-gray-700 text-gray-300"
              }`}>
              <BookTemplate className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          {(["active", "past"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`h-8 px-4 rounded-lg text-xs font-medium transition-colors capitalize ${
                tab === t ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
              }`}>
              {t} ({t === "active" ? activeEvents.length : pastEvents.length})
            </button>
          ))}
        </div>

        {/* Templates Tab */}
        {tab === "templates" && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-2">Your saved templates. Click to create an event from template.</p>
            {templates.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">No templates yet. Save an event as template to reuse it.</p>
              </div>
            )}
            {templates.map(tmpl => (
              <div key={tmpl.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{tmpl.template_name || tmpl.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tmpl.worker_count} workers · {tmpl.category || "No category"}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => { setCreateFromTemplate(tmpl); setShowCreate(true); }}
                    className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium active:bg-blue-700">
                    Use
                  </button>
                  <button onClick={() => deleteEvent(tmpl.id)}
                    className="h-8 px-3 rounded-lg bg-gray-800 text-gray-400 text-xs active:bg-gray-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => setTab("active")} className="text-xs text-blue-400 mt-1">← Back to events</button>
          </div>
        )}

        {/* Active / Past Events */}
        {(tab === "active" || tab === "past") && (
          <div className="space-y-2.5">
            {(tab === "active" ? activeEvents : pastEvents).length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <LayoutDashboard className="w-10 h-10 mx-auto mb-2 text-gray-700" />
                <p className="text-sm">{tab === "active" ? "No active events" : "No past events"}</p>
                {tab === "active" && (
                  <button onClick={() => { setCreateFromTemplate(null); setShowCreate(true); }}
                    className="mt-2 text-xs text-blue-400">Create your first event</button>
                )}
              </div>
            )}

            {(tab === "active" ? activeEvents : pastEvents).map(event => {
              const remaining = event.worker_count - (event.approvedCount || 0);
              const isFull = remaining <= 0;
              const isToday = event.date === todayStr;
              const isTomorrow = new Date(event.date).getTime() - Date.now() < 86400000 * 2 && new Date(event.date).getTime() > Date.now();
              const deadlineSoon = event.application_deadline && new Date(event.application_deadline).getTime() - Date.now() < 86400000 * 3 && new Date(event.application_deadline).getTime() > Date.now();
              const deadlineToday = event.application_deadline === todayStr;

              return (
                <div key={event.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  {/* Top Section */}
                  <div className="p-3.5 pb-2.5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm text-white truncate">{event.title}</h3>
                          {event.category && (
                            <span className="text-[10px] bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full capitalize shrink-0">
                              {event.category.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[event.status]}`}>
                            {STATUS_LABELS[event.status]}
                          </span>
                          {isToday && event.status !== "completed" && event.status !== "cancelled" && (
                            <span className="text-[11px] bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <Clock3 className="w-3 h-3" /> Today
                            </span>
                          )}
                          {isTomorrow && event.status !== "completed" && event.status !== "cancelled" && (
                            <span className="text-[11px] bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded-full font-medium">
                              Tomorrow
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setSelectedEvent(event)}
                        className="shrink-0 h-9 px-3 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-medium flex items-center gap-1.5 active:bg-blue-600/30">
                        <Users className="w-3.5 h-3.5" />
                        {event.applicantCount}
                      </button>
                    </div>

                    {/* Middle Section */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-400 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>

                    {/* Operational Indicators */}
                    <div className="flex flex-wrap gap-1.5">
                      {remaining > 0 && event.status !== "completed" && event.status !== "cancelled" && event.status !== "draft" && (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          remaining <= 3 ? "bg-red-900/40 text-red-300" : "bg-green-900/40 text-green-300"
                        }`}>
                          {remaining <= 3 ? `Only ${remaining} seat${remaining !== 1 ? "s" : ""} left` : `${remaining} seats open`}
                        </span>
                      )}
                      {isFull && event.status !== "completed" && (
                        <span className="text-[11px] bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded-full font-medium">
                          Event full
                        </span>
                      )}
                      {deadlineToday && (
                        <span className="text-[11px] bg-red-900/40 text-red-300 px-2 py-0.5 rounded-full font-medium">
                          Deadline today
                        </span>
                      )}
                      {deadlineSoon && !deadlineToday && (
                        <span className="text-[11px] bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full font-medium">
                          Deadline closing
                        </span>
                      )}
                      {event.payment_info && (
                        <span className="text-[11px] bg-green-900/40 text-green-300 px-2 py-0.5 rounded-full">
                          {event.payment_info}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center gap-1 px-3 py-2 border-t border-gray-800 overflow-x-auto">
                    <button onClick={() => setSelectedEvent(event)}
                      className="h-8 px-2.5 rounded-lg bg-blue-600/20 text-blue-400 text-[11px] font-medium flex items-center gap-1 shrink-0 active:bg-blue-600/30">
                      <Users className="w-3 h-3" /> Applicants ({event.applicantCount})
                    </button>
                    <button onClick={() => setEditingEvent(event)}
                      className="h-8 px-2.5 rounded-lg bg-gray-800 text-gray-300 text-[11px] font-medium flex items-center gap-1 shrink-0 active:bg-gray-700">
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => duplicateEvent(event)}
                      className="h-8 px-2.5 rounded-lg bg-gray-800 text-gray-300 text-[11px] font-medium flex items-center gap-1 shrink-0 active:bg-gray-700">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                    <button onClick={() => saveAsTemplate(event)}
                      className="h-8 px-2.5 rounded-lg bg-gray-800 text-gray-300 text-[11px] font-medium flex items-center gap-1 shrink-0 active:bg-gray-700">
                      <BookTemplate className="w-3 h-3" /> Template
                    </button>
                    {event.status === "published" || event.status === "filling" ? (
                      <button onClick={() => updateEventStatus(event.id, "closed")}
                        className="h-8 px-2.5 rounded-lg bg-amber-900/30 text-amber-400 text-[11px] font-medium flex items-center gap-1 shrink-0 active:bg-amber-900/50">
                        <XCircle className="w-3 h-3" /> Close
                      </button>
                    ) : null}
                    {event.status === "draft" && (
                      <button onClick={() => updateEventStatus(event.id, "published")}
                        className="h-8 px-2.5 rounded-lg bg-green-900/30 text-green-400 text-[11px] font-medium flex items-center gap-1 shrink-0 active:bg-green-900/50">
                        Publish
                      </button>
                    )}
                    {event.status !== "completed" && event.status !== "cancelled" && (
                      <button onClick={() => { if (confirm("Mark as completed?")) updateEventStatus(event.id, "completed"); }}
                        className="h-8 px-2.5 rounded-lg bg-gray-800 text-gray-400 text-[11px] font-medium flex items-center gap-1 shrink-0 active:bg-gray-700">
                        <CheckCircle className="w-3 h-3" /> Complete
                      </button>
                    )}
                    <button onClick={() => deleteEvent(event.id)}
                      className="h-8 px-2.5 rounded-lg bg-red-900/20 text-red-400 text-[11px] font-medium flex items-center gap-1 shrink-0 active:bg-red-900/40">
                      <Trash2 className="w-3 h-3" />
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
