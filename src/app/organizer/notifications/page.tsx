"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Bell, CheckCheck, Users, XCircle, CheckCircle, Clock3 } from "lucide-react";
import type { Notification } from "@/lib/supabase/types";

const ICONS: Record<string, any> = {
  "Application Approved": <CheckCircle className="w-4 h-4 text-green-600" />,
  "Application Rejected": <XCircle className="w-4 h-4 text-red-600" />,
  "New Applicant": <Users className="w-4 h-4 text-indigo-700" />,
};

function extractEventTitle(message: string): string | null {
  const match = message.match(/"([^"]+)"/);
  return match ? match[1] : null;
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
      <div className="min-h-screen bg-gradient-to-b from-indigo-50/30 to-gray-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-10 h-10 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="w-32 h-3 bg-gray-200/70 rounded-full animate-pulse mx-auto" />
        </div>
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
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/30 to-gray-50 pb-24">
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 z-10">
        <div className="h-0.5 bg-gradient-to-r from-indigo-200 via-indigo-500 to-indigo-200" />
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/organizer/dashboard" className="p-1.5 -ml-1.5 text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold text-sm">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-lg ml-auto font-semibold">{unreadCount} new</span>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="w-full h-10 mb-5 rounded-xl bg-white text-gray-600 text-sm font-medium flex items-center justify-center gap-2 border border-gray-200/70 shadow-sm hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all">
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </button>
        )}

        {notifications.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center mx-auto mb-4 shadow-sm ring-1 ring-indigo-200/60">
              <Bell className="w-6 h-6 text-indigo-600" />
            </div>
            <p className="text-base font-semibold text-gray-900">All clear!</p>
            <p className="text-sm text-gray-500 mt-1">Updates about new applicants will appear here</p>
          </div>
        )}

        <div className="space-y-4">
          {sortedGroups.map(([eventName, notifs]) => (
            <div key={eventName} className="animate-fade-in">
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">{eventName}</span>
                <span className="text-[10px] text-gray-400 ml-auto bg-gray-100/80 px-2 py-0.5 rounded-lg font-medium">{notifs.length}</span>
              </div>
              <div className="space-y-1.5">
                {notifs.map(n => (
                  <div key={n.id} className={`rounded-xl p-3.5 flex items-start gap-3 border shadow-sm shadow-black/[0.02] transition-all ${
                    n.read ? "border-gray-200/70 bg-white" : "border-indigo-200 bg-indigo-50/80"
                  }`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      n.title === "Application Approved" ? "bg-emerald-50" :
                      n.title === "Application Rejected" ? "bg-red-50" :
                      "bg-indigo-50"
                    }`}>
                      {ICONS[n.title] || <Bell className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <Clock3 className="w-3 h-3" />
                        {new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

