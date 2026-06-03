"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Search, User, MapPin, Briefcase, Clock, Award, Filter, X, CheckCircle, ChevronRight, Star, Sparkles, Zap, BadgeCheck, ShieldCheck } from "lucide-react";
import { PageLoader } from "@/lib/design/Loading";
import WorkerProfilePanel from "./WorkerProfilePanel";
import type { Profile } from "@/lib/supabase/types";

function computeCompletion(p: Profile): number {
  const checks: [keyof Profile, number][] = [
    ["avatar_url", 15], ["phone", 15], ["age", 10], ["gender", 10],
    ["city", 10], ["area", 10], ["skills", 15], ["experience", 10], ["bio", 10],
  ];
  let percent = 0;
  for (const [key, weight] of checks) {
    const val = p[key];
    if (key === "skills") { if (Array.isArray(val) && val.length > 0) percent += weight; }
    else if (val !== null && val !== undefined && val !== "") percent += weight;
  }
  return percent;
}

const AVAIL_CONFIG: Record<string, { label: string; dot: string }> = {
  available_today: { label: "Available Today", dot: "bg-emerald-500" },
  available_this_week: { label: "Available This Week", dot: "bg-blue-500" },
  available: { label: "Available", dot: "bg-emerald-500" },
  weekends: { label: "Weekends", dot: "bg-amber-500" },
  evenings: { label: "Evenings", dot: "bg-purple-500" },
  busy: { label: "Busy", dot: "bg-red-500" },
  unavailable: { label: "Unavailable", dot: "bg-gray-400" },
};

const AVAIL_SORT_KEY: Record<string, number> = {
  available_today: 0, available_this_week: 1, available: 2,
  weekends: 3, evenings: 4, busy: 5, unavailable: 6,
};

