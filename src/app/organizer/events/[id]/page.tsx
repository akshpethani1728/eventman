"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Users, Edit3, Copy, XCircle, CheckCircle, Trash2, MapPin, Calendar, Clock,
  Clock3, IndianRupee, BookTemplate, AlertTriangle, Check, X as XIcon,
  ChevronDown, ChevronUp, Phone, Mail, Award, Briefcase, Filter, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/lib/design/Button";
import { Card, CardHeader, CardTitle, CardStats, CardStat } from "@/lib/design/Card";
import { Badge, StatusDot, Divider } from "@/lib/design/Badge";
import { PageLoader } from "@/lib/design/Loading";
import type { Event, Profile, Application } from "@/lib/supabase/types";
import EditEventModal from "@/app/organizer/dashboard/EditEventModal";

function computeCompletion(p: Profile): number {
  const checks: [keyof Profile, number][] = [
    ["avatar_url", 15], ["phone", 15], ["age", 10], ["gender", 10],
    ["city", 10], ["area", 10], ["skills", 15], ["experience", 10], ["bio", 10],
  ];
  let percent = 0;
  for (const [key, weight] of checks) {
    const val = p[key];
    if (key === "skills") { if (Array.isArray(val) && val.length > 0) percent += weight; }
    else if (val !== null && val !== undefined && val !== "") percent += weight;
  }
  return percent;
}

