"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Bell, CheckCheck, Users, XCircle, CheckCircle, Clock3, AlertTriangle, Info } from "lucide-react";
import type { Notification } from "@/lib/supabase/types";

const ICONS: Record<string, { icon: any; bg: string }> = {
  "Application Approved": { icon: CheckCircle, bg: "bg-emerald-50" },
  "Application Rejected": { icon: XCircle, bg: "bg-red-50" },
  "New Applicant": { icon: Users, bg: "bg-blue-50" },
};

function extractEventTitle(message: string): string | null {
  const match = message.match(/"([^"]+)"/);
  return match ? match[1] : null;
}

function SkeletonNotification() {
  return (
    <div className="bg-white rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-pulse flex items-start gap-3">
      <div className="w-8 h-8 rounded-[10px] bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="w-24 h-2.5 bg-gray-100 rounded-full" />
        <div className="w-48 h-2 bg-gray-50 rounded-full" />
        <div className="w-16 h-2 bg-gray-50 rounded-full" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => { try { const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (!prof || prof.role !== "organizer") { router.push("/login"); return; }

    const { data } = await supabase
      .from("notifications").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(50);

    setNotifications(data || []);
     } catch (err) { console.error("[NotificationsPage] error:", err); } finally { setLoading(false); } };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    loadNotifications();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F6] pb-24">
        <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-10">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
            <Link href="/organizer/dashboard" className="p-1.5 -ml-1.5 text-gray-500"><ArrowLeft className="w-5 h-5" /></Link>
            <h1 className="font-semibold text-sm">Activity Feed</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-4 space-y-2">
          {[1,2,3,4,5].map(i => <SkeletonNotification key={i} />)}
        </main>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  const grouped = notifications.reduce((acc, n) => {
    const eventName = extractEventTitle(n.message) || "General";
    if (!acc[eventName]) acc[eventName] = [];
    acc[eventName].push(n);
    return acc;
  }, {} as Record<string, Notification[]>);

  const priorityOrder = ["Application Approved", "Application Rejected", "New Applicant"];
  const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) => {
    const aPriority = Math.min(...a.map(n => priorityOrder.indexOf(n.title) >= 0 ? priorityOrder.indexOf(n.title) : 99));
    const bPriority = Math.min(...b.map(n => priorityOrder.indexOf(n.title) >= 0 ? priorityOrder.indexOf(n.title) : 99));
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime();
  });

  return (
    <div className="min-h-screen bg-[#F8F8F6] pb-24">
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/organizer/dashboard" className="p-1.5 -ml-1.5 text-gray-500 hover:text-[#0D9488] hover:bg-[#0D9488]/10 rounded-[10px] transition-all"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold text-sm">Activity Feed</h1>
          {unreadCount > 0 && (
            <span className="text-xs bg-[#0D9488]/10 text-[#0D9488] px-2.5 py-0.5 rounded-full ml-auto font-semibold">{unreadCount} new</span>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="w-full h-11 mb-5 rounded-[14px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#0D9488] active:scale-[0.98] transition-all">
            <CheckCheck className="w-4 h-4" /> Mark All as Read
          </button>
        )}

        {notifications.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-[#0D9488]" />
            </div>
            <p className="text-lg font-bold text-gray-900">All Clear</p>
            <p className="text-sm text-gray-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Updates about new applicants, approvals, and event activity will appear here.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {sortedGroups.map(([eventName, notifs]) => (
            <div key={eventName} className="animate-fade-in">
              <div className="flex items-center gap-1.5 mb-2.5 px-1">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate">{eventName}</span>
                <span className="text-[11px] text-gray-400 ml-auto bg-gray-100/80 px-2 py-0.5 rounded-full font-medium">{notifs.length}</span>
              </div>
              <div className="space-y-2">
                {notifs.map(n => {
                  const cfg = ICONS[n.title] || { icon: Bell, bg: "bg-gray-50" };
                  const IconComp = cfg.icon;
                  return (
                    <div key={n.id} className={`bg-white rounded-[14px] p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-start gap-3 transition-all ${
                      n.read ? "" : "ring-1 ring-[#0D9488]/20"
                    }`}>
                      <div className={`w-9 h-9 rounded-[10px] ${cfg.bg} flex items-center justify-center shrink-0`}>
                        <IconComp className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                          <Clock3 className="w-3 h-3" />
                          {new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[#0D9488] shrink-0 mt-1.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
