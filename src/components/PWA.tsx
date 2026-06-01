"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, X } from "lucide-react";

export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function OfflineBanner() {
  const online = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  if (online || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto animate-slide-up">
      <div className="card-floating p-4 flex items-center gap-3 bg-red-600/90 backdrop-blur-xl border-red-500/30">
        <WifiOff className="w-5 h-5 shrink-0 text-white" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">No connection</p>
          <p className="text-xs text-white/70">Some features may be limited</p>
        </div>
        <button onClick={() => setDismissed(true)} className="p-1 rounded-[14px] hover:bg-white/20 transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto animate-slide-up">
      <div className="card-floating p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Install EventMan</p>
          <p className="text-xs text-gray-500">Add to home screen for quick access</p>
        </div>
        <button onClick={install} className="btn-base h-9 px-4 rounded-[14px] bg-indigo-700 text-white text-xs font-semibold shadow-[0_2px_8px_rgba(67,56,202,0.2)] hover:bg-indigo-800 active:scale-95 transition-all">
          Install
        </button>
        <button onClick={() => setShow(false)} className="p-1.5 rounded-[14px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function PWARegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
