"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Lock, ShieldCheck, ShieldAlert, Phone, Mail, Briefcase, AlertCircle, CheckCircle } from "lucide-react";
import { Badge, StatusDot } from "@/lib/design/Badge";
import type { Profile } from "@/lib/supabase/types";

type DotVariant = "green" | "amber" | "red" | "blue" | "purple" | "gray";
type BadgeVariant = "published" | "pending" | "closed" | "soon" | "trusted" | "basicVerified" | "unverified";

function computeCompletion(p: Profile): { percent: number; missing: string[] } {
  const checks: [keyof Profile, string, number][] = [
    ["avatar_url", "Photo", 15], ["phone", "Phone", 15],
    ["age", "Age", 10], ["gender", "Gender", 10],
    ["city", "City", 10], ["area", "Area", 10],
    ["skills", "Skills", 15], ["experience", "Experience", 10], ["bio", "Bio", 10],
  ];
  let percent = 0;
  const missing: string[] = [];
  for (const [key, label, weight] of checks) {
    const val = p[key];
    if (key === "skills") { if (Array.isArray(val) && val.length > 0) percent += weight; else missing.push(label); }
    else if (val !== null && val !== undefined && val !== "") percent += weight; else missing.push(label);
  }
  return { percent, missing };
}

const AVAIL_CONFIG: Record<string, { label: string; dotColor: DotVariant; badgeVariant: BadgeVariant }> = {
  available_today: { label: "Available Today", dotColor: "green", badgeVariant: "published" },
  available_this_week: { label: "Available This Week", dotColor: "blue", badgeVariant: "pending" },
  available: { label: "Available", dotColor: "green", badgeVariant: "published" },
  weekends: { label: "Weekends", dotColor: "amber", badgeVariant: "soon" },
  evenings: { label: "Evenings", dotColor: "purple", badgeVariant: "pending" },
  busy: { label: "Busy", dotColor: "red", badgeVariant: "closed" },
  unavailable: { label: "Unavailable", dotColor: "gray", badgeVariant: "closed" },
};

interface Props {
  worker: Profile;
  organizerId: string;
  onClose: () => void;
}

export default function WorkerProfilePanel({ worker, organizerId, onClose }: Props) {
  const [canViewContact, setCanViewContact] = useState(false);
  const [checkingContact, setCheckingContact] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkContactAccess = async () => {
      const { data: orgEvents } = await supabase
        .from("events")
        .select("id")
        .eq("organizer_id", organizerId);
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

  const completion = computeCompletion(worker);
  const avail = worker.availability ? AVAIL_CONFIG[worker.availability] : null;
  const statusVariant = worker.status === "trusted" ? "trusted" as const : worker.status === "basic_verified" ? "basicVerified" as const : "unverified" as const;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={handleOverlayClick} />
      <div className="relative w-full max-w-md bg-white shadow-2xl animate-slide-right overflow-y-auto overscroll-behavior-contain">
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-xl bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white transition-all">
          <X className="w-4 h-4" />
        </button>

        {/* Hero section */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-5 pt-10 pb-6">
          <div className="flex items-end gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold ring-2 ring-white/30 shadow-lg">
                {worker.avatar_url ? (
                  <img src={worker.avatar_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  worker.full_name?.charAt(0) || "W"
                )}
              </div>
              {avail && <StatusDot variant={avail.dotColor} className="absolute -bottom-1 -right-1 border-2 border-slate-800" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-white font-bold text-lg leading-tight truncate">{worker.full_name}</h2>
              <p className="text-slate-200/80 text-xs mt-0.5">Worker · {worker.city || "Location not set"}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={statusVariant}>
                  {worker.status === "trusted" ? <ShieldCheck className="w-3 h-3" /> : worker.status === "basic_verified" ? <ShieldAlert className="w-3 h-3" /> : null}
                  {worker.status.replace(/_/g, " ")}
                </Badge>
                {avail && (
                  <Badge variant={avail.badgeVariant}>
                    <StatusDot variant={avail.dotColor} className="!w-1.5 !h-1.5" /> {avail.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Profile Strength */}
          <div className="bg-white rounded-xl border border-gray-200/80 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Profile Strength</span>
              <span className={`text-sm font-bold ${completion.percent >= 80 ? "text-emerald-600" : completion.percent >= 50 ? "text-amber-600" : "text-gray-500"}`}>{completion.percent}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${completion.percent >= 80 ? "bg-emerald-500" : completion.percent >= 50 ? "bg-amber-500" : "bg-slate-600"}`}
                style={{ width: `${completion.percent}%` }} />
            </div>
            {completion.missing.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {completion.missing.map(m => (
                  <span key={m} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {m}
                  </span>
                ))}
              </div>
            )}
            {completion.percent === 100 && (
              <p className="mt-2 text-[10px] text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Complete profile</p>
            )}
          </div>

          {/* Personal Info */}
          <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Personal Info</span>
            </div>
            <div className="p-4 space-y-2.5">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-20 shrink-0 text-xs">Age</span>
                <span className="text-gray-800 font-medium">{worker.age || "Not set"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-20 shrink-0 text-xs">Gender</span>
                <span className="text-gray-800 font-medium capitalize">{worker.gender || "Not set"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-20 shrink-0 text-xs">City</span>
                <span className="text-gray-800 font-medium">{worker.city || "Not set"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-20 shrink-0 text-xs">Area</span>
                <span className="text-gray-800 font-medium">{worker.area || "Not set"}</span>
              </div>
            </div>
          </div>

          {/* Skills & Experience */}
          <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Skills & Experience</span>
            </div>
            <div className="p-4 space-y-3">
              {worker.skills && worker.skills.length > 0 && (
                <div>
                  <div className="flex flex-wrap gap-1.5">
                    {worker.skills.map((s, i) => (
                      <span key={i} className="text-[11px] bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg font-medium">{s}</span>
                    ))}
                  </div>
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

          {/* Bio */}
          {worker.bio && (
            <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">About</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{worker.bio}</p>
              </div>
            </div>
          )}

          {/* Contact (conditional) */}
          {canViewContact && (
            <div className="bg-white rounded-xl border border-emerald-200/80 overflow-hidden">
              <div className="px-4 py-2.5 bg-emerald-50/80 border-b border-emerald-100 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-widest">Contact Details</span>
                <span className="text-[9px] text-emerald-500 ml-auto">Approved worker · visible</span>
              </div>
              <div className="p-4 space-y-2.5">
                {worker.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-800 font-medium">{worker.phone}</span>
                  </div>
                )}
                {worker.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-800 font-medium">{worker.email}</span>
                  </div>
                )}
                {!worker.phone && !worker.email && (
                  <p className="text-xs text-gray-400">No contact details shared</p>
                )}
              </div>
            </div>
          )}

          {!canViewContact && !checkingContact && (
            <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
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

      <style jsx>{`
        .animate-slide-right {
          animation: slide-right 0.25s ease-out;
        }
        @keyframes slide-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
