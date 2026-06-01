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
  available_this_week: { label: "Available This Week", dot: "bg-[#0D9488]", badge: "bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20" },
  available: { label: "Available", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  weekends: { label: "Weekends", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  evenings: { label: "Evenings", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700 border-purple-200" },
  busy: { label: "Busy", dot: "bg-red-500", badge: "bg-red-100 text-red-700 border-red-200" },
  unavailable: { label: "Unavailable", dot: "bg-gray-400", badge: "bg-gray-100 text-gray-500 border-gray-200" },
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", published: "bg-[#0D9488]/10 text-[#0D9488]",
  filling: "bg-emerald-50 text-emerald-700", full: "bg-purple-50 text-purple-700",
  closed: "bg-amber-50 text-amber-700", completed: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-50 text-red-700",
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
    <div className="min-h-screen bg-[#F8F8F6] pb-20">
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="h-0.5 bg-gradient-to-r from-[#0D9488]/20 via-[#0D9488] to-[#0D9488]/20" />
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/organizer/dashboard" className="p-1.5 -ml-1.5 text-gray-500 hover:text-[#0D9488] hover:bg-[#0D9488]/10 rounded-[10px] transition-all"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold text-sm truncate">{event.title}</h1>
          <Badge variant={event.status as any || "draft"} className="ml-auto">{STATUS_LABELS[event.status]}</Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <div className="space-y-1.5 animate-fade-in">
          {isToday && <div className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2"><Clock3 className="w-3.5 h-3.5 shrink-0" /><span className="font-medium">Starts today</span></div>}
          {isTomorrow && <div className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2"><Clock3 className="w-3.5 h-3.5 shrink-0" /><span className="font-medium">Starts tomorrow</span></div>}
          {remaining <= 3 && remaining > 0 && <div className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /><span className="font-medium">Only {remaining} seat{remaining !== 1 ? "s" : ""} left</span></div>}
          {deadlineToday && <div className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /><span className="font-medium">Application deadline is today</span></div>}
          {deadlineSoon && !deadlineToday && <div className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2"><Clock3 className="w-3.5 h-3.5 shrink-0" /><span className="font-medium">Deadline closing soon</span></div>}
          {pendingCount > 0 && <div className="text-xs bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2"><Users className="w-3.5 h-3.5 shrink-0" /><span className="font-medium">{pendingCount} pending approval{pendingCount !== 1 ? "s" : ""}</span></div>}
        </div>

        <Card>
          <CardHeader className="mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {event.category && <span className="text-[11px] font-medium bg-[#0D9488]/10 text-[#0D9488] px-2.5 py-0.5 rounded-full capitalize">{event.category.replace(/_/g, " ")}</span>}
            </div>
            <span className="text-[10px] text-gray-400 font-mono">{event.id.slice(0, 8)}</span>
          </CardHeader>
          <CardStats columns={3}>
            <CardStat label="Seats open" value={remaining} />
            <CardStat label="Approved" value={approvedCount} color="blue" />
            <CardStat label="Pending" value={pendingCount} color="amber" />
          </CardStats>
          <div className="mt-3 flex items-center justify-between">
            {(event.application_deadline) && (
              <p className="text-[11px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />Apply by {new Date(event.application_deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
            )}
            <div className="flex-1 ml-4">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  approvedCount >= event.worker_count ? "bg-purple-500" : approvedCount >= Math.ceil(event.worker_count * 0.8) ? "bg-emerald-500" : "bg-[#0D9488]"
                }`} style={{ width: `${Math.min(100, Math.round((approvedCount / event.worker_count) * 100))}%`}} />
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5 text-right">{approvedCount}/{event.worker_count} filled</p>
            </div>
          </div>
        </Card>

        <div className="card-base p-5 space-y-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Event Details</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600 bg-gray-50/80 rounded-[10px] px-3 py-2.5"><Calendar className="w-4 h-4 text-gray-400 shrink-0" /><span className="font-medium">{event.date_display || event.date}</span></div>
            <div className="flex items-center gap-2 text-gray-600 bg-gray-50/80 rounded-[10px] px-3 py-2.5"><Clock className="w-4 h-4 text-gray-400 shrink-0" /><span className="font-medium">{event.time}{event.end_time ? `-${event.end_time}` : ""}</span></div>
            <div className="col-span-2 flex items-center gap-2 text-gray-600 bg-gray-50/80 rounded-[10px] px-3 py-2.5"><MapPin className="w-4 h-4 text-gray-400 shrink-0" /><span className="font-medium truncate">{event.location}</span></div>
            {event.payment_info && <div className="col-span-2 flex items-center gap-2 text-emerald-700 bg-emerald-50/80 rounded-[10px] px-3 py-2.5"><IndianRupee className="w-4 h-4 shrink-0" /><span className="font-medium">{event.payment_info}</span></div>}
            {(event.food_included || event.travel_included) && (
              <div className="col-span-2 flex gap-3 text-xs">
                {event.food_included && <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">✓ Food included</span>}
                {event.travel_included && <span className="bg-[#0D9488]/10 text-[#0D9488] px-2.5 py-1 rounded-full font-medium">✓ Travel included</span>}
              </div>
            )}
          </div>
        </div>

        {(event.gender_requirement || event.min_age || event.max_age || event.work_description || event.experience_required || event.skill_requirements || event.dress_code) && (
          <div className="card-base p-5 space-y-3">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Requirements</p>
            {event.work_description && <p className="text-sm text-gray-700 leading-relaxed">{event.work_description}</p>}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {event.gender_requirement && <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full capitalize font-medium">{event.gender_requirement}</span>}
              {(event.min_age || event.max_age) && <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">{event.min_age || 0}-{event.max_age || 99} yrs</span>}
              {event.dress_code && <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">{event.dress_code}</span>}
              {event.skill_requirements?.map((s, i) => <span key={i} className="bg-[#0D9488]/10 text-[#0D9488] px-2.5 py-1 rounded-full font-medium">{s}</span>)}
            </div>
          </div>
        )}

        <Card padding="none">
          <div className="px-4 pt-4 pb-3 border-b border-[rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Applicants ({applicants.length})
              </h3>
              <span className="text-[10px] text-gray-400">{approvedCount} approved · {pendingCount} pending</span>
            </div>
            <div className="flex gap-1.5">
              {([["", `All (${applicants.length})`], ["pending", `Pending (${pendingCount})`], ["approved", `Approved (${approvedCount})`], ["rejected", `Rejected (${rejectedCount})`]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`h-7 px-2.5 rounded-[10px] text-[11px] font-medium transition-all ${
                    filter === key ? "bg-[#0D9488] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
            {filteredApplicants.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No applicants</p>
              </div>
            )}
            {filteredApplicants.map(app => {
              const avail = app.profile.availability ? AVAIL_CONFIG[app.profile.availability] : null;
              const completion = computeCompletion(app.profile);
              return (
              <div key={app.id} className="card-base overflow-hidden">
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#0D9488]/10 to-[#0D9488]/20 flex items-center justify-center text-[#0D9488] font-bold text-sm">
                          {app.profile.full_name?.charAt(0) || "W"}
                        </div>
                        {avail && (
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-white ${avail.dot}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm text-gray-900 truncate">{app.profile.full_name}</p>
                          {avail && (
                            <span className={`inline-flex items-center gap-0.5 text-[8px] font-medium px-1 py-0.5 rounded-full border ${avail.badge}`}>
                              <span className={`w-1 h-1 rounded-full ${avail.dot}`} />
                              {avail.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {app.profile.age && `${app.profile.age} yrs`}{app.profile.gender && ` · ${app.profile.gender}`}{app.profile.city && ` · ${app.profile.city}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                        app.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        app.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        app.notes === "removed_by_organizer" ? "bg-red-50 text-red-700 border border-red-200" :
                        app.status === "rejected" ? "bg-gray-50 text-gray-500 border border-gray-200" :
                        "bg-gray-50 text-gray-500 border border-gray-200"
                      }`}>{app.notes === "removed_by_organizer" ? "Removed" : app.status}</span>
                      {app.status === "pending" && (
                        <>
                          <button onClick={() => handleApprove(app.id)} disabled={applying === app.id}
                            className="h-8 w-8 rounded-[10px] bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-50 transition-all active:scale-90">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleReject(app.id)} disabled={applying === app.id}
                            className="h-8 w-8 rounded-[10px] bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 hover:text-red-600 disabled:opacity-50 transition-all active:scale-90">
                            <XIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {app.status === "approved" && (
                        <button onClick={() => { if (confirm(`Remove ${app.profile.full_name} from this event?`)) handleRemove(app.id); }} disabled={applying === app.id}
                          className="h-7 px-2.5 rounded-[10px] bg-red-50 text-red-600 text-[11px] font-medium flex items-center gap-1 hover:bg-red-100 disabled:opacity-50 border border-red-200 transition-all active:scale-95">
                          <XCircle className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                    className="mt-2 text-[11px] text-gray-400 flex items-center gap-1 hover:text-[#0D9488] transition-colors">
                    {expanded === app.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {expanded === app.id ? "Hide profile" : "View full profile"}
                  </button>
                  {expanded === app.id && (
                    <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)] text-xs text-gray-600 space-y-2.5">
                      {app.profile.bio && <p className="text-gray-700 leading-relaxed italic border-l-2 border-[#0D9488]/30 pl-3 py-0.5">{app.profile.bio}</p>}
                      <div className="grid grid-cols-2 gap-2">
                        {app.profile.experience && <span className="flex items-center gap-1.5 text-gray-600"><Briefcase className="w-3 h-3 text-gray-400" />{app.profile.experience}</span>}
                        {app.profile.area && <span className="flex items-center gap-1.5 text-gray-600"><MapPin className="w-3 h-3 text-gray-400" />{app.profile.area}</span>}
                        {app.status === "approved" && app.profile.phone
                          ? <span className="flex items-center gap-1.5 text-emerald-700 col-span-2"><Phone className="w-3 h-3" />{app.profile.phone}
                              <button onClick={() => { navigator.clipboard.writeText(app.profile.phone!); toast.success("Phone copied"); }}
                                className="p-0.5 rounded hover:bg-emerald-100 text-emerald-500 hover:text-emerald-700 transition-colors">
                                <Copy className="w-3 h-3" />
                              </button>
                            </span>
                          : app.status !== "approved" && app.profile.phone && <span className="text-gray-400 italic flex items-center gap-1.5 col-span-2"><Phone className="w-3 h-3" />Contact hidden until approval</span>
                        }
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex-1 max-w-[100px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            completion >= 80 ? "bg-emerald-500" : completion >= 50 ? "bg-amber-500" : "bg-[#0D9488]"
                          }`} style={{ width: `${completion}%` }} />
                        </div>
                        <span className={`text-[10px] font-medium ${
                          completion >= 80 ? "text-emerald-600" : completion >= 50 ? "text-amber-600" : "text-gray-400"
                        }`}>{completion}% profile</span>
                      </div>
                      {app.profile.skills && app.profile.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {app.profile.skills.map((s, i) => (
                            <span key={i} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-[10px]">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        </Card>

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

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] z-10 pb-[env(safe-area-inset-bottom,0px)]">
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
