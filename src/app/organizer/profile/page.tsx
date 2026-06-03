"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save, User, Phone, MapPin, BadgeCheck, ShieldCheck, ShieldAlert, Calendar, Users, Star, Target, LogOut, Edit3, X, CheckCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PageLoader } from "@/lib/design/Loading";
import type { Profile } from "@/lib/supabase/types";

export default function OrganizerProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", city: "", area: "", bio: "" });
  const [pastEventCount, setPastEventCount] = useState(0);
  const [totalWorkersHired, setTotalWorkersHired] = useState(0);
  const [activeEventsCount, setActiveEventsCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => { try { const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (!prof || prof.role !== "organizer") { router.push("/login"); return; }
    setProfile(prof);
    setForm({
      full_name: prof.full_name || "", phone: prof.phone || "",
      city: prof.city || "", area: prof.area || "", bio: prof.bio || "",
    });

    const { count: pc } = await supabase
      .from("events").select("*", { count: "exact", head: true }).eq("organizer_id", user.id).in("status", ["completed", "cancelled"]);
    setPastEventCount(pc || 0);

    const { data: allEvents } = (await supabase
      .from("events").select("id").eq("organizer_id", user.id).in("status", ["published", "filling", "full"])) || { data: [] };
    setActiveEventsCount(allEvents?.length || 0);

    const eventIds = allEvents?.map(e => e.id) || [];
    if (eventIds.length > 0) {
      const { data: allApps } = await supabase
        .from("applications").select("event_id, status").in("event_id", eventIds);
      setTotalWorkersHired(allApps?.filter(a => a.status === "approved").length || 0);
    }
     } catch (err) { console.error("[OrganizerProfile] error:", err); } finally { setLoading(false); } };

  const saveProfile = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name, phone: form.phone || null,
      city: form.city || null, area: form.area || null, bio: form.bio || null,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    setProfile({ ...profile!, ...form } as Profile);
    setEditing(false);
  };

  const signOut = async () => { await supabase.auth.signOut(); router.push("/login"); };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-[#F8F8F6] pb-24">
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/organizer/dashboard" aria-label="Back to dashboard" className="p-1 -ml-1 text-gray-500 hover:text-[#0D9488] transition-colors active:scale-90"><ArrowLeft className="w-5 h-5" /></Link>
            <h1 className="font-semibold text-sm">Organization Profile</h1>
          </div>
          <div className="flex items-center gap-1">
            {!editing && (
              <button onClick={() => setEditing(true)}
                className="h-9 px-3.5 rounded-[10px] bg-[#0D9488] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-teal-700 transition-all active:scale-95">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            <button onClick={signOut} aria-label="Sign out"
              className="h-9 w-9 rounded-[10px] text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all active:scale-90">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="bg-gradient-to-br from-[#0D9488] via-[#0D9488] to-[#0F766E] rounded-[20px] p-6 text-center shadow-[0_8px_32px_rgba(13,148,136,0.2)]">
          <div className="w-20 h-20 rounded-[16px] bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto ring-2 ring-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.1)]" aria-hidden="true">
            <span className="text-3xl font-bold text-white">{profile?.full_name?.charAt(0)?.toUpperCase() || "O"}</span>
          </div>
          <h2 className="text-white text-xl font-bold mt-4">{profile?.full_name}</h2>
          <p className="text-white/70 text-sm mt-0.5">Event Organizer</p>
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            {profile?.is_trusted_organizer && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
                <BadgeCheck className="w-3 h-3" /> Trusted Organizer
              </span>
            )}
            {!profile?.is_trusted_organizer && profile?.status === "trusted" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
                <ShieldCheck className="w-3 h-3" /> Verified
              </span>
            )}
            {profile?.is_trusted_organizer === false && (profile?.status !== "trusted") && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/60 bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-sm">
                <ShieldAlert className="w-3 h-3" /> {profile?.status === "basic_verified" ? "Basic Verified" : "Profile Created"}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Performance Overview
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-gray-50 rounded-[12px] p-3">
              <p className="text-xl font-bold text-gray-900">{pastEventCount}</p>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Past Events</p>
            </div>
            <div className="text-center bg-gray-50 rounded-[12px] p-3">
              <p className="text-xl font-bold text-[#0D9488]">{totalWorkersHired}</p>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Workers Hired</p>
            </div>
            <div className="text-center bg-gray-50 rounded-[12px] p-3">
              <p className="text-xl font-bold text-emerald-600">{activeEventsCount}</p>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Active Now</p>
            </div>
          </div>
        </div>

        {!editing && (
          <div className="bg-white rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Business Information</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[10px] bg-emerald-50 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-[#0D9488]" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 font-medium">Organization Name</p>
                  <p className="text-sm font-semibold text-gray-900">{profile?.full_name || "—"}</p>
                </div>
              </div>
              <div className="border-t border-[rgba(0,0,0,0.04)]" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[10px] bg-emerald-50 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-[#0D9488]" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 font-medium">Contact Number</p>
                  <p className="text-sm font-semibold text-gray-900">{profile?.phone || "—"}</p>
                </div>
              </div>
              <div className="border-t border-[rgba(0,0,0,0.04)]" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[10px] bg-emerald-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-[#0D9488]" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 font-medium">Location</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {[profile?.city, profile?.area].filter(Boolean).join(", ") || "—"}
                  </p>
                </div>
              </div>
              {profile?.bio && (
                <>
                  <div className="border-t border-[rgba(0,0,0,0.04)]" />
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-[10px] bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Star className="w-4 h-4 text-[#0D9488]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 font-medium">About</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {editing && (
          <form onSubmit={(e) => { e.preventDefault(); saveProfile(); }}>
            <div className="bg-white rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Edit Information</p>
                <button type="button" onClick={() => setEditing(false)}
                  className="text-gray-400 hover:text-gray-600 active:scale-90" aria-label="Cancel editing">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label htmlFor="profile-name" className="block text-xs font-medium text-gray-600 mb-1.5">Organization Name</label>
                <input id="profile-name" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full h-11 px-3.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white text-sm outline-none transition-all focus:border-[#0D9488] focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]" />
              </div>
              <div>
                <label htmlFor="profile-phone" className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
                <input id="profile-phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="9876543210"
                  className="w-full h-11 px-3.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white text-sm outline-none transition-all focus:border-[#0D9488] focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="profile-city" className="block text-xs font-medium text-gray-600 mb-1.5">City</label>
                  <input id="profile-city" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="Ahmedabad"
                    className="w-full h-11 px-3.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white text-sm outline-none transition-all focus:border-[#0D9488] focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]" />
                </div>
                <div>
                  <label htmlFor="profile-area" className="block text-xs font-medium text-gray-600 mb-1.5">Area</label>
                  <input id="profile-area" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))}
                    placeholder="e.g., Navrangpura"
                    className="w-full h-11 px-3.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white text-sm outline-none transition-all focus:border-[#0D9488] focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]" />
                </div>
              </div>
              <div>
                <label htmlFor="profile-bio" className="block text-xs font-medium text-gray-600 mb-1.5">About Organization</label>
                <textarea id="profile-bio" value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell workers about your organization..."
                  className="w-full h-24 px-3.5 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white text-sm outline-none transition-all focus:border-[#0D9488] focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)] resize-none" />
              </div>
            </div>
            <div className="mt-4">
              <button type="submit" disabled={saving}
                className="w-full h-12 rounded-[12px] bg-[#0D9488] text-white text-sm font-semibold hover:bg-teal-700 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(13,148,136,0.25)]">
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Changes</>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
