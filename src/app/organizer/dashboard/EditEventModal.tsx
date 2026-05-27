"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { X, Save } from "lucide-react";
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

export default function EditEventModal({ event, onClose, onUpdated }: Props) {
  const [form, setForm] = useState({
    title: event.title,
    category: event.category || "",
    date: event.date,
    time: event.time,
    application_deadline: event.application_deadline || "",
    location: event.location,
    google_maps_link: event.google_maps_link || "",
    worker_count: String(event.worker_count),
    gender_requirement: event.gender_requirement || "",
    min_age: event.min_age !== null ? String(event.min_age) : "",
    max_age: event.max_age !== null ? String(event.max_age) : "",
    experience_required: event.experience_required || "",
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

  const update = (key: string, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("events").update({
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

  const SectionLabel = ({ label }: { label: string }) => (
    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-1 border-b border-gray-100 mb-3">
      {label}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 p-3 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-xl">
          <h2 className="font-semibold text-base truncate mr-2">Edit Event</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          {/* Status */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Status:</label>
            <select value={form.status} onChange={e => update("status", e.target.value)}
              className="h-8 px-2 rounded-lg border border-gray-300 bg-white text-xs font-medium">
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* A. Basic Event Info */}
          <div>
            <SectionLabel label="Basic Event Info" />
            <div className="space-y-2.5">
              <input required value={form.title} onChange={e => update("title", e.target.value)}
                maxLength={100}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              <div className="grid grid-cols-2 gap-2.5">
                <select value={form.category} onChange={e => update("category", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm">
                  <option value="">Category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                </select>
                <input type="number" min={1} value={form.worker_count} onChange={e => update("worker_count", e.target.value)}
                  required
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
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              </div>
              <input value={form.location} onChange={e => update("location", e.target.value)}
                placeholder="Location *" required
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              <input value={form.google_maps_link} onChange={e => update("google_maps_link", e.target.value)}
                placeholder="Google Maps link"
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
                placeholder="Experience required"
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
                placeholder="Dress code"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              <input value={form.required_documents} onChange={e => update("required_documents", e.target.value)}
                placeholder="Required documents (comma separated)"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              <input value={form.grooming_notes} onChange={e => update("grooming_notes", e.target.value)}
                placeholder="Grooming notes"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
            </div>
          </div>

          {/* D. Payment Display */}
          <div>
            <SectionLabel label="Payment & Perks" />
            <div className="space-y-2.5">
              <input value={form.payment_info} onChange={e => update("payment_info", e.target.value)}
                placeholder="Payment text"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm" />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.food_included} onChange={e => update("food_included", e.target.checked)}
                    className="rounded border-gray-300" />
                  Food
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.travel_included} onChange={e => update("travel_included", e.target.checked)}
                    className="rounded border-gray-300" />
                  Travel
                </label>
              </div>
              <input value={form.overtime_info} onChange={e => update("overtime_info", e.target.value)}
                placeholder="Overtime info"
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

          <button type="submit" disabled={loading}
            className="w-full h-11 rounded-xl bg-blue-600 text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:bg-blue-700">
            <Save className="w-4 h-4" />
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
