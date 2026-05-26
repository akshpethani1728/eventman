"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LogOut, MapPin, Calendar, Clock, Users, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import type { Profile, Event, Application } from "@/lib/supabase/types";

type StatusBadgeProps = {
  status: ApplicationStatusDisplay;
};

type ApplicationStatusDisplay = "pending" | "approved" | "rejected" | "cancelled";

function StatusBadge({ status }: StatusBadgeProps) {
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
  const [events, setEvents] = useState<(Event & { application?: Application })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"browse" | "applied">("browse");
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
    if (!prof || prof.role !== "worker") { router.push("/login"); return; }
    setProfile(prof);

    const { data: apps } = await supabase
      .from("applications")
      .select("event_id, status, id, notes, created_at, updated_at")
      .eq("worker_id", user.id);

    const appMap: Record<string, any> = {};
    apps?.forEach((a: any) => { appMap[a.event_id] = a; });

    const { data: evts } = await supabase
      .from("events")
      .select("*")
      .eq("status", "upcoming")
      .order("date", { ascending: true });

    const enriched = (evts || []).map(e => ({
      ...e,
      application: appMap[e.id] || undefined,
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
      event_id: eventId,
      worker_id: user.id,
      status: "pending",
    });

    if (error) { toast.error(error.message); return; }
    toast.success("Applied successfully!");
    loadData();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const appliedIds = new Set(events.filter(e => e.application).map(e => e.id));
  const browseEvents = events.filter(e => !appliedIds.has(e.id));
  const appliedEvents = events.filter(e => appliedIds.has(e.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-lg">EventMan</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 truncate max-w-[120px]">{profile?.full_name}</span>
            <button onClick={signOut} className="p-2 text-gray-500 hover:text-gray-900">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 pb-20">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("browse")}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-colors ${
              tab === "browse"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            Browse {browseEvents.length > 0 && `(${browseEvents.length})`}
          </button>
          <button
            onClick={() => setTab("applied")}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-colors ${
              tab === "applied"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            Applied {appliedEvents.length > 0 && `(${appliedEvents.length})`}
          </button>
        </div>

        {/* Browse Events */}
        {tab === "browse" && browseEvents.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-base">No events available right now</p>
          </div>
        )}

        {tab === "browse" && browseEvents.map(event => (
          <Link
            key={event.id}
            href={`/worker/events/${event.id}`}
            className="block bg-white border border-gray-200 rounded-xl p-4 mb-3 active:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-semibold text-base leading-snug">{event.title}</h3>
              <button
                onClick={(e) => apply(e, event.id)}
                className="shrink-0 h-9 px-5 rounded-lg bg-blue-600 text-white text-sm font-medium active:bg-blue-700"
              >
                Apply
              </button>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-gray-400" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 shrink-0 text-gray-400" />
                <span>{event.date}</span>
                <span className="text-gray-300">|</span>
                <Clock className="w-4 h-4 shrink-0 text-gray-400" />
                <span>{event.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 shrink-0 text-gray-400" />
                <span>{event.worker_count} workers needed</span>
              </div>
              {event.payment_info && (
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 shrink-0 text-gray-400" />
                  <span className="text-green-700 font-medium">{event.payment_info}</span>
                </div>
              )}
            </div>
          </Link>
        ))}

        {/* Applied Events */}
        {tab === "applied" && appliedEvents.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-base">You haven&apos;t applied to any events yet</p>
            <button
              onClick={() => setTab("browse")}
              className="mt-3 text-blue-600 text-sm font-medium"
            >
              Browse events
            </button>
          </div>
        )}

        {tab === "applied" && appliedEvents.map(event => (
          <Link
            key={event.id}
            href={`/worker/events/${event.id}`}
            className="block bg-white border border-gray-200 rounded-xl p-4 mb-3 active:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-semibold text-base leading-snug">{event.title}</h3>
              <StatusBadge status={event.application!.status as ApplicationStatusDisplay} />
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-gray-400" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 shrink-0 text-gray-400" />
                <span>{event.date}</span>
                <span className="text-gray-300">|</span>
                <Clock className="w-4 h-4 shrink-0 text-gray-400" />
                <span>{event.time}</span>
              </div>
            </div>
          </Link>
        ))}
      </main>
    </div>
  );
}
