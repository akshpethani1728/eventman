"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save, User, Phone, MapPin, BadgeCheck, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/lib/design/Button";
import { PageLoader } from "@/lib/design/Loading";
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
  });
  const [pastEventCount, setPastEventCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();
  const update = useCallback((key: string, value: string) => setForm(p => ({ ...p, [key]: value })), []);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => { try { const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!prof || prof.role !== "organizer") { router.push("/login"); return; }
    setProfile(prof);
    setForm({
      full_name: prof.full_name || "",
      phone: prof.phone || "",
      city: prof.city || "",
      area: prof.area || "",
      bio: prof.bio || "",
    });

    const { count: pc } = await supabase
      .from("events").select("*", { count: "exact", head: true }).eq("organizer_id", user.id).in("status", ["completed", "cancelled"]);
    setPastEventCount(pc || 0);

     } catch (err) { console.error("[OrganizerProfilePage] error:", err); } finally { setLoading(false); } };

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
    }).eq("user_id", user.id);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-[#F8F8F6] pb-24">
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="h-0.5 bg-gradient-to-r from-[#0D9488]/20 via-[#0D9488] to-[#0D9488]/20" />
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/organizer/dashboard" className="p-1.5 -ml-1.5 text-gray-500 hover:text-[#0D9488] hover:bg-[#0D9488]/10 rounded-[10px] transition-all"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold text-sm">My Profile</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); saveProfile(); }}>
          <div className="card-base p-6 text-center">
            <div className="w-20 h-20 rounded-[16px] bg-gradient-to-br from-[#0D9488]/10 to-[#0D9488]/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-[#0D9488]">{profile?.full_name?.charAt(0)?.toUpperCase() || "O"}</span>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <p className="font-semibold text-lg text-gray-900">{profile?.full_name}</p>
              {profile?.is_trusted_organizer && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                  <BadgeCheck className="w-3 h-3" />
                  Trusted
                </span>
              )}
              {!profile?.is_trusted_organizer && profile?.status === "trusted" && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#0D9488] bg-[#0D9488]/10 border border-[#0D9488]/20 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              )}
              {!profile?.is_trusted_organizer && profile?.status === "basic_verified" && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200/60 px-2 py-0.5 rounded-full">
                  <ShieldAlert className="w-3 h-3" />
                  Basic Verified
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 capitalize mt-0.5">{profile?.role}</p>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{pastEventCount}</p>
                <p className="text-[11px] text-gray-500">Past events</p>
              </div>
            </div>
          </div>

          <div className="card-base p-5 space-y-4">
            <p className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Personal Information</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.full_name} onChange={e => update("full_name", e.target.value)}
                  className="input-base pl-10" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.phone} onChange={e => update("phone", e.target.value)}
                  placeholder="9876543210"
                  className="input-base pl-10" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">City</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.city} onChange={e => update("city", e.target.value)}
                  placeholder="Ahmedabad"
                  className="input-base pl-10" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Area</label>
                <input value={form.area} onChange={e => update("area", e.target.value)}
                  placeholder="e.g., Navrangpura"
                  className="input-base" />
            </div>
          </div>

          <div className="card-base p-5 space-y-4">
            <p className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">About</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
              <textarea value={form.bio} onChange={e => update("bio", e.target.value)}
                placeholder="Tell workers about your organization..."
                className="input-base h-24 resize-none pt-2.5" />
            </div>
          </div>

          <div className="mt-4">
            <Button type="submit" size="lg" loading={saving} icon={<Save className="w-4 h-4" />} className="w-full">
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
