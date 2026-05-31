"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  X, Check, X as XIcon, ChevronDown, ChevronUp, Phone, MapPin,
  User, Award, Briefcase, Clock, Mail, Filter, XCircle, Copy,
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
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Applied", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled",
};

export default function ApplicantList({ event, onClose, onUpdate }: Props) {
  const [applicants, setApplicants] = useState<ApplicantWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    gender: "",
    ageMin: "",
    ageMax: "",
    area: "",
    skills: "",
    availability: "",
    verifiedOnly: false,
  });
  const supabase = createClient();

  useEffect(() => { loadApplicants(); }, [event.id]);

  const loadApplicants = async () => { try { const { data: apps } = await supabase
      .from("applications")
      .select("*")
      .eq("event_id", event.id)
      .order("created_at", { ascending: false });

    if (!apps) { setLoading(false); return; }

    const withProfiles = await Promise.all(
      apps.map(async (app) => {
        const { data: prof } = await supabase
          .from("profiles").select("*").eq("user_id", app.worker_id).maybeSingle();
        return { ...app, profile: prof! } as ApplicantWithProfile;
      })
    );

    setApplicants(withProfiles.filter(a => a.profile));
     } catch (err) { console.error("[ApplicantList] error:", err); } finally { setLoading(false); } };

  const updateStatus = async (applicationId: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("applications").update({ status, updated_at: new Date().toISOString() }).eq("id", applicationId);
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

    // Auto-mark Full when capacity reached
    if (status === "approved") {
      const newApprovedCount = applicants.filter(a => a.status === "approved" || a.id === applicationId).length;
      if (newApprovedCount >= event.worker_count) {
        await supabase.from("events").update({ status: "full", updated_at: new Date().toISOString() }).eq("id", event.id);
        toast.success("Event is now full!");
      }
    }

    toast.success(`Worker ${status === "approved" ? "approved" : "rejected"}!`);
    loadApplicants();
    onUpdate();
  };

  const handleRemove = async (applicationId: string) => {
    const { error } = await supabase
      .from("applications").update({ status: "cancelled", notes: "removed_by_organizer", updated_at: new Date().toISOString() }).eq("id", applicationId);
    if (error) { toast.error(error.message); return; }

    const app = applicants.find(a => a.id === applicationId);
    if (app) {
      await supabase.from("notifications").insert({
        user_id: app.worker_id,
        title: "Removed from Event",
        message: `You have been removed from "${event.title}". The organizer cancelled your selection. You can re-apply if the event is still accepting applications.`,
      });
    }

    // If event was full, free up a spot
    if (event.status === "full") {
      await supabase.from("events").update({ status: "filling", updated_at: new Date().toISOString() }).eq("id", event.id);
    }

    toast.success("Worker removed");
    loadApplicants();
    onUpdate();
  };

  const filtered = useMemo(() => {
    return applicants.filter(a => {
      const p = a.profile;
      if (filters.gender && p.gender !== filters.gender) return false;
      if (filters.ageMin && (!p.age || p.age < parseInt(filters.ageMin))) return false;
      if (filters.ageMax && (!p.age || p.age > parseInt(filters.ageMax))) return false;
      if (filters.area && !p.area?.toLowerCase().includes(filters.area.toLowerCase())) return false;
      if (filters.skills && !p.skills?.some(s => s.toLowerCase().includes(filters.skills.toLowerCase()))) return false;
      if (filters.availability && p.availability !== filters.availability) return false;
      if (filters.verifiedOnly && p.status === "unverified") return false;
      return true;
    });
  }, [applicants, filters]);

  const pendingCount = applicants.filter(a => a.status === "pending").length;
  const approvedCount = applicants.filter(a => a.status === "approved").length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-6 p-3 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-xl">
          <div className="min-w-0 flex-1 mr-3">
            <h2 className="font-semibold text-base text-gray-900 truncate">{event.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {applicants.length} applicant{applicants.length !== 1 ? "s" : ""}
              {pendingCount > 0 && ` Â· ${pendingCount} pending`}
              {approvedCount > 0 && ` Â· ${approvedCount} approved`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg ${showFilters ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-500"}`}>
              <Filter className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <form onSubmit={e => e.preventDefault()} className="px-4 py-3 border-b border-gray-100 bg-gray-50 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <select value={filters.gender} onChange={e => setFilters(f => ({ ...f, gender: e.target.value }))}
                className="h-8 px-2 rounded-lg border border-gray-200 text-xs bg-white">
                <option value="">Any gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <input type="number" value={filters.ageMin} onChange={e => setFilters(f => ({ ...f, ageMin: e.target.value }))}
                placeholder="Min age" className="h-8 px-2 rounded-lg border border-gray-200 text-xs bg-white" />
              <input type="number" value={filters.ageMax} onChange={e => setFilters(f => ({ ...f, ageMax: e.target.value }))}
                placeholder="Max age" className="h-8 px-2 rounded-lg border border-gray-200 text-xs bg-white" />
              <input value={filters.area} onChange={e => setFilters(f => ({ ...f, area: e.target.value }))}
                placeholder="Area" className="h-8 px-2 rounded-lg border border-gray-200 text-xs bg-white" />
              <input value={filters.skills} onChange={e => setFilters(f => ({ ...f, skills: e.target.value }))}
                placeholder="Skills" className="h-8 px-2 rounded-lg border border-gray-200 text-xs bg-white" />
              <select value={filters.availability} onChange={e => setFilters(f => ({ ...f, availability: e.target.value }))}
                className="h-8 px-2 rounded-lg border border-gray-200 text-xs bg-white">
                <option value="">Any availability</option>
                <option value="available">Available</option>
                <option value="weekends">Weekends</option>
                <option value="evenings">Evenings</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={filters.verifiedOnly} onChange={e => setFilters(f => ({ ...f, verifiedOnly: e.target.checked }))}
                className="rounded border-gray-300" />
              Verified workers only
            </label>
            {filtered.length !== applicants.length && (
              <p className="text-xs text-gray-500">{filtered.length} of {applicants.length} shown</p>
            )}
          </form>
        )}

        {/* List */}
        <div className="p-3 space-y-2 max-h-[65vh] overflow-y-auto">
          {loading && <p className="text-center text-gray-500 py-8 text-sm">Loading...</p>}

          {!loading && filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No applicants match filters</p>
          )}

          {filtered.map(app => (
            <div key={app.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                      {app.profile.full_name?.charAt(0) || "W"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{app.profile.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {app.profile.age && `${app.profile.age} yrs`}
                        {app.profile.gender && ` Â· ${app.profile.gender}`}
                        {app.profile.city && ` Â· ${app.profile.city}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      app.notes === "removed_by_organizer" ? "bg-red-100 text-red-800" : STATUS_STYLES[app.status]
                    }`}>
                      {app.notes === "removed_by_organizer" ? "Removed" : STATUS_LABELS[app.status]}
                    </span>
                    {app.status === "pending" && (
                      <button onClick={() => updateStatus(app.id, "approved")}
                        className="h-7 w-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-200">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {app.status === "pending" && (
                      <button onClick={() => updateStatus(app.id, "rejected")}
                        className="h-7 w-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200">
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {app.status === "approved" && (
                      <button onClick={() => { if (confirm(`Remove ${app.profile.full_name} from this event?`)) handleRemove(app.id); }}
                        className="h-7 px-2 rounded-full bg-red-50 text-red-600 text-[10px] font-medium flex items-center gap-1 hover:bg-red-100 border border-red-200">
                        <XCircle className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>
                </div>

                <button onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                  className="mt-2 text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600">
                  {expanded === app.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {expanded === app.id ? "Hide details" : "View profile"}
                </button>
              </div>

              {expanded === app.id && (
                <div className="px-3 pb-3 border-t border-gray-100">
                  <div className="pt-2.5 space-y-1.5 text-xs text-gray-600">
                    {app.profile.bio && (
                      <p className="text-gray-700 italic border-l-2 border-gray-200 pl-2 py-0.5">{app.profile.bio}</p>
                    )}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
                      {app.profile.skills && app.profile.skills.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-gray-400">Skills:</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {app.profile.skills.map((s, i) => (
                              <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {app.profile.experience && (
                        <div className="flex items-center gap-1.5"><Briefcase className="w-3 h-3 text-gray-400" /><span>{app.profile.experience}</span></div>
                      )}
                      {app.profile.availability && (
                        <div className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-gray-400" /><span className="capitalize">{app.profile.availability}</span></div>
                      )}
                      {app.profile.area && (
                        <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-gray-400" /><span>{app.profile.area}</span></div>
                      )}
                      {app.status === "approved" && (app.profile.phone || app.profile.email) ? (
                        <>
                          {app.profile.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-green-600" />
                              <span className="text-green-700">{app.profile.phone}</span>
                              <button onClick={() => { navigator.clipboard.writeText(app.profile.phone!); toast.success("Phone copied"); }}
                                className="p-0.5 rounded hover:bg-green-100 text-green-500 hover:text-green-700 transition-colors">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {app.profile.email && (
                            <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-green-600" /><span className="text-green-700 truncate">{app.profile.email}</span></div>
                          )}
                        </>
                      ) : (app.profile.phone || app.profile.email) && (
                        <div className="flex items-center gap-1.5 text-gray-400 italic col-span-2"><Phone className="w-3 h-3" /><span>Contact hidden until approval</span></div>
                      )}
                    </div>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-1 ${
                      app.profile.status === "trusted" ? "bg-green-100 text-green-700" :
                      app.profile.status === "basic_verified" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {app.profile.status.replace(/_/g, " ")}
                    </span>
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

