"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, X } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((ch) => ch.charCodeAt(0)));
}

async function getVapidPublicKey(): Promise<string> {
  try {
    const res = await fetch("/api/push/vapid-public-key");
    const data = await res.json();
    return data.publicKey || "";
  } catch {
    return "";
  }
}

async function subscribeDevice(role: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) return false;

    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      const subJson = existing.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh || "",
          auth: subJson.keys?.auth || "",
          role,
        }),
      });
      return true;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const subJson = subscription.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh || "",
        auth: subJson.keys?.auth || "",
        role,
      }),
    });

    return true;
  } catch {
    return false;
  }
}

export function NotificationGate() {
  const supabase = createClient();
  const doneRef = useRef(false);
  const [blocked, setBlocked] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("notif_blocked_dismissed") === "1";
  });

  useEffect(() => {
    if (doneRef.current || typeof Notification === "undefined" || typeof navigator === "undefined") return;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!profile) return;

      if (Notification.permission === "granted") {
        await subscribeDevice(profile.role);
        doneRef.current = true;
        return;
      }

      if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          await subscribeDevice(profile.role);
        } else if (perm === "denied") {
          setBlocked(true);
        }
        doneRef.current = true;
        return;
      }

      if (Notification.permission === "denied") {
        setBlocked(true);
        doneRef.current = true;
      }
    };

    setup();
  }, []);

  if (typeof Notification === "undefined" || !blocked || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-xs z-50 animate-fade-in">
      <div className="bg-white rounded-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-[rgba(0,0,0,0.06)] p-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-[8px] bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-gray-900">Notifications blocked</p>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">Enable them in your browser settings to get updates.</p>
        </div>
        <button onClick={() => { setDismissed(true); localStorage.setItem("notif_blocked_dismissed", "1"); }}
          className="w-6 h-6 rounded-[6px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
