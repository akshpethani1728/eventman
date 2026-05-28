"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Search, User, MapPin, Briefcase, Clock, Award, Filter, X, CheckCircle } from "lucide-react";
import { Button } from "@/lib/design/Button";
import { Card } from "@/lib/design/Card";
import { Badge, StatusDot } from "@/lib/design/Badge";
import { PageLoader, EmptyState } from "@/lib/design/Loading";
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
  available_today: { label: "Available Today", dot: "bg-emerald-500", badge: "emerald-100 text-emerald-700 border-emerald-200" },
  available_this_week: { label: "Available This Week", dot: "bg-blue-500", badge: "blue-100 text-blue-700 border-blue-200" },
  available: { label: "Available", dot: "bg-emerald-500", badge: "emerald-100 text-emerald-700 border-emerald-200" },
  weekends: { label: "Weekends", dot: "bg-amber-500", badge: "amber-100 text-amber-700 border-amber-200" },
  evenings: { label: "Evenings", dot: "bg-purple-500", badge: "purple-100 text-purple-700 border-purple-200" },
  busy: { label: "Busy", dot: "bg-red-500", badge: "red-100 text-red-700 border-red-200" },
  unavailable: { label: "Unavailable", dot: "bg-gray-400", badge: "gray-100 text-gray-500 border-gray-200" },
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
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadWorkers(); }, []);

  const loadWorkers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (!prof || prof.role !== "organizer") { router.push("/login"); return; }
    const { data } = await supabase.from("profiles").select("*").eq("role", "worker").order("full_name", { ascending: true });
    setWorkers(data || []);
    setLoading(false);
  };

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
    <div className="min-h-screen bg-[#f5f5f7] pb-24">
      <header className="sticky top-0 bg-white/80 backdrop-blur-2xl border-b border-gray-200/60 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/organizer/dashboard" className="p-1 -ml-1 text-gray-500"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold text-sm">Worker Database</h1>
          <span className="text-xs text-gray-400 ml-auto">{workers.length} workers</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        <form onSubmit={e => e.preventDefault()} className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, area, or skills..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-300 bg-white text-sm form-input" />
          </div>
          <button type="button" onClick={() => setShowFilters(!showFilters)}
            className={`h-10 px-3 rounded-xl border text-sm flex items-center gap-1.5 transition-all ${
              showFilters ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-300 text-gray-600 bg-white"
            }`}>
            <Filter className="w-4 h-4" /> Filters
          </button>
        </form>

        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setAvailableOnly(!availableOnly)}
            className={`h-7 px-3 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1.5 ${
              availableOnly ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-white text-gray-500 border border-gray-200"
            }`}>
            {availableOnly && <CheckCircle className="w-3 h-3" />} Available only
          </button>
          {filtered.length < workers.length && (
            <span className="text-[10px] text-gray-400">{filtered.length} match{filtered.length !== 1 ? "es" : ""}</span>
          )}
        </div>

        {showFilters && (
          <form onSubmit={e => e.preventDefault()} className="bg-white border border-gray-200 rounded-xl p-3 mb-3 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select value={filters.gender} onChange={e => setFilters(f => ({ ...f, gender: e.target.value }))}
                className="h-8 px-2 rounded-lg border border-gray-200 text-xs bg-white">
                <option value="">Any gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <select value={filters.availability} onChange={e => setFilters(f => ({ ...f, availability: e.target.value }))}
                className="h-8 px-2 rounded-lg border border-gray-200 text-xs bg-white">
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
                placeholder="City" className="h-8 px-2 rounded-lg border border-gray-200 text-xs bg-white" />
              <input value={filters.skills} onChange={e => setFilters(f => ({ ...f, skills: e.target.value }))}
                placeholder="Skill" className="h-8 px-2 rounded-lg border border-gray-200 text-xs bg-white" />
            </div>
            {(filters.gender || filters.availability || filters.city || filters.skills) && (
              <button type="button" onClick={() => setFilters({ gender: "", availability: "", city: "", skills: "" })}
                className="text-xs text-blue-600 flex items-center gap-1"><X className="w-3 h-3" /> Clear filters</button>
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
              <Card key={w.id} padding="sm" hover>
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                      {w.full_name?.charAt(0) || "W"}
                    </div>
                    {avail && <StatusDot className="absolute -bottom-0.5 -right-0.5 border-2 border-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-gray-900">{w.full_name}</p>
                      {avail && (
                        <span className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-${avail.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} /> {avail.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {w.age && `${w.age} yrs`}{w.gender && ` · ${w.gender}`}{w.city && ` · ${w.city}`}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {w.skills?.slice(0, 3).map((s, i) => <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>)}
                      {(w.skills?.length || 0) > 3 && <span className="text-[10px] text-gray-400">+{w.skills!.length - 3}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                      {w.experience && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{w.experience}</span>}
                      {w.area && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{w.area}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                          <div className={`h-full rounded-full ${completion >= 80 ? "bg-emerald-500" : completion >= 50 ? "bg-amber-500" : "bg-blue-500"}`}
                            style={{ width: `${completion}%` }} />
                        </div>
                        <span className={`text-[10px] font-medium ${completion >= 80 ? "text-emerald-600" : completion >= 50 ? "text-amber-600" : "text-gray-400"}`}>{completion}%</span>
                      </div>
                      <Badge variant={w.status === "trusted" ? "trusted" : w.status === "basic_verified" ? "basicVerified" : "unverified"}>
                        {w.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
