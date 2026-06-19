"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Bell, CheckCheck, CheckCircle, XCircle, X, Clock, AlertCircle, BadgeCheck, Share2 } from "lucide-react";
import type { Notification } from "@/lib/supabase/types";

const ICONS: Record<string, any> = {
  "Application Approved": <CheckCircle className="w-4 h-4 text-green-600" />,
  "Application Rejected": <XCircle className="w-4 h-4 text-red-600" />,
  "Trial Ending Soon": <Clock className="w-4 h-4 text-[#0D9488]" />,
  "Trial Expired": <AlertCircle className="w-4 h-4 text-amber-600" />,
  "Welcome": <BadgeCheck className="w-4 h-4 text-emerald-600" />,
  "Subscription Active": <CheckCircle className="w-4 h-4 text-emerald-600" />,
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

  const shareApp = async () => {
    const text = "Join EventMan - the best platform for event workers and organizers! Find events, hire workers, and manage everything in one place. 🚀\n\nDownload now: https://eventman2.vercel.app";
    if (navigator.share) {
      try { await navigator.share({ title: "EventMan", text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      const { toast } = await import("sonner");
      toast.success("Link copied to clipboard!");
    }
  };

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!prof || prof.role !== "worker") { router.push("/login"); return; }

      const { data } = await supabase
        .from("notifications").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(50);

      setNotifications(data || []);
    } catch (err) {
      console.error("[WorkerNotificationsPage] error:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    loadNotifications();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#A1A1AA] font-medium">Loading notifications...</p>
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

  const priorityOrder = ["Application Approved", "Application Rejected"];
  const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) => {
    const aPriority = Math.min(...a.map(n => priorityOrder.indexOf(n.title) >= 0 ? priorityOrder.indexOf(n.title) : 99));
    const bPriority = Math.min(...b.map(n => priorityOrder.indexOf(n.title) >= 0 ? priorityOrder.indexOf(n.title) : 99));
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime();
  });

  return (
    <div className="min-h-screen bg-[#F8F8F6] pb-24">
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="h-0.5 bg-gradient-to-r from-[#0D9488]/20 via-[#0D9488] to-[#0D9488]/20" />
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/worker/dashboard" className="p-1 -ml-1 text-gray-500"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold text-sm text-[#1A1A1A]">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-xs bg-[#0D9488]/10 text-[#0D9488] px-2 py-0.5 rounded-full ml-auto font-semibold">{unreadCount} new</span>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="w-full h-9 mb-4 rounded-[10px] bg-white text-[#6B6B6B] text-sm font-medium flex items-center justify-center gap-2 border border-[rgba(0,0,0,0.06)] hover:bg-[#F8F8F6] active:scale-[0.98] transition-all">
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </button>
        )}

        <div className="mb-4 rounded-[16px] bg-gradient-to-r from-teal-600 to-teal-700 p-4 flex items-center gap-3 shadow-lg shadow-teal-700/20">
          <div className="w-10 h-10 rounded-[12px] bg-white/20 flex items-center justify-center shrink-0">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Share with Friends</p>
            <p className="text-xs text-teal-100 mt-0.5">Help your friends discover EventMan</p>
          </div>
          <button onClick={shareApp}
            className="h-9 px-4 rounded-[12px] bg-white text-teal-700 text-xs font-bold shadow-lg active:scale-95 transition-all">
            Share
          </button>
        </div>

        {notifications.length === 0 && (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-5 h-5 text-[#0D9488]" />
            </div>
            <p className="text-sm font-medium text-[#6B6B6B]">No notifications yet</p>
            <p className="text-xs text-[#A1A1AA] mt-1">Updates about your applications will appear here</p>
          </div>
        )}

        <div className="space-y-4">
          {sortedGroups.map(([eventName, notifs]) => (
            <div key={eventName}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider truncate">
                  {eventName}
                </span>
                <span className="text-[10px] text-[#A1A1AA] ml-auto bg-gray-100 px-1.5 py-0.5 rounded-md font-medium">{notifs.length}</span>
              </div>
              <div className="space-y-1.5">
                {notifs.map(n => (
                  <div key={n.id} className={`card-base p-3 flex items-start gap-2.5 transition-all ${
                    n.read ? "" : "bg-teal-50/40 border-l-2 border-l-[#0D9488]"
                  }`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      n.read ? "bg-white" : "bg-white"
                    }`}>
                      {ICONS[n.title] || <Bell className="w-3.5 h-3.5 text-[#A1A1AA]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#1A1A1A]">{n.title}</p>
                      <p className="text-xs text-[#6B6B6B] mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-[#A1A1AA] mt-0.5">
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
