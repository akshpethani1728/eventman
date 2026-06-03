"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { X, Save, Sparkles } from "lucide-react";
import { useBodyScrollLock } from "@/lib/useStableForm";
import type { Event } from "@/lib/supabase/types";

interface Props {
  event: Event;
  onClose: () => void;
  onUpdated: () => void;
}

const CATEGORIES = [
  "promotion", "event_setup", "crowd_management", "registration",
  "hospitality", "cleaning", "security", "other"
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "draft", label: "Draft" }, { value: "published", label: "Published" },
  { value: "filling", label: "Filling" }, { value: "full", label: "Full" },
  { value: "closed", label: "Closed" }, { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function InputGroup({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

export default function EditEventModal({ event, onClose, onUpdated }: Props) {
  const [form, setForm] = useState({
    title: event.title, category: event.category || "",
    date: event.date, date_display: event.date_display || "",
    time: event.time, end_time: event.end_time || "",
    application_deadline: event.application_deadline || "",
    location: event.location, google_maps_link: event.google_maps_link || "",
    worker_count: String(event.worker_count),
    gender_requirement: event.gender_requirement || "",
    min_age: event.min_age !== null ? String(event.min_age) : "",
    max_age: event.max_age !== null ? String(event.max_age) : "",
    work_description: event.work_description || event.experience_required || "",
    skill_requirements: event.skill_requirements?.join(", ") || "",
    dress_code: event.dress_code || "",
    required_documents: event.required_documents?.join(", ") || "",
    grooming_notes: event.grooming_notes || "",
    payment_info: event.payment_info || "",
    food_included: event.food_included || false,
    travel_included: event.travel_included || false,
    overtime_info: event.overtime_info || "",
    reporting_details: event.reporting_details || "",
    instructions: event.instructions || "",
    contact_person_notes: event.contact_person_notes || "",
    status: event.status,
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  useBodyScrollLock(true);

  const update = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("events").update({
      title: form.title, category: form.category || null,
      date: form.date, date_display: form.date_display || null,
      time: form.time, end_time: form.end_time || null,
      application_deadline: form.application_deadline || null,
      location: form.location, google_maps_link: form.google_maps_link || null,
      worker_count: parseInt(form.worker_count) || 1,
      gender_requirement: form.gender_requirement || null,
      min_age: form.min_age ? parseInt(form.min_age) : null,
      max_age: form.max_age ? parseInt(form.max_age) : null,
      experience_required: form.work_description || null,
      skill_requirements: form.skill_requirements ? form.skill_requirements.split(",").map(s => s.trim()).filter(Boolean) : null,
      dress_code: form.dress_code || null,
      required_documents: form.required_documents ? form.required_documents.split(",").map(s => s.trim()).filter(Boolean) : null,
      grooming_notes: form.grooming_notes || null,
      payment_info: form.payment_info || null,
      food_included: form.food_included || false,
      travel_included: form.travel_included || false,
      overtime_info: form.overtime_info || null,
      reporting_details: form.reporting_details || null,
      instructions: form.instructions || null,
      contact_person_notes: form.contact_person_notes || null,
      status: form.status,
      updated_at: new Date().toISOString(),
    }).eq("id", event.id);

    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Event updated!");
    onUpdated();
  };

  const inputClass = "w-full h-11 px-3.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white text-sm outline-none transition-all focus:border-[#0D9488] focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1.5";
  const selectClass = inputClass;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-6 p-3 overflow-y-auto modal-overlay">
      <div className="w-full max-w-xl bg-white rounded-[20px] shadow-[0_24px_64px_rgba(0,0,0,0.15),0_8px_20px_rgba(0,0,0,0.08)]">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-[rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="font-bold text-lg text-gray-900">Edit Event</h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[350px]">{event.title}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-[10px] transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Status:</span>
            <select value={form.status} onChange={e => update("status", e.target.value)}
              className="h-8 px-3 rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white text-xs font-medium outline-none focus:border-[#0D9488]">
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 max-h-[60vh] overflow-y-auto space-y-5">
            {/* Event Basics */}
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Event Basics</p>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Event Title</label>
                  <input required value={form.title} onChange={e => update("title", e.target.value)} maxLength={100} className={inputClass} />
                  <span className="text-[10px] text-gray-400 mt-1 block text-right">{form.title.length}/100</span>
                </div>
                <InputGroup>
                  <div>
                    <label className={labelClass}>Category</label>
                    <select value={form.category} onChange={e => update("category", e.target.value)} className={selectClass}>
                      <option value="">Select</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Workers Needed</label>
                    <input type="number" min={1} value={form.worker_count} onChange={e => update("worker_count", e.target.value)} required className={inputClass} />
                  </div>
                </InputGroup>
                <InputGroup>
                  <div>
                    <label className={labelClass}>Event Date</label>
                    <input required type="date" value={form.date} onChange={e => update("date", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Start Time</label>
                    <input required type="time" value={form.time} onChange={e => update("time", e.target.value)} className={inputClass} />
                  </div>
                </InputGroup>
                <InputGroup>
                  <div>
                    <label className={labelClass}>Display Date <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input value={form.date_display} onChange={e => update("date_display", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>End Time <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="time" value={form.end_time} onChange={e => update("end_time", e.target.value)} className={inputClass} />
                  </div>
                </InputGroup>
                <div>
                  <label className={labelClass}>Application Deadline <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="date" value={form.application_deadline} onChange={e => update("application_deadline", e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Location</p>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Venue / Location</label>
                  <input value={form.location} onChange={e => update("location", e.target.value)} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Google Maps Link <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input value={form.google_maps_link} onChange={e => update("google_maps_link", e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Worker Requirements</p>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Gender</label>
                    <select value={form.gender_requirement} onChange={e => update("gender_requirement", e.target.value)} className={selectClass}>
                      <option value="">Any</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Min Age</label>
                    <input type="number" min={0} value={form.min_age} onChange={e => update("min_age", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Max Age</label>
                    <input type="number" min={0} value={form.max_age} onChange={e => update("max_age", e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Work Description</label>
                  <textarea value={form.work_description} onChange={e => update("work_description", e.target.value)}
                    className={`${inputClass} h-32 resize-none pt-2.5`} />
                </div>
                <div>
                  <label className={labelClass}>Skills Required <span className="text-gray-400 font-normal">(comma separated)</span></label>
                  <input value={form.skill_requirements} onChange={e => update("skill_requirements", e.target.value)} className={inputClass} />
                </div>
                <InputGroup>
                  <div>
                    <label className={labelClass}>Dress Code</label>
                    <input value={form.dress_code} onChange={e => update("dress_code", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Required Documents</label>
                    <input value={form.required_documents} onChange={e => update("required_documents", e.target.value)} className={inputClass} />
                  </div>
                </InputGroup>
                <div>
                  <label className={labelClass}>Grooming Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input value={form.grooming_notes} onChange={e => update("grooming_notes", e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment & Perks</p>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Payment</label>
                  <input value={form.payment_info} onChange={e => update("payment_info", e.target.value)} className={inputClass} />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div className={`relative w-11 h-6 rounded-full transition-colors ${form.food_included ? "bg-emerald-500" : "bg-gray-200"}`}>
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.food_included ? "translate-x-5" : ""}`} />
                      <input type="checkbox" checked={form.food_included} onChange={e => update("food_included", e.target.checked)} className="sr-only" />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">Food</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div className={`relative w-11 h-6 rounded-full transition-colors ${form.travel_included ? "bg-emerald-500" : "bg-gray-200"}`}>
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.travel_included ? "translate-x-5" : ""}`} />
                      <input type="checkbox" checked={form.travel_included} onChange={e => update("travel_included", e.target.checked)} className="sr-only" />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">Travel</span>
                  </label>
                </div>
                <div>
                  <label className={labelClass}>Overtime Info <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input value={form.overtime_info} onChange={e => update("overtime_info", e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Reporting Instructions</p>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Where to Report</label>
                  <textarea value={form.reporting_details} onChange={e => update("reporting_details", e.target.value)}
                    className={`${inputClass} h-20 resize-none pt-2.5`} />
                </div>
                <div>
                  <label className={labelClass}>Special Instructions</label>
                  <textarea value={form.instructions} onChange={e => update("instructions", e.target.value)}
                    className={`${inputClass} h-20 resize-none pt-2.5`} />
                </div>
                <div>
                  <label className={labelClass}>Contact Person <span className="text-gray-400 font-normal">(on-site)</span></label>
                  <input value={form.contact_person_notes} onChange={e => update("contact_person_notes", e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[rgba(0,0,0,0.06)] bg-gray-50/50 rounded-b-[20px]">
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="flex-1 h-11 rounded-[12px] border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all active:scale-[0.97]">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 h-11 rounded-[12px] bg-[#0D9488] text-white text-sm font-semibold hover:bg-teal-700 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(13,148,136,0.25)]">
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Changes</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