const AVAIL_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  available_today: { label: "Available Today", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  available_this_week: { label: "Available This Week", dot: "bg-indigo-600", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  available: { label: "Available", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  weekends: { label: "Weekends", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  evenings: { label: "Evenings", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700 border-purple-200" },
  busy: { label: "Busy", dot: "bg-red-500", badge: "bg-red-100 text-red-700 border-red-200" },
  unavailable: { label: "Unavailable", dot: "bg-gray-400", badge: "bg-gray-100 text-gray-500 border-gray-200" },
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", published: "bg-indigo-50 text-indigo-700",
  filling: "bg-green-100 text-green-700", full: "bg-purple-100 text-purple-700",
  closed: "bg-amber-100 text-amber-700", completed: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-700",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", published: "Published", filling: "Filling", full: "Full",
  closed: "Closed", completed: "Completed", cancelled: "Cancelled",
};

export default function OrganizerEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [event, setEvent] = useState<Event | null>(null);
  const [applicants, setApplicants] = useState<(Application & { profile: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"" | "pending" | "approved" | "rejected">("");
  const [applying, setApplying] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => { try { const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (!prof || prof.role !== "organizer") { router.push("/login"); return; }

    const { data: evt } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
    if (!evt || evt.organizer_id !== user.id) { router.push("/organizer/dashboard"); return; }
    setEvent(evt);

    const { data: apps } = await supabase
      .from("applications").select("*").eq("event_id", id).order("created_at", { ascending: false });

    const withProfiles = await Promise.all(
      (apps || []).map(async (app) => {
        const { data: p } = await supabase.from("profiles").select("*").eq("user_id", app.worker_id).maybeSingle();
        return { ...app, profile: p! } as Application & { profile: Profile };
      })
    );
    setApplicants(withProfiles.filter(a => a.profile));
     } catch (err) { console.error("[OrganizerEventDetailPage] error:", err); } finally { setLoading(false); } };

  const handleApprove = async (applicationId: string) => {
    if (!event) return;
    setApplying(applicationId);
    const { error } = await supabase
      .from("applications").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", applicationId);
    if (error) { toast.error(error.message); setApplying(null); return; }

    const app = applicants.find(a => a.id === applicationId);
    if (app) {
      await supabase.from("notifications").insert({
        user_id: app.worker_id, title: "Application Approved",
        message: `Your application for "${event.title}" has been approved.`,
      });
    }

    const newApproved = applicants.filter(a => a.status === "approved" || a.id === applicationId).length;
    if (newApproved >= event.worker_count && event.status !== "full") {
      await supabase.from("events").update({ status: "full", updated_at: new Date().toISOString() }).eq("id", event.id);
      setEvent({ ...event, status: "full" });
      toast.success("Event is now full!");
    }

    setApplying(null);
    loadData();
  };

  const handleReject = async (applicationId: string) => {
    if (!event) return;
    setApplying(applicationId);
    const { error } = await supabase
      .from("applications").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", applicationId);
    if (error) { toast.error(error.message); setApplying(null); return; }

    const app = applicants.find(a => a.id === applicationId);
    if (app) {
      await supabase.from("notifications").insert({
        user_id: app.worker_id, title: "Application Rejected",
        message: `Your application for "${event.title}" has been rejected.`,
      });
    }
    setApplying(null);
    loadData();
  };

  const handleRemove = async (applicationId: string) => {
    if (!event) return;
    setApplying(applicationId);
    const { error } = await supabase
      .from("applications").update({ status: "cancelled", notes: "removed_by_organizer", updated_at: new Date().toISOString() }).eq("id", applicationId);
    if (error) { toast.error(error.message); setApplying(null); return; }

    const app = applicants.find(a => a.id === applicationId);
    if (app) {
      await supabase.from("notifications").insert({
        user_id: app.worker_id,
        title: "Removed from Event",
        message: `You have been removed from "${event.title}". The organizer cancelled your selection. You can re-apply if the event is still accepting applications.`,
      });
    }

    // If event was full, free up a spot
    if (event.status === "full") {
      await supabase.from("events").update({ status: "filling", updated_at: new Date().toISOString() }).eq("id", event.id);
      setEvent({ ...event, status: "filling" });
    }

    setApplying(null);
    loadData();
  };

  const updateStatus = async (status: string) => {
    if (!event) return;
    const { error } = await supabase.from("events").update({ status, updated_at: new Date().toISOString() }).eq("id", event.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Event ${STATUS_LABELS[status]?.toLowerCase()}`);
    setEvent({ ...event, status: status as Event["status"] });
    loadData();
  };

  const duplicate = async () => {
    if (!event) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("events").insert({
      organizer_id: user.id, title: event.title, category: event.category,
      date: event.date, date_display: event.date_display, time: event.time, end_time: event.end_time,
      application_deadline: event.application_deadline, location: event.location,
      google_maps_link: event.google_maps_link, worker_count: event.worker_count,
      gender_requirement: event.gender_requirement, min_age: event.min_age, max_age: event.max_age,
      experience_required: event.experience_required, skill_requirements: event.skill_requirements,
      dress_code: event.dress_code, required_documents: event.required_documents,
      grooming_notes: event.grooming_notes, payment_info: event.payment_info,
      food_included: event.food_included, travel_included: event.travel_included,
      overtime_info: event.overtime_info, reporting_details: event.reporting_details,
      instructions: event.instructions, contact_person_notes: event.contact_person_notes,
      status: "draft",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Event duplicated (draft)");
  };

  const deleteEvent = async () => {
    if (!confirm("Delete permanently?")) return;
    if (!event) return;
    await supabase.from("events").delete().eq("id", event.id);
    toast.success("Event deleted");
    router.push("/organizer/dashboard");
  };

  if (loading) return <PageLoader />;
  if (!event) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const remaining = event.worker_count - applicants.filter(a => a.status === "approved").length;
  const isToday = event.date === todayStr;
  const isTomorrow = new Date(event.date).getTime() - Date.now() < 86400000 * 2 && new Date(event.date) > new Date();
  const deadlineToday = event.application_deadline === todayStr;
  const deadlineSoon = event.application_deadline && new Date(event.application_deadline).getTime() - Date.now() < 86400000 * 3 && new Date(event.application_deadline).getTime() > Date.now();
  const canEdit = ["draft", "published", "filling"].includes(event.status);
  const pendingCount = applicants.filter(a => a.status === "pending").length;
  const approvedCount = applicants.filter(a => a.status === "approved").length;
  const rejectedCount = applicants.filter(a => a.status === "rejected").length;
  const filteredApplicants = filter ? applicants.filter(a => a.status === filter) : applicants;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/organizer/dashboard" className="p-1 -ml-1 text-gray-500"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold text-sm truncate">{event.title}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Operational Alerts */}
        <div className="space-y-1.5">
          {isToday && <div className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2"><Clock3 className="w-3.5 h-3.5" />Starts today</div>}
          {isTomorrow && <div className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2"><Clock3 className="w-3.5 h-3.5" />Starts tomorrow</div>}
          {remaining <= 3 && remaining > 0 && <div className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" />Only {remaining} seat{remaining !== 1 ? "s" : ""} left</div>}
          {deadlineToday && <div className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" />Application deadline is today</div>}
          {deadlineSoon && !deadlineToday && <div className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2"><Clock3 className="w-3.5 h-3.5" />Deadline closing soon</div>}
          {pendingCount > 0 && <div className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg px-3 py-2 flex items-center gap-2"><Users className="w-3.5 h-3.5" />{pendingCount} pending approval{pendingCount !== 1 ? "s" : ""}</div>}
        </div>

        {/* Status & Quick Stats */}
        <Card>
          <CardHeader className="mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={event.status as any || "draft"}>{STATUS_LABELS[event.status]}</Badge>
              {event.category && <span className="text-[10px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full capitalize">{event.category.replace(/_/g, " ")}</span>}
            </div>
            <span className="text-[10px] text-gray-400">{event.id.slice(0, 8)}</span>
          </CardHeader>
          <CardStats columns={3}>
            <CardStat label="Seats open" value={remaining} />
            <CardStat label="Approved" value={approvedCount} color="blue" />
            <CardStat label="Pending" value={pendingCount} color="amber" />
          </CardStats>
          {event.application_deadline && (
            <p className="text-xs text-gray-400 mt-2">Apply by {new Date(event.application_deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
          )}
        </Card>

        {/* Event Details */}
        <Card>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Event Details</p>
          <div className="grid grid-cols-2 gap-2.5 text-sm">
            <div className="flex items-center gap-1.5 text-gray-600"><Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />{event.date_display || event.date}</div>
            <div className="flex items-center gap-1.5 text-gray-600"><Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />{event.time}{event.end_time ? `-${event.end_time}` : ""}</div>
            <div className="col-span-2 flex items-center gap-1.5 text-gray-600"><MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" /><span className="truncate">{event.location}</span></div>
            {event.payment_info && <div className="col-span-2 flex items-center gap-1.5 text-green-700"><IndianRupee className="w-3.5 h-3.5 shrink-0" />{event.payment_info}</div>}
            {(event.food_included || event.travel_included) && (
              <div className="col-span-2 flex gap-3 text-xs text-gray-500">
                {event.food_included && <span>âœ“ Food included</span>}
                {event.travel_included && <span>âœ“ Travel included</span>}
              </div>
            )}
          </div>
        </Card>

        {/* Requirements */}
        {(event.gender_requirement || event.min_age || event.max_age || event.work_description || event.experience_required || event.skill_requirements || event.dress_code) && (
          <Card>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Requirements</p>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {event.gender_requirement && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full capitalize">{event.gender_requirement}</span>}
              {(event.min_age || event.max_age) && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{event.min_age || 0}-{event.max_age || 99} yrs</span>}
              {(event.work_description || event.experience_required) && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{event.work_description || event.experience_required}</span>}
              {event.dress_code && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{event.dress_code}</span>}
              {event.skill_requirements?.map((s, i) => <span key={i} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{s}</span>)}
            </div>
          </Card>
        )}

        {/* Applicants */}
        <Card padding="none">
          <div className="p-4 pb-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Applicants ({applicants.length})
            </h3>
            <div className="flex gap-1.5">
              {([["", `All (${applicants.length})`], ["pending", `Pending (${pendingCount})`], ["approved", `Approved (${approvedCount})`], ["rejected", `Rejected (${rejectedCount})`]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
                    filter === key ? "bg-indigo-700 text-white" : "bg-gray-100 text-gray-600"
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
            {filteredApplicants.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-6">No applicants</p>
            )}
            {filteredApplicants.map(app => {
              const avail = app.profile.availability ? AVAIL_CONFIG[app.profile.availability] : null;
              const completion = computeCompletion(app.profile);
              return (
              <div key={app.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                          {app.profile.full_name?.charAt(0) || "W"}
                        </div>
                        {avail && (
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-white ${avail.dot}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm text-gray-900 truncate">{app.profile.full_name}</p>
                          {avail && (
                            <span className={`inline-flex items-center gap-0.5 text-[8px] font-medium px-1 py-0.5 rounded-full border ${avail.badge}`}>
                              <span className={`w-1 h-1 rounded-full ${avail.dot}`} />
                              {avail.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {app.profile.age && `${app.profile.age} yrs`}{app.profile.gender && ` Â· ${app.profile.gender}`}{app.profile.city && ` Â· ${app.profile.city}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        app.status === "pending" ? "bg-amber-100 text-amber-800" :
                        app.status === "approved" ? "bg-green-100 text-green-800" :
                        app.notes === "removed_by_organizer" ? "bg-red-100 text-red-800" :
                        app.status === "rejected" ? "bg-gray-100 text-gray-600" :
                        "bg-gray-100 text-gray-500"
                      }`}>{app.notes === "removed_by_organizer" ? "Removed" : app.status}</span>
                      {app.status === "pending" && (
                        <>
                          <button onClick={() => handleApprove(app.id)} disabled={applying === app.id}
                            className="h-7 w-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-200 disabled:opacity-50">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleReject(app.id)} disabled={applying === app.id}
                            className="h-7 w-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 disabled:opacity-50">
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {app.status === "approved" && (
                        <button onClick={() => { if (confirm(`Remove ${app.profile.full_name} from this event?`)) handleRemove(app.id); }} disabled={applying === app.id}
                          className="h-7 px-2 rounded-full bg-red-50 text-red-600 text-[10px] font-medium flex items-center gap-1 hover:bg-red-100 disabled:opacity-50 border border-red-200">
                          <XCircle className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                    className="mt-1.5 text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600">
                    {expanded === app.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {expanded === app.id ? "Hide" : "Profile"}
                  </button>
                  {expanded === app.id && (
                    <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                      {app.profile.bio && <p className="italic">{app.profile.bio}</p>}
                      <div className="grid grid-cols-2 gap-1">
                        {app.profile.experience && <span>Exp: {app.profile.experience}</span>}
                        {app.profile.area && <span>Area: {app.profile.area}</span>}
                        {app.status === "approved" && app.profile.phone
                          ? <span className="flex items-center gap-1 text-green-700"><Phone className="w-3 h-3" />{app.profile.phone}
                              <button onClick={() => { navigator.clipboard.writeText(app.profile.phone!); toast.success("Phone copied"); }}
                                className="p-0.5 rounded hover:bg-green-100 text-green-500 hover:text-green-700 transition-colors">
                                <Copy className="w-3 h-3" />
                              </button>
                            </span>
                          : app.status !== "approved" && app.profile.phone && <span className="text-gray-400 italic">Contact hidden until approval</span>
                        }
                      </div>
                      {/* Profile strength */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex-1 max-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            completion >= 80 ? "bg-emerald-500" : completion >= 50 ? "bg-amber-500" : "bg-indigo-600"
                          }`} style={{ width: `${completion}%` }} />
                        </div>
                        <span className={`text-[10px] font-medium ${
                          completion >= 80 ? "text-emerald-600" : completion >= 50 ? "text-amber-600" : "text-gray-400"
                        }`}>{completion}% profile</span>
                      </div>
                      {app.profile.skills && app.profile.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {app.profile.skills.map((s, i) => <span key={i} className="bg-gray-100 px-2 py-0.5 rounded-full">{s}</span>)}
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        </Card>

        {/* Instructions */}
        {(event.reporting_details || event.instructions || event.contact_person_notes) && (
          <Card>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Reporting & Notes</p>
            {event.reporting_details && <p className="text-sm text-gray-700 mb-2">{event.reporting_details}</p>}
            {event.instructions && <p className="text-sm text-gray-700 mb-2">{event.instructions}</p>}
            {event.contact_person_notes && <p className="text-sm text-gray-700">{event.contact_person_notes}</p>}
          </Card>
        )}
      </main>

      {showEdit && (
        <EditEventModal
          event={event}
          onClose={() => setShowEdit(false)}
          onUpdated={() => { setShowEdit(false); loadData(); }}
        />
      )}

      {/* Sticky bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex gap-2 overflow-x-auto">
          <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)} disabled={!canEdit}>
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={duplicate}>
            <Copy className="w-3.5 h-3.5" /> Duplicate
          </Button>
          {(event.status === "published" || event.status === "filling") && (
            <Button variant="warning" size="sm" onClick={() => updateStatus("closed")}>
              <XCircle className="w-3.5 h-3.5" /> Close
            </Button>
          )}
          {event.status === "draft" && (
            <Button variant="success" size="sm" onClick={() => updateStatus("published")}>
              Publish
            </Button>
          )}
          {event.status !== "completed" && event.status !== "cancelled" && event.status !== "draft" && (
            <Button variant="secondary" size="sm" onClick={() => { if (confirm("Mark as completed?")) updateStatus("completed"); }}>
              <CheckCircle className="w-3.5 h-3.5" /> Complete
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={deleteEvent}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

