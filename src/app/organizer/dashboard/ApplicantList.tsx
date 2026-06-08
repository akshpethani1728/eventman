"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  X, Check, ChevronDown, ChevronUp, Phone, MapPin,
  User, Award, Briefcase, Clock, Mail, Filter, XCircle, Copy,
  Star, BadgeCheck, Search,
} from "lucide-react";
import { useBodyScrollLock } from "@/lib/useStableForm";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { ConfirmDialog } from "@/lib/design/Modal";
import { APPLICANT_STATUS_STYLES, APPLICANT_STATUS_LABELS } from "@/lib/organizer/constants";
import { loadApplicantsForEvent, updateApplicantStatus, removeApplicant } from "@/lib/organizer/applicantUtils";
import type { ApplicantWithProfile } from "@/lib/organizer/applicantUtils";
import type { Event } from "@/lib/supabase/types";

interface Props {
  event: Event;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ApplicantList({ event, onClose, onUpdate }: Props) {
  const [applicants, setApplicants] = useState<ApplicantWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [filters, setFilters] = useState({
    gender: "", ageMin: "", ageMax: "", area: "", skills: "", availability: "", verifiedOnly: false,
  });
  const supabase = createClient();
  useBodyScrollLock(true);
  const modalRef = useFocusTrap(true);

  useEffect(() => { loadApplicants(); }, [event.id]);

  const loadApplicants = async () => {
    setLoading(true);
    const result = await loadApplicantsForEvent(event.id);
    setApplicants(result);
    setLoading(false);
  };

  const handleUpdateStatus = (applicationId: string, status: "approved" | "rejected") => {
    updateApplicantStatus(applicationId, status, event, applicants, () => {
      loadApplicants();
      onUpdate();
    });
  };

  const handleRemove = (applicationId: string) => {
    removeApplicant(applicationId, event, applicants, () => {
      loadApplicants();
      onUpdate();
    });
    setRemoveTarget(null);
  };

  const filtered = useMemo(() => {
    return applicants.filter(a => {
      if (filterTab !== "all" && a.status !== filterTab) return false;
      const p = a.profile;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = p.full_name?.toLowerCase() || "";
        const city = p.city?.toLowerCase() || "";
        const area = p.area?.toLowerCase() || "";
        const skills = p.skills?.some(s => s.toLowerCase().includes(q)) || false;
        if (!name.includes(q) && !city.includes(q) && !area.includes(q) && !skills) return false;
      }
      if (filters.gender && p.gender !== filters.gender) return false;
      if (filters.ageMin && (!p.age || p.age < parseInt(filters.ageMin))) return false;
      if (filters.ageMax && (!p.age || p.age > parseInt(filters.ageMax))) return false;
      if (filters.area && !p.area?.toLowerCase().includes(filters.area.toLowerCase())) return false;
      if (filters.skills && !p.skills?.some(s => s.toLowerCase().includes(filters.skills.toLowerCase()))) return false;
      if (filters.availability && p.availability !== filters.availability) return false;
      if (filters.verifiedOnly && p.status === "unverified") return false;
      return true;
    });
  }, [applicants, filters, filterTab, searchQuery]);

