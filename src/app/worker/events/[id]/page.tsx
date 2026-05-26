"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, MapPin, Calendar, Clock, Users, IndianRupee, Shirt, FileText, AlertCircle, Phone, User } from "lucide-react";
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
    if (org) setOrganizer(org);

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
        {(event.gender_requirement || event.min_age || event.max_age || event.dress_code) && (
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
              {event.dress_code && (
                <div className="flex items-start gap-3">
                  <Shirt className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Dress Code</p>
                    <p className="font-medium">{event.dress_code}</p>
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
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                {organizer.full_name?.charAt(0) || "O"}
              </div>
              <div>
                <p className="font-medium text-sm">{organizer.full_name}</p>
                {organizer.is_trusted_organizer && (
                  <span className="text-xs text-blue-600 font-medium">Trusted Organizer</span>
                )}
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
      {!application && (
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
