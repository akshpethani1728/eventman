"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { X, Wand2, Users, MapPin, Shirt, IndianRupee, ClipboardList, ArrowRight, Sparkles } from "lucide-react";

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
  date_display: "",
  time: "",
  end_time: "",
  application_deadline: "",
  location: "",
  google_maps_link: "",
  worker_count: "",
  gender_requirement: "",
  min_age: "",
  max_age: "",
  work_description: "",
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
    work_description: template.work_description || template.experience_required || "",
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

  const SectionCard = ({ label, emoji, children, accentCls }: { label: string; emoji: string; children: React.ReactNode; accentCls: string }) => (
    <div className="rounded-2xl bg-white border border-gray-200/80 overflow-hidden shadow-sm">
      <div className={`flex items-center gap-2 px-4 py-3 ${accentCls} border-b border-gray-100/50`}>
        <span className="text-lg">{emoji}</span>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500/80">{label}</span>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );

  const InputGroup = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-2 gap-3">{children}</div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-6 p-3 overflow-y-auto">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-t-2xl px-5 py-5 text-white">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{template ? "Create from Template" : "New Event"}</h2>
                <p className="text-xs text-blue-200/80 mt-0.5">Fill in the details below</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {template && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 text-xs font-medium backdrop-blur-sm">
              <Wand2 className="w-3 h-3" />
              {template.template_name || "Template"}
            </div>
          )}
        </div>

        {/* Form body */}
        <div className="bg-gray-50 px-5 py-4 space-y-4 border-x border-gray-200/80">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* A. Event Basics */}
            <SectionCard emoji="📋" label="Event Basics" accentCls="bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Event Title</label>
                <input required value={form.title} onChange={e => update("title", e.target.value)}
                  placeholder="e.g., Wedding Staff Needed — Grand Palace"
                  maxLength={100}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                <div className="text-right mt-1">
                  <span className="text-[10px] text-gray-400">{form.title.length}/100</span>
                </div>
              </div>
              <InputGroup>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Category</label>
                  <select value={form.category} onChange={e => update("category", e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all">
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Workers Needed</label>
                  <input type="number" min={1} value={form.worker_count} onChange={e => update("worker_count", e.target.value)}
                    placeholder="Number of workers" required
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                </div>
              </InputGroup>
              <InputGroup>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Event Date</label>
                  <input required type="date" value={form.date} onChange={e => update("date", e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Start Time</label>
                  <input required type="time" value={form.time} onChange={e => update("time", e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                </div>
              </InputGroup>
              <InputGroup>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Display Date <span className="text-gray-400 normal-case font-normal">(e.g., 26,27,30 May)</span></label>
                  <input value={form.date_display} onChange={e => update("date_display", e.target.value)}
                    placeholder="e.g., 26,27,30 May"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">End Time <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                  <input type="time" value={form.end_time} onChange={e => update("end_time", e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                </div>
              </InputGroup>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Application Deadline <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                <input type="date" value={form.application_deadline} onChange={e => update("application_deadline", e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
              </div>
            </SectionCard>

            {/* B. Location */}
            <SectionCard emoji="📍" label="Location" accentCls="bg-gradient-to-r from-teal-50/80 to-emerald-50/80">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Venue / Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={form.location} onChange={e => update("location", e.target.value)}
                    placeholder="e.g., Grand Palace, SG Highway, Ahmedabad" required
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Google Maps Link <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                <input value={form.google_maps_link} onChange={e => update("google_maps_link", e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all" />
              </div>
            </SectionCard>

            {/* C. Worker Requirements */}
            <SectionCard emoji="👥" label="Worker Requirements" accentCls="bg-gradient-to-r from-purple-50/80 to-violet-50/80">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Gender</label>
                  <select value={form.gender_requirement} onChange={e => update("gender_requirement", e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all">
                    <option value="">Any</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Min Age</label>
                  <input type="number" min={0} value={form.min_age} onChange={e => update("min_age", e.target.value)}
                    placeholder="18"
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Max Age</label>
                  <input type="number" min={0} value={form.max_age} onChange={e => update("max_age", e.target.value)}
                    placeholder="45"
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Work Description</label>
                <textarea value={form.work_description} onChange={e => update("work_description", e.target.value)}
                  placeholder="Describe what workers will actually do — be specific so they know what to expect.&#10;&#10;Example:&#10;• Greet guests at the entrance (4 hrs)&#10;• Guide attendees to their tables&#10;• Assist with food serving during dinner&#10;• Help with cleanup after the event"
                  className="w-full h-36 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 leading-relaxed resize-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all" />
                <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                  <ClipboardList className="w-3 h-3" />
                  Clear description helps workers decide. Mention duration for each task.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Skills Required <span className="text-gray-400 normal-case font-normal">(comma separated)</span></label>
                <input value={form.skill_requirements} onChange={e => update("skill_requirements", e.target.value)}
                  placeholder="e.g., Communication, Basic English, Hospitality"
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all" />
              </div>
            </SectionCard>

            {/* D. Appearance & Documents */}
            <SectionCard emoji="👔" label="Appearance & Documents" accentCls="bg-gradient-to-r from-green-50/80 to-emerald-50/80">
              <InputGroup>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Dress Code</label>
                  <input value={form.dress_code} onChange={e => update("dress_code", e.target.value)}
                    placeholder="e.g., Black formal, White shirt"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Required Documents</label>
                  <input value={form.required_documents} onChange={e => update("required_documents", e.target.value)}
                    placeholder="e.g., Aadhaar, Photo"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none transition-all" />
                </div>
              </InputGroup>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Grooming Notes <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                <input value={form.grooming_notes} onChange={e => update("grooming_notes", e.target.value)}
                  placeholder="e.g., Clean shave, trimmed hair, no perfume"
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none transition-all" />
              </div>
            </SectionCard>

            {/* E. Payment & Perks */}
            <SectionCard emoji="💰" label="Payment & Perks" accentCls="bg-gradient-to-r from-amber-50/80 to-yellow-50/80">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Payment</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={form.payment_info} onChange={e => update("payment_info", e.target.value)}
                    placeholder="e.g., ₹500 per event, paid at venue"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.food_included ? "bg-emerald-500" : "bg-gray-200"}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${form.food_included ? "translate-x-5" : ""}`} />
                    <input type="checkbox" checked={form.food_included} onChange={e => update("food_included", e.target.checked)} className="sr-only" />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">Food Included</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.travel_included ? "bg-emerald-500" : "bg-gray-200"}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${form.travel_included ? "translate-x-5" : ""}`} />
                    <input type="checkbox" checked={form.travel_included} onChange={e => update("travel_included", e.target.checked)} className="sr-only" />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">Travel Included</span>
                </label>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Overtime Info <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                <input value={form.overtime_info} onChange={e => update("overtime_info", e.target.value)}
                  placeholder="e.g., ₹100 per extra hour"
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all" />
              </div>
            </SectionCard>

            {/* F. Reporting Instructions */}
            <SectionCard emoji="📍" label="Reporting Instructions" accentCls="bg-gradient-to-r from-orange-50/80 to-red-50/80">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Where to Report</label>
                <textarea value={form.reporting_details} onChange={e => update("reporting_details", e.target.value)}
                  placeholder="e.g., Meet at the main entrance near the fountain. Look for the event manager in blue uniform."
                  className="w-full h-20 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 leading-relaxed resize-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Special Instructions</label>
                <textarea value={form.instructions} onChange={e => update("instructions", e.target.value)}
                  placeholder="e.g., Bring your own water bottle. Arrive 15 mins early for briefing."
                  className="w-full h-20 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 leading-relaxed resize-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Contact Person <span className="text-gray-400 normal-case font-normal">(on-site)</span></label>
                <input value={form.contact_person_notes} onChange={e => update("contact_person_notes", e.target.value)}
                  placeholder="e.g., Rajesh — 98765 43210"
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
              </div>
            </SectionCard>

            {/* Footer Actions inside form */}
            <div className="flex gap-3 pt-2">
              <button type="submit" onClick={() => setPublishAfter(true)} disabled={loading}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publishing...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Publish Event</>
                )}
              </button>
              <button type="submit" onClick={() => setPublishAfter(false)} disabled={loading}
                className="h-12 px-6 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-gray-50 active:scale-[0.98] transition-all">
                <ArrowRight className="w-4 h-4" />
                Draft
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
