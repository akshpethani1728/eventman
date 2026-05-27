"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { X, Save, Send } from "lucide-react";

interface Props {
  onClose: () => void;
  onCreated: () => void;
  template?: any;
}

const CATEGORIES = [
  "promotion", "event_setup", "crowd_management", "registration",
  "hospitality", "cleaning", "security", "other"
];

const DEFAULT_FORM = {
  title: "",
  category: "",
  date: "",
  time: "",
  application_deadline: "",
  location: "",
  google_maps_link: "",
  worker_count: "",
  gender_requirement: "",
  min_age: "",
  max_age: "",
  experience_required: "",
  skill_requirements: "",
  dress_code: "",
  required_documents: "",
  grooming_notes: "",
  payment_info: "",
  food_included: false,
  travel_included: false,
  overtime_info: "",
  reporting_details: "",
  instructions: "",
  contact_person_notes: "",
};

export default function CreateEventModal({ onClose, onCreated, template }: Props) {
  const [form, setForm] = useState(template ? {
    ...DEFAULT_FORM,
    ...template,
    date: "",
    application_deadline: "",
    worker_count: String(template.worker_count || ""),
    min_age: template.min_age != null ? String(template.min_age) : "",
    max_age: template.max_age != null ? String(template.max_age) : "",
  } : { ...DEFAULT_FORM });
  const [publishAfter, setPublishAfter] = useState(true);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const update = (key: string, value: any) =>
    setForm((prev: any) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); setLoading(false); return; }

    const payload: any = {
      organizer_id: user.id,
      title: form.title,
      category: form.category || null,
      date: form.date,
      time: form.time,
      application_deadline: form.application_deadline || null,
      location: form.location,
      google_maps_link: form.google_maps_link || null,
      worker_count: parseInt(form.worker_count) || 1,
      gender_requirement: form.gender_requirement || null,
      min_age: form.min_age ? parseInt(form.min_age) : null,
      max_age: form.max_age ? parseInt(form.max_age) : null,
      experience_required: form.experience_required || null,
      skill_requirements: form.skill_requirements
        ? form.skill_requirements.split(",").map((s: string) => s.trim()).filter(Boolean)
        : null,
      dress_code: form.dress_code || null,
      required_documents: form.required_documents
        ? form.required_documents.split(",").map((s: string) => s.trim()).filter(Boolean)
        : null,
      grooming_notes: form.grooming_notes || null,
      payment_info: form.payment_info || null,
      food_included: form.food_included || false,
      travel_included: form.travel_included || false,
      overtime_info: form.overtime_info || null,
      reporting_details: form.reporting_details || null,
      instructions: form.instructions || null,
      contact_person_notes: form.contact_person_notes || null,
      status: publishAfter ? "published" : "draft",
    };

    const { error } = await supabase.from("events").insert(payload);

    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(publishAfter ? "Event published!" : "Draft saved!");
    onCreated();
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-1 border-b border-gray-100 mb-3">
      {label}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 p-3 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-xl">
          <h2 className="font-semibold text-base">{template ? "Create from Template" : "Create Event"}</h2>
          <div className="flex items-center gap-2">
            {template && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{template.template_name || "Template"}</span>}
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          {/* A. Basic Event Info */}
          <div>
            <SectionLabel label="Basic Event Info" />
            <div className="space-y-2.5">
              <input required value={form.title} onChange={e => update("title", e.target.value)}
                placeholder="Event title *" maxLength={100}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              <div className="grid grid-cols-2 gap-2.5">
                <select value={form.category} onChange={e => update("category", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm">
                  <option value="">Category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                </select>
                <input type="number" min={1} value={form.worker_count} onChange={e => update("worker_count", e.target.value)}
                  placeholder="Workers needed *" required
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <input required type="date" value={form.date} onChange={e => update("date", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
                <input required type="time" value={form.time} onChange={e => update("time", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <input type="date" value={form.application_deadline} onChange={e => update("application_deadline", e.target.value)}
                  placeholder="Apply deadline"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              </div>
              <input value={form.location} onChange={e => update("location", e.target.value)}
                placeholder="Location *" required
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              <input value={form.google_maps_link} onChange={e => update("google_maps_link", e.target.value)}
                placeholder="Google Maps link (optional)"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
            </div>
          </div>

          {/* B. Worker Requirements */}
          <div>
            <SectionLabel label="Worker Requirements" />
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2.5">
                <select value={form.gender_requirement} onChange={e => update("gender_requirement", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm">
                  <option value="">Any gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <input type="number" min={0} value={form.min_age} onChange={e => update("min_age", e.target.value)}
                  placeholder="Min age"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
                <input type="number" min={0} value={form.max_age} onChange={e => update("max_age", e.target.value)}
                  placeholder="Max age"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              </div>
              <input value={form.experience_required} onChange={e => update("experience_required", e.target.value)}
                placeholder="Experience required (e.g., 1+ year in events)"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              <input value={form.skill_requirements} onChange={e => update("skill_requirements", e.target.value)}
                placeholder="Skills required (comma separated)"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
            </div>
          </div>

          {/* C. Appearance & Documents */}
          <div>
            <SectionLabel label="Appearance & Documents" />
            <div className="space-y-2.5">
              <input value={form.dress_code} onChange={e => update("dress_code", e.target.value)}
                placeholder="Dress code (e.g., Black formal)"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              <input value={form.required_documents} onChange={e => update("required_documents", e.target.value)}
                placeholder="Required documents (comma separated)"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              <input value={form.grooming_notes} onChange={e => update("grooming_notes", e.target.value)}
                placeholder="Grooming notes (e.g., Clean shave, trimmed hair)"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
            </div>
          </div>

          {/* D. Payment Display */}
          <div>
            <SectionLabel label="Payment & Perks" />
            <div className="space-y-2.5">
              <input value={form.payment_info} onChange={e => update("payment_info", e.target.value)}
                placeholder="Payment text (e.g., ₹500 per event)"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.food_included} onChange={e => update("food_included", e.target.checked)}
                    className="rounded border-gray-300" />
                  Food included
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.travel_included} onChange={e => update("travel_included", e.target.checked)}
                    className="rounded border-gray-300" />
                  Travel included
                </label>
              </div>
              <input value={form.overtime_info} onChange={e => update("overtime_info", e.target.value)}
                placeholder="Overtime info (optional)"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
            </div>
          </div>

          {/* E. Reporting Instructions */}
          <div>
            <SectionLabel label="Reporting Instructions" />
            <div className="space-y-2.5">
              <textarea value={form.reporting_details} onChange={e => update("reporting_details", e.target.value)}
                placeholder="Where to report, contact person at venue..."
                className="w-full h-16 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm resize-none" />
              <textarea value={form.instructions} onChange={e => update("instructions", e.target.value)}
                placeholder="Special instructions for workers..."
                className="w-full h-16 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm resize-none" />
              <input value={form.contact_person_notes} onChange={e => update("contact_person_notes", e.target.value)}
                placeholder="Contact person name & number"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              onClick={() => setPublishAfter(true)}
              disabled={loading}
              className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:bg-blue-700"
            >
              <Send className="w-4 h-4" />
              {loading ? "Publishing..." : "Publish Event"}
            </button>
            <button
              type="submit"
              onClick={() => setPublishAfter(false)}
              disabled={loading}
              className="h-11 px-5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm flex items-center gap-2 disabled:opacity-50 active:bg-gray-50"
            >
              <Save className="w-4 h-4" />
              Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
