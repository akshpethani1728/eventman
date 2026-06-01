"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ArrowUpRight, MapPin, Calendar, Clock, Users, IndianRupee, Shirt, AlertCircle, User, Briefcase, Award, ShieldCheck, CheckCircle, Hourglass, Phone, Timer, Info, ListChecks, XCircle, BadgeCheck, ListPlus, ListMinus, CreditCard, RefreshCw } from "lucide-react";
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

      const { count } = await supabase.from("applications").select("id", { count: "exact", head: true }).eq("event_id", id).eq("status", "approved");
      setApprovedCount(count || 0);

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

  const showContact = application?.status === "approved";
  const planCheck = workerProfile ? checkPlanStatus(workerProfile) : null;
  const canApply = planCheck?.canApply ?? true;
  const hoursUntilEvent = event ? (new Date(event.date).getTime() - timeNow) / 3600000 : 0;
  const daysUntilEvent = Math.ceil(hoursUntilEvent / 24);
  const isEventUrgent = hoursUntilEvent > 0 && hoursUntilEvent < 24;
  const isEventToday = daysUntilEvent === 0;
  const isFull = event ? (approvedCount >= event.worker_count) : false;
  const deadlinePassed = event?.application_deadline ? new Date(event.application_deadline).getTime() <= timeNow : false;
  const waitlisted = application ? isWaitlisted(application) : false;

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="h-0.5 bg-gradient-to-r from-[#0D9488]/20 via-[#0D9488] to-[#0D9488]/20" />
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/worker/dashboard" className="p-1 -ml-1 text-[#6B6B6B]"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold text-[#1A1A1A] truncate">Event Details</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 pb-28">

        {/* Approval Hero */}
        {application?.status === "approved" && (
          <div className="mb-4 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[16px] p-5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.03)] shadow-emerald-600/20 overflow-hidden relative">
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
                <div className={`mt-3 flex items-center gap-2 text-xs font-semibold ${
                  isEventUrgent ? "text-amber-200" : "text-emerald-100"
                } bg-white/10 rounded-[14px] px-3 py-2`}>
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

        {/* Application status summary */}
        {application && application.status !== "approved" && !isWaitlisted(application) && (
          <div className={`mb-4 rounded-[16px] p-4 card-base ${
            application.status === "pending"
              ? "bg-amber-50/50"
              : "bg-gray-50/50"
          }`}>
            <div className="flex items-center gap-2.5">
              {application.status === "pending" ? (
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-[#6B6B6B] shrink-0" />
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

        {/* Waitlisted status */}
        {waitlisted && (
          <div className="mb-4 rounded-[16px] p-4 card-base bg-purple-50/50">
            <div className="flex items-center gap-2.5">
              <ListPlus className="w-5 h-5 text-purple-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-800">On Waitlist</p>
                <p className="text-xs text-purple-600 mt-0.5">Waiting for a spot to open up &mdash; you&apos;ll be moved up if a selected worker becomes unavailable</p>
              </div>
            </div>
          </div>
        )}

        <div className="card-base p-5 mb-3 rounded-[16px]">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">{event.title}</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {event.category && <span className="text-xs bg-teal-50 text-[#0D9488] px-2.5 py-1 rounded-full capitalize">{event.category.replace(/_/g, " ")}</span>}
            <span className={`text-xs px-2.5 py-1 rounded-full ${event.worker_count - approvedCount === 0 ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-[#6B6B6B]"}`}>
              {event.worker_count - approvedCount} of {event.worker_count} spots left
            </span>
          </div>
          {event.application_deadline && !deadlinePassed && (
            <p className="text-xs text-amber-700 mt-2">Apply by {new Date(event.application_deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          )}
          {event.application_deadline && deadlinePassed && (
            <p className="text-xs text-[#6B6B6B] mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Applications closed on {new Date(event.application_deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
          {event.payment_info && (
            <p className="text-green-700 font-bold text-base flex items-center gap-1.5 mt-2"><IndianRupee className="w-5 h-5" />{event.payment_info}</p>
          )}
        </div>

        <div className="card-base p-5 mb-3 rounded-[16px] space-y-4">
          <h3 className="font-semibold text-sm text-[#6B6B6B] uppercase tracking-wide">Event Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-0.5 text-[#0D9488] shrink-0" />
              <div>
                <p className="text-[#A1A1AA] text-xs">Location</p>
                <p className="font-medium text-[#1A1A1A]">{event.location}</p>
                <a href={`https://www.google.com/maps/search/${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#0D9488] font-medium mt-0.5 inline-block">Open in Google Maps &rarr;</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 mt-0.5 text-[#0D9488] shrink-0" />
              <div>
                <p className="text-[#A1A1AA] text-xs">Event Date</p>
                <p className="font-medium text-[#1A1A1A]">{event.date_display || event.date}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-0.5 text-[#0D9488] shrink-0" />
              <div>
                <p className="text-[#A1A1AA] text-xs">Reporting Time</p>
                <p className="font-medium text-[#1A1A1A]">{event.time}{event.end_time ? ` — ${event.end_time}` : ""}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 mt-0.5 text-[#0D9488] shrink-0" />
              <div>
                <p className="text-[#A1A1AA] text-xs">Workers Needed</p>
                <p className="font-medium text-[#1A1A1A]">{event.worker_count}</p>
              </div>
            </div>
          </div>
        </div>

        {(event.gender_requirement || event.min_age || event.max_age || event.dress_code || event.work_description || event.experience_required || event.skill_requirements || event.grooming_notes) && (
          <div className="card-base p-5 mb-3 rounded-[16px] space-y-4">
            <h3 className="font-semibold text-sm text-[#6B6B6B] uppercase tracking-wide">Requirements</h3>
            <div className="space-y-3 text-sm">
              {event.gender_requirement && <div className="flex items-start gap-3"><User className="w-4 h-4 mt-0.5 text-[#0D9488] shrink-0" /><div><p className="text-[#A1A1AA] text-xs">Gender</p><p className="font-medium text-[#1A1A1A] capitalize">{event.gender_requirement}</p></div></div>}
              {(event.min_age || event.max_age) && <div className="flex items-start gap-3"><AlertCircle className="w-4 h-4 mt-0.5 text-[#0D9488] shrink-0" /><div><p className="text-[#A1A1AA] text-xs">Age Range</p><p className="font-medium text-[#1A1A1A]">{event.min_age || 0} - {event.max_age || 99} years</p></div></div>}
              {(event.work_description || event.experience_required) && <div className="flex items-start gap-3"><Briefcase className="w-4 h-4 mt-0.5 text-[#0D9488] shrink-0" /><div><p className="text-[#A1A1AA] text-xs">Work Description</p><p className="font-medium text-[#1A1A1A] whitespace-pre-wrap">{event.work_description || event.experience_required}</p></div></div>}
              {event.skill_requirements && event.skill_requirements.length > 0 && (
                <div className="flex items-start gap-3">
                  <Award className="w-4 h-4 mt-0.5 text-[#0D9488] shrink-0" />
                  <div>
                    <p className="text-[#A1A1AA] text-xs">Skills Required</p>
                    <div className="flex flex-wrap gap-1 mt-1">{event.skill_requirements.map((s, i) => <span key={i} className="text-xs bg-teal-50 text-[#0D9488] px-2 py-0.5 rounded-full">{s}</span>)}</div>
                  </div>
                </div>
              )}
              {event.dress_code && <div className="flex items-start gap-3"><Shirt className="w-4 h-4 mt-0.5 text-[#0D9488] shrink-0" /><div><p className="text-[#A1A1AA] text-xs">Dress Code</p><p className="font-medium text-[#1A1A1A]">{event.dress_code}</p></div></div>}
              {event.grooming_notes && <div className="flex items-start gap-3"><AlertCircle className="w-4 h-4 mt-0.5 text-[#0D9488] shrink-0" /><div><p className="text-[#A1A1AA] text-xs">Grooming</p><p className="font-medium text-[#1A1A1A]">{event.grooming_notes}</p></div></div>}
            </div>
          </div>
        )}

        {event.required_documents && event.required_documents.length > 0 && (
          <div className="card-base p-5 mb-3 rounded-[16px] space-y-3">
            <h3 className="font-semibold text-sm text-[#6B6B6B] uppercase tracking-wide">Required Documents</h3>
            <div className="flex flex-wrap gap-2">{event.required_documents.map((doc, i) => <span key={i} className="text-xs bg-teal-50 text-[#0D9488] px-2.5 py-1 rounded-full">{doc}</span>)}</div>
          </div>
        )}

        {event.reporting_details && (
          <div className="card-base p-5 mb-3 rounded-[16px] space-y-3">
            <h3 className="font-semibold text-sm text-[#6B6B6B] uppercase tracking-wide">Reporting Details</h3>
            <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">{event.reporting_details}</p>
          </div>
        )}

        {event.instructions && (
          <div className="card-base p-5 mb-3 rounded-[16px] space-y-3">
            <h3 className="font-semibold text-sm text-[#6B6B6B] uppercase tracking-wide">Instructions</h3>
            <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">{event.instructions}</p>
          </div>
        )}

        {/* Organizer Info — contact hidden until approved */}
        {organizer && (
          <div className="rounded-[16px] p-4 bg-teal-50/40 space-y-3 mb-3 card-base">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[#6B6B6B] uppercase tracking-wide">Organized by</h3>
              {showContact && (
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg">Contact Available</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {organizer.avatar_url ? (
                <img src={organizer.avatar_url} alt="" className={`w-11 h-11 rounded-full object-cover ring-2 shrink-0 ${
                  showContact ? "ring-emerald-200" : organizer.is_trusted_organizer ? "ring-emerald-200" : organizer.status === "trusted" || organizer.status === "basic_verified" ? "ring-[#0D9488]/30" : "ring-gray-100"
                }`} />
              ) : (
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0 ${
                  showContact
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                    : organizer.is_trusted_organizer
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                      : organizer.status === "trusted" || organizer.status === "basic_verified"
                        ? "bg-gradient-to-br from-[#0D9488] to-[#0B7C71]"
                        : "bg-gradient-to-br from-[#0D9488] to-[#0B7C71]"
                }`}>
                  {organizer.full_name?.charAt(0) || "O"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold text-sm text-[#1A1A1A] truncate">{organizer.full_name}</p>
                  {organizer.is_trusted_organizer && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md">
                      <BadgeCheck className="w-3 h-3" />
                      Trusted
                    </span>
                  )}
                  {!organizer.is_trusted_organizer && (organizer.status === "trusted" || organizer.status === "basic_verified") && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#0D9488] bg-teal-50 border border-[#0D9488]/20 px-1.5 py-0.5 rounded-md">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#A1A1AA]">{organizerPastEvents} past event{organizerPastEvents !== 1 ? "s" : ""}</span>
                </div>
                {/* Contact — only visible after approval */}
                {showContact && organizer.phone && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-[14px] bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-600 font-medium">Organizer Contact</p>
                      <p className="text-sm font-semibold text-gray-900">{organizer.phone}</p>
                    </div>
                  </div>
                )}
                {!showContact && (
                  <div className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                    <Info className="w-3 h-3 text-[#A1A1AA]" />
                    <p className="text-[10px] text-[#A1A1AA]">Contact revealed after approval</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Application Status — only when not already shown as hero or waitlisted */}
        {application && !isWaitlisted(application) && application.status !== "approved" && application.status !== "pending" && !isRemovedByOrganizer(application) && (
          <div className="card-base p-5 mb-3 rounded-[16px]">
            <h3 className="font-semibold text-sm text-[#6B6B6B] uppercase tracking-wide mb-3">Application Status</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-gray-100 text-[#6B6B6B]">
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

        {/* Removed by organizer — show re-apply option */}
        {application && isRemovedByOrganizer(application) && (
          <div className="card-base p-5 mb-3 rounded-[16px] bg-amber-50/30">
            <h3 className="font-semibold text-sm text-[#6B6B6B] uppercase tracking-wide mb-3">Application Status</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-amber-100 text-amber-600">
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

      {/* Bottom bar */}
      {!application && deadlinePassed && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <div className="w-full h-14 rounded-[10px] bg-gray-50 backdrop-blur-xl border border-[rgba(0,0,0,0.06)] flex items-center justify-center text-[#6B6B6B] font-medium text-sm gap-2">
              <Clock className="w-4 h-4 text-[#A1A1AA]" /> Applications Closed — deadline has passed
            </div>
          </div>
        </div>
      )}

      {!application && !deadlinePassed && isFull && canApply && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <button onClick={handleJoinWaitlist} disabled={applying}
              className="w-full h-12 rounded-[10px] bg-purple-600 text-white font-medium text-base active:scale-[0.98] transition-all disabled:opacity-50 hover:bg-purple-700 flex items-center justify-center gap-2">
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
            <Link href="/worker/plans" className="w-full h-12 rounded-[10px] bg-amber-600 text-white font-medium text-base active:scale-[0.98] transition-all hover:bg-amber-700 flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4" /> Subscribe to Join Waitlist
            </Link>
          </div>
        </div>
      )}

      {!application && !deadlinePassed && !isFull && (event.status === "published" || event.status === "filling") && canApply && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <button onClick={handleApply} disabled={applying}
              className="w-full h-12 rounded-[10px] bg-[#0D9488] text-white font-medium text-base active:scale-[0.98] transition-all disabled:opacity-50 hover:bg-[#0B7C71] flex items-center justify-center gap-2">
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
            <Link href="/worker/plans" className="w-full h-12 rounded-[10px] bg-amber-600 text-white font-medium text-base active:scale-[0.98] transition-all hover:bg-amber-700 flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4" /> Subscribe to Apply
            </Link>
          </div>
        </div>
      )}

      {!application && !deadlinePassed && !isFull && event.status === "closed" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <div className="w-full h-14 rounded-[10px] bg-gray-50 backdrop-blur-xl border border-[rgba(0,0,0,0.06)] flex items-center justify-center text-[#6B6B6B] font-medium text-sm gap-2">
              <Info className="w-4 h-4 text-[#A1A1AA]" /> This event is no longer accepting applications
            </div>
          </div>
        </div>
      )}

      {application && application.status === "pending" && !isWaitlisted(application) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <div className="w-full h-14 rounded-[10px] bg-amber-50 backdrop-blur-xl border border-amber-200 flex items-center justify-center text-amber-800 font-medium text-sm gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Application submitted — waiting for organizer response
            </div>
          </div>
        </div>
      )}

      {waitlisted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] p-4 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto">
            <button onClick={handleLeaveWaitlist} disabled={applying}
              className="w-full h-12 rounded-[10px] border-2 border-purple-200 bg-purple-50 text-purple-700 font-medium text-base active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
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
              <div className={`w-full rounded-[10px] flex items-center justify-between px-5 py-3 bg-emerald-50 backdrop-blur-xl border border-emerald-200`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
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
              className="w-full h-12 rounded-[10px] bg-[#0D9488] text-white font-medium text-base active:scale-[0.98] transition-all disabled:opacity-50 hover:bg-[#0B7C71] flex items-center justify-center gap-2">
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
              className="w-full h-12 rounded-[10px] bg-[#0D9488] text-white font-medium text-base flex items-center justify-center gap-2 hover:bg-[#0B7C71]">
              <ArrowUpRight className="w-4 h-4" /> Browse More Events
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
