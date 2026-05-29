"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Bell, CheckCheck, CheckCircle, XCircle, X, Clock } from "lucide-react";
import type { Notification } from "@/lib/supabase/types";

const ICONS: Record<string, any> = {
  "Application Approved": <CheckCircle className="w-4 h-4 text-green-600" />,
  "Application Rejected": <XCircle className="w-4 h-4 text-red-600" />,
  "Trial Ending Soon": <Clock className="w-4 h-4 text-blue-600" />,
  "Subscription Expired": <XCircle className="w-4 h-4 text-red-600" />,
  "Payment Successful": <CheckCircle className="w-4 h-4 text-green-600" />,
  "Subscription Active": <CheckCircle className="w-4 h-4 text-blue-600" />,
};

function extractEventTitle(message: string): string | null {
  const match = message.match(/"([^"]+)"/);
  return match ? match[1] : null;
}

export default function WorkerNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (!prof || prof.role !== "worker") { router.push("/login"); return; }

    const { data } = await supabase
      .from("notifications").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(50);

    setNotifications(data || []);
    setLoading(false);
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    loadNotifications();
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  const grouped = notifications.reduce((acc, n) => {
    const eventName = extractEventTitle(n.message) || "General";
    if (!acc[eventName]) acc[eventName] = [];
    acc[eventName].push(n);
    return acc;
  }, {} as Record<string, Notification[]>);

  const priorityOrder = ["Application Approved", "Application Rejected"];
  const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) => {
    const aPriority = Math.min(...a.map(n => priorityOrder.indexOf(n.title) >= 0 ? priorityOrder.indexOf(n.title) : 99));
    const bPriority = Math.min(...b.map(n => priorityOrder.indexOf(n.title) >= 0 ? priorityOrder.indexOf(n.title) : 99));
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/worker/dashboard" className="p-1 -ml-1 text-gray-500"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-auto">{unreadCount} new</span>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="w-full h-9 mb-4 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium flex items-center justify-center gap-2 active:bg-gray-200">
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </button>
        )}

        {notifications.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs text-gray-300 mt-1">Updates about your applications will appear here</p>
          </div>
        )}

        <div className="space-y-4">
          {sortedGroups.map(([eventName, notifs]) => (
            <div key={eventName}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
                  {eventName}
                </span>
                <span className="text-[10px] text-gray-400 ml-auto">{notifs.length}</span>
              </div>
              <div className="space-y-1.5">
                {notifs.map(n => (
                  <div key={n.id} className={`border rounded-xl p-3 flex items-start gap-2.5 ${
                    n.read ? "border-gray-200 bg-white" : "border-blue-200 bg-blue-50"
                  }`}>
                    <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                      {ICONS[n.title] || <Bell className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
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
