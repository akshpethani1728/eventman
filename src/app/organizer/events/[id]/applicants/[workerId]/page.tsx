"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, BadgeCheck, ShieldCheck, ShieldAlert, Phone, Mail, Briefcase, MapPin, Clock, User,
  Check, X as XIcon, XCircle, ChevronUp, Copy, AlertCircle, CheckCircle, Star,
} from "lucide-react";
import { toast } from "sonner";
import { PageLoader } from "@/lib/design/Loading";
import { ConfirmDialog } from "@/lib/design/Modal";
import type { Event, Profile } from "@/lib/supabase/types";
import { AVAIL_CONFIG, computeCompletion } from "@/lib/organizer/constants";

interface ApplicantData {
  id: string;
  status: string;
  notes: string | null;
  worker_id: string;
  profile: Profile;
}

export default function WorkerProfilePage() {
  const { id: eventId, workerId } = useParams<{ id: string; workerId: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [event, setEvent] = useState<Event | null>(null);
  const [applicant, setApplicant] = useState<ApplicantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);

  useEffect(() => { loadData(); }, [eventId, workerId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!prof || prof.role !== "organizer") { router.push("/login"); return; }
      const { data: evt } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
      if (!evt || evt.organizer_id !== user.id) { router.push("/organizer/dashboard"); return; }
      setEvent(evt);

      const { data: apps } = await supabase
        .from("applications").select("*").eq("event_id", eventId).eq("worker_id", workerId).maybeSingle();

      if (apps) {
        const { data: workerProf } = await supabase.from("profiles").select("*").eq("user_id", workerId).maybeSingle();
        if (workerProf) {
          setApplicant({ ...apps, profile: workerProf, worker_id: workerId });
        }
      }
    } catch (err) { console.error("[WorkerProfilePage] error:", err); } finally { setLoading(false); }
  };

  const handleApprove = async () => {
    if (!applicant || !event) return;
    setApplying(true);
    const { error } = await supabase
      .from("applications").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", applicant.id);
    if (error) { toast.error(error.message); setApplying(false); return; }
    await supabase.from("notifications").insert({
      user_id: workerId, title: "Application Approved",
      message: `Your application for "${event.title}" has been approved.`,
    });
    const { data: allApps } = await supabase.from("applications").select("status").eq("event_id", eventId);
    const newApproved = allApps?.filter(a => a.status === "approved").length || 0;
    if (newApproved >= event.worker_count && event.status !== "full") {
      await supabase.from("events").update({ status: "full", updated_at: new Date().toISOString() }).eq("id", event.id);
      setEvent({ ...event, status: "full" });
    }
    toast.success("Applicant approved!");
    setApplying(false);
    loadData();
  };

  const handleReject = async () => {
    if (!applicant || !event) return;
    setApplying(true);
    const { error } = await supabase
      .from("applications").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", applicant.id);
    if (error) { toast.error(error.message); setApplying(false); return; }
    await supabase.from("notifications").insert({
      user_id: workerId, title: "Application Rejected",
      message: `Your application for "${event.title}" has been rejected.`,
    });
    toast.success("Applicant rejected");
    setApplying(false);
    loadData();
  };

  const handleRemove = async () => {
    if (!applicant || !event) return;
    setApplying(true);
    await supabase.from("applications").update({ status: "cancelled", notes: "removed_by_organizer", updated_at: new Date().toISOString() }).eq("id", applicant.id);
    await supabase.from("notifications").insert({
      user_id: workerId, title: "Removed from Event",
      message: `You have been removed from "${event.title}". The organizer cancelled your selection.`,
    });
    if (event.status === "full") {
      await supabase.from("events").update({ status: "filling", updated_at: new Date().toISOString() }).eq("id", event.id);
      setEvent({ ...event, status: "filling" });
    }
    toast.success("Worker removed");
    setRemoveConfirm(false);
    setApplying(false);
    loadData();
  };

  const handleRestore = async () => {
    if (!applicant) return;
    setApplying(true);
    const { error } = await supabase
      .from("applications").update({ status: "pending", notes: null, updated_at: new Date().toISOString() }).eq("id", applicant.id);
    if (error) { toast.error(error.message); setApplying(false); return; }
    toast.success("Applicant restored to pending");
    setApplying(false);
    loadData();
  };

  if (loading) return <PageLoader />;
  if (!event || !applicant) return (
    <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-lg font-bold text-gray-900">Worker not found</p>
        <p className="text-sm text-gray-500 mt-1.5">This applicant may have been removed or the link is invalid.</p>
        <Link href={`/organizer/events/${eventId}/applicants`} className="mt-6 inline-flex h-11 px-6 rounded-[14px] bg-[#0D9488] text-white text-sm font-semibold items-center gap-2 hover:bg-teal-700 transition-all active:scale-[0.97] shadow-[0_4px_12px_rgba(13,148,136,0.25)]">
          <ArrowLeft className="w-4 h-4" /> Back to Applicants
        </Link>
      </div>
    </div>
  );

  const p = applicant.profile;
  const avail = p.availability ? AVAIL_CONFIG[p.availability] : null;
  const completion = computeCompletion(p, true);
  const isPast = ["completed", "cancelled"].includes(event.status) || (event.date && event.date < new Date().toISOString().split("T")[0]);
  const canViewContact = applicant.status === "approved" && !isPast;

  return (
    <div className="min-h-screen bg-[#F8F8F6] pb-8">
      {/* Header */}
      <header className="bg-white border-b border-[rgba(0,0,0,0.06)]">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={`/organizer/events/${eventId}/applicants`} aria-label="Back to applicants" className="p-1.5 -ml-1.5 text-gray-500 hover:text-[#0D9488] hover:bg-[#0D9488]/10 rounded-[10px] transition-all active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-sm truncate">Worker Profile</h1>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto ${
            applicant.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-200" :
            applicant.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
            "bg-gray-100 text-gray-500 border border-gray-200"
          }`}>
            {applicant.notes === "removed_by_organizer" ? "Removed" : applicant.status.charAt(0).toUpperCase() + applicant.status.slice(1)}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-[#0D9488] via-[#0D9488] to-[#0F766E] rounded-[20px] p-6 shadow-[0_8px_32px_rgba(13,148,136,0.2)]">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-[16px] bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold ring-2 ring-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                {p.full_name?.charAt(0) || "W"}
              </div>
              {avail && <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[2px] border-[#0D9488] ${avail.dot}`} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-white font-bold text-xl leading-tight">{p.full_name}</h2>
                {p.status === "trusted" && <BadgeCheck className="w-5 h-5 text-emerald-300 shrink-0" />}
              </div>
              <p className="text-white/80 text-sm mt-0.5">
                {[p.age && `${p.age} yrs`, p.gender, p.city].filter(Boolean).join(" · ")}
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm ${
                  p.status === "trusted" ? "bg-emerald-500/20 text-white" :
                  p.status === "basic_verified" ? "bg-blue-500/20 text-white" :
                  "bg-white/10 text-white/70"
                }`}>
                  {p.status === "trusted" ? <ShieldCheck className="w-3 h-3" /> :
                   p.status === "basic_verified" ? <ShieldAlert className="w-3 h-3" /> : null}
                  {p.status.replace(/_/g, " ")}
                </span>
                {avail && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white/15 text-white px-2.5 py-1 rounded-full backdrop-blur-sm">
                    <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} /> {avail.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 max-w-[100px] h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${completion.percent >= 80 ? "bg-emerald-400" : completion.percent >= 50 ? "bg-amber-400" : "bg-white/40"}`}
                    style={{ width: `${completion.percent}%` }} />
                </div>
                <span className="text-[10px] text-white/70 font-medium">{completion.percent}% Profile</span>
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {p.skills && p.skills.length > 0 ? p.skills.map((s, i) => (
              <span key={i} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-[10px] font-medium">{s}</span>
            )) : <p className="text-xs text-gray-400">No skills listed</p>}
          </div>
        </div>

        {/* Experience */}
        <div className="bg-white rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Experience</p>
          {p.experience ? (
            <p className="text-sm text-gray-700 flex items-start gap-2">
              <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <span>{p.experience}</span>
            </p>
          ) : <p className="text-xs text-gray-400">No experience listed</p>}
        </div>

        {/* About */}
        <div className="bg-white rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">About</p>
          {p.bio ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{p.bio}</p>
          ) : <p className="text-xs text-gray-400">No bio provided</p>}
        </div>

        {/* Location */}
        <div className="bg-white rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Location</p>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{[p.city, p.area].filter(Boolean).join(", ") || "Not specified"}</span>
          </div>
        </div>

        {/* Contact (only if approved) */}
        {canViewContact && (
          <div className="bg-white rounded-[16px] border border-emerald-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-3 bg-emerald-50/80 border-b border-emerald-100 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Contact Information</span>
              <span className="text-[9px] text-emerald-500 ml-auto">Visible after approval</span>
            </div>
            <div className="p-5 space-y-3">
              {p.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-800 font-medium">{p.phone}</span>
                  <button onClick={() => { navigator.clipboard.writeText(p.phone!); toast.success("Phone copied"); }}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all active:scale-90" aria-label="Copy phone">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {p.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-800 font-medium truncate">{p.email}</span>
                </div>
              )}
              {!p.phone && !p.email && (
                <p className="text-xs text-gray-400">No contact details shared</p>
              )}
            </div>
          </div>
        )}

        {!canViewContact && (
          <div className="bg-white rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact</p>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {isPast ? "Contact hidden — event has ended" : "Contact details visible after approving this worker"}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {applicant.status === "pending" && (
            <>
              <button onClick={handleApprove} disabled={applying}
                className="flex-1 h-12 rounded-[14px] bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(16,185,129,0.25)]">
                <Check className="w-4 h-4" /> Approve
              </button>
              <button onClick={handleReject} disabled={applying}
                className="flex-1 h-12 rounded-[14px] bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2">
                <XIcon className="w-4 h-4" /> Reject
              </button>
            </>
          )}
          {applicant.status === "approved" && (
            <button onClick={() => setRemoveConfirm(true)} disabled={applying}
              className="w-full h-12 rounded-[14px] bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4" /> Remove Worker
            </button>
          )}
          {applicant.status === "rejected" && (
            <button onClick={handleRestore} disabled={applying}
              className="w-full h-12 rounded-[14px] bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2">
              <ChevronUp className="w-4 h-4" /> Restore to Pending
            </button>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={removeConfirm}
        onClose={() => setRemoveConfirm(false)}
        onConfirm={handleRemove}
        title="Remove Worker"
        message={`Remove ${p.full_name} from this event? They will be notified and the event may reopen for applications.`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
