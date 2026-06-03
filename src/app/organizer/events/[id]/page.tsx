"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Users, Edit3, Copy, XCircle, CheckCircle, Trash2, MapPin, Calendar, Clock,
  Clock3, IndianRupee, AlertTriangle, Check, X as XIcon,
  ChevronDown, ChevronUp, Phone, Mail, Award, Briefcase, Filter, Sparkles,
  MoreHorizontal, Ban, UserCheck, UserX, Eye, Star, Target,
} from "lucide-react";
import { toast } from "sonner";
import { PageLoader } from "@/lib/design/Loading";
import { ConfirmDialog } from "@/lib/design/Modal";
import type { Event, Profile, Application } from "@/lib/supabase/types";
import { AVAIL_CONFIG, computeCompletion, STATUS_STYLES, STATUS_LABELS, formatDate } from "@/lib/organizer/constants";
import { loadApplicantsForEvent, updateApplicantStatus, removeApplicant } from "@/lib/organizer/applicantUtils";
import type { ApplicantWithProfile } from "@/lib/organizer/applicantUtils";
import EditEventModal from "@/app/organizer/dashboard/EditEventModal";

export default function OrganizerEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [event, setEvent] = useState<Event | null>(null);
  const [applicants, setApplicants] = useState<ApplicantWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"" | "pending" | "approved" | "rejected">("");
  const [showEdit, setShowEdit] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "complete" } | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [id]);

  const loadData = useCallback(async () => { try { const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (!prof || prof.role !== "organizer") { router.push("/login"); return; }

    const { data: evt } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
    if (!evt || evt.organizer_id !== user.id) { router.push("/organizer/dashboard"); return; }
    setEvent(evt);

    const result = await loadApplicantsForEvent(id);
    setApplicants(result);
     } catch (err) { console.error("[OrganizerEventDetailPage] error:", err); } finally { setLoading(false); } }, [id]);

  const handleApprove = async (applicationId: string) => {
    if (!event) return;
    setApplying(applicationId);
    await updateApplicantStatus(applicationId, "approved", event, applicants, loadData);
    setApplying(null);
    if (event) {
      const newApproved = applicants.filter(a => a.status === "approved" || a.id === applicationId).length;
      if (newApproved >= event.worker_count && event.status !== "full") {
        setEvent({ ...event, status: "full" });
      }
    }
  };

  const handleReject = async (applicationId: string) => {
    if (!event) return;
    setApplying(applicationId);
    await updateApplicantStatus(applicationId, "rejected", event, applicants, loadData);
    setApplying(null);
  };

  const handleRemove = async (applicationId: string) => {
    if (!event) return;
    setApplying(applicationId);
    await removeApplicant(applicationId, event, applicants, loadData);
    if (event.status === "full") setEvent({ ...event, status: "filling" });
    setApplying(null);
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
  const fillPercent = Math.min(100, Math.round((approvedCount / event.worker_count) * 100));

  return (
    <div className="min-h-screen bg-[#F8F8F6] pb-24">
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/organizer/dashboard" aria-label="Back to dashboard" className="p-1.5 -ml-1.5 text-gray-500 hover:text-[#0D9488] hover:bg-[#0D9488]/10 rounded-[10px] transition-all"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-sm truncate">{event.title}</h1>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[event.status]}`}>
              {STATUS_LABELS[event.status]}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="space-y-1.5 animate-fade-in">
          {isToday && <div className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2"><Clock3 className="w-3.5 h-3.5 shrink-0" /><span className="font-medium">Starts today</span></div>}
          {isTomorrow && <div className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2"><Clock3 className="w-3.5 h-3.5 shrink-0" /><span className="font-medium">Starts tomorrow</span></div>}
          {remaining <= 3 && remaining > 0 && <div className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /><span className="font-medium">Only {remaining} seat{remaining !== 1 ? "s" : ""} left</span></div>}
          {deadlineToday && <div className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /><span className="font-medium">Application deadline is today</span></div>}
          {deadlineSoon && !deadlineToday && <div className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2"><Clock3 className="w-3.5 h-3.5 shrink-0" /><span className="font-medium">Deadline closing soon</span></div>}
          {pendingCount > 0 && <div className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2"><Users className="w-3.5 h-3.5 shrink-0" /><span className="font-medium">{pendingCount} pending approval{pendingCount !== 1 ? "s" : ""}</span></div>}
        </div>

        <div className="bg-gradient-to-br from-[#0D9488] via-[#0D9488] to-[#0F766E] rounded-[20px] p-5 shadow-[0_8px_32px_rgba(13,148,136,0.2)]">
          <div className="flex items-start justify-between mb-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-white text-lg font-bold leading-tight">{event.title}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {event.category && (
                  <span className="text-[10px] font-medium bg-white/20 text-white px-2.5 py-0.5 rounded-full capitalize backdrop-blur-sm">
                    {event.category.replace(/_/g, " ")}
                  </span>
                )}
                {event.payment_info && (
                  <span className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
                    <IndianRupee className="w-3 h-3" />{event.payment_info}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-white/80">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-white/60" />
              <span>{formatDate(event.date, event.date_display)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-white/60" />
              <span>{event.time}{event.end_time ? `-${event.end_time}` : ""}</span>
            </div>
            <div className="col-span-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-white/60 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Operation Metrics</p>
          <div className="grid grid-cols-5 gap-2">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-700">{approvedCount}</p>
              <p className="text-[9px] text-gray-400 font-medium mt-0.5">Approved</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-700">{pendingCount}</p>
              <p className="text-[9px] text-gray-400 font-medium mt-0.5">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-600">{rejectedCount}</p>
              <p className="text-[9px] text-gray-400 font-medium mt-0.5">Rejected</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${remaining <= 0 ? "text-purple-700" : "text-gray-900"}`}>{remaining <= 0 ? "—" : remaining}</p>
              <p className="text-[9px] text-gray-400 font-medium mt-0.5">Open</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-700">{fillPercent}%</p>
              <p className="text-[9px] text-gray-400 font-medium mt-0.5">Fill Rate</p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${
              fillPercent >= 100 ? "bg-purple-500" : fillPercent >= 80 ? "bg-emerald-500" : fillPercent >= 50 ? "bg-[#0D9488]" : "bg-amber-500"
            }`} style={{ width: `${Math.max(2, fillPercent)}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-right">{approvedCount}/{event.worker_count} filled ({remaining > 0 ? `${remaining} open` : "full"})</p>
        </div>

        <div className="bg-white rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Event Schedule</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-[10px] px-3 py-2.5">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="font-medium">{formatDate(event.date, event.date_display)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-[10px] px-3 py-2.5">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="font-medium">{event.time}{event.end_time ? `-${event.end_time}` : ""}</span>
            </div>
            <div className="col-span-2 flex items-center gap-2 text-gray-600 bg-gray-50 rounded-[10px] px-3 py-2.5">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="font-medium truncate">{event.location}</span>
            </div>
          </div>
          {event.application_deadline && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500 bg-amber-50 rounded-[10px] px-3 py-2">
              <Clock3 className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-medium">Apply by {new Date(event.application_deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            </div>
          )}
        </div>

        {(event.gender_requirement || event.min_age || event.max_age || event.work_description || event.experience_required || event.skill_requirements || event.dress_code) && (
          <div className="bg-white rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Worker Requirements</p>
            {event.work_description && (
              <p className="text-sm text-gray-700 leading-relaxed mb-3 bg-gray-50 rounded-[10px] px-3 py-2.5">{event.work_description}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {event.gender_requirement && <span className="text-[11px] bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium capitalize">{event.gender_requirement}</span>}
              {(event.min_age || event.max_age) && <span className="text-[11px] bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">{event.min_age || 0}-{event.max_age || 99} yrs</span>}
              {event.dress_code && <span className="text-[11px] bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">{event.dress_code}</span>}
              {event.skill_requirements?.map((s, i) => <span key={i} className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">{s}</span>)}
            </div>
            {(event.food_included || event.travel_included) && (
              <div className="flex gap-2 mt-3">
                {event.food_included && <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">✓ Food</span>}
                {event.travel_included && <span className="text-[11px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">✓ Travel</span>}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-[16px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="px-4 pt-4 pb-3 border-b border-[rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Talent Pipeline ({applicants.length})
              </h3>
              <span className="text-[10px] text-gray-400">{approvedCount} selected · {pendingCount} to review</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {([["", `All`], ["pending", `Pending (${pendingCount})`], ["approved", `Selected (${approvedCount})`], ["rejected", `Declined (${rejectedCount})`]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`h-8 px-3 rounded-[10px] text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 ${
                    filter === key ? "bg-[#0D9488] text-white shadow-[0_2px_8px_rgba(13,148,136,0.2)]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
            {filteredApplicants.length === 0 && (
              <div className="text-center py-10">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400 font-medium">No applicants in this stage</p>
                <p className="text-xs text-gray-300 mt-1">Applications will appear here as workers apply</p>
              </div>
            )}
            {filteredApplicants.map(app => {
              const avail = app.profile.availability ? AVAIL_CONFIG[app.profile.availability] : null;
              const completion = computeCompletion(app.profile);
              return (
              <div key={app.id} className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.06)] overflow-hidden transition-all hover:border-[rgba(0,0,0,0.12)]">
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#0D9488]/10 to-[#0D9488]/20 flex items-center justify-center text-[#0D9488] font-bold text-sm">
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
                        <p className="text-xs text-gray-500">
                          {[app.profile.age && `${app.profile.age}y`, app.profile.gender, app.profile.city].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        app.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        app.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        app.notes === "removed_by_organizer" ? "bg-red-50 text-red-700 border border-red-200" :
                        app.status === "rejected" ? "bg-gray-50 text-gray-500 border border-gray-200" :
                        "bg-gray-50 text-gray-500 border border-gray-200"
                      }`}>{app.notes === "removed_by_organizer" ? "Removed" : app.status}</span>
                      {app.status === "pending" && (
                        <>
                          <button onClick={() => handleApprove(app.id)} disabled={applying === app.id}
                            className="h-8 w-8 rounded-[10px] bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-50 transition-all active:scale-90" aria-label="Approve">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleReject(app.id)} disabled={applying === app.id}
                            className="h-8 w-8 rounded-[10px] bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 hover:text-red-600 disabled:opacity-50 transition-all active:scale-90" aria-label="Reject">
                            <XIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {app.status === "approved" && (
                        <button onClick={() => handleRemove(app.id)} disabled={applying === app.id}
                          className="h-7 px-2.5 rounded-[10px] bg-red-50 text-red-600 text-[10px] font-medium flex items-center gap-1 hover:bg-red-100 disabled:opacity-50 border border-red-200 transition-all active:scale-95">
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
                                className="p-0.5 rounded hover:bg-emerald-100 text-emerald-500 hover:text-emerald-700 transition-colors" aria-label="Copy phone">
                                <Copy className="w-3 h-3" />
                              </button>
                            </span>
                          : app.status !== "approved" && app.profile.phone && <span className="text-gray-400 italic flex items-center gap-1.5 col-span-2"><Phone className="w-3 h-3" />Contact hidden until approval</span>
                        }
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[100px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            completion >= 80 ? "bg-emerald-500" : completion >= 50 ? "bg-amber-500" : "bg-[#0D9488]"
                          }`} style={{ width: `${completion}%` }} />
                        </div>
                        <span className={`text-[10px] font-medium ${
                          completion >= 80 ? "text-emerald-600" : completion >= 50 ? "text-amber-600" : "text-gray-400"
                        }`}>{completion}% profile</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          app.profile.status === "trusted" ? "bg-emerald-50 text-emerald-700" :
                          app.profile.status === "basic_verified" ? "bg-blue-50 text-blue-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>{app.profile.status.replace(/_/g, " ")}</span>
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
        </div>

        {(event.reporting_details || event.instructions || event.contact_person_notes) && (
          <div className="bg-white rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Reporting & Instructions</p>
            <div className="space-y-2.5">
              {event.reporting_details && <p className="text-sm text-gray-700 bg-gray-50 rounded-[10px] px-3 py-2.5 leading-relaxed">{event.reporting_details}</p>}
              {event.instructions && <p className="text-sm text-gray-700 bg-gray-50 rounded-[10px] px-3 py-2.5 leading-relaxed">{event.instructions}</p>}
              {event.contact_person_notes && (
                <p className="text-sm text-gray-700 bg-amber-50 rounded-[10px] px-3 py-2.5 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{event.contact_person_notes}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {showEdit && (
        <EditEventModal
          event={event}
          onClose={() => setShowEdit(false)}
          onUpdated={() => { setShowEdit(false); loadData(); }}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] z-10 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-lg mx-auto px-4 py-2.5 flex gap-2 overflow-x-auto">
          <button onClick={() => setShowEdit(true)} disabled={!canEdit}
            className="h-9 px-4 rounded-[10px] border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all active:scale-[0.97] flex items-center gap-1.5 shrink-0">
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={duplicate}
            className="h-9 px-4 rounded-[10px] border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all active:scale-[0.97] flex items-center gap-1.5 shrink-0">
            <Copy className="w-3.5 h-3.5" /> Duplicate
          </button>
          {(event.status === "published" || event.status === "filling") && (
            <button onClick={() => updateStatus("closed")}
              className="h-9 px-4 rounded-[10px] bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-all active:scale-[0.97] flex items-center gap-1.5 shrink-0">
              <XCircle className="w-3.5 h-3.5" /> Close
            </button>
          )}
          {event.status === "draft" && (
            <button onClick={() => updateStatus("published")}
              className="h-9 px-4 rounded-[10px] bg-[#0D9488] text-white text-xs font-semibold hover:bg-teal-700 transition-all active:scale-[0.97] flex items-center gap-1.5 shrink-0 shadow-[0_2px_8px_rgba(13,148,136,0.2)]">
              <Sparkles className="w-3.5 h-3.5" /> Publish
            </button>
          )}
          {event.status !== "completed" && event.status !== "cancelled" && event.status !== "draft" && (
            <button onClick={() => setConfirmAction({ type: "complete" })}
              className="h-9 px-4 rounded-[10px] border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all active:scale-[0.97] flex items-center gap-1.5 shrink-0">
              <CheckCircle className="w-3.5 h-3.5" /> Complete
            </button>
          )}
          <button onClick={() => setConfirmAction({ type: "delete" })}
            className="h-9 px-4 rounded-[10px] bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-all active:scale-[0.97] flex items-center gap-1.5 shrink-0">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction?.type === "delete" || false}
        onClose={() => setConfirmAction(null)}
        onConfirm={deleteEvent}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
      <ConfirmDialog
        open={confirmAction?.type === "complete" || false}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { updateStatus("completed"); setConfirmAction(null); }}
        title="Mark as Completed"
        message="Mark this event as completed? This will notify workers and move the event to past events."
        confirmLabel="Complete"
        variant="warning"
      />
    </div>
  );
}