  const pendingCount = applicants.filter(a => a.status === "pending").length;
  const approvedCount = applicants.filter(a => a.status === "approved").length;
  const isPast = ["completed", "cancelled"].includes(event.status) || (event.date && event.date < new Date().toISOString().split("T")[0]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-6 p-3 overflow-y-auto modal-overlay" ref={modalRef} role="dialog" aria-modal="true" aria-label="Applicants for event">
      <div className="w-full max-w-xl bg-white rounded-[20px] shadow-[0_24px_64px_rgba(0,0,0,0.15),0_8px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between p-4 border-b border-[rgba(0,0,0,0.06)] sticky top-0 bg-white z-10 rounded-t-[20px]">
          <div className="min-w-0 flex-1 mr-3">
            <h2 className="font-semibold text-base text-gray-900 truncate">{event.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {applicants.length} applicant{applicants.length !== 1 ? "s" : ""}
              {pendingCount > 0 && <span className="text-amber-600 font-medium"> · {pendingCount} to review</span>}
              {approvedCount > 0 && <span className="text-emerald-600 font-medium"> · {approvedCount} selected</span>}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-[10px] ${showFilters ? "bg-[#0D9488]/10 text-[#0D9488]" : "hover:bg-gray-100 text-gray-500"}`} aria-label="Toggle filters">
              <Filter className="w-4 h-4" />
            </button>
            <button onClick={onClose} data-close-modal className="p-2 hover:bg-gray-100 rounded-[10px]" aria-label="Close">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-4 py-2.5 border-b border-[rgba(0,0,0,0.06)] bg-gray-50/50 space-y-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, area, skills..."
              className="w-full h-9 pl-9 pr-3 rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white text-xs outline-none transition-all focus:border-[#0D9488]" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(["all", "pending", "approved", "rejected"] as const).map(tab => (
              <button key={tab} onClick={() => setFilterTab(tab)}
                className={`h-8 px-3 rounded-[10px] text-[11px] font-semibold transition-all capitalize shrink-0 ${
                  filterTab === tab
                    ? "bg-[#0D9488] text-white shadow-[0_2px_8px_rgba(13,148,136,0.2)]"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}>
                {tab} ({applicants.filter(a => tab === "all" || a.status === tab).length})
              </button>
            ))}
          </div>
        </div>

        {showFilters && (
          <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] bg-[#F8F8F6] space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <select value={filters.gender} onChange={e => setFilters(f => ({ ...f, gender: e.target.value }))}
                className="input-base h-9 text-xs" aria-label="Gender filter">
                <option value="">Any gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <input type="number" value={filters.ageMin} onChange={e => setFilters(f => ({ ...f, ageMin: e.target.value }))}
                placeholder="Min age" className="input-base h-9 text-xs" aria-label="Minimum age" />
              <input type="number" value={filters.ageMax} onChange={e => setFilters(f => ({ ...f, ageMax: e.target.value }))}
                placeholder="Max age" className="input-base h-9 text-xs" aria-label="Maximum age" />
              <input value={filters.area} onChange={e => setFilters(f => ({ ...f, area: e.target.value }))}
                placeholder="Area" className="input-base h-9 text-xs" aria-label="Area filter" />
              <input value={filters.skills} onChange={e => setFilters(f => ({ ...f, skills: e.target.value }))}
                placeholder="Skills" className="input-base h-9 text-xs" aria-label="Skills filter" />
              <select value={filters.availability} onChange={e => setFilters(f => ({ ...f, availability: e.target.value }))}
                className="input-base h-9 text-xs" aria-label="Availability filter">
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
          </div>
        )}

        <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto">
          {loading && (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-[14px] p-4 border border-[rgba(0,0,0,0.06)] animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-gray-100" />
                    <div className="flex-1 space-y-1.5">
                      <div className="w-24 h-2.5 bg-gray-100 rounded-full" />
                      <div className="w-16 h-2 bg-gray-50 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-10">
              <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">
                {searchQuery || Object.values(filters).some(v => v) ? "No matching applicants" :
                 filterTab === "all" ? "No applicants yet" : `No ${filterTab} applicants`}
              </p>
              <p className="text-xs text-gray-400 mt-1">Applications will show up here as workers apply</p>
            </div>
          )}

          {filtered.map(app => (
            <div key={app.id} className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.06)] overflow-hidden transition-all hover:border-[rgba(0,0,0,0.12)]">
              <div className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#0D9488]/10 to-[#0D9488]/20 flex items-center justify-center text-[#0D9488] font-semibold text-sm shrink-0" aria-hidden="true">
                      {app.profile.full_name?.charAt(0) || "W"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm text-gray-900 truncate">{app.profile.full_name}</p>
                        {app.profile.status === "trusted" && <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {[app.profile.age && `${app.profile.age}y`, app.profile.gender, app.profile.city].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      app.notes === "removed_by_organizer" ? "bg-red-50 text-red-700 border border-red-200" : APPLICANT_STATUS_STYLES[app.status]
                    }`}>
                      {app.notes === "removed_by_organizer" ? "Removed" : APPLICANT_STATUS_LABELS[app.status]}
                    </span>
                    {app.status === "pending" && (
                      <>
                        <button onClick={() => handleUpdateStatus(app.id, "approved")}
                          className="h-8 w-8 rounded-[10px] bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-700 transition-all active:scale-90" aria-label="Approve">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleUpdateStatus(app.id, "rejected")}
                          className="h-8 w-8 rounded-[10px] bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all active:scale-90" aria-label="Reject">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {app.status === "approved" && (
                      <button onClick={() => setRemoveTarget(app.id)}
                        className="h-7 px-2.5 rounded-[10px] bg-red-50 text-red-600 text-[10px] font-medium flex items-center gap-1 hover:bg-red-100 border border-red-200 transition-all active:scale-95">
                        <XCircle className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>
                </div>

                <button onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                  className="mt-2 text-xs text-gray-400 flex items-center gap-1 hover:text-[#0D9488] transition-colors">
                  {expanded === app.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {expanded === app.id ? "Hide details" : "View profile"}
                </button>

                {expanded === app.id && (
                  <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)] space-y-2 text-xs text-gray-600">
                    {app.profile.bio && (
                      <p className="text-gray-700 italic border-l-2 border-emerald-200 pl-3 py-0.5 leading-relaxed">{app.profile.bio}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {app.profile.skills && app.profile.skills.length > 0 && (
                        <div className="col-span-2">
                          <div className="flex flex-wrap gap-1">
                            {app.profile.skills.map((s, i) => (
                              <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-[8px] font-medium">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {app.profile.experience && (
                        <span className="flex items-center gap-1.5"><Briefcase className="w-3 h-3 text-gray-400" />{app.profile.experience}</span>
                      )}
                      {app.profile.availability && (
                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-gray-400" /><span className="capitalize">{app.profile.availability.replace(/_/g, " ")}</span></span>
                      )}
                      {app.profile.area && (
                        <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-gray-400" />{app.profile.area}</span>
                      )}
                      {app.status === "approved" && !isPast && (app.profile.phone || app.profile.email) ? (
                        <>
                          {app.profile.phone && (
                            <span className="flex items-center gap-1.5 text-emerald-700 col-span-2">
                              <Phone className="w-3 h-3" />{app.profile.phone}
                              <button onClick={() => { navigator.clipboard.writeText(app.profile.phone!); toast.success("Phone copied"); }}
                                className="p-0.5 rounded hover:bg-emerald-100 text-emerald-500 hover:text-emerald-700 transition-colors" aria-label="Copy phone">
                                <Copy className="w-3 h-3" />
                              </button>
                            </span>
                          )}
                          {app.profile.email && (
                            <span className="flex items-center gap-1.5 text-emerald-700 col-span-2"><Mail className="w-3 h-3" />{app.profile.email}</span>
                          )}
                        </>
                      ) : (app.profile.phone || app.profile.email) && (
                        <span className="flex items-center gap-1.5 text-gray-400 italic col-span-2"><Phone className="w-3 h-3" />Contact hidden{isPast ? " after event completion" : " until approval"}</span>
                      )}
                    </div>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      app.profile.status === "trusted" ? "bg-emerald-50 text-emerald-700" :
                      app.profile.status === "basic_verified" ? "bg-blue-50 text-blue-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {app.profile.status.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => { if (removeTarget) handleRemove(removeTarget); }}
        title="Remove Worker"
        message={removeTarget ? `Remove ${applicants.find(a => a.id === removeTarget)?.profile.full_name} from this event? This will notify them.` : ""}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
