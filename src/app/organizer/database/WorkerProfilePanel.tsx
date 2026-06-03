"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Lock, ShieldCheck, ShieldAlert, Phone, Mail, Briefcase, AlertCircle, CheckCircle, Award, MapPin, Clock, Star } from "lucide-react";
import { useBodyScrollLock } from "@/lib/useStableForm";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { computeCompletion, AVAIL_CONFIG } from "@/lib/organizer/constants";
import type { Profile } from "@/lib/supabase/types";

interface Props {
  worker: Profile;
  organizerId: string;
  onClose: () => void;
}

export default function WorkerProfilePanel({ worker, organizerId, onClose }: Props) {
  const [canViewContact, setCanViewContact] = useState(false);
  const [checkingContact, setCheckingContact] = useState(true);
  const supabase = createClient();
  useBodyScrollLock(true);
  const panelRef = useFocusTrap(true);

  useEffect(() => {
    const checkContactAccess = async () => {
      const { data: orgEvents } = await supabase
        .from("events").select("id").eq("organizer_id", organizerId);
      const eventIds = orgEvents?.map(e => e.id) || [];
      if (eventIds.length === 0) { setCheckingContact(false); return; }
      const { count } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .in("event_id", eventIds)
        .eq("worker_id", worker.user_id)
        .eq("status", "approved");
      setCanViewContact((count || 0) > 0);
      setCheckingContact(false);
    };
    checkContactAccess();
  }, [worker.user_id, organizerId]);

  const completion = computeCompletion(worker, true);
  const avail = worker.availability ? AVAIL_CONFIG[worker.availability] : null;

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" ref={panelRef} role="dialog" aria-modal="true" aria-label={`${worker.full_name}'s profile`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={handleOverlayClick} />
      <div className="relative w-full max-w-md bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-slide-right overflow-y-auto overscroll-behavior-contain">
        <button onClick={onClose} data-close-modal
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-[10px] bg-white/90 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white transition-all" aria-label="Close">
          <X className="w-4 h-4" />
        </button>

        <div className="bg-gradient-to-br from-[#0D9488] via-[#0D9488] to-[#0F766E] px-5 pt-10 pb-6">
          <div className="flex items-end gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-[16px] bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold ring-2 ring-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                {worker.avatar_url ? (
                  <img src={worker.avatar_url} alt={worker.full_name || "Worker avatar"} className="w-16 h-16 rounded-[16px] object-cover" />
                ) : (
                  worker.full_name?.charAt(0) || "W"
                )}
              </div>
              {avail && <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[2px] border-[#0D9488] ${avail.dot}`} />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-white font-bold text-lg leading-tight truncate">{worker.full_name}</h2>
              <p className="text-white/80 text-xs mt-0.5">{worker.city || "Location not set"}{worker.age ? ` · ${worker.age} yrs` : ""}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${
                  worker.status === "trusted" ? "bg-emerald-500/20 text-white" :
                  worker.status === "basic_verified" ? "bg-blue-500/20 text-white" :
                  "bg-white/10 text-white/70"
                }`}>
                  {worker.status === "trusted" ? <ShieldCheck className="w-3 h-3" /> :
                   worker.status === "basic_verified" ? <ShieldAlert className="w-3 h-3" /> : null}
                  {worker.status.replace(/_/g, " ")}
                </span>
                {avail && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white/15 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                    <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} /> {avail.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-white rounded-[14px] p-4 border border-[rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Profile Strength</span>
              <span className={`text-sm font-bold ${completion.percent >= 80 ? "text-emerald-600" : completion.percent >= 50 ? "text-amber-600" : "text-gray-500"}`}>{completion.percent}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${completion.percent >= 80 ? "bg-emerald-500" : completion.percent >= 50 ? "bg-amber-500" : "bg-[#0D9488]"}`}
                style={{ width: `${completion.percent}%` }} />
            </div>
            {completion.missing.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {completion.missing.map(m => (
                  <span key={m} className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" /> {m}
                  </span>
                ))}
              </div>
            )}
            {completion.percent === 100 && (
              <p className="mt-2 text-[10px] text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Complete profile</p>
            )}
          </div>

          <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50/80 border-b border-[rgba(0,0,0,0.04)]">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Personal Info</span>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Age</span>
                <span className="text-gray-800 font-medium">{worker.age || "Not set"}</span>
              </div>
              <div className="border-t border-[rgba(0,0,0,0.04)]" />
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Gender</span>
                <span className="text-gray-800 font-medium capitalize">{worker.gender || "Not set"}</span>
              </div>
              <div className="border-t border-[rgba(0,0,0,0.04)]" />
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">City</span>
                <span className="text-gray-800 font-medium">{worker.city || "Not set"}</span>
              </div>
              <div className="border-t border-[rgba(0,0,0,0.04)]" />
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Area</span>
                <span className="text-gray-800 font-medium">{worker.area || "Not set"}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50/80 border-b border-[rgba(0,0,0,0.04)]">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Skills & Experience</span>
            </div>
            <div className="p-4 space-y-3">
              {worker.skills && worker.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {worker.skills.map((s, i) => (
                    <span key={i} className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-[10px] font-medium">{s}</span>
                  ))}
                </div>
              )}
              {worker.experience && (
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <span>{worker.experience}</span>
                </div>
              )}
              {!worker.skills?.length && !worker.experience && (
                <p className="text-xs text-gray-400">No skills or experience listed</p>
              )}
            </div>
          </div>

          {worker.bio && (
            <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50/80 border-b border-[rgba(0,0,0,0.04)]">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">About</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{worker.bio}</p>
              </div>
            </div>
          )}

          {canViewContact && (
            <div className="bg-white rounded-[14px] border border-emerald-200/60 overflow-hidden">
              <div className="px-4 py-2.5 bg-emerald-50/80 border-b border-emerald-100 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-widest">Contact Details</span>
                <span className="text-[9px] text-emerald-500 ml-auto">Visible</span>
              </div>
              <div className="p-4 space-y-3">
                {worker.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-800 font-medium">{worker.phone}</span>
                  </div>
                )}
                {worker.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-800 font-medium truncate">{worker.email}</span>
                  </div>
                )}
                {!worker.phone && !worker.email && (
                  <p className="text-xs text-gray-400">No contact details shared</p>
                )}
              </div>
            </div>
          )}

          {!canViewContact && !checkingContact && (
            <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50/80 border-b border-[rgba(0,0,0,0.04)]">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Contact</span>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Contact details visible after approving this worker for an event
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
