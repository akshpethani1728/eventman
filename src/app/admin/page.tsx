"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  LogOut, Shield, Ban, Users, Calendar, BadgeCheck, ShieldCheck,
  ShieldAlert, Crown, Trash2, CreditCard, Clock, ChevronRight, Plus,
  Search, X, RefreshCw, Building2, Flag, MoreHorizontal, AlertTriangle,
  CheckCircle, XCircle, Filter
} from "lucide-react";
import { Button } from "@/lib/design/Button";
import { Card, CardHeader, CardTitle, CardStat, CardStats } from "@/lib/design/Card";
import { Badge, StatusDot, Divider } from "@/lib/design/Badge";
import { PageLoader } from "@/lib/design/Loading";
import type { Profile, Event } from "@/lib/supabase/types";

type AdminTab = "users" | "events";

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <Shield className="w-3.5 h-3.5 text-indigo-500" />,
  organizer: <Building2 className="w-3.5 h-3.5 text-[#0D9488]" />,
  worker: <Users className="w-3.5 h-3.5 text-amber-600" />,
};

const PLAN_BADGES: Record<string, { label: string; variant: string }> = {
  active: { label: "Active", variant: "approved" },
  expired: { label: "Expired", variant: "rejected" },
  trial: { label: "Trial", variant: "pending" },
  cancelled: { label: "Cancelled", variant: "cancelled" },
};

function getStatusBadgeVariant(status: string, isTrusted: boolean) {
  if (isTrusted) return "trusted";
  if (status === "trusted") return "trusted";
  if (status === "basic_verified") return "basicVerified";
  return "unverified";
}

function getStatusIcon(status: string, isTrusted: boolean) {
  if (isTrusted) return <Crown className="w-3 h-3" />;
  if (status === "trusted") return <ShieldCheck className="w-3 h-3" />;
  if (status === "basic_verified") return <ShieldAlert className="w-3 h-3" />;
  return <Shield className="w-3 h-3" />;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return null; }
}