function SkeletonWorkerCard() {
  return (
    <div className="bg-white rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[12px] bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="w-28 h-3 bg-gray-100 rounded-full" />
          <div className="w-20 h-2.5 bg-gray-50 rounded-full" />
          <div className="flex gap-1.5">
            <div className="w-14 h-5 bg-gray-50 rounded-full" />
            <div className="w-16 h-5 bg-gray-50 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkerDatabasePage() {
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ gender: "", availability: "", city: "", skills: "" });
  const [availableOnly, setAvailableOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Profile | null>(null);
  const [organizerId, setOrganizerId] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadWorkers(); }, []);

  const loadWorkers = async () => { try { const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setOrganizerId(user.id);
    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (!prof || prof.role !== "organizer") { router.push("/login"); return; }
    const { data } = await supabase.from("profiles").select("*").eq("role", "worker").order("full_name", { ascending: true });
    setWorkers(data || []);
     } catch (err) { console.error("[WorkerDatabasePage] error:", err); } finally { setLoading(false); } };

  const filtered = workers.filter(w => {
    const q = query.toLowerCase();
    if (q && !w.full_name?.toLowerCase().includes(q) && !w.area?.toLowerCase().includes(q) && !w.city?.toLowerCase().includes(q) && !w.skills?.some(s => s.toLowerCase().includes(q))) return false;
    if (filters.gender && w.gender !== filters.gender) return false;
    if (filters.availability && w.availability !== filters.availability) return false;
    if (filters.city && !w.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.skills && !w.skills?.some(s => s.toLowerCase().includes(filters.skills.toLowerCase()))) return false;
    if (availableOnly) { const a = w.availability || ""; if (a !== "available_today" && a !== "available_this_week" && a !== "available") return false; }
    if (verifiedOnly && w.status === "unverified") return false;
    return true;
  }).sort((a, b) => {
    const aK = AVAIL_SORT_KEY[a.availability || ""] ?? 99;
    const bK = AVAIL_SORT_KEY[b.availability || ""] ?? 99;
    return aK - bK;
  });

  if (loading) return (
    <div className="min-h-screen bg-[#F8F8F6] pb-24">
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/organizer/dashboard" className="p-1.5 -ml-1.5 text-gray-500"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold text-sm">Talent Discovery</h1>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {[1,2,3,4,5].map(i => <SkeletonWorkerCard key={i} />)}
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F8F6] pb-24">
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/organizer/dashboard" className="p-1.5 -ml-1.5 text-gray-500 hover:text-[#0D9488] hover:bg-[#0D9488]/10 rounded-[10px] transition-all"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold text-sm">Talent Discovery</h1>
          <span className="text-xs text-gray-400 ml-auto font-medium">{workers.length} workers</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Search */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search talent by name, area, skills..."
              className="w-full h-11 pl-10 pr-3 rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white text-sm outline-none transition-all focus:border-[#0D9488] focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`h-11 px-4 rounded-[12px] text-sm font-semibold transition-all flex items-center gap-1.5 ${
              showFilters ? "bg-[#0D9488] text-white shadow-[0_2px_8px_rgba(13,148,136,0.2)]" : "bg-white text-gray-600 border border-[rgba(0,0,0,0.08)] hover:border-[rgba(0,0,0,0.14)]"
            }`}>
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        {/* Quick filter chips */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <button onClick={() => setAvailableOnly(!availableOnly)}
            className={`h-8 px-3.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 ${
              availableOnly ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm" : "bg-white text-gray-500 border border-[rgba(0,0,0,0.08)] hover:border-gray-300"
            }`}>
            <Zap className={`w-3 h-3 inline mr-1 ${availableOnly ? "text-emerald-600" : ""}`} /> Available
          </button>
          <button onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`h-8 px-3.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 ${
              verifiedOnly ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm" : "bg-white text-gray-500 border border-[rgba(0,0,0,0.08)] hover:border-gray-300"
            }`}>
            <ShieldCheck className={`w-3 h-3 inline mr-1 ${verifiedOnly ? "text-blue-600" : ""}`} /> Verified
          </button>
          <button onClick={() => setQuery("")}
            className="h-8 px-3.5 rounded-full text-[11px] font-semibold bg-white text-gray-500 border border-[rgba(0,0,0,0.08)] hover:border-gray-300 transition-all whitespace-nowrap shrink-0">
            <Star className="w-3 h-3 inline mr-1" /> Top Rated
          </button>
          {filtered.length < workers.length && (
            <span className="text-[10px] text-gray-400 font-medium shrink-0 ml-1">{filtered.length} match{filtered.length !== 1 ? "es" : ""}</span>
          )}
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="bg-white rounded-[14px] p-4 mb-4 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-fade-in border border-[rgba(0,0,0,0.06)]">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Advanced Filters</p>
            <div className="grid grid-cols-2 gap-2.5">
              <select value={filters.gender} onChange={e => setFilters(f => ({ ...f, gender: e.target.value }))}
                className="input-base text-xs">
                <option value="">Any gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <select value={filters.availability} onChange={e => setFilters(f => ({ ...f, availability: e.target.value }))}
                className="input-base text-xs">
                <option value="">Any availability</option>
                <option value="available_today">Available Today</option>
                <option value="available_this_week">Available This Week</option>
                <option value="available">Available</option>
                <option value="weekends">Weekends</option>
                <option value="evenings">Evenings</option>
                <option value="busy">Busy</option>
                <option value="unavailable">Unavailable</option>
              </select>
              <input value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                placeholder="City" className="input-base text-xs" />
              <input value={filters.skills} onChange={e => setFilters(f => ({ ...f, skills: e.target.value }))}
                placeholder="Skill" className="input-base text-xs" />
            </div>
            {(filters.gender || filters.availability || filters.city || filters.skills) && (
              <button onClick={() => setFilters({ gender: "", availability: "", city: "", skills: "" })}
                className="text-xs text-[#0D9488] flex items-center gap-1 hover:text-[#0F766E] transition-colors"><X className="w-3 h-3" /> Clear filters</button>
            )}
          </div>
        )}

        {/* Results */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-lg font-bold text-gray-900">No workers found</p>
            <p className="text-sm text-gray-500 mt-1.5">Try adjusting your search or filters to discover talent.</p>
            <button onClick={() => { setQuery(""); setFilters({ gender: "", availability: "", city: "", skills: "" }); setAvailableOnly(false); setVerifiedOnly(false); }}
              className="mt-5 h-10 px-5 rounded-[12px] bg-[#0D9488] text-white text-sm font-semibold hover:bg-teal-700 transition-all active:scale-[0.97]">Clear All Filters</button>
          </div>
        )}

        <div className="space-y-2.5">
          {filtered.map(w => {
            const completion = computeCompletion(w);
            const avail = w.availability ? AVAIL_CONFIG[w.availability] : null;
            return (
              <div key={w.id}
                className="bg-white rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] cursor-pointer active:scale-[0.99]"
                onClick={() => setSelectedWorker(w)}>
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-[#0D9488]/10 to-[#0D9488]/20 flex items-center justify-center text-[#0D9488] font-bold text-base">
                      {w.full_name?.charAt(0) || "W"}
                    </div>
                    {avail && <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[2px] border-white ${avail.dot}`} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900">{w.full_name}</p>
                      {w.status === "trusted" && <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      {avail && (
                        <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          w.availability === "available_today" || w.availability === "available" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          w.availability === "available_this_week" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                          w.availability === "weekends" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          w.availability === "evenings" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                          "bg-gray-50 text-gray-500 border border-gray-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            w.availability === "available_today" || w.availability === "available" ? "bg-emerald-500" :
                            w.availability === "available_this_week" ? "bg-blue-500" :
                            w.availability === "weekends" ? "bg-amber-500" :
                            w.availability === "evenings" ? "bg-purple-500" :
                            w.availability === "busy" ? "bg-red-500" :
                            "bg-gray-400"
                          }`} /> {avail.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[w.age && `${w.age}y`, w.gender && w.gender, w.city].filter(Boolean).join(" · ")}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {w.skills?.slice(0, 3).map((s, i) => <span key={i} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-[8px] font-medium">{s}</span>)}
                      {(w.skills?.length || 0) > 3 && <span className="text-[10px] text-gray-400 font-medium self-center">+{w.skills!.length - 3}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                          <div className={`h-full rounded-full ${completion >= 80 ? "bg-emerald-500" : completion >= 50 ? "bg-amber-500" : "bg-[#0D9488]"}`}
                            style={{ width: `${completion}%` }} />
                        </div>
                        <span className={`text-[9px] font-medium ${completion >= 80 ? "text-emerald-600" : completion >= 50 ? "text-amber-600" : "text-gray-400"}`}>{completion}%</span>
                      </div>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                        w.status === "trusted" ? "bg-emerald-50 text-emerald-700" :
                        w.status === "basic_verified" ? "bg-blue-50 text-blue-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>{w.status.replace(/_/g, " ")}</span>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {selectedWorker && organizerId && (
        <WorkerProfilePanel
          worker={selectedWorker}
          organizerId={organizerId}
          onClose={() => setSelectedWorker(null)}
        />
      )}
    </div>
  );
}
