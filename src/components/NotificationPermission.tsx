"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const [enabled, setEnabled] = useState(false);

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
        const ok = await subscribeDevice(profile.role);
        setEnabled(ok);
        doneRef.current = true;
        return;
      }

      if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          const ok = await subscribeDevice(profile.role);
          setEnabled(ok);
        }
        doneRef.current = true;
      }
    };

    setup();
  }, []);

  if (typeof Notification === "undefined") return null;

  return null;
}

export function NotificationTest() {
  const isDev = process.env.NODE_ENV === "development";
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!isDev) return null;

  const sendTest = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/push/send", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setResult("Notification sent!");
      } else {
        setResult(data.error || "failed");
      }
    } catch {
      setResult("network error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2">
      <button
        onClick={sendTest}
        disabled={sending}
        className="h-9 px-3 rounded-[14px] bg-teal-700 text-white text-xs font-semibold shadow-lg hover:bg-teal-800 active:scale-95 transition-all"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 inline mr-1"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        Test Push
      </button>
      {result && (
        <span className="text-[10px] text-gray-500 text-center bg-white/80 px-2 py-1 rounded-[8px] shadow">{result}</span>
      )}
    </div>
  );
}
