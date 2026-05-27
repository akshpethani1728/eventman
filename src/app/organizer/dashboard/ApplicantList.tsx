"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  X, Check, X as XIcon, ChevronDown, ChevronUp, Phone, MapPin,
  User, Award, Briefcase, Clock, Star, Mail
} from "lucide-react";
import type { Event, Application, Profile } from "@/lib/supabase/types";

interface Props {
  event: Event;
  onClose: () => void;
  onUpdate: () => void;
}

interface ApplicantWithProfile extends Application {
  profile: Profile;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-900/40 text-amber-300",
  approved: "bg-green-900/40 text-green-300",
  rejected: "bg-red-900/40 text-red-300",
  cancelled: "bg-gray-800 text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Applied", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled",
};

export default function ApplicantList({ event, onClose, onUpdate }: Props) {
  const [applicants, setApplicants] = useState<ApplicantWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => { loadApplicants(); }, [event.id]);

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
          .from("profiles").select("*").eq("user_id", app.worker_id).single();
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

  const pendingCount = applicants.filter(a => a.status === "pending").length;
  const approvedCount = applicants.filter(a => a.status === "approved").length;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-6 p-3 overflow-y-auto">
      <div className="w-full max-w-xl bg-gray-950 border border-gray-800 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-gray-800 sticky top-0 bg-gray-950 z-10 rounded-t-xl">
          <div className="min-w-0 flex-1 mr-3">
            <h2 className="font-semibold text-sm text-white truncate">{event.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {applicants.length} applicant{applicants.length !== 1 ? "s" : ""}
              {pendingCount > 0 && ` · ${pendingCount} pending`}
              {approvedCount > 0 && ` · ${approvedCount} approved`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-lg shrink-0">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* List */}
        <div className="p-3 space-y-2 max-h-[75vh] overflow-y-auto">
          {loading && <p className="text-center text-gray-500 py-8 text-sm">Loading...</p>}

          {!loading && applicants.length === 0 && (
            <p className="text-center text-gray-500 py-8 text-sm">No applications yet</p>
          )}

          {applicants.map(app => (
            <div key={app.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Main row */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-300 font-semibold text-sm shrink-0">
                      {app.profile.full_name?.charAt(0) || "W"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-white truncate">{app.profile.full_name}</p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {app.profile.age && `${app.profile.age} yrs`}
                        {app.profile.gender && ` · ${app.profile.gender}`}
                        {app.profile.city && ` · ${app.profile.city}`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[app.status]}`}>
                    {STATUS_LABELS[app.status]}
                  </span>
                </div>

                {/* Quick actions for pending */}
                {app.status === "pending" && (
                  <div className="flex gap-2 mt-2.5">
                    <button onClick={() => updateStatus(app.id, "approved")}
                      className="flex-1 h-9 rounded-lg bg-green-600 text-white text-xs font-medium flex items-center justify-center gap-1.5 active:bg-green-700">
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => updateStatus(app.id, "rejected")}
                      className="flex-1 h-9 rounded-lg bg-red-600 text-white text-xs font-medium flex items-center justify-center gap-1.5 active:bg-red-700">
                      <XIcon className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}

                {/* Expand toggle */}
                <button onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                  className="mt-2 text-[11px] text-gray-500 flex items-center gap-1 hover:text-gray-300">
                  {expanded === app.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {expanded === app.id ? "Hide details" : "View full profile"}
                </button>
              </div>

              {/* Expanded details */}
              {expanded === app.id && (
                <div className="px-3 pb-3 pt-0 border-t border-gray-800">
                  <div className="pt-2.5 space-y-1.5 text-xs text-gray-400">
                    {app.profile.bio && (
                      <p className="text-gray-300 italic border-l-2 border-gray-700 pl-2 py-0.5">{app.profile.bio}</p>
                    )}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
                      {app.profile.skills && app.profile.skills.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Skills:</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {app.profile.skills.map((s, i) => (
                              <span key={i} className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {app.profile.experience && (
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-3 h-3 text-gray-600" />
                          <span>{app.profile.experience}</span>
                        </div>
                      )}
                      {app.profile.availability && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-gray-600" />
                          <span className="capitalize">{app.profile.availability}</span>
                        </div>
                      )}
                      {app.profile.area && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-gray-600" />
                          <span>{app.profile.area}</span>
                        </div>
                      )}
                      {app.profile.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-gray-600" />
                          <span>{app.profile.phone}</span>
                        </div>
                      )}
                      {app.profile.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-gray-600" />
                          <span className="truncate">{app.profile.email}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        app.profile.status === "trusted" ? "bg-green-900/40 text-green-300" :
                        app.profile.status === "basic_verified" ? "bg-blue-900/40 text-blue-300" :
                        "bg-gray-800 text-gray-400"
                      }`}>
                        {app.profile.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
