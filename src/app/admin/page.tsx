"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  LogOut, Shield, Users, Calendar, Search, X, RefreshCw,
  Building2, Crown, Trash2, CreditCard, Bell,
  ShieldCheck, Lock, Eye, EyeOff,
  ChevronDown, ChevronUp, MapPin, Clock
} from "lucide-react";
import { Button } from "@/lib/design/Button";
import { Card, CardStat, CardStats } from "@/lib/design/Card";
import { Badge } from "@/lib/design/Badge";
import { PageLoader } from "@/lib/design/Loading";
import { Modal } from "@/lib/design/Modal";
import type { Profile, Event } from "@/lib/supabase/types";

type UserTab = "workers" | "organizers";
type AdminTab = "users" | "events" | "notifications";

function getStatusConfig(status: string, isTrusted: boolean) {
  if (isTrusted || status === "trusted") return { label: "Trusted", variant: "trusted" as const, icon: <Crown className="w-3 h-3" />, color: "text-emerald-700 bg-emerald-50" };
  if (status === "basic_verified") return { label: "Verified", variant: "basicVerified" as const, icon: <ShieldCheck className="w-3 h-3" />, color: "text-[#0369A1] bg-[#F0F9FF]" };
  return { label: "Unverified", variant: "unverified" as const, icon: <Shield className="w-3 h-3" />, color: "text-gray-500 bg-gray-100" };
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return null; }
}

function formatRelativeDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return formatDate(dateStr);
  } catch { return null; }
}

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<AdminTab>("users");
  const [userTab, setUserTab] = useState<UserTab>("workers");
  const [users, setUsers] = useState<Profile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const verified = sessionStorage.getItem("admin_verified");
    if (verified === "1") {
      setAuthenticated(true);
      loadData();
    } else {
      checkAuth();
    }
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!prof || prof.role !== "admin") { router.push("/"); return; }
      setProfile(prof);
      setLoading(false);
    } catch { router.push("/login"); }
  };

  const verifyPassword = async () => {
    if (!password.trim()) { toast.error("Enter password"); return; }
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem("admin_verified", "1");
        setAuthenticated(true);
        loadData();
        toast.success("Access granted");
      } else {
        toast.error("Wrong password");
        setPassword("");
      }
    } catch { toast.error("Verification failed"); }
    finally { setVerifying(false); }
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!prof || prof.role !== "admin") { router.push("/"); return; }
      setProfile(prof);
      const { data: allUsers } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      setUsers(allUsers || []);
      const { data: allEvents } = await supabase.from("events").select("*").order("created_at", { ascending: false });
      setEvents(allEvents || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

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
    if (!confirm("Delete this user? This cannot be undone.")) return;
    await supabase.from("profiles").delete().eq("user_id", userId);
    toast.success("User deleted");
    loadData();
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    await supabase.from("events").delete().eq("id", eventId);
    toast.success("Event deleted");
    loadData();
  };

  const signOut = async () => {
    sessionStorage.removeItem("admin_verified");
    await supabase.auth.signOut();
    router.push("/login");
  };

  const workers = users.filter(u => u.role === "worker");
  const organizers = users.filter(u => u.role === "organizer");
  const currentUsers = userTab === "workers" ? workers : organizers;

  const filteredUsers = currentUsers.filter(u => {
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (userTab === "organizers" && statusFilter === "all" && u.is_trusted_organizer) return true;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q) || (u.phone || "").includes(q);
  });

  const filteredEvents = events.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (e.title || "").toLowerCase().includes(q) || (e.location || "").toLowerCase().includes(q);
  });

  const stats = {
    totalUsers: users.length,
    workers: workers.length,
    activeWorkers: workers.filter(w => w.plan_status === "active").length,
    organizers: organizers.length,
    trustedOrgs: organizers.filter(o => o.is_trusted_organizer).length,
    verifiedOrgs: organizers.filter(o => o.status === "basic_verified" || o.status === "trusted" || o.is_trusted_organizer).length,
    totalEvents: events.length,
    activeEvents: events.filter(e => e.status === "published" || e.status === "filling").length,
  };

  if (loading) return <PageLoader />;

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="card-floating p-8 text-center">
            <div className="w-14 h-14 rounded-[14px] bg-gradient-to-br from-[#0D9488] to-[#0F766E] flex items-center justify-center mx-auto mb-4 shadow-[0_4px_16px_rgba(13,148,136,0.3)]">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-bold text-[18px] text-gray-900 mb-1">Admin Access</h1>
            <p className="text-[13px] text-gray-500 mb-6">Enter admin password to continue</p>
            <div className="relative mb-4">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && verifyPassword()}
                placeholder="Enter password"
                className="w-full h-12 px-4 pr-12 rounded-[12px] bg-gray-50 border border-[rgba(0,0,0,0.08)] text-[14px] outline-none focus:ring-2 focus:ring-[#0D9488]/20 transition-all"
                autoFocus
              />
              <button onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button variant="primary" size="lg" loading={verifying} onClick={verifyPassword} className="w-full">
              Verify
            </Button>
            <button onClick={() => router.push("/")} className="mt-4 text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <header className="sticky top-0 bg-white/80 backdrop-blur-2xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#0D9488] to-[#0F766E] flex items-center justify-center shadow-[0_2px_8px_rgba(13,148,136,0.25)]">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-[17px] leading-tight">Admin Panel</h1>
              <p className="text-[10px] text-gray-400 font-medium tracking-wide">Management Console</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 truncate max-w-[120px]">{profile?.full_name}</span>
            <div className="w-px h-5 bg-[rgba(0,0,0,0.06)]" />
            <button onClick={loadData} className="h-8 w-8 rounded-[10px] hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={signOut} className="h-8 px-3 rounded-[10px] text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all flex items-center gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <CardStats columns={4}>
            <CardStat label="Workers" value={stats.workers} color="amber" />
            <CardStat label="Organizers" value={stats.organizers} color="blue" />
            <CardStat label="Active Events" value={stats.activeEvents} color="emerald" />
            <CardStat label="Trusted Org." value={stats.trustedOrgs} color="purple" />
          </CardStats>
        </div>

        {/* Main Tabs */}
        <div className="card-floating p-1.5 flex items-center gap-2">
          <div className="flex gap-1 flex-1">
            {(["users", "events", "notifications"] as AdminTab[]).map(t => (
              <button key={t} onClick={() => {
                if (t === "notifications") { router.push("/admin/notifications"); return; }
                setTab(t);
              }}
                className={`flex-1 h-10 rounded-[12px] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  tab === t
                    ? "bg-[#0D9488] text-white shadow-[0_2px_8px_rgba(13,148,136,0.25)]"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}>
                {t === "users" && <Users className="w-3.5 h-3.5" />}
                {t === "events" && <Calendar className="w-3.5 h-3.5" />}
                {t === "notifications" && <Bell className="w-3.5 h-3.5" />}
                <span className="capitalize">{t}</span>
                <span className={`text-[10px] ${tab === t ? "text-white/70" : "text-gray-400"}`}>
                  ({t === "users" ? users.length : t === "events" ? events.length : "Push"})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Users Tab */}
        {tab === "users" && (
          <>
            {/* Sub-tabs: Workers / Organizers */}
            <div className="flex gap-2">
              {(["workers", "organizers"] as UserTab[]).map(ut => (
                <button key={ut} onClick={() => { setUserTab(ut); setStatusFilter("all"); setSearchQuery(""); }}
                  className={`flex-1 h-11 rounded-[12px] text-[13px] font-semibold transition-all flex items-center justify-center gap-2 ${
                    userTab === ut
                      ? ut === "workers"
                        ? "bg-amber-50 text-amber-700 border-2 border-amber-200"
                        : "bg-[#F0FDFA] text-[#0F766E] border-2 border-[#99F6E4]"
                      : "bg-white text-gray-500 border-2 border-[rgba(0,0,0,0.06)] hover:border-gray-300"
                  }`}>
                  {ut === "workers" ? <Users className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  {ut === "workers" ? "Workers" : "Organizers"}
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-[6px] ${
                    userTab === ut
                      ? ut === "workers" ? "bg-amber-100 text-amber-600" : "bg-teal-100 text-teal-600"
                      : "bg-gray-100 text-gray-400"
                  }`}>
                    {ut === "workers" ? workers.length : organizers.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Search + Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Search ${userTab}...`}
                  className="w-full h-9 pl-9 pr-8 rounded-[10px] bg-white border border-[rgba(0,0,0,0.06)] text-xs outline-none focus:ring-2 focus:ring-[#0D9488]/20 transition-all" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex gap-1">
                {["all", "unverified", "basic_verified", "trusted"].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`h-9 px-2.5 rounded-[10px] text-[11px] font-medium transition-all ${
                      statusFilter === s ? "bg-[#0D9488] text-white" : "bg-white border border-[rgba(0,0,0,0.06)] text-gray-500 hover:bg-gray-50"
                    }`}>
                    {s === "all" ? "All" : s === "basic_verified" ? "Verified" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* User List */}
            <div className="space-y-2">
              {filteredUsers.length === 0 && (
                <div className="card-base p-12 text-center">
                  {userTab === "workers" ? <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" /> : <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />}
                  <p className="text-sm font-medium text-gray-500">No {userTab} found</p>
                  <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search.</p>
                </div>
              )}
              {filteredUsers.map(u => {
                const statusConfig = getStatusConfig(u.status, u.is_trusted_organizer);
                const isExpanded = expandedUser === u.user_id;
                return (
                  <Card key={u.id} padding="sm">
                    {/* Main Row */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                        u.role === "organizer"
                          ? u.is_trusted_organizer ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-gradient-to-br from-[#0D9488] to-[#0F766E]"
                          : u.plan_status === "active" ? "bg-gradient-to-br from-amber-500 to-amber-600" : "bg-gradient-to-br from-gray-400 to-gray-500"
                      }`}>
                        {(u.full_name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-[14px] text-gray-900 truncate">{u.full_name || "Unknown"}</p>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${statusConfig.color}`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                          {u.role === "organizer" && u.is_trusted_organizer && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 inline-flex items-center gap-1">
                              <Crown className="w-3 h-3" /> Trusted Org
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-gray-400">{u.email || u.phone || "—"}</span>
                          {u.city && <span className="text-[10px] text-gray-400">• {u.city}</span>}
                          <span className="text-[10px] text-gray-300">• {formatRelativeDate(u.created_at)}</span>
                        </div>
                      </div>

                      {/* Quick Status Badge */}
                      {u.role === "worker" && u.plan_status && (
                        <span className={`text-[10px] font-medium px-2 py-1 rounded-[8px] flex items-center gap-1 shrink-0 ${
                          u.plan_status === "active" ? "bg-emerald-50 text-emerald-700" :
                          u.plan_status === "expired" ? "bg-red-50 text-red-600" :
                          "bg-amber-50 text-amber-700"
                        }`}>
                          <CreditCard className="w-3 h-3" />
                          {u.plan_status === "active" ? "Active" : u.plan_status === "expired" ? "Expired" : "Trial"}
                        </span>
                      )}

                      <button onClick={() => setExpandedUser(isExpanded ? null : u.user_id)}
                        className="w-8 h-8 rounded-[8px] hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Expanded Actions */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)] space-y-3 animate-fade-in">
                        {/* Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {u.phone && (
                            <div className="text-[11px]">
                              <span className="text-gray-400">Phone</span>
                              <p className="font-medium text-gray-700">{u.phone}</p>
                            </div>
                          )}
                          {u.age && (
                            <div className="text-[11px]">
                              <span className="text-gray-400">Age</span>
                              <p className="font-medium text-gray-700">{u.age}</p>
                            </div>
                          )}
                          {u.gender && (
                            <div className="text-[11px]">
                              <span className="text-gray-400">Gender</span>
                              <p className="font-medium text-gray-700 capitalize">{u.gender}</p>
                            </div>
                          )}
                          {u.area && (
                            <div className="text-[11px]">
                              <span className="text-gray-400">Area</span>
                              <p className="font-medium text-gray-700">{u.area}</p>
                            </div>
                          )}
                          {u.role === "worker" && u.subscription_end_date && (
                            <div className="text-[11px]">
                              <span className="text-gray-400">Plan Ends</span>
                              <p className="font-medium text-gray-700">{formatDate(u.subscription_end_date)}</p>
                            </div>
                          )}
                          {u.role === "worker" && u.skills && u.skills.length > 0 && (
                            <div className="text-[11px] col-span-2">
                              <span className="text-gray-400">Skills</span>
                              <p className="font-medium text-gray-700">{u.skills.join(", ")}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">Status</span>
                            <select value={u.status} onChange={e => updateUserStatus(u.user_id, e.target.value as any)}
                              className="h-8 px-2 rounded-[8px] border border-[rgba(0,0,0,0.08)] bg-white text-[11px] font-medium outline-none focus:ring-2 focus:ring-[#0D9488]/20 transition-all">
                              <option value="unverified">Unverified</option>
                              <option value="basic_verified">Basic Verified</option>
                              <option value="trusted">Trusted</option>
                            </select>
                          </div>
                          {u.role === "organizer" && (
                            <button onClick={() => toggleOrganizerTrust(u.user_id, u.is_trusted_organizer)}
                              className={`h-8 px-3 rounded-[8px] text-[11px] font-medium inline-flex items-center gap-1.5 transition-all ${
                                u.is_trusted_organizer
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}>
                              <Crown className="w-3.5 h-3.5" />
                              {u.is_trusted_organizer ? "Remove Trust" : "Mark as Trusted"}
                            </button>
                          )}
                          <button onClick={() => deleteUser(u.user_id)}
                            className="h-8 px-3 rounded-[8px] bg-red-50 text-red-600 text-[11px] font-medium inline-flex items-center gap-1.5 hover:bg-red-100 transition-all ml-auto">
                            <Trash2 className="w-3.5 h-3.5" /> Delete User
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Events Tab */}
        {tab === "events" && (
          <>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                className="w-full h-10 pl-9 pr-8 rounded-[10px] bg-white border border-[rgba(0,0,0,0.06)] text-xs outline-none focus:ring-2 focus:ring-[#0D9488]/20 transition-all" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="space-y-2">
              {filteredEvents.length === 0 && (
                <div className="card-base p-12 text-center">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">No events found</p>
                </div>
              )}
              {filteredEvents.map(e => (
                <Card key={e.id} padding="sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#0D9488]/20 to-[#0F766E]/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-[#0D9488]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-gray-900 truncate">{e.title}</p>
                        <Badge variant={(e.status || "draft") as any}>{e.status || "draft"}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{e.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span>{e.location}</span>
                        </div>
                        <span>{e.worker_count} workers</span>
                        {e.category && <span className="capitalize">{e.category}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <button onClick={() => deleteEvent(e.id)}
                          className="h-7 px-2.5 rounded-[8px] bg-red-50 text-red-600 text-[11px] font-medium inline-flex items-center gap-1 hover:bg-red-100 transition-all">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