export default function AdminDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<Profile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!prof || prof.role !== "admin") { router.push("/login"); return; }
      setProfile(prof);
      const { data: allUsers } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      setUsers(allUsers || []);
      const { data: allEvents } = await supabase.from("events").select("*").order("created_at", { ascending: false });
      setEvents(allEvents || []);
    } catch (err) { console.error("[AdminDashboard] error:", err); } finally { setLoading(false); }
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

  const signOut = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const filteredUsers = users.filter(u => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q)
    );
  });

  const filteredEvents = events.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (e.title || "").toLowerCase().includes(q) || (e.location || "").toLowerCase().includes(q);
  });

  const stats = {
    totalUsers: users.length,
    organizers: users.filter(u => u.role === "organizer").length,
    workers: users.filter(u => u.role === "worker").length,
    admins: users.filter(u => u.role === "admin").length,
    totalEvents: events.length,
    trustedOrganizers: users.filter(u => u.role === "organizer" && u.is_trusted_organizer).length,
  };

  const userCountByRole = { admin: stats.admins, organizer: stats.organizers, worker: stats.workers };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      {/* Premium Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-2xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#0D9488] to-[#0F766E] flex items-center justify-center shadow-[0_2px_8px_rgba(13,148,136,0.25)]">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-[17px] leading-tight">Admin</h1>
              <p className="text-[10px] text-gray-400 font-medium tracking-wide">Control Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 truncate max-w-[120px]">{profile?.full_name}</span>
            <div className="w-px h-5 bg-[rgba(0,0,0,0.06)]" />
            <button onClick={loadData}
              className="h-8 w-8 rounded-[10px] hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
              title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={signOut}
              className="h-8 px-3 rounded-[10px] text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all flex items-center gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <CardStats columns={5}>
            <CardStat label="Total Users" value={stats.totalUsers} color="gray" />
            <CardStat label="Organizers" value={stats.organizers} color="blue" />
            <CardStat label="Workers" value={stats.workers} color="amber" />
            <CardStat label="Events" value={stats.totalEvents} color="emerald" />
            <CardStat label="Trusted Org." value={stats.trustedOrganizers} color="purple" />
          </CardStats>
        </div>

        {/* Tabs + Search Bar */}
        <div className="card-floating p-1.5 flex items-center gap-2">
          <div className="flex gap-1 flex-1">
            {(["users", "events"] as AdminTab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 h-10 rounded-[12px] text-xs font-semibold capitalize transition-all ${
                  tab === t
                    ? "bg-[#0D9488] text-white shadow-[0_2px_8px_rgba(13,148,136,0.25)]"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}>
                <span className="hidden sm:inline">{t}</span>
                <span className="sm:hidden">{t === "users" ? "👤" : "📅"}</span>
                {" "}
                <span className={`text-[10px] ${tab === t ? "text-white/70" : "text-gray-400"}`}>
                  ({t === "users" ? users.length : events.length})
                </span>
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-[200px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search ${tab}...`}
              className="w-full h-9 pl-9 pr-8 rounded-[10px] bg-gray-100 border-0 text-xs outline-none focus:ring-2 focus:ring-[#0D9488]/20 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {tab === "users" && (
            <button onClick={() => setShowFilters(!showFilters)}
              className={`h-9 px-3 rounded-[10px] text-xs font-medium flex items-center gap-1.5 transition-all ${
                showFilters || roleFilter !== "all" || statusFilter !== "all"
                  ? "bg-[#0D9488]/10 text-[#0D9488]"
                  : "text-gray-500 hover:bg-gray-100"
              }`}>
              <Filter className="w-3.5 h-3.5" /> Filters
            </button>
          )}
        </div>

        {/* Filter bar */}
        {tab === "users" && showFilters && (
          <div className="card-base p-3 animate-fade-in flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Role</span>
              <div className="flex gap-1">
                {["all", "admin", "organizer", "worker"].map(r => (
                  <button key={r} onClick={() => setRoleFilter(r)}
                    className={`h-7 px-2.5 rounded-[8px] text-[11px] font-medium capitalize transition-all ${
                      roleFilter === r ? "bg-[#0D9488] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>{r}</button>
                ))}
              </div>
            </div>
            <div className="w-px h-6 bg-[rgba(0,0,0,0.06)]" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</span>
              <div className="flex gap-1">
                {["all", "unverified", "basic_verified", "trusted"].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`h-7 px-2.5 rounded-[8px] text-[11px] font-medium capitalize transition-all ${
                      statusFilter === s ? "bg-[#0D9488] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>{s.replace("_", " ")}</button>
                ))}
              </div>
            </div>
            {(roleFilter !== "all" || statusFilter !== "all") && (
              <button onClick={() => { setRoleFilter("all"); setStatusFilter("all"); }}
                className="h-7 px-2.5 rounded-[8px] text-[11px] font-medium text-red-600 hover:bg-red-50 transition-all ml-auto">
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div className="space-y-2">
            {filteredUsers.length === 0 && (
              <div className="card-base p-12 text-center">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No users found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search query.</p>
              </div>
            )}
            {filteredUsers.map(u => (
              <Card key={u.id} padding="sm" hover>
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                    u.role === "admin" ? "bg-indigo-500" : u.role === "organizer" ? "bg-[#0D9488]" : "bg-amber-500"
                  }`}>
                    {(u.full_name || "U").charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-gray-900 truncate">{u.full_name || "Unknown"}</p>
                      <Badge variant={getStatusBadgeVariant(u.status, u.is_trusted_organizer)} icon={getStatusIcon(u.status, u.is_trusted_organizer)}>
                        {u.is_trusted_organizer ? "Trusted Org" : u.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-[6px] bg-gray-100 text-gray-600 capitalize flex items-center gap-1">
                        {ROLE_ICONS[u.role] || null}
                        {u.role}
                      </span>
                      <span className="text-xs text-gray-400">{u.email || u.phone || "—"}</span>
                    </div>

                    {/* Plan info */}
                    {u.role === "worker" && u.plan_status && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-[6px] flex items-center gap-1 ${
                          u.plan_status === "active" ? "bg-emerald-50 text-emerald-700" :
                          u.plan_status === "expired" ? "bg-red-50 text-red-600" :
                          u.plan_status === "trial" ? "bg-amber-50 text-amber-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          <CreditCard className="w-2.5 h-2.5" />
                          {PLAN_BADGES[u.plan_status]?.label || u.plan_status}
                        </span>
                        {formatDate(u.subscription_start_date) && (
                          <span className="text-[10px] text-gray-400">{formatDate(u.subscription_start_date)}</span>
                        )}
                        {u.plan_status === "trial" && formatDate(u.trial_end_date) && (
                          <span className="text-[10px] text-amber-600 font-medium">Trial ends {formatDate(u.trial_end_date)}</span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      <select value={u.status} onChange={e => updateUserStatus(u.user_id, e.target.value as any)}
                        className="h-7 px-2 rounded-[8px] border border-[rgba(0,0,0,0.08)] bg-white text-[11px] font-medium outline-none focus:ring-2 focus:ring-[#0D9488]/20 transition-all">
                        <option value="unverified">Unverified</option>
                        <option value="basic_verified">Basic Verify</option>
                        <option value="trusted">Trusted</option>
                      </select>
                      {u.role === "organizer" && (
                        <button onClick={() => toggleOrganizerTrust(u.user_id, u.is_trusted_organizer)}
                          className={`h-7 px-2.5 rounded-[8px] text-[11px] font-medium inline-flex items-center gap-1 transition-all ${
                            u.is_trusted_organizer
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}>
                          <Crown className="w-3 h-3" />
                          {u.is_trusted_organizer ? "Trusted" : "Mark Trust"}
                        </button>
                      )}
                      <button onClick={() => deleteUser(u.user_id)}
                        className="h-7 px-2.5 rounded-[8px] bg-red-50 text-red-600 text-[11px] font-medium inline-flex items-center gap-1 hover:bg-red-100 transition-all">
                        <Ban className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Events Tab */}
        {tab === "events" && (
          <div className="space-y-2">
            {filteredEvents.length === 0 && (
              <div className="card-base p-12 text-center">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No events found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your search query.</p>
              </div>
            )}
            {filteredEvents.map(e => (
              <Card key={e.id} padding="sm" hover>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#0D9488]/20 to-[#0F766E]/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-[#0D9488]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-gray-900 truncate">{e.title}</p>
                      <Badge variant={(e.status || "draft") as any}>{e.status || "draft"}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{e.date}</span>
                      </div>
                      <span>·</span>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{e.location}</span>
                      </div>
                      <span>·</span>
                      <span>{e.worker_count} workers</span>
                      {e.category && (
                        <>
                          <span>·</span>
                          <span className="capitalize">{e.category}</span>
                        </>
                      )}
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
        )}
      </main>
    </div>
  );
}

function MapPin(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

