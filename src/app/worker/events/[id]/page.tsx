"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, MapPin, Calendar, Clock, Users, IndianRupee, Shirt, AlertCircle, User, Briefcase, Award, Star, ShieldCheck, XCircle, CheckCircle, Hourglass, Phone } from "lucide-react";
import { toast } from "sonner";
import type { Event, Application, Profile } from "@/lib/supabase/types";

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
  const [cancelling, setCancelling] = useState(false);
  const [organizerRating, setOrganizerRating] = useState(0);
  const [organizerPastEvents, setOrganizerPastEvents] = useState(0);

  useEffect(() => { loadEvent(); }, [id]);

  const loadEvent = async () => {
    const { data: evt } = await supabase.from("events").select("*").eq("id", id).single();
    if (!evt) { router.push("/worker/dashboard"); return; }
    setEvent(evt);

    const { count } = await supabase.from("applications").select("id", { count: "exact", head: true }).eq("event_id", id).eq("status", "approved");
    setApprovedCount(count || 0);

    const { data: org } = await supabase.from("profiles").select("*").eq("user_id", evt.organizer_id).single();
    if (org) {
      setOrganizer(org);
      const { data: revs } = await supabase.from("reviews").select("rating").eq("to_id", org.user_id);
      if (revs && revs.length > 0) setOrganizerRating(Math.round(revs.reduce((s, r) => s + r.rating, 0) / revs.length * 10) / 10);
      const { count: pc } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("organizer_id", org.user_id).in("status", ["completed", "cancelled"]);
      setOrganizerPastEvents(pc || 0);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: app } = await supabase.from("applications").select("*").eq("event_id", id).eq("worker_id", user.id).maybeSingle();
      if (app) setApplication(app);
    }
    setLoading(false);
  };

  const handleApply = async () => {
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

  const isCancellable = (appStatus: string) => {
    if (!event) return false;
    if (appStatus !== "pending" && appStatus !== "approved") return false;
    const hoursUntilEvent = (new Date(event.date).getTime() - Date.now()) / 3600000;
    return hoursUntilEvent >= 12;
  };

  const handleCancel = async () => {
    if (!application || !event) return;
    if (!isCancellable(application.status)) {
      toast.error("Cancellation unavailable within 12 hours of reporting time.");
      return;
    }
    if (!confirm("Cancel your application for this event?")) return;
    setCancelling(true);
    await supabase.from("applications").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", application.id);
    await supabase.from("notifications").insert({
      user_id: event.organizer_id, title: "Application Cancelled",
      message: `A worker has cancelled their application for "${event.title}".`,
    });
    if (event.status === "full") {
      await supabase.from("events").update({ status: "published", updated_at: new Date().toISOString() }).eq("id", event.id);
    }
    setCancelling(false);
    toast.success("Application cancelled");
    loadEvent();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading event...</p>
        </div>
      </div>
    );
  }
  if (!event) return null;

  const hoursUntilEvent = (new Date(event.date).getTime() - Date.now()) / 3600000;
  const canCancel = application && isCancellable(application.status);
  const showContact = application?.status === "approved";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/worker/dashboard" className="p-1 -ml-1"><ArrowLeft className="w-5 h-5 text-gray-700" /></Link>
          <h1 className="font-semibold truncate">Event Details</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 pb-28">
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3">
          <h2 className="text-lg font-bold mb-1">{event.title}</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {event.category && <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full capitalize">{event.category.replace(/_/g, " ")}</span>}
            <span className={`text-xs px-2.5 py-1 rounded-full ${event.worker_count - approvedCount === 0 ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
              {event.worker_count - approvedCount} of {event.worker_count} spots left
            </span>
          </div>
          {event.application_deadline && (
            <p className="text-xs text-amber-700 mt-2">Apply by {new Date(event.application_deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          )}
          {event.payment_info && (
            <p className="text-green-700 font-semibold text-sm flex items-center gap-1.5 mt-2"><IndianRupee className="w-4 h-4" />{event.payment_info}</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3 space-y-4">
          <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Event Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
              <div>
                <p className="text-gray-500 text-xs">Location</p>
                <p className="font-medium">{event.location}</p>
                <a href={`https://www.google.com/maps/search/${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 font-medium mt-0.5 inline-block">Open in Google Maps &rarr;</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
              <div>
                <p className="text-gray-500 text-xs">Event Date</p>
                <p className="font-medium">{event.date_display || event.date}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
              <div>
                <p className="text-gray-500 text-xs">Reporting Time</p>
                <p className="font-medium">{event.time}{event.end_time ? ` — ${event.end_time}` : ""}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
              <div>
                <p className="text-gray-500 text-xs">Workers Needed</p>
                <p className="font-medium">{event.worker_count}</p>
              </div>
            </div>
          </div>
        </div>

        {(event.gender_requirement || event.min_age || event.max_age || event.dress_code || event.experience_required || event.skill_requirements || event.grooming_notes) && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3 space-y-4">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Requirements</h3>
            <div className="space-y-3 text-sm">
              {event.gender_requirement && <div className="flex items-start gap-3"><User className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" /><div><p className="text-gray-500 text-xs">Gender</p><p className="font-medium capitalize">{event.gender_requirement}</p></div></div>}
              {(event.min_age || event.max_age) && <div className="flex items-start gap-3"><AlertCircle className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" /><div><p className="text-gray-500 text-xs">Age Range</p><p className="font-medium">{event.min_age || 0} - {event.max_age || 99} years</p></div></div>}
              {event.experience_required && <div className="flex items-start gap-3"><Briefcase className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" /><div><p className="text-gray-500 text-xs">Experience</p><p className="font-medium">{event.experience_required}</p></div></div>}
              {event.skill_requirements && event.skill_requirements.length > 0 && (
                <div className="flex items-start gap-3">
                  <Award className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Skills Required</p>
                    <div className="flex flex-wrap gap-1 mt-1">{event.skill_requirements.map((s, i) => <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{s}</span>)}</div>
                  </div>
                </div>
              )}
              {event.dress_code && <div className="flex items-start gap-3"><Shirt className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" /><div><p className="text-gray-500 text-xs">Dress Code</p><p className="font-medium">{event.dress_code}</p></div></div>}
              {event.grooming_notes && <div className="flex items-start gap-3"><AlertCircle className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" /><div><p className="text-gray-500 text-xs">Grooming</p><p className="font-medium">{event.grooming_notes}</p></div></div>}
            </div>
          </div>
        )}

        {event.required_documents && event.required_documents.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3 space-y-3">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Required Documents</h3>
            <div className="flex flex-wrap gap-2">{event.required_documents.map((doc, i) => <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{doc}</span>)}</div>
          </div>
        )}

        {event.reporting_details && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3 space-y-3">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Reporting Details</h3>
            <p className="text-sm whitespace-pre-wrap">{event.reporting_details}</p>
          </div>
        )}

        {event.instructions && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3 space-y-3">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Instructions</h3>
            <p className="text-sm whitespace-pre-wrap">{event.instructions}</p>
          </div>
        )}

        {/* Organizer Info — contact hidden until approved */}
        {organizer && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3 space-y-3">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Organized by</h3>
            <div className="flex items-center gap-3">
              {organizer.avatar_url ? (
                <img src={organizer.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-100" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-base">
                  {organizer.full_name?.charAt(0) || "O"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm truncate">{organizer.full_name}</p>
                  {organizer.is_trusted_organizer && <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {organizerRating > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${organizerRating >= s ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />)}</div>
                      <span className="text-xs text-gray-500">{organizerRating}</span>
                    </div>
                  )}
                  <span className="text-xs text-gray-400">{organizerPastEvents} past event{organizerPastEvents !== 1 ? "s" : ""}</span>
                </div>
                {/* Contact — only visible after approval */}
                {showContact && organizer.phone && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-600 bg-green-50 px-2 py-1 rounded-lg">
                    <Phone className="w-3 h-3 text-green-600" />
                    <span className="font-medium">{organizer.phone}</span>
                  </div>
                )}
                {!showContact && (
                  <p className="text-[10px] text-gray-400 mt-1.5">Contact revealed after approval</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Application Status */}
        {application && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">Your Application</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-block w-2 h-2 rounded-full ${application.status === "approved" ? "bg-green-500" : application.status === "rejected" || application.status === "cancelled" ? "bg-red-500" : "bg-amber-500"}`} />
              <span className="font-medium capitalize text-sm">{application.status}</span>
            </div>
            {application.notes && <p className="text-sm text-gray-600 mt-2">{application.notes}</p>}
            {application.status === "approved" && (
              <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> You have been approved for this event
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom bar */}
      {!application && (event.status === "published" || event.status === "filling") && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-lg mx-auto">
            <button onClick={handleApply} disabled={applying}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium text-base active:scale-[0.98] transition-all disabled:opacity-50 shadow-md shadow-blue-600/20">
              {applying ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> : "Apply for this Event"}
            </button>
          </div>
        </div>
      )}

      {!application && event.status === "full" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-lg mx-auto">
            <div className="w-full h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 font-medium text-sm">Event is full — no more applications accepted</div>
          </div>
        </div>
      )}

      {application && application.status === "pending" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-lg mx-auto space-y-2">
            <div className="w-full h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 font-medium text-sm">
              <Hourglass className="w-4 h-4 mr-1.5" /> Application pending — waiting for organizer response
            </div>
            {canCancel && (
              <button onClick={handleCancel} disabled={cancelling}
                className="w-full h-10 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium active:scale-[0.98] transition-all disabled:opacity-50">
                {cancelling ? "Cancelling..." : "Cancel Application"}
              </button>
            )}
            {!canCancel && application.status === "pending" && (
              <p className="text-[10px] text-gray-400 text-center">Cannot cancel within 12 hours of event</p>
            )}
          </div>
        </div>
      )}

      {application && application.status === "approved" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-lg mx-auto space-y-2">
            <div className="w-full h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-medium text-sm">
              <CheckCircle className="w-4 h-4 mr-1.5" /> You are approved for this event
            </div>
            {canCancel && (
              <button onClick={handleCancel} disabled={cancelling}
                className="w-full h-10 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium active:scale-[0.98] transition-all disabled:opacity-50">
                {cancelling ? "Cancelling..." : "Cancel Participation"}
              </button>
            )}
            {!canCancel && (
              <p className="text-[10px] text-gray-400 text-center">Cannot cancel within 12 hours of event</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
