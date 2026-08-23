"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Send, Users, Building2, Megaphone,
  CheckCircle, AlertTriangle
} from "lucide-react";
import { Button } from "@/lib/design/Button";
import { Card, CardStats, CardStat } from "@/lib/design/Card";
import { ConfirmDialog } from "@/lib/design/Modal";
import { PageLoader } from "@/lib/design/Loading";

type Audience = "workers" | "organizers" | "everyone";

const AUDIENCE_OPTIONS: { value: Audience; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "workers", label: "Workers", icon: <Users className="w-4 h-4" />, desc: "All subscribed workers" },
  { value: "organizers", label: "Organizers", icon: <Building2 className="w-4 h-4" />, desc: "All subscribed organizers" },
  { value: "everyone", label: "Everyone", icon: <Megaphone className="w-4 h-4" />, desc: "All subscribed users" },
];

interface SendResult {
  ok: boolean;
  total?: number;
  sent?: number;
  failed?: number;
  staleRemoved?: number;
  error?: string;
}

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<Audience>("everyone");
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [subCount, setSubCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
      if (!profile || profile.role !== "admin") { router.push("/login"); return; }
      await loadSubCount();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadSubCount = async () => {
    const { count } = await supabase.from("push_subscriptions").select("*", { count: "exact", head: true });
    setSubCount(count || 0);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/push/admin-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), audience }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to send");
        setResult({ ok: false, error: data.error });
        return;
      }

      setResult(data);
      toast.success(`Notification sent to ${data.sent} users`);
      setTitle("");
      setMessage("");
      await loadSubCount();
    } catch (err: any) {
      toast.error(err.message || "Send failed");
      setResult({ ok: false, error: err.message });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      <header className="sticky top-0 bg-white/80 backdrop-blur-2xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.push("/admin")}
            className="w-9 h-9 rounded-[10px] hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-bold text-[17px] leading-tight">Send Notification</h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide">Push to subscribers</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <CardStats columns={1}>
          <CardStat label="Total Subscribers" value={subCount} color="blue" />
        </CardStats>

        <Card>
          <div className="space-y-5">
            <div>
              <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Notification title"
                maxLength={100}
                className="w-full h-11 px-4 rounded-[10px] bg-gray-50 border border-[rgba(0,0,0,0.08)] text-[14px] outline-none focus:ring-2 focus:ring-[#0D9488]/20 transition-all"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write your notification message..."
                maxLength={500}
                rows={3}
                className="w-full px-4 py-3 rounded-[10px] bg-gray-50 border border-[rgba(0,0,0,0.08)] text-[14px] outline-none focus:ring-2 focus:ring-[#0D9488]/20 transition-all resize-none"
              />
              <p className="text-[11px] text-gray-400 mt-1 text-right">{message.length}/500</p>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">Audience</label>
              <div className="grid grid-cols-3 gap-2">
                {AUDIENCE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setAudience(opt.value)}
                    className={`h-20 rounded-[12px] border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${
                      audience === opt.value
                        ? "border-[#0D9488] bg-[#0D9488]/5 text-[#0D9488]"
                        : "border-[rgba(0,0,0,0.06)] bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {opt.icon}
                    <span className="text-[12px] font-semibold">{opt.label}</span>
                    <span className="text-[10px] opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              loading={sending}
              disabled={!title.trim() || !message.trim()}
              onClick={() => setShowConfirm(true)}
              icon={<Send className="w-4 h-4" />}
              className="w-full"
            >
              Send Notification
            </Button>
          </div>
        </Card>

        {result && result.ok && (
          <Card className="animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">Notification Sent</p>
                <div className="flex flex-wrap gap-3 mt-2">
                  <span className="text-[11px] font-medium px-2 py-1 rounded-[6px] bg-gray-100 text-gray-600">
                    Total: {result.total}
                  </span>
                  <span className="text-[11px] font-medium px-2 py-1 rounded-[6px] bg-emerald-50 text-emerald-700">
                    Sent: {result.sent}
                  </span>
                  {result.failed ? (
                    <span className="text-[11px] font-medium px-2 py-1 rounded-[6px] bg-red-50 text-red-600">
                      Failed: {result.failed}
                    </span>
                  ) : null}
                  {result.staleRemoved ? (
                    <span className="text-[11px] font-medium px-2 py-1 rounded-[6px] bg-amber-50 text-amber-700">
                      Stale Removed: {result.staleRemoved}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        )}

        {result && !result.ok && (
          <Card className="animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">Send Failed</p>
                <p className="text-xs text-gray-500 mt-1">{result.error}</p>
              </div>
            </div>
          </Card>
        )}
      </main>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSend}
        title="Send Notification"
        message={`Send this notification to all ${audience === "everyone" ? "subscribed users" : audience}?`}
        confirmLabel={sending ? "Sending..." : "Send"}
        variant="primary"
      />
    </div>
  );
}
