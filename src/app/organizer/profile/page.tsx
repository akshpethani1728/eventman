"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save, User, Phone, MapPin, FileText, Star, BadgeCheck, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/lib/supabase/types";

export default function OrganizerProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    city: "",
    area: "",
    bio: "",
    avatar_url: "",
  });
  const [pastEventCount, setPastEventCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();
  const update = useCallback((key: string, value: string) => setForm(p => ({ ...p, [key]: value })), []);

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

    if (!prof || prof.role !== "organizer") { router.push("/login"); return; }
    setProfile(prof);
    setForm({
      full_name: prof.full_name || "",
      phone: prof.phone || "",
      city: prof.city || "",
      area: prof.area || "",
      bio: prof.bio || "",
      avatar_url: prof.avatar_url || "",
    });

    const { count: pc } = await supabase
      .from("events").select("*", { count: "exact", head: true }).eq("organizer_id", user.id).in("status", ["completed", "cancelled"]);
    setPastEventCount(pc || 0);

    const { data: revs } = await supabase
      .from("reviews").select("rating").eq("to_id", user.id);
    if (revs && revs.length > 0) {
      setAvgRating(Math.round(revs.reduce((s, r) => s + r.rating, 0) / revs.length * 10) / 10);
      setRatingCount(revs.length);
    }

    setLoading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      phone: form.phone || null,
      city: form.city || null,
      area: form.area || null,
      bio: form.bio || null,
      avatar_url: form.avatar_url || null,
    }).eq("user_id", user.id);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
  };

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
          <Link href="/organizer/dashboard" className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="font-semibold">My Profile</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); saveProfile(); }}>
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="Logo" className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-gray-200" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <User className="w-8 h-8 text-blue-600" />
              </div>
            )}
            <div className="flex items-center justify-center gap-2">
              <p className="font-semibold text-lg">{profile?.full_name}</p>
              {profile?.is_trusted_organizer && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md">
                  <BadgeCheck className="w-3 h-3" />
                  Trusted
                </span>
              )}
              {!profile?.is_trusted_organizer && profile?.status === "trusted" && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded-md">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              )}
              {!profile?.is_trusted_organizer && profile?.status === "basic_verified" && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200/60 px-1.5 py-0.5 rounded-md">
                  <ShieldAlert className="w-3 h-3" />
                  Basic Verified
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 capitalize">{profile?.role}</p>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{pastEventCount}</p>
                <p className="text-[10px] text-gray-500">Past events</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-500">{avgRating > 0 ? avgRating : "--"}</p>
                <p className="text-[10px] text-gray-500">{ratingCount > 0 ? `${ratingCount} ratings` : "No ratings"}</p>
              </div>
            </div>
            {avgRating > 0 && (
              <div className="flex items-center justify-center gap-0.5 mt-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-3.5 h-3.5 ${avgRating >= s ? "fill-amber-400 text-amber-400" : avgRating >= s - 0.5 ? "fill-amber-200 text-amber-300" : "text-gray-300"}`} />
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.full_name} onChange={e => update("full_name", e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 bg-white text-sm form-input" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.phone} onChange={e => update("phone", e.target.value)}
                  placeholder="9876543210"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 bg-white text-sm form-input" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.city} onChange={e => update("city", e.target.value)}
                  placeholder="Ahmedabad"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 bg-white text-sm form-input" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Area</label>
              <input value={form.area} onChange={e => update("area", e.target.value)}
                placeholder="e.g., Navrangpura"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm form-input" />
            </div>
          </div>

          {/* About section */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 mt-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">About</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description / About</label>
              <textarea value={form.bio} onChange={e => update("bio", e.target.value)}
                placeholder="Tell workers about your organization..."
                className="w-full h-20 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm resize-none form-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Logo URL</label>
              <input value={form.avatar_url} onChange={e => update("avatar_url", e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm form-input" />
              {form.avatar_url && (
                <img src={form.avatar_url} alt="Preview" className="w-16 h-16 rounded-lg object-cover mt-2 border border-gray-200" />
              )}
            </div>
          </div>

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
