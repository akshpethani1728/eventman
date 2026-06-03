"use client";

import { useEffect, useState, useMemo } from "react";
import { useDebounce } from "@/lib/useDebounce";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Search, Filter, SlidersHorizontal, Check, X as XIcon, XCircle, ChevronDown, ChevronUp,
  Phone, Mail, MapPin, Briefcase, Clock, Star, BadgeCheck, Copy, User,
} from "lucide-react";
import { toast } from "sonner";
import { PageLoader } from "@/lib/design/Loading";
import { ConfirmDialog } from "@/lib/design/Modal";
import type { Event } from "@/lib/supabase/types";
import { AVAIL_CONFIG, computeCompletion, formatDate } from "@/lib/organizer/constants";
import { loadApplicantsForEvent, updateApplicantStatus, removeApplicant } from "@/lib/organizer/applicantUtils";
import type { ApplicantWithProfile } from "@/lib/organizer/applicantUtils";

export default function ApplicantManagementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [event, setEvent] = useState<Event | null>(null);
  const [applicants, setApplicants] = useState<ApplicantWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ gender: "", ageMin: "", ageMax: "", area: "", skills: "", availability: "", verifiedOnly: false });
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!prof || prof.role !== "organizer") { router.push("/login"); return; }
      const { data: evt } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      if (!evt || evt.organizer_id !== user.id) { router.push("/organizer/dashboard"); return; }
      setEvent(evt);
      const result = await loadApplicantsForEvent(id);
      setApplicants(result);
    } catch (err) { console.error("[ApplicantManagement] error:", err); } finally { setLoading(false); }
  };

  const handleApprove = async (applicationId: string) => {
    if (!event) return;
    setApplying(applicationId);
    await updateApplicantStatus(applicationId, "approved", event, applicants, loadData);
    setApplying(null);
  };

  const handleReject = async (applicationId: string) => {
    if (!event) return;
    setApplying(applicationId);
    await updateApplicantStatus(applicationId, "rejected", event, applicants, loadData);
    setApplying(null);
  };

  const handleRemove = (applicationId: string) => {
    if (!event) return;
    removeApplicant(applicationId, event, applicants, loadData);
    setRemoveTarget(null);
  };

  const handleRestore = async (applicationId: string) => {
    if (!event) return;
    setApplying(applicationId);
    const supabase = createClient();
    const { error } = await supabase
      .from("applications").update({ status: "pending", notes: null, updated_at: new Date().toISOString() }).eq("id", applicationId);
    if (error) { toast.error(error.message); setApplying(null); return; }
    toast.success("Applicant restored to pending");
    setApplying(null);
    loadData();
  };

  const filtered = useMemo(() => {
    return applicants.filter(a => {
      if (tab !== "all" && a.status !== tab) return false;
      const p = a.profile;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        if (!p.full_name?.toLowerCase().includes(q) && !p.city?.toLowerCase().includes(q) && !p.area?.toLowerCase().includes(q) && !p.skills?.some(s => s.toLowerCase().includes(q))) return false;
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
  }, [applicants, tab, debouncedSearch, filters]);

  const pendingCount = applicants.filter(a => a.status === "pending").length;
  const approvedCount = applicants.filter(a => a.status === "approved").length;
  const rejectedCount = applicants.filter(a => a.status === "rejected").length;
  const selectionRate = applicants.length > 0 ? Math.round((approvedCount / applicants.length) * 100) : 0;

  if (loading) return <PageLoader />;
  if (!event) return null;

  return (
    <div className="min-h-screen bg-[#F8F8F6] pb-8">
      {/* Header */}
      <header className="bg-white border-b border-[rgba(0,0,0,0.06)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link href={`/organizer/events/${id}`} aria-label="Back to event" className="p-1.5 -ml-1.5 text-gray-500 hover:text-[#0D9488] hover:bg-[#0D9488]/10 rounded-[10px] transition-all active:scale-90">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-gray-900 truncate">{event.title}</h1>
              <p className="text-xs text-gray-500 mt-0.5">{formatDate(event.date, event.date_display)} · {event.time}{event.end_time ? `-${event.end_time}` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold text-gray-900">{applicants.length}</span>
              <span className="text-xs text-gray-500 font-medium">Total Applicants</span>
            </div>
            <div className="h-6 w-px bg-[rgba(0,0,0,0.08)]" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-gray-700 font-medium">{pendingCount} Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-700 font-medium">{approvedCount} Approved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-xs text-gray-700 font-medium">{rejectedCount} Rejected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[#0D9488]">{selectionRate}% Selection Rate</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4">
        {/* Sticky Search + Filter + Tabs */}
        <div className="sticky top-0 z-10 bg-[#F8F8F6] pt-1 pb-3 -mx-4 px-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, city, skills..."
                className="w-full h-11 pl-10 pr-3 rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white text-sm outline-none transition-all focus:border-[#0D9488] focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
                aria-label="Search applicants" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`h-11 px-4 rounded-[12px] text-sm font-semibold transition-all active:scale-[0.97] flex items-center gap-1.5 ${
                showFilters ? "bg-[#0D9488] text-white shadow-[0_2px_8px_rgba(13,148,136,0.2)]" : "bg-white text-gray-600 border border-[rgba(0,0,0,0.08)] hover:border-[rgba(0,0,0,0.14)]"
              }`} aria-label="Toggle filters" aria-expanded={showFilters}>
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>

          {/* Segmented Tabs */}
          <div className="flex gap-2">
            {(["all", "pending", "approved", "rejected"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 h-10 rounded-[12px] text-sm font-semibold transition-all active:scale-[0.97] capitalize ${
                  tab === t
                    ? "bg-[#0D9488] text-white shadow-[0_4px_12px_rgba(13,148,136,0.25)]"
                    : "bg-white text-gray-500 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:text-gray-800"
                }`}>
                {t} ({t === "all" ? applicants.length : t === "pending" ? pendingCount : t === "approved" ? approvedCount : rejectedCount})
              </button>
            ))}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-3 bg-white rounded-[14px] p-4 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)] animate-fade-in">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Advanced Filters</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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
        </div>

        {/* Applicant Cards */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-base font-bold text-gray-900">
                {searchQuery || Object.values(filters).some(v => v) ? "No matching applicants" : "No applicants yet"}
              </p>
              <p className="text-sm text-gray-500 mt-1">Applications will show up here as workers apply</p>
            </div>
          )}

          {filtered.map(app => {
            const availConfig = app.profile.availability ? AVAIL_CONFIG[app.profile.availability] : null;
            const completion = computeCompletion(app.profile);

            return (
              <div key={app.id} className="bg-white rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="p-5">
                  {/* Row 1: Avatar + Name + Rating + Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-[#0D9488]/10 to-[#0D9488]/20 flex items-center justify-center text-[#0D9488] font-bold text-base">
                          {app.profile.full_name?.charAt(0) || "W"}
                        </div>
                        {availConfig && (
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[2px] border-white ${availConfig.dot}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-gray-900">{app.profile.full_name}</p>
                          {app.profile.status === "trusted" && <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
                          {app.profile.status === "basic_verified" && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            app.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            app.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            app.notes === "removed_by_organizer" ? "bg-red-50 text-red-700 border border-red-200" :
                            "bg-gray-100 text-gray-500 border border-gray-200"
                          }`}>
                            {app.notes === "removed_by_organizer" ? "Removed" : app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Age • City | Experience | Availability */}
                  <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 mb-3">
                    <span>{[app.profile.age && `${app.profile.age}y`, app.profile.gender, app.profile.city].filter(Boolean).join(" · ")}</span>
                    {app.profile.experience && (
                      <span className="flex items-center gap-1"><Briefcase className="w-3 h-3 text-gray-400" />{app.profile.experience}</span>
                    )}
                    {availConfig && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${availConfig.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${availConfig.dot}`} />
                        {availConfig.label}
                      </span>
                    )}
                  </div>

                  {/* Row 3: Skills */}
                  {app.profile.skills && app.profile.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {app.profile.skills.slice(0, 3).map((s, i) => (
                        <span key={i} className="text-[11px] bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-[8px] font-medium">{s}</span>
                      ))}
                      {app.profile.skills.length > 3 && (
                        <span className="text-[10px] text-gray-400 font-medium self-center">+{app.profile.skills.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Row 4: Profile completion */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 max-w-[120px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${completion >= 80 ? "bg-emerald-500" : completion >= 50 ? "bg-[#0D9488]" : "bg-amber-500"}`}
                        style={{ width: `${completion}%` }} />
                    </div>
                    <span className={`text-[10px] font-medium ${completion >= 80 ? "text-emerald-600" : completion >= 50 ? "text-[#0D9488]" : "text-amber-600"}`}>
                      {completion}% Complete
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      app.profile.status === "trusted" ? "bg-emerald-50 text-emerald-700" :
                      app.profile.status === "basic_verified" ? "bg-blue-50 text-blue-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {app.profile.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Row 5: Bio preview */}
                  {app.profile.bio && (
                    <p className="text-xs text-gray-600 leading-relaxed mb-4 line-clamp-2">{app.profile.bio}</p>
                  )}

                  {/* Row 6: Actions + Contact */}
                  <div className="pt-3 border-t border-[rgba(0,0,0,0.06)]">
                    {/* Contact for approved */}
                    {app.status === "approved" && (
                      <div className="mb-3 bg-emerald-50/80 rounded-[12px] p-3 border border-emerald-100">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Contact</span>
                          <span className="text-[9px] text-emerald-500 font-medium">· visible</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs">
                          {app.profile.phone && (
                            <span className="flex items-center gap-1.5 text-emerald-800">
                              <Phone className="w-3 h-3 text-emerald-600" />{app.profile.phone}
                              <button onClick={() => { navigator.clipboard.writeText(app.profile.phone!); toast.success("Phone copied"); }}
                                className="p-0.5 rounded hover:bg-emerald-100 text-emerald-500 transition-all active:scale-90" aria-label="Copy phone">
                                <Copy className="w-3 h-3" />
                              </button>
                            </span>
                          )}
                          {app.profile.email && (
                            <span className="flex items-center gap-1.5 text-emerald-800">
                              <Mail className="w-3 h-3 text-emerald-600" />{app.profile.email}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Link href={`/organizer/events/${id}/applicants/${app.worker_id}`}
                        className="flex-1 h-9 rounded-[10px] border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all active:scale-[0.97] flex items-center justify-center gap-1.5">
                        View Profile
                      </Link>

                      {app.status === "pending" && (
                        <>
                          <button onClick={() => handleApprove(app.id)} disabled={applying === app.id}
                            className="flex-1 h-9 rounded-[10px] bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(16,185,129,0.2)]">
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button onClick={() => handleReject(app.id)} disabled={applying === app.id}
                            className="flex-1 h-9 rounded-[10px] bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-1.5">
                            <XIcon className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}

                      {app.status === "approved" && (
                        <button onClick={() => setRemoveTarget(app.id)}
                          className="h-9 px-4 rounded-[10px] bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-all active:scale-[0.97] flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}

                      {app.status === "rejected" && (
                        <button onClick={() => handleRestore(app.id)} disabled={applying === app.id}
                          className="h-9 px-4 rounded-[10px] bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center gap-1.5">
                          <ChevronUp className="w-3.5 h-3.5" /> Restore
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <ConfirmDialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => { if (removeTarget) handleRemove(removeTarget); }}
        title="Remove Worker"
        message={removeTarget ? `Remove ${applicants.find(a => a.id === removeTarget)?.profile.full_name} from this event? They will be notified.` : ""}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
