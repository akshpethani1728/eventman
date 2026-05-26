"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { Event } from "@/lib/supabase/types";

interface Props {
  event: Event;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditEventModal({ event, onClose, onUpdated }: Props) {
  const [form, setForm] = useState({
    title: event.title,
    location: event.location,
    date: event.date,
    time: event.time,
    worker_count: String(event.worker_count),
    gender_requirement: event.gender_requirement || "",
    min_age: event.min_age !== null ? String(event.min_age) : "",
    max_age: event.max_age !== null ? String(event.max_age) : "",
    dress_code: event.dress_code || "",
    required_documents: event.required_documents?.join(", ") || "",
    payment_info: event.payment_info || "",
    reporting_details: event.reporting_details || "",
    instructions: event.instructions || "",
    status: event.status,
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("events")
      .update({
        title: form.title,
        location: form.location,
        date: form.date,
        time: form.time,
        worker_count: parseInt(form.worker_count) || 1,
        gender_requirement: form.gender_requirement || null,
        min_age: form.min_age ? parseInt(form.min_age) : null,
        max_age: form.max_age ? parseInt(form.max_age) : null,
        dress_code: form.dress_code || null,
        required_documents: form.required_documents
          ? form.required_documents.split(",").map(s => s.trim()).filter(Boolean)
          : null,
        payment_info: form.payment_info || null,
        reporting_details: form.reporting_details || null,
        instructions: form.instructions || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Event updated!");
    onUpdated();
  };

  const update = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold text-lg">Edit Event</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1 text-gray-700">Event Title *</label>
              <input
                required
                value={form.title}
                onChange={e => update("title", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
                placeholder="e.g., Promoter for Music Festival"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Event Date *</label>
              <input
                required
                type="date"
                value={form.date}
                onChange={e => update("date", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Reporting Time *</label>
              <input
                required
                type="time"
                value={form.time}
                onChange={e => update("time", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1 text-gray-700">Location *</label>
              <input
                required
                value={form.location}
                onChange={e => update("location", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
                placeholder="e.g., Ahmedabad, Gujarat"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Workers Needed *</label>
              <input
                required
                type="number"
                min={1}
                value={form.worker_count}
                onChange={e => update("worker_count", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Gender Requirement</label>
              <select
                value={form.gender_requirement}
                onChange={e => update("gender_requirement", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
              >
                <option value="">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Min Age</label>
              <input
                type="number"
                min={0}
                value={form.min_age}
                onChange={e => update("min_age", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Max Age</label>
              <input
                type="number"
                min={0}
                value={form.max_age}
                onChange={e => update("max_age", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1 text-gray-700">Dress Code</label>
              <input
                value={form.dress_code}
                onChange={e => update("dress_code", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
                placeholder="e.g., Formal black shoes"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Required Documents (comma separated)
              </label>
              <input
                value={form.required_documents}
                onChange={e => update("required_documents", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
                placeholder="e.g., Aadhaar, Driving License"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1 text-gray-700">Payment Info (display only)</label>
              <input
                value={form.payment_info}
                onChange={e => update("payment_info", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
                placeholder="e.g., 500 per event"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1 text-gray-700">Reporting Details</label>
              <textarea
                value={form.reporting_details}
                onChange={e => update("reporting_details", e.target.value)}
                className="w-full h-20 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm resize-none"
                placeholder="Where to report, contact person, etc."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1 text-gray-700">Instructions</label>
              <textarea
                value={form.instructions}
                onChange={e => update("instructions", e.target.value)}
                className="w-full h-20 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm resize-none"
                placeholder="Any extra information for workers"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 active:bg-blue-700"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
