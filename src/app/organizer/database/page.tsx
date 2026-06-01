"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Search, User, MapPin, Briefcase, Clock, Award, Filter, X, CheckCircle, ChevronRight } from "lucide-react";
import { Button } from "@/lib/design/Button";
import { Card } from "@/lib/design/Card";
import { Badge, StatusDot } from "@/lib/design/Badge";
import { PageLoader, EmptyState } from "@/lib/design/Loading";
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

const AVAIL_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  available_today: { label: "Available Today", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  available_this_week: { label: "Available This Week", dot: "bg-[#0D9488]", badge: "bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20" },
  available: { label: "Available", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  weekends: { label: "Weekends", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  evenings: { label: "Evenings", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700 border-purple-200" },
  busy: { label: "Busy", dot: "bg-red-500", badge: "bg-red-100 text-red-700 border-red-200" },
  unavailable: { label: "Unavailable", dot: "bg-gray-400", badge: "bg-gray-100 text-gray-500 border-gray-200" },
};

const AVAIL_SORT_KEY: Record<string, number> = {
  available_today: 0, available_this_week: 1, available: 2,
  weekends: 3, evenings: 4, busy: 5, unavailable: 6,
};

export default function WorkerDatabasePage() {
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ gender: "", availability: "", city: "", skills: "" });
  const [availableOnly, setAvailableOnly] = useState(false);
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
    return true;
  }).sort((a, b) => {
    const aK = AVAIL_SORT_KEY[a.availability || ""] ?? 99;
    const bK = AVAIL_SORT_KEY[b.availability || ""] ?? 99;
    return aK - bK;
  });

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-[#F8F8F6] pb-24">
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="h-0.5 bg-gradient-to-r from-[#0D9488]/20 via-[#0D9488] to-[#0D9488]/20" />
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/organizer/dashboard" className="p-1.5 -ml-1.5 text-gray-500 hover:text-[#0D9488] hover:bg-[#0D9488]/10 rounded-[10px] transition-all"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold text-sm">Worker Database</h1>
          <span className="text-xs text-gray-400 ml-auto font-medium">{workers.length} workers</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        <form onSubmit={e => e.preventDefault()} className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, area, or skills..."
              className="input-base pl-10" />
          </div>
          <button type="button" onClick={() => setShowFilters(!showFilters)}
            className={`btn-base rounded-[10px] h-11 px-4 text-sm gap-1.5 ${
              showFilters ? "btn-primary" : "btn-secondary"
            }`}>
            <Filter className="w-4 h-4" /> Filters
          </button>
        </form>

        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setAvailableOnly(!availableOnly)}
            className={`h-8 px-3 rounded-[10px] text-[11px] font-medium transition-all flex items-center gap-1.5 ${
              availableOnly ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-white text-gray-500 border border-[rgba(0,0,0,0.08)] hover:border-[rgba(0,0,0,0.14)]"
            }`}>
            {availableOnly && <CheckCircle className="w-3 h-3" />} Available only
          </button>
          {filtered.length < workers.length && (
            <span className="text-[10px] text-gray-400 font-medium">{filtered.length} match{filtered.length !== 1 ? "es" : ""}</span>
          )}
        </div>

        {showFilters && (
          <form onSubmit={e => e.preventDefault()} className="card-base p-5 mb-3 space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <select value={filters.gender} onChange={e => setFilters(f => ({ ...f, gender: e.target.value }))}
                className="input-base">
                <option value="">Any gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <select value={filters.availability} onChange={e => setFilters(f => ({ ...f, availability: e.target.value }))}
                className="input-base">
                <option value="">Any availability</option>
                <option value="available_today">Available Today</option>
                <option value="available_this_week">Available This Week</option>
                <option value="available">Available (general)</option>
                <option value="weekends">Weekends</option>
                <option value="evenings">Evenings</option>
                <option value="busy">Busy</option>
                <option value="unavailable">Unavailable</option>
              </select>
              <input value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                placeholder="City" className="input-base" />
              <input value={filters.skills} onChange={e => setFilters(f => ({ ...f, skills: e.target.value }))}
                placeholder="Skill" className="input-base" />
            </div>
            {(filters.gender || filters.availability || filters.city || filters.skills) && (
              <button type="button" onClick={() => setFilters({ gender: "", availability: "", city: "", skills: "" })}
                className="text-xs text-[#0D9488] flex items-center gap-1 hover:text-[#0F766E] transition-colors"><X className="w-3 h-3" /> Clear filters</button>
            )}
          </form>
        )}

        {filtered.length === 0 && (
          <EmptyState icon={<Search className="w-9 h-9 text-gray-300" />} title="No workers found" description="Try adjusting your search or filters" />
        )}

        <div className="space-y-2">
          {filtered.map(w => {
            const completion = computeCompletion(w);
            const avail = w.availability ? AVAIL_CONFIG[w.availability] : null;
            return (
              <Card key={w.id} padding="md" hover className="cursor-pointer transition-all duration-200 active:scale-[0.99] group"
                onClick={() => setSelectedWorker(w)}>
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#0D9488]/10 to-[#0D9488]/20 flex items-center justify-center text-[#0D9488] font-bold text-sm group-hover:ring-2 group-hover:ring-[#0D9488]/30 transition-all">
                      {w.full_name?.charAt(0) || "W"}
                    </div>
                    {avail && <StatusDot variant={
                      w.availability === "available_today" || w.availability === "available" ? "green" :
                      w.availability === "available_this_week" ? "blue" :
                      w.availability === "weekends" ? "amber" :
                      w.availability === "evenings" ? "purple" :
                      w.availability === "busy" ? "red" : "gray"
                    } className="absolute -bottom-0.5 -right-0.5 border-2 border-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 group-hover:text-[#0D9488] transition-colors">{w.full_name}</p>
                      {avail && (
                        <span className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${
                          w.availability === "available_today" || w.availability === "available" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          w.availability === "available_this_week" ? "bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20" :
                          w.availability === "weekends" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          w.availability === "evenings" ? "bg-purple-50 text-purple-700 border-purple-200" :
                          w.availability === "busy" ? "bg-red-50 text-red-700 border-red-200" :
                          "bg-gray-50 text-gray-500 border-gray-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            w.availability === "available_today" || w.availability === "available" ? "bg-emerald-500" :
                            w.availability === "available_this_week" ? "bg-[#0D9488]" :
                            w.availability === "weekends" ? "bg-amber-500" :
                            w.availability === "evenings" ? "bg-purple-500" :
                            w.availability === "busy" ? "bg-red-500" :
                            "bg-gray-400"
                          }`} /> {avail.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {w.age && `${w.age} yrs`}{w.gender && ` &middot; ${w.gender}`}{w.city && ` &middot; ${w.city}`}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {w.skills?.slice(0, 3).map((s, i) => <span key={i} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-[10px]">{s}</span>)}
                      {(w.skills?.length || 0) > 3 && <span className="text-[10px] text-gray-400 font-medium">+{w.skills!.length - 3}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-gray-500">
                      {w.experience && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{w.experience}</span>}
                      {w.area && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{w.area}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                          <div className={`h-full rounded-full ${completion >= 80 ? "bg-emerald-500" : completion >= 50 ? "bg-amber-500" : "bg-[#0D9488]"}`}
                            style={{ width: `${completion}%` }} />
                        </div>
                        <span className={`text-[10px] font-medium ${completion >= 80 ? "text-emerald-600" : completion >= 50 ? "text-amber-600" : "text-gray-400"}`}>{completion}%</span>
                      </div>
                      <Badge variant={w.status === "trusted" ? "trusted" : w.status === "basic_verified" ? "basicVerified" : "unverified"}>
                        {w.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 mt-3 shrink-0 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Card>
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
