"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Plus, Copy, Edit3, Trash2, XCircle, Users, MapPin, Calendar, Clock, LayoutDashboard, User } from "lucide-react";
import { toast } from "sonner";
import type { Profile, Event, Application } from "@/lib/supabase/types";
import CreateEventModal from "./CreateEventModal";
import EditEventModal from "./EditEventModal";
import ApplicantList from "./ApplicantList";

export default function OrganizerDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<(Event & { applicantCount?: number; approvedCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (!prof || prof.role !== "organizer") { router.push("/login"); return; }
    setProfile(prof);

    const { data: evts } = await supabase
      .from("events")
      .select("*")
      .eq("organizer_id", user.id)
      .order("date", { ascending: false });

    const eventsWithCounts = await Promise.all(
      (evts || []).map(async (event) => {
        const { count: totalCount } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id);
        const { count: approvedCount } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id)
          .eq("status", "approved");
        return { ...event, applicantCount: totalCount || 0, approvedCount: approvedCount || 0 };
      })
    );

    setEvents(eventsWithCounts);
    setLoading(false);
  };

  const duplicateEvent = async (event: Event) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("events").insert({
      organizer_id: user.id,
      title: event.title,
      category: event.category,
      application_deadline: event.application_deadline,
      location: event.location,
      date: event.date,
      time: event.time,
      worker_count: event.worker_count,
      gender_requirement: event.gender_requirement,
      min_age: event.min_age,
      max_age: event.max_age,
      dress_code: event.dress_code,
      required_documents: event.required_documents,
      payment_info: event.payment_info,
      reporting_details: event.reporting_details,
      instructions: event.instructions,
      status: "upcoming",
    });

    if (error) { toast.error(error.message); return; }
    toast.success("Event duplicated!");
    loadData();
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm("Delete this event permanently?")) return;
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) { toast.error(error.message); return; }
    toast.success("Event deleted");
    loadData();
  };

  const cancelEvent = async (eventId: string) => {
    if (!confirm("Cancel this event? Workers will be notified.")) return;
    const { error } = await supabase
      .from("events")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", eventId);
    if (error) { toast.error(error.message); return; }
    toast.success("Event cancelled");
    loadData();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Stats
  const activeCount = events.filter(e => e.status === "upcoming" || e.status === "ongoing").length;
  const totalApplicants = events.reduce((sum, e) => sum + (e.applicantCount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-lg">EventMan</h1>
          <div className="flex items-center gap-1">
            <Link href="/organizer/profile" className="p-2 text-gray-500 hover:text-gray-900">
              <User className="w-4 h-4" />
            </Link>
            <button onClick={signOut} className="p-2 text-gray-500 hover:text-gray-900">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            <p className="text-xs text-gray-500 mt-1">Active Events</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{totalApplicants}</p>
            <p className="text-xs text-gray-500 mt-1">Applicants</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{events.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total Events</p>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={() => setShowCreate(true)}
          className="w-full h-12 rounded-xl bg-blue-600 text-white font-medium text-base flex items-center justify-center gap-2 mb-4 active:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Create New Event
        </button>

        {/* Events List */}
        {events.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <LayoutDashboard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-base mb-1">No events yet</p>
            <p className="text-sm">Create your first event to start receiving applications</p>
          </div>
        )}

        {events.map(event => (
          <div key={event.id} className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
            {/* Top Row */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">{event.title}</h3>
                <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${
                  event.status === "upcoming" ? "bg-blue-100 text-blue-700" :
                  event.status === "ongoing" ? "bg-green-100 text-green-700" :
                  event.status === "completed" ? "bg-gray-100 text-gray-600" :
                  "bg-red-100 text-red-700"
                }`}>
                  {event.status}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setSelectedEvent(event)}
                  className="h-9 px-3 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium flex items-center gap-1.5 active:bg-blue-100"
                >
                  <Users className="w-4 h-4" />
                  {event.applicantCount}
                </button>
              </div>
            </div>

            {/* Event Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                <span className="truncate">{event.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                <span>{event.time}</span>
              </div>
            </div>

            {/* Description */}
            <div className="text-sm text-gray-500 mb-3 space-y-1">
              <p>
                {event.worker_count} workers needed
                {event.gender_requirement && ` · ${event.gender_requirement}`}
                {(event.min_age || event.max_age) && ` · Age ${event.min_age || 0}-${event.max_age || 99}`}
              </p>
              <div className="flex gap-2">
                {event.category && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full capitalize">
                    {event.category.replace(/_/g, " ")}
                  </span>
                )}
                {event.approvedCount !== undefined && (
                  <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                    {event.approvedCount} of {event.worker_count} filled
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setEditingEvent(event)}
                className="h-8 px-3 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium flex items-center gap-1.5 active:bg-gray-200"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={() => duplicateEvent(event)}
                className="h-8 px-3 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium flex items-center gap-1.5 active:bg-gray-200"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicate
              </button>
              {event.status === "upcoming" && (
                <button
                  onClick={() => cancelEvent(event.id)}
                  className="h-8 px-3 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium flex items-center gap-1.5 active:bg-orange-100"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel
                </button>
              )}
              <button
                onClick={() => deleteEvent(event.id)}
                className="h-8 px-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium flex items-center gap-1.5 active:bg-red-100 ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </main>

      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadData(); }}
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
