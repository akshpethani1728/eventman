"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { X, Save, Sparkles } from "lucide-react";
import { useStableForm, useBodyScrollLock } from "@/lib/useStableForm";
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
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "filling", label: "Filling" },
  { value: "full", label: "Full" },
  { value: "closed", label: "Closed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function SectionCard({ label, emoji, children, accentCls }: { label: string; emoji: string; children: React.ReactNode; accentCls: string }) {
  return (
    <div className="card-base overflow-hidden form-section">
      <div className={`flex items-center gap-2 px-4 py-3 ${accentCls} border-b border-gray-100/50`}>
        <span className="text-lg">{emoji}</span>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500/80">{label}</span>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function InputGroup({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

export default function EditEventModal({ event, onClose, onUpdated }: Props) {
  const { form, update } = useStableForm({
    title: event.title,
    category: event.category || "",
    date: event.date,
    date_display: event.date_display || "",
    time: event.time,
    end_time: event.end_time || "",
    application_deadline: event.application_deadline || "",
    location: event.location,
    google_maps_link: event.google_maps_link || "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("events").update({
      title: form.title,
      category: form.category || null,
      date: form.date,
      date_display: form.date_display || null,
      time: form.time,
      end_time: form.end_time || null,
      application_deadline: form.application_deadline || null,
      location: form.location,
      google_maps_link: form.google_maps_link || null,
      worker_count: parseInt(form.worker_count) || 1,
      gender_requirement: form.gender_requirement || null,
      min_age: form.min_age ? parseInt(form.min_age) : null,
      max_age: form.max_age ? parseInt(form.max_age) : null,
      experience_required: form.work_description || null,
      skill_requirements: form.skill_requirements
        ? form.skill_requirements.split(",").map(s => s.trim()).filter(Boolean)
        : null,
      dress_code: form.dress_code || null,
      required_documents: form.required_documents
        ? form.required_documents.split(",").map(s => s.trim()).filter(Boolean)
        : null,
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-6 p-3 overflow-y-auto modal-overlay">
      <div className="w-full max-w-xl modal-body">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-600 via-violet-700 to-purple-800 rounded-t-[22px] px-5 py-5 text-white">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[18px] bg-white/15 flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Edit Event</h2>
                <p className="text-xs text-violet-200/80 mt-0.5 truncate max-w-[300px]">{event.title}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-[18px] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Status selector inline */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-violet-200 font-medium">Status:</span>
            <select value={form.status} onChange={e => update("status", e.target.value)}
              className="h-8 px-3 rounded-[18px] bg-white/15 border border-white/20 text-white text-xs font-medium backdrop-blur-sm outline-none">
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Form body */}
        <div className="bg-[#f5f5f7] px-5 py-4 space-y-4 border-x border-gray-200/80">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* A. Event Basics */}
            <SectionCard emoji="📋" label="Event Basics" accentCls="bg-gradient-to-r from-indigo-50/80 to-indigo-100/80">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Event Title</label>
                <input required value={form.title} onChange={e => update("title", e.target.value)}
                  maxLength={100}
                 
                  className="input-base" />
                <div className="text-right mt-1">
                  <span className="text-[10px] text-gray-400">{form.title.length}/100</span>
                </div>
              </div>
              <InputGroup>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Category</label>
                  <select value={form.category} onChange={e => update("category", e.target.value)}
                    className="input-base">
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Workers Needed</label>
                  <input type="number" min={1} value={form.worker_count} onChange={e => update("worker_count", e.target.value)}
                    required
                    className="input-base" />
                </div>
              </InputGroup>
              <InputGroup>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Event Date</label>
                  <input required type="date" value={form.date} onChange={e => update("date", e.target.value)}
                    className="input-base" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Start Time</label>
                  <input required type="time" value={form.time} onChange={e => update("time", e.target.value)}
                    className="input-base" />
                </div>
              </InputGroup>
              <InputGroup>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Display Date <span className="text-gray-400 normal-case font-normal">(e.g., 26,27,30 May)</span></label>
                  <input value={form.date_display} onChange={e => update("date_display", e.target.value)}
                    className="input-base" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">End Time <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                  <input type="time" value={form.end_time} onChange={e => update("end_time", e.target.value)}
                    className="input-base" />
                </div>
              </InputGroup>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Application Deadline <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                <input type="date" value={form.application_deadline} onChange={e => update("application_deadline", e.target.value)}
                  className="input-base" />
              </div>
            </SectionCard>

            {/* B. Location */}
            <SectionCard emoji="📍" label="Location" accentCls="bg-gradient-to-r from-teal-50/80 to-emerald-50/80">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Venue / Location</label>
                <input value={form.location} onChange={e => update("location", e.target.value)}
                  required
                  className="input-base" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Google Maps Link <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                <input value={form.google_maps_link} onChange={e => update("google_maps_link", e.target.value)}
                  className="input-base" />
              </div>
            </SectionCard>

            {/* C. Worker Requirements */}
            <SectionCard emoji="👥" label="Worker Requirements" accentCls="bg-gradient-to-r from-purple-50/80 to-violet-50/80">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Gender</label>
                  <select value={form.gender_requirement} onChange={e => update("gender_requirement", e.target.value)}
                    className="input-base px-3">
                    <option value="">Any</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Min Age</label>
                  <input type="number" min={0} value={form.min_age} onChange={e => update("min_age", e.target.value)}
                    className="input-base px-3" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Max Age</label>
                  <input type="number" min={0} value={form.max_age} onChange={e => update("max_age", e.target.value)}
                    className="input-base px-3" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Work Description</label>
                <textarea value={form.work_description} onChange={e => update("work_description", e.target.value)}
                  placeholder="Describe what workers will actually do — be specific so they know what to expect.&#10;&#10;Example:&#10;• Greet guests at the entrance (4 hrs)&#10;• Guide attendees to their tables&#10;• Assist with food serving during dinner&#10;• Help with cleanup after the event"
                  className="input-base h-36 resize-none" />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Skills Required <span className="text-gray-400 normal-case font-normal">(comma separated)</span></label>
                <input value={form.skill_requirements} onChange={e => update("skill_requirements", e.target.value)}
                  className="input-base" />
              </div>
            </SectionCard>

            {/* D. Appearance & Documents */}
            <SectionCard emoji="👔" label="Appearance & Documents" accentCls="bg-gradient-to-r from-green-50/80 to-emerald-50/80">
              <InputGroup>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Dress Code</label>
                  <input value={form.dress_code} onChange={e => update("dress_code", e.target.value)}
                    className="input-base" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Required Documents</label>
                  <input value={form.required_documents} onChange={e => update("required_documents", e.target.value)}
                    className="input-base" />
                </div>
              </InputGroup>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Grooming Notes <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                <input value={form.grooming_notes} onChange={e => update("grooming_notes", e.target.value)}
                  className="input-base" />
              </div>
            </SectionCard>

            {/* E. Payment & Perks */}
            <SectionCard emoji="💰" label="Payment & Perks" accentCls="bg-gradient-to-r from-amber-50/80 to-yellow-50/80">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Payment</label>
                <input value={form.payment_info} onChange={e => update("payment_info", e.target.value)}
                  className="input-base" />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.food_included ? "bg-emerald-500" : "bg-gray-200"}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] transition-transform duration-200 ${form.food_included ? "translate-x-5" : ""}`} />
                    <input type="checkbox" checked={form.food_included} onChange={e => update("food_included", e.target.checked)} className="sr-only" />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">Food Included</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.travel_included ? "bg-emerald-500" : "bg-gray-200"}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] transition-transform duration-200 ${form.travel_included ? "translate-x-5" : ""}`} />
                    <input type="checkbox" checked={form.travel_included} onChange={e => update("travel_included", e.target.checked)} className="sr-only" />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">Travel Included</span>
                </label>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Overtime Info <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                <input value={form.overtime_info} onChange={e => update("overtime_info", e.target.value)}
                  className="input-base" />
              </div>
            </SectionCard>

            {/* F. Reporting Instructions */}
            <SectionCard emoji="📍" label="Reporting Instructions" accentCls="bg-gradient-to-r from-orange-50/80 to-red-50/80">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Where to Report</label>
                <textarea value={form.reporting_details} onChange={e => update("reporting_details", e.target.value)}
                  className="input-base h-20 resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Special Instructions</label>
                <textarea value={form.instructions} onChange={e => update("instructions", e.target.value)}
                  className="input-base h-20 resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Contact Person <span className="text-gray-400 normal-case font-normal">(on-site)</span></label>
                <input value={form.contact_person_notes} onChange={e => update("contact_person_notes", e.target.value)}
                  className="input-base" />
              </div>
            </SectionCard>

            {/* Footer Action inside form */}
            <div className="pt-2">
              <button type="submit" disabled={loading}
                className="w-full h-12 rounded-[18px] bg-gradient-to-r from-violet-600 to-purple-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:from-violet-700 hover:to-purple-800 active:scale-[0.98] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] shadow-black/[0.03]">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Changes</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
