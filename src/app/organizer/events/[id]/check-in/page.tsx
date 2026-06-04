"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, QrCode, CheckCircle, XCircle, Clock, Copy, Check, User, Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { PageLoader } from "@/lib/design/Loading";
import type { Event } from "@/lib/supabase/types";
import { formatDate } from "@/lib/organizer/constants";
import type { ApplicantWithProfile } from "@/lib/organizer/applicantUtils";
import { loadApplicantsForEvent } from "@/lib/organizer/applicantUtils";
import QRCode from "qrcode";

function parseCheckin(notes: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/\|checked_in:([^\|]+)/);
  return m ? m[1] : null;
}

function removeCheckinTag(notes: string | null): string {
  if (!notes) return "";
  return notes.replace(/\|checked_in:[^\|]*/g, "");
}

export default function CheckinPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [event, setEvent] = useState<Event | null>(null);
  const [approved, setApproved] = useState<(ApplicantWithProfile & { qrDataUrl?: string; checkedIn: boolean; checkedInAt: string | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [id]);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!prof || prof.role !== "organizer") { router.push("/login"); return; }
      const { data: evt } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      if (!evt || evt.organizer_id !== user.id) { router.push("/organizer/dashboard"); return; }
      setEvent(evt);

      const all = await loadApplicantsForEvent(id);
      const approvedOnly = all.filter(a => a.status === "approved");

      const withQr = await Promise.all(approvedOnly.map(async (a) => {
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://eventman2.vercel.app";
        const qrDataUrl = await QRCode.toDataURL(`${baseUrl}/api/checkin?token=${a.id}`, {
          width: 160, margin: 1, color: { dark: "#0D9488", light: "#FFFFFF" },
        });
        const checkedInAt = parseCheckin(a.notes);
        return { ...a, qrDataUrl, checkedIn: !!checkedInAt, checkedInAt };
      }));

      setApproved(withQr);
    } catch (err) { console.error("[CheckinPage] error:", err); } finally { setLoading(false); }
  }, [id]);

  const toggleCheckin = async (app: typeof approved[number]) => {
    const now = new Date().toISOString();
    let newNotes: string;
    if (app.checkedIn) {
      newNotes = removeCheckinTag(app.notes);
    } else {
      newNotes = (app.notes || "").replace(/\|checked_in:[^\|]*/g, "") + `|checked_in:${now}`;
    }

    const { error } = await supabase
      .from("applications").update({ notes: newNotes, updated_at: now }).eq("id", app.id);

    if (error) { toast.error("Failed to update check-in"); return; }
    toast.success(app.checkedIn ? "Checked out" : "Checked in");
    loadData();
  };

  const checkedInCount = approved.filter(a => a.checkedIn).length;

  if (loading) return <PageLoader />;
  if (!event) return null;

  return (
    <div className="min-h-screen bg-[#F8F8F6] pb-8">
      <header className="bg-white border-b border-[rgba(0,0,0,0.06)]">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={`/organizer/events/${id}`} aria-label="Back to event" className="p-1.5 -ml-1.5 text-gray-500 hover:text-[#0D9488] hover:bg-[#0D9488]/10 rounded-[10px] transition-all active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-sm truncate">{event.title}</h1>
            <p className="text-[10px] text-gray-400">{formatDate(event.date, event.date_display)}</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />
              {checkedInCount}/{approved.length}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4">
        {approved.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-lg font-bold text-gray-900">No approved workers</p>
            <p className="text-sm text-gray-500 mt-1.5">Approve applicants first to start check-in.</p>
            <Link href={`/organizer/events/${id}/applicants`} className="mt-6 inline-flex h-11 px-6 rounded-[14px] bg-[#0D9488] text-white text-sm font-semibold items-center gap-2 hover:bg-teal-700 transition-all active:scale-[0.97]">
              View Applicants
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {approved.map(app => (
            <div key={app.id} className={`bg-white rounded-[16px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all ${app.checkedIn ? "ring-2 ring-emerald-400" : ""}`}>
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#0D9488]/10 to-[#0D9488]/20 flex items-center justify-center text-[#0D9488] font-bold text-sm shrink-0">
                    {app.profile.full_name?.charAt(0) || "W"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 truncate">{app.profile.full_name}</p>
                    <p className="text-[10px] text-gray-500">{app.profile.city || app.profile.area || "—"}</p>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${app.checkedIn ? "bg-emerald-500" : "bg-gray-300"}`} />
                </div>

                <div className="flex justify-center mb-3">
                  {app.qrDataUrl ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={app.qrDataUrl} alt={`QR for ${app.profile.full_name}`}
                        className="w-32 h-32 rounded-[12px] border border-[rgba(0,0,0,0.06)] cursor-pointer hover:shadow-md transition-all active:scale-95"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/api/checkin?token=${app.id}`);
                          toast.success("Scan URL copied");
                        }} />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-7 h-7 rounded-[6px] bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
                          <Smartphone className="w-3.5 h-3.5 text-[#0D9488]" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-[12px] bg-gray-50 flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>

                {app.checkedIn && app.checkedInAt && (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 rounded-[10px] px-3 py-1.5 mb-3">
                    <Clock className="w-3 h-3" />
                    <span>Checked in {new Date(app.checkedInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                )}
              </div>

              <div className="px-4 pb-4">
                <button onClick={() => toggleCheckin(app)}
                  className={`w-full h-10 rounded-[12px] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${
                    app.checkedIn
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      : "bg-[#0D9488] text-white hover:bg-teal-700 shadow-[0_2px_8px_rgba(13,148,136,0.2)]"
                  }`}>
                  {app.checkedIn ? (
                    <><XCircle className="w-3.5 h-3.5" /> Check Out</>
                  ) : (
                    <><Check className="w-3.5 h-3.5" /> Check In</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
