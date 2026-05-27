"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Bell, CheckCheck, User, Calendar, Users, XCircle } from "lucide-react";
import type { Notification } from "@/lib/supabase/types";

const ICONS: Record<string, any> = {
  "Application Approved": <CheckCheck className="w-4 h-4 text-green-600" />,
  "Application Rejected": <XCircle className="w-4 h-4 text-red-600" />,
  "New Applicant": <Users className="w-4 h-4 text-blue-600" />,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (!prof || prof.role !== "organizer") { router.push("/login"); return; }

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/organizer/dashboard" className="p-1 -ml-1 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-auto">{unreadCount} new</span>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="w-full h-9 mb-3 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium flex items-center justify-center gap-2 active:bg-gray-200">
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </button>
        )}

        {notifications.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No notifications yet</p>
          </div>
        )}

        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} className={`bg-white border rounded-xl p-3.5 flex items-start gap-3 ${
              n.read ? "border-gray-200" : "border-blue-200 bg-blue-50"
            }`}>
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                {ICONS[n.title] || <Bell className="w-4 h-4 text-gray-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
