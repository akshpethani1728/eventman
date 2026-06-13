"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, ArrowUpRight, MapPin, Calendar, Clock, Users, IndianRupee, Shirt,
  AlertCircle, User, Briefcase, Award, ShieldCheck, CheckCircle, Hourglass,
  Phone, Timer, Info, ListChecks, XCircle, BadgeCheck, ListPlus, ListMinus,
  CreditCard, RefreshCw, Star, ChevronDown, ChevronUp, Sparkles, Target,
  UtensilsCrossed, Car,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/lib/design/Button";
import { Card } from "@/lib/design/Card";
import { Badge, StatusDot, Divider } from "@/lib/design/Badge";
import { PageLoader } from "@/lib/design/Loading";
import type { Event, Application, Profile } from "@/lib/supabase/types";
import { checkPlanStatus } from "@/lib/subscription";

function isWaitlisted(app: Application) { return app.status === "pending" && app.notes === "waitlisted"; }
function isRemovedByOrganizer(app: Application) { return app.status === "cancelled" && app.notes === "removed_by_organizer"; }

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [event, setEvent] = useState<Event | null>(null);
  const [organizer, setOrganizer] = useState<Profile | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [approvedCount, setApprovedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const [organizerPastEvents, setOrganizerPastEvents] = useState(0);
  const [workerProfile, setWorkerProfile] = useState<Profile | null>(null);
  const [timeNow, setTimeNow] = useState(Date.now());

  useEffect(() => { loadEvent(); }, [id]);

  useEffect(() => {
    if (application?.status === "approved") {
      const interval = setInterval(() => setTimeNow(Date.now()), 60000);
      return () => clearInterval(interval);
    }
  }, [application?.status]);

  const loadEvent = async () => {
    try {
      const { data: evt } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      if (!evt) { router.push("/worker/dashboard"); return; }
      setEvent(evt);

      const { data: count } = await supabase.rpc("get_approved_count", { event_id_param: id });
      setApprovedCount(count ?? 0);

      const { data: org } = await supabase.from("profiles").select("*").eq("user_id", evt.organizer_id).maybeSingle();
      if (org) {
        setOrganizer(org);
        const { count: pc } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("organizer_id", org.user_id).in("status", ["completed", "cancelled"]);
        setOrganizerPastEvents(pc || 0);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
        if (prof) {
          setWorkerProfile(prof);
        }
        const { data: app } = await supabase.from("applications").select("*").eq("event_id", id).eq("worker_id", user.id).maybeSingle();
        if (app) setApplication(app);
      }
    } catch (err) {
      console.error("[EventDetailPage] error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (workerProfile) {
      const status = checkPlanStatus(workerProfile);
      if (!status.canApply) {
        toast.error("Your trial or subscription has expired. Purchase a plan to continue applying for events.");
        router.push("/worker/plans");
        return;
      }
    }
    setApplying(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please login"); setApplying(false); return; }
    const { data: existing } = await supabase.from("applications").select("id").eq("event_id", id).eq("worker_id", user.id).maybeSingle();
    if (existing) { toast.error("You already applied to this event"); setApplying(false); return; }
    const { error } = await supabase.from("applications").insert({ event_id: id, worker_id: user.id, status: "pending" });
    setApplying(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Applied successfully!");
    loadEvent();
  };

  const handleJoinWaitlist = async () => {
    if (workerProfile) {
      const status = checkPlanStatus(workerProfile);
      if (!status.canApply) {
        toast.error("Your trial or subscription has expired. Purchase a plan to continue applying for events.");
        router.push("/worker/plans");
        return;
      }
    }
    setApplying(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setApplying(false); toast.error("Please login"); return; }
    const { error } = await supabase.from("applications").insert({
      event_id: id, worker_id: user.id, status: "pending", notes: "waitlisted",
    });
    setApplying(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Added to waitlist!");
    loadEvent();
  };

  const handleLeaveWaitlist = async () => {
    if (!application) return;
    setApplying(true);
    const { error } = await supabase.from("applications").delete().eq("id", application.id);
    setApplying(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Left waitlist");
    loadEvent();
  };

  const handleReApply = async () => {
    if (workerProfile) {
      const status = checkPlanStatus(workerProfile);
      if (!status.canApply) {
        toast.error("Your trial or subscription has expired. Purchase a plan to continue applying for events.");
        router.push("/worker/plans");
        return;
      }
    }
    if (!application) return;
    setApplying(true);
    const { error: delError } = await supabase.from("applications").delete().eq("id", application.id);
    if (delError) { toast.error(delError.message); setApplying(false); return; }
    const { error: insError } = await supabase.from("applications").insert({
      event_id: id, worker_id: application.worker_id, status: "pending",
    });
    setApplying(false);
    if (insError) { toast.error(insError.message); return; }
    toast.success("Re-applied successfully!");
    loadEvent();
  };

  if (loading) return <PageLoader />;
  if (!event) return null;

  const isEventPast = ["completed", "cancelled"].includes(event.status) || (event.date && event.date < new Date().toISOString().split("T")[0]);
  const showContact = application?.status === "approved" && !isEventPast;
  const planCheck = workerProfile ? checkPlanStatus(workerProfile) : null;
  const canApply = planCheck?.canApply ?? true;
  const hoursUntilEvent = event ? (new Date(event.date).getTime() - timeNow) / 3600000 : 0;
  const daysUntilEvent = Math.ceil(hoursUntilEvent / 24);
  const isEventUrgent = hoursUntilEvent > 0 && hoursUntilEvent < 24;
  const isEventToday = daysUntilEvent === 0;
  const isFull = event ? (approvedCount >= event.worker_count) : false;
  const deadlinePassed = event?.application_deadline ? new Date(event.application_deadline).getTime() <= timeNow : false;
  const waitlisted = application ? isWaitlisted(application) : false;
  const remaining = event.worker_count - approvedCount;
  const fillPercent = Math.min(100, Math.round((approvedCount / event.worker_count) * 100));
  const isTrusted = organizer?.is_trusted_organizer;
  const orgStatus = organizer?.status;
  const isProfileVerified = orgStatus === "trusted" || orgStatus === "basic_verified";

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="h-0.5 bg-gradient-to-r from-[#0D9488]/20 via-[#0D9488] to-[#0D9488]/20" />
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/worker/dashboard" className="p-1 -ml-1 text-[#6B6B6B] active:scale-90 transition-transform"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold text-[#1A1A1A] truncate">Event Details</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 pb-32">
        {/* === HERO SECTION === */}
        <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-4">
          {/* Gradient header */}
          <div className="relative bg-gradient-to-br from-[#0D9488] to-teal-800 px-5 pt-6 pb-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

            {/* Category badge */}
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex-1">
                {event.category && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm mb-3 capitalize">
                    <Target className="w-3 h-3" />
                    {event.category.replace(/_/g, " ")}
                  </span>
                )}
                <h1 className="text-xl font-bold text-white leading-tight mt-1">{event.title}</h1>
                {event.payment_info && (
                  <div className="flex items-center gap-1 mt-2">
                    <IndianRupee className="w-5 h-5 text-teal-200" />
                    <span className="text-2xl font-black text-white">{event.payment_info}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info chips */}
            <div className="relative z-10 mt-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] text-white/90 bg-white/10 rounded-[10px] px-3 py-1.5 backdrop-blur-sm">
                <Calendar className="w-3.5 h-3.5" />
                {event.date_display || new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] text-white/90 bg-white/10 rounded-[10px] px-3 py-1.5 backdrop-blur-sm">
                <Clock className="w-3.5 h-3.5" />
                {event.time}{event.end_time ? ` — ${event.end_time}` : ""}
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] text-white/90 bg-white/10 rounded-[10px] px-3 py-1.5 backdrop-blur-sm max-w-[180px]">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            </div>

            {/* Trust indicators + seats */}
            <div className="relative z-10 mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-white/80">
                {remaining > 0 ? (
                  <><Users className="w-3.5 h-3.5" /> {remaining} of {event.worker_count} spots left</>
                ) : (
                  <span className="text-amber-200 font-medium">All spots filled</span>
                )}
              </div>
              {isTrusted && (
                <div className="flex items-center gap-1 text-[10px] font-semibold text-teal-100 bg-white/10 rounded-full px-2.5 py-1 backdrop-blur-sm">
                  <BadgeCheck className="w-3 h-3" />
                  Trusted Organizer
                </div>
              )}
            </div>
          </div>

          {/* Fill progress */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-[#6B6B6B]">Spots filled</span>
              <span className={`font-bold ${fillPercent >= 80 ? "text-red-600" : fillPercent >= 50 ? "text-amber-600" : "text-[#0D9488]"}`}>
                {fillPercent}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  fillPercent >= 80 ? "bg-red-500" : fillPercent >= 50 ? "bg-amber-500" : "bg-[#0D9488]"
                }`}
                style={{ width: `${Math.max(2, fillPercent)}%` }}
              />
            </div>

            {/* Deadline */}
            {event.application_deadline && (
              <div className="mt-3 flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5 text-[#A1A1AA]" />
                <span className="text-[#6B6B6B]">Apply by {new Date(event.application_deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                {!deadlinePassed && (
                  <span className={`font-semibold ${new Date(event.application_deadline).getTime() - timeNow < 86400000 * 2 ? "text-amber-600" : "text-[#0D9488]"}`}>
                    · {Math.ceil((new Date(event.application_deadline).getTime() - timeNow) / 86400000)}d left
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* === APPROVED HERO === */}
        {application?.status === "approved" && (
          <div className="mb-4 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[20px] p-5 text-white shadow-[0_8px_24px_rgba(5,150,105,0.2)] overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-100">Confirmation</p>
                  <p className="text-xl font-bold">You&apos;re Selected!</p>
                </div>
              </div>
              <p className="text-sm text-emerald-100 leading-relaxed">
                You&apos;ve been approved for <span className="font-semibold text-white">{event.title}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5 text-xs text-emerald-100 bg-white/10 rounded-lg px-3 py-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {event.date_display || new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-100 bg-white/10 rounded-lg px-3 py-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {event.time}
                </div>
              </div>
              {hoursUntilEvent > 0 && (
                <div className={`mt-3 flex items-center gap-2 text-xs font-semibold ${isEventUrgent ? "text-amber-200" : "text-emerald-100"} bg-white/10 rounded-[14px] px-3 py-2`}>
                  <Timer className={`w-4 h-4 ${isEventUrgent ? "animate-pulse" : ""}`} />
                  {isEventToday
                    ? "Event starts today — get ready!"
                    : isEventUrgent
                      ? `Starting in ${Math.floor(hoursUntilEvent)}h — be prepared!`
                      : `Event in ${daysUntilEvent} days`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* === APPLICATION STATUS (pending/other) === */}
        {application && application.status !== "approved" && !isWaitlisted(application) && (
          <div className={`mb-4 rounded-[20px] p-5 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] ${
            application.status === "pending" ? "border-l-4 border-amber-400" : "border-l-4 border-gray-300"
          }`}>
            <div className="flex items-center gap-3">
              {application.status === "pending" ? (
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-[#6B6B6B] shrink-0" />
              )}
              <div>
                <p className={`text-sm font-semibold ${application.status === "pending" ? "text-amber-800" : "text-[#1A1A1A]"}`}>
                  {application.status === "pending" ? "Application Pending" : application.status === "rejected" ? "Not Selected" : "Cancelled"}
                </p>
                <p className={`text-xs mt-0.5 ${application.status === "pending" ? "text-amber-600" : "text-[#6B6B6B]"}`}>
                  {application.status === "pending"
                    ? "Waiting for organizer to review your application"
                    : application.status === "rejected"
                      ? "The organizer chose another candidate"
                      : "Your application has been withdrawn"}
                </p>
              </div>
            </div>
            {application.notes && !isWaitlisted(application) && (
              <div className="mt-2 pt-2 border-t border-[rgba(0,0,0,0.06)] text-xs text-[#6B6B6B]">
                <span className="font-medium">Note:</span> {application.notes}
              </div>
            )}
          </div>
        )}

        {/* === WAITLISTED STATUS === */}
        {waitlisted && (
          <div className="mb-4 rounded-[20px] p-5 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-l-4 border-purple-400">
            <div className="flex items-center gap-3">
              <ListPlus className="w-5 h-5 text-purple-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-800">On Waitlist</p>
                <p className="text-xs text-purple-600 mt-0.5">Waiting for a spot to open up — you&apos;ll be moved up if a selected worker becomes unavailable</p>
              </div>
            </div>
          </div>
        )}

        {/* === ABOUT / DESCRIPTION === */}
        {event.work_description && (
          <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-4">
            <h3 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-[0.04em] mb-3">About This Event</h3>
            <p className="text-sm text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">{event.work_description}</p>
          </div>
        )}

        {/* === EVENT DETAILS === */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-4">
          <h3 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-[0.04em] mb-4">Event Details</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-[12px] bg-teal-50 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-[#0D9488]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#A1A1AA] font-medium">Location</p>
                <p className="text-[14px] font-semibold text-[#1A1A1A]">{event.location}</p>
                <a href={`https://www.google.com/maps/search/${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer"
                  className="text-[12px] text-[#0D9488] font-medium mt-0.5 inline-block">Open in Maps →</a>
              </div>
            </div>
            <div className="border-t border-[rgba(0,0,0,0.04)]" />
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-[12px] bg-teal-50 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-[#0D9488]" />
              </div>
              <div>
                <p className="text-[11px] text-[#A1A1AA] font-medium">Date</p>
                <p className="text-[14px] font-semibold text-[#1A1A1A]">{event.date_display || event.date}</p>
              </div>
            </div>
            <div className="border-t border-[rgba(0,0,0,0.04)]" />
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-[12px] bg-teal-50 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-[#0D9488]" />
              </div>
              <div>
                <p className="text-[11px] text-[#A1A1AA] font-medium">Reporting Time</p>
                <p className="text-[14px] font-semibold text-[#1A1A1A]">{event.time}{event.end_time ? ` — ${event.end_time}` : ""}</p>
              </div>
            </div>
            <div className="border-t border-[rgba(0,0,0,0.04)]" />
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-[12px] bg-teal-50 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-[#0D9488]" />
              </div>
              <div>
                <p className="text-[11px] text-[#A1A1AA] font-medium">Workers Needed</p>
                <p className="text-[14px] font-semibold text-[#1A1A1A]">{event.worker_count}</p>
              </div>
            </div>
            {event.experience_required && (
              <>
                <div className="border-t border-[rgba(0,0,0,0.04)]" />
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-[12px] bg-teal-50 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4 text-[#0D9488]" />
                  </div>
                  <div>
                    <p className="text-[11px] text-[#A1A1AA] font-medium">Experience</p>
                    <p className="text-[14px] font-semibold text-[#1A1A1A]">{event.experience_required}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* === REQUIREMENTS === */}
        {(event.gender_requirement || event.min_age || event.max_age || event.dress_code || event.skill_requirements || event.grooming_notes) && (
          <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-4">
            <h3 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-[0.04em] mb-4">Requirements</h3>
            <div className="flex flex-wrap gap-2">
              {event.gender_requirement && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-gray-50 border border-gray-100">
                  <User className="w-3.5 h-3.5 text-[#6B6B6B]" />
                  <span className="text-xs font-medium text-[#6B6B6B] capitalize">{event.gender_requirement}</span>
                </div>
              )}
              {(event.min_age || event.max_age) && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-gray-50 border border-gray-100">
                  <AlertCircle className="w-3.5 h-3.5 text-[#6B6B6B]" />
                  <span className="text-xs font-medium text-[#6B6B6B]">{event.min_age || 0} - {event.max_age || 99} yrs</span>
                </div>
              )}
              {event.dress_code && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-gray-50 border border-gray-100">
                  <Shirt className="w-3.5 h-3.5 text-[#6B6B6B]" />
                  <span className="text-xs font-medium text-[#6B6B6B]">{event.dress_code}</span>
                </div>
              )}
              {event.grooming_notes && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-gray-50 border border-gray-100">
                  <Info className="w-3.5 h-3.5 text-[#6B6B6B]" />
                  <span className="text-xs font-medium text-[#6B6B6B]">{event.grooming_notes}</span>
                </div>
              )}
            </div>
            {event.skill_requirements && event.skill_requirements.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wide mb-2">Skills Required</p>
                <div className="flex flex-wrap gap-1.5">
                  {event.skill_requirements.map((s, i) => (
                    <span key={i} className="text-xs font-medium bg-teal-50 text-[#0D9488] px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {event.food_included && (
              <div className="mt-3 text-xs text-green-700 font-medium flex items-center gap-1.5 bg-green-50 px-3 py-2 rounded-[10px]">
                <UtensilsCrossed className="w-3.5 h-3.5" /> Food Included
              </div>
            )}
            {event.travel_included && (
              <div className="mt-2 text-xs text-teal-700 font-medium flex items-center gap-1.5 bg-teal-50 px-3 py-2 rounded-[10px]">
                <Car className="w-3.5 h-3.5" /> Travel Included
              </div>
            )}
          </div>
        )}

        {/* === REQUIRED DOCUMENTS === */}
        {event.required_documents && event.required_documents.length > 0 && (
          <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-4">
            <h3 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-[0.04em] mb-3">Required Documents</h3>
            <div className="flex flex-wrap gap-2">
              {event.required_documents.map((doc, i) => (
                <span key={i} className="text-xs font-medium bg-teal-50 text-[#0D9488] px-3 py-1.5 rounded-full">{doc}</span>
              ))}
            </div>
          </div>
        )}

        {/* === REPORTING DETAILS === */}
        {event.reporting_details && (
          <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-4">
            <h3 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-[0.04em] mb-3">Reporting Details</h3>
            <div className="flex items-start gap-3 bg-amber-50/50 px-3 py-3 rounded-[12px] border border-amber-100/50">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">{event.reporting_details}</p>
            </div>
          </div>
        )}

        {/* === INSTRUCTIONS === */}
        {event.instructions && (
          <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-4">
            <h3 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-[0.04em] mb-3">Instructions</h3>
            <div className="flex items-start gap-3 px-3 py-3 rounded-[12px] bg-gray-50 border border-gray-100">
              <Info className="w-4 h-4 text-[#A1A1AA] shrink-0 mt-0.5" />
              <p className="text-sm text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">{event.instructions}</p>
            </div>
          </div>
        )}

        {/* === ORGANIZER SECTION === */}
        {organizer && (
          <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-4">
            <div className="bg-gradient-to-r from-[#0D9488]/5 to-teal-50/50 px-5 py-4">
              <h3 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-[0.04em]">Organized by</h3>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4">
                {organizer.avatar_url ? (
                  <img src={organizer.avatar_url} alt="" className={`w-14 h-14 rounded-full object-cover ring-2 shrink-0 ${
                    showContact ? "ring-emerald-200" : isTrusted ? "ring-emerald-200" : isProfileVerified ? "ring-[#0D9488]/30" : "ring-gray-100"
                  }`} />
                ) : (
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0 ${
                    showContact || isTrusted
                      ? "bg-gradient-to-br from-emerald-500 to-[#0D9488]"
                      : "bg-gradient-to-br from-[#0D9488] to-teal-700"
                  }`}>
                    {organizer.full_name?.charAt(0) || "O"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[15px] text-[#1A1A1A] truncate">{organizer.full_name}</p>
                    {isTrusted && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                        <BadgeCheck className="w-3 h-3" />
                        Trusted
                      </span>
                    )}
                    {!isTrusted && isProfileVerified && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#0D9488] bg-teal-50 border border-[#0D9488]/20 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[#6B6B6B]">{organizerPastEvents} event{organizerPastEvents !== 1 ? "s" : ""} hosted</span>
                    {organizer.city && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="text-xs text-[#6B6B6B]">{organizer.city}</span>
                      </>
                    )}
                  </div>

                  {/* Contact */}
                  {showContact && organizer.phone && (
                    <div className="flex items-center gap-3 mt-3 px-3 py-2.5 rounded-[14px] bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] text-emerald-600 font-medium">Organizer Contact</p>
                        <p className="text-sm font-bold text-gray-900">{organizer.phone}</p>
                      </div>
                    </div>
                  )}
                  {!showContact && (
                    <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-[12px] bg-gray-50 border border-gray-100">
                      <Info className="w-3.5 h-3.5 text-[#A1A1AA]" />
                      <p className="text-xs text-[#A1A1AA]">{isEventPast && application?.status === "approved" ? "Contact hidden — event has ended" : "Contact revealed after approval"}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional application status blocks */}
        {application && !isWaitlisted(application) && application.status !== "approved" && application.status !== "pending" && !isRemovedByOrganizer(application) && (
          <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-4">
            <h3 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-[0.04em] mb-3">Application Status</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] flex items-center justify-center bg-gray-100 text-[#6B6B6B]">
                {application.status === "rejected" ? <XCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-semibold text-sm text-[#1A1A1A] capitalize">{application.status === "rejected" ? "Not Selected" : application.status}</p>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  {application.status === "rejected"
                    ? "The organizer selected another candidate"
                    : "Application has been withdrawn"}
                </p>
              </div>
            </div>
            {application.notes && (
              <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)] text-sm text-[#6B6B6B]">
                <span className="font-medium">Feedback:</span> {application.notes}
              </div>
            )}
          </div>
        )}

        {application && isRemovedByOrganizer(application) && (
          <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-4 bg-amber-50/30">
            <h3 className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-[0.04em] mb-3">Application Status</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] flex items-center justify-center bg-amber-100 text-amber-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-amber-900">Removed by Organizer</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  The organizer removed you from this event. You can re-apply if you&apos;re still interested.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* === STICKY BOTTOM BAR === */}
      {!application && deadlinePassed && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <div className="w-full h-12 rounded-[14px] bg-gray-50 backdrop-blur-xl border border-[rgba(0,0,0,0.06)] flex items-center justify-center text-[#6B6B6B] font-medium text-sm gap-2">
              <Clock className="w-4 h-4 text-[#A1A1AA]" /> Applications Closed — deadline passed
            </div>
          </div>
        </div>
      )}

      {!application && !deadlinePassed && isFull && canApply && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <button onClick={handleJoinWaitlist} disabled={applying}
              className="w-full h-12 rounded-[14px] bg-purple-600 text-white font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50 hover:bg-purple-700 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(147,51,234,0.25)]">
              {applying ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              ) : (
                <><ListPlus className="w-4 h-4" /> Join Waitlist</>
              )}
            </button>
          </div>
        </div>
      )}

      {!application && !deadlinePassed && isFull && !canApply && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <Link href="/worker/plans" className="w-full h-12 rounded-[14px] bg-amber-600 text-white font-semibold text-sm active:scale-[0.98] transition-all hover:bg-amber-700 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(217,119,6,0.25)]">
              <CreditCard className="w-4 h-4" /> Subscribe to Join Waitlist
            </Link>
          </div>
        </div>
      )}

      {!application && !deadlinePassed && !isFull && (event.status === "published" || event.status === "filling") && canApply && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <button onClick={handleApply} disabled={applying}
              className="w-full h-12 rounded-[14px] bg-[#0D9488] text-white font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50 hover:bg-[#0B7C71] flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(13,148,136,0.25)]">
              {applying ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              ) : (
                <><Briefcase className="w-4 h-4" /> Apply for this Event</>
              )}
            </button>
          </div>
        </div>
      )}

      {!application && !deadlinePassed && !isFull && (event.status === "published" || event.status === "filling") && !canApply && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <Link href="/worker/plans" className="w-full h-12 rounded-[14px] bg-amber-600 text-white font-semibold text-sm active:scale-[0.98] transition-all hover:bg-amber-700 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(217,119,6,0.25)]">
              <CreditCard className="w-4 h-4" /> Subscribe to Apply
            </Link>
          </div>
        </div>
      )}

      {!application && !deadlinePassed && !isFull && event.status === "closed" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <div className="w-full h-12 rounded-[14px] bg-gray-50 backdrop-blur-xl border border-[rgba(0,0,0,0.06)] flex items-center justify-center text-[#6B6B6B] font-medium text-sm gap-2">
              <Info className="w-4 h-4 text-[#A1A1AA]" /> No longer accepting applications
            </div>
          </div>
        </div>
      )}

      {application && application.status === "pending" && !isWaitlisted(application) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <div className="w-full h-12 rounded-[14px] bg-amber-50 backdrop-blur-xl border border-amber-200 flex items-center justify-center text-amber-800 font-medium text-sm gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Application submitted — awaiting response
            </div>
          </div>
        </div>
      )}

      {waitlisted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <button onClick={handleLeaveWaitlist} disabled={applying}
              className="w-full h-12 rounded-[14px] border-2 border-purple-200 bg-purple-50 text-purple-700 font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {applying ? (
                <span className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin inline-block" />
              ) : (
                <><ListMinus className="w-4 h-4" /> Leave Waitlist</>
              )}
            </button>
          </div>
        </div>
      )}

      {application && application.status === "approved" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <div className="w-full rounded-[14px] flex items-center justify-between px-5 py-3 bg-emerald-50 backdrop-blur-xl border border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">You&apos;re Confirmed</p>
                  <p className="text-[10px] text-emerald-600">{event.date_display || new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} at {event.time}</p>
                </div>
              </div>
              {hoursUntilEvent > 0 && (
                <div className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                  isEventUrgent ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {isEventToday ? "Today!" : isEventUrgent ? `${Math.floor(hoursUntilEvent)}h` : `${daysUntilEvent}d`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {application && isRemovedByOrganizer(application) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <button onClick={handleReApply} disabled={applying}
              className="w-full h-12 rounded-[14px] bg-[#0D9488] text-white font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50 hover:bg-[#0B7C71] flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(13,148,136,0.25)]">
              {applying ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              ) : (
                <><RefreshCw className="w-4 h-4" /> Re-Apply for this Event</>
              )}
            </button>
          </div>
        </div>
      )}

      {application && (application.status === "rejected" || (application.status === "cancelled" && !isRemovedByOrganizer(application))) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <Link href="/worker/dashboard"
              className="w-full h-12 rounded-[14px] bg-[#0D9488] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#0B7C71] shadow-[0_4px_12px_rgba(13,148,136,0.25)]">
              <ArrowUpRight className="w-4 h-4" /> Browse More Events
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
