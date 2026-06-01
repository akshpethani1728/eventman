"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save, User, Phone, MapPin, Award, Briefcase, AlertCircle, CheckCircle, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/lib/design/Button";
import { Badge } from "@/lib/design/Badge";
import { PageLoader } from "@/lib/design/Loading";
import type { Profile } from "@/lib/supabase/types";

function computeCompletion(p: Profile): { percent: number; missing: string[] } {
  const checks: [keyof Profile, string, number][] = [
    ["phone", "Phone number", 20], ["age", "Age", 10], ["gender", "Gender", 10],
    ["city", "City", 10], ["area", "Area", 10],
    ["skills", "Skills", 20], ["experience", "Experience", 10], ["bio", "Bio", 10],
  ];
  let percent = 0;
  const missing: string[] = [];
  for (const [key, label, weight] of checks) {
    const val = p[key];
    if (key === "skills") { if (Array.isArray(val) && val.length > 0) percent += weight; else missing.push(label); }
    else if (val !== null && val !== undefined && val !== "") percent += weight; else missing.push(label);
  }
  return { percent, missing };
}

const AVAILABILITY_OPTIONS = [
  { value: "", label: "Set your availability" },
  { value: "available_today", label: "Available Today" },
  { value: "available_this_week", label: "Available This Week" },
  { value: "available", label: "Available (general)" },
  { value: "weekends", label: "Weekends only" },
  { value: "evenings", label: "Evenings only" },
  { value: "busy", label: "Busy / Unavailable" },
  { value: "unavailable", label: "Unavailable" },
];

export default function WorkerProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completion, setCompletion] = useState({ percent: 0, missing: [] as string[] });
  const [form, setForm] = useState({
    full_name: "", phone: "", age: "", gender: "", city: "", area: "",
    skills: "", experience: "", availability: "", bio: "",
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!prof || prof.role !== "worker") { router.push("/login"); return; }
      setProfile(prof);
      setCompletion(computeCompletion(prof));
      setForm({
        full_name: prof.full_name || "", phone: prof.phone || "",
        age: prof.age ? String(prof.age) : "", gender: prof.gender || "",
        city: prof.city || "", area: prof.area || "",
        skills: prof.skills?.join(", ") || "", experience: prof.experience || "",
        availability: prof.availability || "", bio: prof.bio || "",
      });
    } catch (err) {
      console.error("[WorkerProfilePage] error:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name, phone: form.phone || null,
      age: form.age ? parseInt(form.age) : null, gender: form.gender || null,
      city: form.city || null, area: form.area || null,
      skills: form.skills ? form.skills.split(",").map(s => s.trim()).filter(Boolean) : null,
      experience: form.experience || null, availability: form.availability || null, bio: form.bio || null,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    const updated = { ...profile, ...Object.fromEntries(Object.entries(form).map(([k, v]) => {
      if (k === "age") return [k, v ? parseInt(v) : null];
      if (k === "skills") return [k, v ? v.split(",").map(s => s.trim()).filter(Boolean) : null];
      return [k, v || null];
    })) } as Profile;
    setProfile(updated);
    setCompletion(computeCompletion(updated));
    toast.success("Profile saved");
  };

  const update = useCallback((key: string, value: string) => setForm(p => ({ ...p, [key]: value })), []);

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-[#F8F8F6] pb-24">
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="h-0.5 bg-gradient-to-r from-[#0D9488]/20 via-[#0D9488] to-[#0D9488]/20" />
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/worker/dashboard" className="p-1 -ml-1 text-gray-500"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold text-sm text-[#1A1A1A]">My Profile</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Profile Hero */}
        {profile && (
          <div className="card-base p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[#0D9488] flex items-center justify-center mx-auto mb-3 ring-4 ring-[#0D9488]/20">
              <span className="text-2xl font-bold text-white">{profile?.full_name?.charAt(0)?.toUpperCase() || "W"}</span>
            </div>
            <p className="font-semibold text-lg text-[#1A1A1A]">{profile?.full_name}</p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <p className="text-sm text-[#6B6B6B] capitalize">{profile?.role}</p>
              {profile?.availability && (
                <Badge variant={profile.availability === "unavailable" || profile.availability === "busy" ? "closed" : "published"}>
                  {AVAILABILITY_OPTIONS.find(o => o.value === profile.availability)?.label || profile.availability}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Profile Strength */}
        {profile && (
          <div className="card-base p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Profile Strength</span>
              <span className={`text-sm font-bold ${completion.percent >= 80 ? "text-emerald-600" : completion.percent >= 50 ? "text-amber-600" : "text-[#6B6B6B]"}`}>{completion.percent}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${completion.percent >= 80 ? "bg-emerald-500" : completion.percent >= 50 ? "bg-amber-500" : "bg-[#0D9488]"}`}
                style={{ width: `${completion.percent}%` }} />
            </div>
            {completion.missing.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] text-[#6B6B6B] flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-500" /> Add these to strengthen your profile:</p>
                <div className="flex flex-wrap gap-1">
                  {completion.missing.map(m => (
                    <span key={m} className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg">{m}</span>
                  ))}
                </div>
              </div>
            )}
            {completion.percent === 100 && (
              <p className="mt-2 text-[10px] text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Complete profile &mdash; you look great to organizers!</p>
            )}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); saveProfile(); }}>
          {/* Basic Info */}
          <div className="card-base p-5 space-y-4">
            <h3 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">Basic Info</h3>
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                <input value={form.full_name} onChange={e => update("full_name", e.target.value)}
                  className="w-full h-10 pl-9 pr-3 input-base focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                <input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="9876543210"
                  className="w-full h-10 pl-9 pr-3 input-base focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Age</label>
                <input type="number" value={form.age} onChange={e => update("age", e.target.value)}
                  className="w-full h-10 px-3 input-base focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Gender</label>
                <select value={form.gender} onChange={e => update("gender", e.target.value)}
                  className="w-full h-10 px-3 input-base focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">City</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                <input value={form.city} onChange={e => update("city", e.target.value)} placeholder="Ahmedabad"
                  className="w-full h-10 pl-9 pr-3 input-base focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Area</label>
              <input value={form.area} onChange={e => update("area", e.target.value)} placeholder="e.g., Navrangpura"
                className="w-full h-10 px-3 input-base focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20" />
            </div>
          </div>

          {/* Work Info */}
          <div className="card-base p-5 space-y-4 mt-4">
            <h3 className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">Work Info</h3>
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Skills (comma separated)</label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                <input value={form.skills} onChange={e => update("skills", e.target.value)}
                  placeholder="e.g., Promotion, Event setup, Crowd management"
                  className="w-full h-10 pl-9 pr-3 input-base focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Experience</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                <input value={form.experience} onChange={e => update("experience", e.target.value)}
                  placeholder="e.g., 2 years in event management"
                  className="w-full h-10 pl-9 pr-3 input-base focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Availability</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                <select value={form.availability} onChange={e => update("availability", e.target.value)}
                  className="w-full h-10 pl-9 pr-3 input-base appearance-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20">
                  {AVAILABILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">About / Bio</label>
              <textarea value={form.bio} onChange={e => update("bio", e.target.value)}
                placeholder="Tell organizers about yourself..."
                className="w-full h-24 px-3 py-2 input-base resize-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20" />
            </div>
          </div>

          <div className="mt-4">
            <Button type="submit" size="lg" loading={saving} icon={<Save className="w-4 h-4" />} className="w-full btn-primary">
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
