"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, MapPin, Calendar, Clock, Users, IndianRupee, Shirt, FileText, AlertCircle, Phone, User, Briefcase, Award, Star, ShieldCheck } from "lucide-react";
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
  const [organizerRating, setOrganizerRating] = useState(0);
  const [organizerPastEvents, setOrganizerPastEvents] = useState(0);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    const { data: evt } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (!evt) { router.push("/worker/dashboard"); return; }
    setEvent(evt);

    const { count } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id)
      .eq("status", "approved");
    setApprovedCount(count || 0);

    const { data: org } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", evt.organizer_id)
      .single();
    if (org) {
      setOrganizer(org);
      const { data: revs } = await supabase.from("reviews").select("rating").eq("to_id", org.user_id);
      if (revs && revs.length > 0) {
        setOrganizerRating(Math.round(revs.reduce((s, r) => s + r.rating, 0) / revs.length * 10) / 10);
      }
      const { count: pc } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("organizer_id", org.user_id).in("status", ["completed", "cancelled"]);
      setOrganizerPastEvents(pc || 0);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: app } = await supabase
        .from("applications")
        .select("*")
        .eq("event_id", id)
        .eq("worker_id", user.id)
        .maybeSingle();
      if (app) setApplication(app);
    }

    setLoading(false);
  };

  const handleApply = async () => {
    setApplying(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please login"); setApplying(false); return; }

    const { error } = await supabase.from("applications").insert({
      event_id: id,
      worker_id: user.id,
      status: "pending",
    });

    setApplying(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Applied successfully!");
    loadEvent();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/worker/dashboard" className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="font-semibold truncate">Event Details</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 pb-24">
        {/* Title & Status */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3">
          <h2 className="text-lg font-bold mb-1">{event.title}</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {event.category && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full capitalize">
                {event.category.replace(/_/g, " ")}
              </span>
            )}
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
              {event.worker_count - approvedCount} of {event.worker_count} spots left
            </span>
          </div>
          {event.application_deadline && (
            <p className="text-xs text-amber-700 mt-2">
              Apply by {new Date(event.application_deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
          {event.payment_info && (
            <p className="text-green-700 font-medium text-sm flex items-center gap-1.5 mt-2">
              <IndianRupee className="w-4 h-4" />
              {event.payment_info}
            </p>
          )}
        </div>

        {/* Event Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3 space-y-4">
          <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Event Details</h3>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
              <div>
                <p className="text-gray-500 text-xs">Location</p>
                <p className="font-medium">{event.location}</p>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(event.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 font-medium mt-0.5 inline-block"
                >
                  Open in Google Maps &rarr;
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
              <div>
                <p className="text-gray-500 text-xs">Event Date</p>
                <p className="font-medium">{event.date}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
              <div>
                <p className="text-gray-500 text-xs">Reporting Time</p>
                <p className="font-medium">{event.time}</p>
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

        {/* Requirements */}
        {(event.gender_requirement || event.min_age || event.max_age || event.dress_code || event.experience_required || event.skill_requirements || event.grooming_notes) && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3 space-y-4">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Requirements</h3>
            <div className="space-y-3 text-sm">
              {event.gender_requirement && (
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Gender</p>
                    <p className="font-medium capitalize">{event.gender_requirement}</p>
                  </div>
                </div>
              )}
              {(event.min_age || event.max_age) && (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Age Range</p>
                    <p className="font-medium">{event.min_age || 0} - {event.max_age || 99} years</p>
                  </div>
                </div>
              )}
              {event.experience_required && (
                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Experience Required</p>
                    <p className="font-medium">{event.experience_required}</p>
                  </div>
                </div>
              )}
              {event.skill_requirements && event.skill_requirements.length > 0 && (
                <div className="flex items-start gap-3">
                  <Award className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Skills Required</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {event.skill_requirements.map((s, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {event.dress_code && (
                <div className="flex items-start gap-3">
                  <Shirt className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Dress Code</p>
                    <p className="font-medium">{event.dress_code}</p>
                  </div>
                </div>
              )}
              {event.grooming_notes && (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Grooming Notes</p>
                    <p className="font-medium">{event.grooming_notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Required Documents */}
        {event.required_documents && event.required_documents.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3 space-y-3">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Required Documents</h3>
            <div className="flex flex-wrap gap-2">
              {event.required_documents.map((doc, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                  {doc}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reporting Details */}
        {event.reporting_details && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3 space-y-3">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Reporting Details</h3>
            <p className="text-sm whitespace-pre-wrap">{event.reporting_details}</p>
          </div>
        )}

        {/* Instructions */}
        {event.instructions && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3 space-y-3">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Instructions</h3>
            <p className="text-sm whitespace-pre-wrap">{event.instructions}</p>
          </div>
        )}

        {/* Organizer Info */}
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
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${organizerRating >= s ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />)}
                      </div>
                      <span className="text-xs text-gray-500">{organizerRating}</span>
                    </div>
                  )}
                  <span className="text-xs text-gray-400">{organizerPastEvents} past event{organizerPastEvents !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Application Status */}
        {application && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">Your Application</h3>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${
                application.status === "approved" ? "bg-green-500" :
                application.status === "rejected" ? "bg-red-500" :
                "bg-amber-500"
              }`} />
              <span className="font-medium capitalize text-sm">{application.status}</span>
            </div>
            {application.notes && (
              <p className="text-sm text-gray-600 mt-2">{application.notes}</p>
            )}
          </div>
        )}
      </main>

      {/* Bottom Apply Button */}
      {!application && (event.status === "published" || event.status === "filling") && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleApply}
              disabled={applying}
              className="w-full h-12 rounded-xl bg-blue-600 text-white font-medium text-base active:bg-blue-700 disabled:opacity-50"
            >
              {applying ? "Applying..." : "Apply for this Event"}
            </button>
          </div>
        </div>
      )}

      {!application && event.status === "full" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-lg mx-auto">
            <div className="w-full h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 font-medium text-sm">
              Event is full — no more applications accepted
            </div>
          </div>
        </div>
      )}

      {application && application.status === "pending" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-lg mx-auto">
            <div className="w-full h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 font-medium text-sm">
              Application pending — waiting for organizer response
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
