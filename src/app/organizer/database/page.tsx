"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Search, User, MapPin, Phone, Mail, Briefcase, Clock, Award, Filter, X } from "lucide-react";
import type { Profile } from "@/lib/supabase/types";

export default function WorkerDatabasePage() {
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    gender: "",
    availability: "",
    city: "",
    skills: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (!prof || prof.role !== "organizer") { router.push("/login"); return; }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "worker")
      .order("full_name", { ascending: true });

    setWorkers(data || []);
    setLoading(false);
  };

  const filtered = workers.filter(w => {
    const q = query.toLowerCase();
    if (q && !w.full_name?.toLowerCase().includes(q) && !w.area?.toLowerCase().includes(q) && !w.city?.toLowerCase().includes(q) && !w.skills?.some(s => s.toLowerCase().includes(q)))
      return false;
    if (filters.gender && w.gender !== filters.gender) return false;
    if (filters.availability && w.availability !== filters.availability) return false;
    if (filters.city && !w.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.skills && !w.skills?.some(s => s.toLowerCase().includes(filters.skills.toLowerCase()))) return false;
    return true;
  });

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/organizer/dashboard" className="p-1 -ml-1 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold">Worker Database</h1>
          <span className="text-xs text-gray-400 ml-auto">{workers.length} workers</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        {/* Search */}
        <form onSubmit={e => e.preventDefault()} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, area, or skills..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-300 bg-white text-sm" />
          </div>
          <button type="button" onClick={() => setShowFilters(!showFilters)}
            className={`h-10 px-3 rounded-xl border text-sm flex items-center gap-1.5 ${
              showFilters ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-300 text-gray-600 bg-white"
            }`}>
            <Filter className="w-4 h-4" /> Filters
          </button>
        </form>

        {/* Filters */}
        {showFilters && (
          <form onSubmit={e => e.preventDefault()} className="bg-white border border-gray-200 rounded-xl p-3 mb-4 space-y-2">
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
                <option value="available">Available</option>
                <option value="weekends">Weekends</option>
                <option value="evenings">Evenings</option>
                <option value="unavailable">Unavailable</option>
              </select>
              <input value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                placeholder="City" className="h-8 px-2 rounded-lg border border-gray-200 text-xs bg-white" />
              <input value={filters.skills} onChange={e => setFilters(f => ({ ...f, skills: e.target.value }))}
                placeholder="Skill" className="h-8 px-2 rounded-lg border border-gray-200 text-xs bg-white" />
            </div>
            {(filters.gender || filters.availability || filters.city || filters.skills) && (
              <button type="button" onClick={() => setFilters({ gender: "", availability: "", city: "", skills: "" })}
                className="text-xs text-blue-600 flex items-center gap-1">
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </form>
        )}

        {/* Results */}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No workers found</div>
        )}

        <div className="space-y-2">
          {filtered.map(w => (
            <div key={w.id} className="bg-white border border-gray-200 rounded-xl p-3.5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                  {w.full_name?.charAt(0) || "W"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-900">{w.full_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {w.age && `${w.age} yrs`}{w.gender && ` · ${w.gender}`}{w.city && ` · ${w.city}`}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {w.skills?.slice(0, 3).map((s, i) => (
                      <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                    {(w.skills?.length || 0) > 3 && (
                      <span className="text-[10px] text-gray-400">+{w.skills!.length - 3}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                    {w.experience && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{w.experience}</span>}
                    {w.availability && <span className="flex items-center gap-1 capitalize"><Clock className="w-3 h-3" />{w.availability}</span>}
                    {w.area && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{w.area}</span>}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                  w.status === "trusted" ? "bg-green-100 text-green-700" :
                  w.status === "basic_verified" ? "bg-blue-100 text-blue-700" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {w.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
