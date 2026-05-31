"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { LogOut, Shield, Ban, Users, Calendar, BadgeCheck, ShieldCheck, ShieldAlert, Crown, Trash2, CreditCard, Clock } from "lucide-react";
import { Button } from "@/lib/design/Button";
import { Card, CardHeader } from "@/lib/design/Card";
import { Badge, StatusDot } from "@/lib/design/Badge";
import { PageLoader } from "@/lib/design/Loading";
import type { Profile, Event } from "@/lib/supabase/types";

type AdminTab = "users" | "events";

export default function AdminDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<Profile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => { try { const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (!prof || prof.role !== "admin") { router.push("/login"); return; }
    setProfile(prof);
    const { data: allUsers } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(allUsers || []);
    const { data: allEvents } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    setEvents(allEvents || []);
     } catch (err) { console.error("[AdminDashboard] error:", err); } finally { setLoading(false); } };

  const updateUserStatus = async (userId: string, status: "unverified" | "basic_verified" | "trusted") => {
    const { error } = await supabase.from("profiles").update({ status }).eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated");
    loadData();
  };

  const toggleOrganizerTrust = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_trusted_organizer: !current }).eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success(current ? "Trust removed" : "Marked as trusted");
    loadData();
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user?")) return;
    await supabase.from("profiles").delete().eq("user_id", userId);
    toast.success("User deleted");
    loadData();
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm("Delete this event?")) return;
    await supabase.from("events").delete().eq("id", eventId);
    toast.success("Event deleted");
    loadData();
  };

  const signOut = async () => { await supabase.auth.signOut(); router.push("/login"); };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <header className="sticky top-0 bg-white/80 backdrop-blur-2xl border-b border-gray-200/60 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-600" />
            <h1 className="font-bold text-lg">Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 truncate max-w-[120px]">{profile?.full_name}</span>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-4 bg-white/80 backdrop-blur-xl rounded-2xl p-1 border border-gray-200/60 shadow-sm">
          {(["users", "events"] as AdminTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 h-11 rounded-lg text-sm font-medium capitalize transition-all ${
                tab === t ? "bg-slate-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}>
              {t} ({t === "users" ? users.length : events.length})
            </button>
          ))}
        </div>

        {tab === "users" && (
          <div className="space-y-2">
            {users.map(u => (
              <Card key={u.id} padding="sm">
                <CardHeader className="mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm truncate">{u.full_name}</p>
                      {u.role === "organizer" && u.is_trusted_organizer && <Crown className="w-3 h-3 text-emerald-500 shrink-0" />}
                      {u.role === "worker" && u.plan_status === "active" && <CreditCard className="w-3 h-3 text-slate-500 shrink-0" />}
                      {u.role === "worker" && u.plan_status === "expired" && <Clock className="w-3 h-3 text-red-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{u.role} Â· {u.email || u.phone || "â€”"}</p>
                    {u.role === "worker" && u.plan_status && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Plan: {u.plan_status}
                        {u.subscription_start_date && ` Â· Since ${new Date(u.subscription_start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                        {u.subscription_end_date && ` Â· Till ${new Date(u.subscription_end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                        {u.trial_end_date && u.plan_status === "trial" && ` Â· Trial ends ${new Date(u.trial_end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                      </p>
                    )}
                  </div>
                  <Badge variant={u.status === "trusted" ? "trusted" : u.status === "basic_verified" ? "basicVerified" : "unverified"}>
                    {u.is_trusted_organizer && <Crown className="w-3 h-3" />}
                    {!u.is_trusted_organizer && u.status === "trusted" && <ShieldCheck className="w-3 h-3" />}
                    {!u.is_trusted_organizer && u.status === "basic_verified" && <ShieldAlert className="w-3 h-3" />}
                    {u.status === "unverified" && <Shield className="w-3 h-3" />}
                    {u.status.replace("_", " ")}
                  </Badge>
                </CardHeader>
                <div className="flex flex-wrap gap-1.5">
                  <select value={u.status} onChange={e => updateUserStatus(u.user_id, e.target.value as any)}
                    className="h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs flex-1 min-w-0">
                    <option value="unverified">Unverified</option>
                    <option value="basic_verified">Basic Verify</option>
                    <option value="trusted">Trusted</option>
                  </select>
                  {u.role === "organizer" && (
                    <button onClick={() => toggleOrganizerTrust(u.user_id, u.is_trusted_organizer)}
                      className={`h-8 px-3 rounded-lg text-xs font-medium shrink-0 inline-flex items-center gap-1 transition-all ${
                        u.is_trusted_organizer ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}>
                      <Crown className="w-3 h-3" />
                      {u.is_trusted_organizer ? "Trusted" : "Mark Trust"}
                    </button>
                  )}
                  <button onClick={() => deleteUser(u.user_id)}
                    className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 hover:bg-red-100 transition-colors"
                    title="Delete user"><Ban className="w-3.5 h-3.5" /></button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === "events" && (
          <div className="space-y-2">
            {events.map(e => (
              <Card key={e.id} padding="sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{e.title}</p>
                    <p className="text-xs text-gray-500 truncate">{e.date} Â· {e.location} Â· {e.worker_count} workers</p>
                  </div>
                  <button onClick={() => deleteEvent(e.id)}
                    className="h-8 px-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium shrink-0 hover:bg-red-100 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

