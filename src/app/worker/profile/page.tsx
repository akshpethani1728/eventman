"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save, User, Phone, Mail, MapPin, Calendar, Briefcase, Award } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/lib/supabase/types";

export default function WorkerProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    age: "",
    gender: "",
    city: "",
    area: "",
    skills: "",
    experience: "",
    availability: "",
    bio: "",
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!prof || prof.role !== "worker") { router.push("/login"); return; }
    setProfile(prof);
    setForm({
      full_name: prof.full_name || "",
      phone: prof.phone || "",
      age: prof.age ? String(prof.age) : "",
      gender: prof.gender || "",
      city: prof.city || "",
      area: prof.area || "",
      skills: prof.skills?.join(", ") || "",
      experience: prof.experience || "",
      availability: prof.availability || "",
      bio: prof.bio || "",
    });
    setLoading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      phone: form.phone || null,
      age: form.age ? parseInt(form.age) : null,
      gender: form.gender || null,
      city: form.city || null,
      area: form.area || null,
      skills: form.skills ? form.skills.split(",").map(s => s.trim()).filter(Boolean) : null,
      experience: form.experience || null,
      availability: form.availability || null,
      bio: form.bio || null,
    }).eq("user_id", user.id);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
  };

  const update = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/worker/dashboard" className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="font-semibold">My Profile</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); saveProfile(); }}>
          {/* Avatar placeholder */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <p className="font-semibold text-lg">{profile?.full_name}</p>
            <p className="text-sm text-gray-500 capitalize">{profile?.role}</p>
          </div>

          {/* Basic Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 mt-4">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Basic Info</h3>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.full_name} onChange={e => update("full_name", e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 bg-white text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.phone} onChange={e => update("phone", e.target.value)}
                  placeholder="9876543210"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 bg-white text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Age</label>
                <input type="number" value={form.age} onChange={e => update("age", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                <select value={form.gender} onChange={e => update("gender", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.city} onChange={e => update("city", e.target.value)}
                  placeholder="Ahmedabad"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 bg-white text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Area</label>
              <input value={form.area} onChange={e => update("area", e.target.value)}
                placeholder="e.g., Navrangpura"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
            </div>
          </div>

          {/* Work Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 mt-4">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Work Info</h3>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Skills (comma separated)</label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.skills} onChange={e => update("skills", e.target.value)}
                  placeholder="e.g., Promotion, Event setup, Crowd management"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 bg-white text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Experience</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.experience} onChange={e => update("experience", e.target.value)}
                  placeholder="e.g., 2 years in event management"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 bg-white text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Availability</label>
              <select value={form.availability} onChange={e => update("availability", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm">
                <option value="">Select availability</option>
                <option value="available">Available</option>
                <option value="weekends">Weekends only</option>
                <option value="evenings">Evenings only</option>
                <option value="unavailable">Not available</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">About / Bio</label>
              <textarea value={form.bio} onChange={e => update("bio", e.target.value)}
                placeholder="Tell organizers about yourself..."
                className="w-full h-24 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm resize-none" />
            </div>
          </div>

          {/* Save */}
          <button
            type="submit"
            disabled={saving}
            className="mt-4 w-full h-12 rounded-xl bg-blue-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 active:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </main>
    </div>
  );
}
