"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { X, Check, X as XIcon, ChevronDown, ChevronUp, Phone, MapPin } from "lucide-react";
import type { Event, Application, Profile } from "@/lib/supabase/types";

interface Props {
  event: Event;
  onClose: () => void;
  onUpdate: () => void;
}

interface ApplicantWithProfile extends Application {
  profile: Profile;
}

export default function ApplicantList({ event, onClose, onUpdate }: Props) {
  const [applicants, setApplicants] = useState<ApplicantWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadApplicants();
  }, [event.id]);

  const loadApplicants = async () => {
    const { data: apps } = await supabase
      .from("applications")
      .select("*")
      .eq("event_id", event.id)
      .order("created_at", { ascending: false });

    if (!apps) { setLoading(false); return; }

    const withProfiles = await Promise.all(
      apps.map(async (app) => {
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", app.worker_id)
          .single();
        return { ...app, profile: prof! } as ApplicantWithProfile;
      })
    );

    setApplicants(withProfiles.filter(a => a.profile));
    setLoading(false);
  };

  const updateStatus = async (applicationId: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", applicationId);

    if (error) { toast.error(error.message); return; }

    const app = applicants.find(a => a.id === applicationId);
    if (app) {
      await supabase.from("notifications").insert({
        user_id: app.worker_id,
        title: status === "approved" ? "Application Approved" : "Application Rejected",
        message: status === "approved"
          ? `Your application for "${event.title}" has been approved.`
          : `Your application for "${event.title}" has been rejected.`,
      });
    }

    toast.success(`Worker ${status === "approved" ? "approved" : "rejected"}!`);
    loadApplicants();
    onUpdate();
  };

  const StatusBadge = ({ status }: { status: string }) => {
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
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="min-w-0 flex-1 mr-2">
            <h2 className="font-semibold text-lg truncate">{event.title}</h2>
            <p className="text-sm text-gray-500">{applicants.length} applicant{applicants.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {loading && <p className="text-center text-gray-500 py-8">Loading...</p>}

          {!loading && applicants.length === 0 && (
            <p className="text-center text-gray-500 py-8">No applications yet</p>
          )}

          {applicants.map(app => (
            <div key={app.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
              {/* Profile Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                    {app.profile.full_name?.charAt(0) || "W"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{app.profile.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {app.profile.age && `${app.profile.age} yrs`}
                      {app.profile.gender && ` · ${app.profile.gender}`}
                      {app.profile.city && ` · ${app.profile.city}`}
                    </p>
                  </div>
                </div>
                <StatusBadge status={app.status} />
              </div>

              {/* Actions for pending */}
              {app.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(app.id, "approved")}
                    className="flex-1 h-9 rounded-lg bg-green-600 text-white text-sm font-medium flex items-center justify-center gap-1.5 active:bg-green-700"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => updateStatus(app.id, "rejected")}
                    className="flex-1 h-9 rounded-lg bg-red-600 text-white text-sm font-medium flex items-center justify-center gap-1.5 active:bg-red-700"
                  >
                    <XIcon className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}

              {/* Expand */}
              <button
                onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-700"
              >
                {expanded === app.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded === app.id ? "Hide details" : "View details"}
              </button>

              {expanded === app.id && (
                <div className="text-xs text-gray-500 space-y-1.5 pt-2 border-t border-gray-100">
                  {app.profile.skills && app.profile.skills.length > 0 && (
                    <p>Skills: {app.profile.skills.join(", ")}</p>
                  )}
                  {app.profile.experience && <p>Experience: {app.profile.experience}</p>}
                  {app.profile.area && (
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {app.profile.area}
                    </p>
                  )}
                  <p className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {app.profile.phone || app.profile.email || "N/A"}
                  </p>
                  <p>
                    Status: <span className="capitalize">{app.profile.status.replace(/_/g, " ")}</span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
