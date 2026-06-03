"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { X, Check, ArrowRight, ArrowLeft, Sparkles, Save } from "lucide-react";
import { useBodyScrollLock } from "@/lib/useStableForm";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { CATEGORIES, INPUT_CLASS, LABEL_CLASS, SELECT_CLASS, parseCommaList } from "@/lib/organizer/constants";

interface Props {
  onClose: () => void;
  onCreated: () => void;
  template?: any;
}

const STEPS = ["Basics", "Location", "Requirements", "Payment", "Instructions", "Review"];

const INITIAL_FORM = {
  title: "", category: "", date: "", date_display: "", time: "", end_time: "",
  application_deadline: "", location: "", google_maps_link: "",
  worker_count: "1", gender_requirement: "", min_age: "", max_age: "",
  work_description: "", skill_requirements: "", dress_code: "", required_documents: "",
  grooming_notes: "", payment_info: "", food_included: false, travel_included: false,
  overtime_info: "", reporting_details: "", instructions: "", contact_person_notes: "",
};

export default function CreateEventModal({ onClose, onCreated, template }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(template ? {
    ...INITIAL_FORM,
    ...template,
    date: "",
    application_deadline: "",
    worker_count: String(template.worker_count || "1"),
    min_age: template.min_age != null ? String(template.min_age) : "",
    max_age: template.max_age != null ? String(template.max_age) : "",
    work_description: template.work_description || template.experience_required || "",
  } : { ...INITIAL_FORM });
  const [publishAfter, setPublishAfter] = useState(true);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  useBodyScrollLock(true);
  const modalRef = useFocusTrap(true);

  const update = (key: string, value: any) => setForm((p: typeof form) => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); setLoading(false); return; }

    const payload: any = {
      organizer_id: user.id, title: form.title,
      category: form.category || null, date: form.date,
      date_display: form.date_display || null, time: form.time,
      end_time: form.end_time || null, application_deadline: form.application_deadline || null,
      location: form.location, google_maps_link: form.google_maps_link || null,
      worker_count: parseInt(form.worker_count) || 1,
      gender_requirement: form.gender_requirement || null,
      min_age: form.min_age ? parseInt(form.min_age) : null,
      max_age: form.max_age ? parseInt(form.max_age) : null,
      experience_required: form.work_description || null,
      skill_requirements: parseCommaList(form.skill_requirements).length > 0 ? parseCommaList(form.skill_requirements) : null,
      dress_code: form.dress_code || null,
      required_documents: parseCommaList(form.required_documents).length > 0 ? parseCommaList(form.required_documents) : null,
      grooming_notes: form.grooming_notes || null, payment_info: form.payment_info || null,
      food_included: form.food_included || false, travel_included: form.travel_included || false,
      overtime_info: form.overtime_info || null, reporting_details: form.reporting_details || null,
      instructions: form.instructions || null, contact_person_notes: form.contact_person_notes || null,
      status: publishAfter ? "published" : "draft",
    };

    const { error } = await supabase.from("events").insert(payload);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(publishAfter ? "Event published!" : "Draft saved!");
    onCreated();
  };

  const isStepValid = () => {
    if (step === 0) return form.title && form.date && form.time && form.worker_count;
    if (step === 1) return form.location;
    return true;
  };

  const nextStep = () => { if (isStepValid()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-6 p-3 overflow-y-auto modal-overlay" ref={modalRef} role="dialog" aria-modal="true" aria-label={template ? "Create from template" : "New event"}>
      <div className="w-full max-w-xl bg-white rounded-[20px] shadow-[0_24px_64px_rgba(0,0,0,0.15),0_8px_20px_rgba(0,0,0,0.08)]">
        <div className="px-5 pt-5 pb-3 border-b border-[rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-lg text-gray-900">{template ? "Create from Template" : "New Event"}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
            </div>
            <button onClick={onClose} data-close-modal className="p-1.5 hover:bg-gray-100 rounded-[10px] transition-colors" aria-label="Close">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1 rounded-full transition-all duration-300 ${i <= step ? "bg-[#0D9488]" : "bg-gray-200"}`} />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-2">
            {STEPS.map((s, i) => (
              <span key={s} className={`text-[9px] font-medium ${i === step ? "text-[#0D9488]" : "text-gray-400"}`}>
                {i <= step ? <Check className="w-3 h-3 inline mr-0.5" /> : null}
                {s}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 max-h-[60vh] overflow-y-auto space-y-4">
            {step === 0 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label htmlFor="create-title" className={LABEL_CLASS}>Event Title *</label>
                  <input id="create-title" required value={form.title} onChange={e => update("title", e.target.value)}
                    placeholder="e.g., Wedding Staff Needed — Grand Palace" maxLength={100}
                    className={INPUT_CLASS} />
                  <span className="text-[10px] text-gray-400 mt-1 block text-right">{form.title.length}/100</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="create-category" className={LABEL_CLASS}>Category</label>
                    <select id="create-category" value={form.category} onChange={e => update("category", e.target.value)} className={SELECT_CLASS}>
                      <option value="">Select</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="create-workers" className={LABEL_CLASS}>Workers Needed *</label>
                    <input id="create-workers" type="number" min={1} value={form.worker_count} onChange={e => update("worker_count", e.target.value)} required className={INPUT_CLASS} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="create-date" className={LABEL_CLASS}>Event Date *</label>
                    <input id="create-date" required type="date" value={form.date} onChange={e => update("date", e.target.value)} className={INPUT_CLASS} />
                  </div>
                  <div>
                    <label htmlFor="create-time" className={LABEL_CLASS}>Start Time *</label>
                    <input id="create-time" required type="time" value={form.time} onChange={e => update("time", e.target.value)} className={INPUT_CLASS} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="create-date-display" className={LABEL_CLASS}>Display Date <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input id="create-date-display" value={form.date_display} onChange={e => update("date_display", e.target.value)}
                      placeholder="e.g., 26,27,30 May" className={INPUT_CLASS} />
                  </div>
                  <div>
                    <label htmlFor="create-end-time" className={LABEL_CLASS}>End Time <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input id="create-end-time" type="time" value={form.end_time} onChange={e => update("end_time", e.target.value)} className={INPUT_CLASS} />
                  </div>
                </div>
                <div>
                  <label htmlFor="create-deadline" className={LABEL_CLASS}>Application Deadline <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input id="create-deadline" type="date" value={form.application_deadline} onChange={e => update("application_deadline", e.target.value)} className={INPUT_CLASS} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label htmlFor="create-location" className={LABEL_CLASS}>Venue / Location *</label>
                  <input id="create-location" value={form.location} onChange={e => update("location", e.target.value)}
                    placeholder="e.g., Grand Palace, SG Highway, Ahmedabad" required className={INPUT_CLASS} />
                </div>
                <div>
                  <label htmlFor="create-maps" className={LABEL_CLASS}>Google Maps Link <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input id="create-maps" value={form.google_maps_link} onChange={e => update("google_maps_link", e.target.value)}
                    placeholder="https://maps.google.com/..." className={INPUT_CLASS} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="create-gender" className={LABEL_CLASS}>Gender</label>
                    <select id="create-gender" value={form.gender_requirement} onChange={e => update("gender_requirement", e.target.value)} className={SELECT_CLASS}>
                      <option value="">Any</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="create-min-age" className={LABEL_CLASS}>Min Age</label>
                    <input id="create-min-age" type="number" min={0} value={form.min_age} onChange={e => update("min_age", e.target.value)} placeholder="18" className={INPUT_CLASS} />
                  </div>
                  <div>
                    <label htmlFor="create-max-age" className={LABEL_CLASS}>Max Age</label>
                    <input id="create-max-age" type="number" min={0} value={form.max_age} onChange={e => update("max_age", e.target.value)} placeholder="45" className={INPUT_CLASS} />
                  </div>
                </div>
                <div>
                  <label htmlFor="create-desc" className={LABEL_CLASS}>Work Description</label>
                  <textarea id="create-desc" value={form.work_description} onChange={e => update("work_description", e.target.value)}
                    placeholder="Describe what workers will actually do — be specific."
                    className={`${INPUT_CLASS} h-32 resize-none pt-2.5`} />
                </div>
                <div>
                  <label htmlFor="create-skills" className={LABEL_CLASS}>Skills Required <span className="text-gray-400 font-normal">(comma separated)</span></label>
                  <input id="create-skills" value={form.skill_requirements} onChange={e => update("skill_requirements", e.target.value)}
                    placeholder="e.g., Communication, Basic English, Hospitality" className={INPUT_CLASS} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="create-dress" className={LABEL_CLASS}>Dress Code</label>
                    <input id="create-dress" value={form.dress_code} onChange={e => update("dress_code", e.target.value)}
                      placeholder="e.g., Black formal" className={INPUT_CLASS} />
                  </div>
                  <div>
                    <label htmlFor="create-docs" className={LABEL_CLASS}>Required Documents</label>
                    <input id="create-docs" value={form.required_documents} onChange={e => update("required_documents", e.target.value)}
                      placeholder="e.g., Aadhaar, Photo" className={INPUT_CLASS} />
                  </div>
                </div>
                <div>
                  <label htmlFor="create-grooming" className={LABEL_CLASS}>Grooming Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input id="create-grooming" value={form.grooming_notes} onChange={e => update("grooming_notes", e.target.value)}
                    placeholder="e.g., Clean shave, trimmed hair" className={INPUT_CLASS} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label htmlFor="create-payment" className={LABEL_CLASS}>Payment</label>
                  <input id="create-payment" value={form.payment_info} onChange={e => update("payment_info", e.target.value)}
                    placeholder="e.g., ₹500 per event, paid at venue" className={INPUT_CLASS} />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.food_included ? "bg-emerald-500" : "bg-gray-200"}`}>
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${form.food_included ? "translate-x-5" : ""}`} />
                      <input type="checkbox" checked={form.food_included} onChange={e => update("food_included", e.target.checked)} className="sr-only" />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">Food</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.travel_included ? "bg-emerald-500" : "bg-gray-200"}`}>
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${form.travel_included ? "translate-x-5" : ""}`} />
                      <input type="checkbox" checked={form.travel_included} onChange={e => update("travel_included", e.target.checked)} className="sr-only" />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">Travel</span>
                  </label>
                </div>
                <div>
                  <label htmlFor="create-overtime" className={LABEL_CLASS}>Overtime Info <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input id="create-overtime" value={form.overtime_info} onChange={e => update("overtime_info", e.target.value)}
                    placeholder="e.g., ₹100 per extra hour" className={INPUT_CLASS} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label htmlFor="create-reporting" className={LABEL_CLASS}>Where to Report</label>
                  <textarea id="create-reporting" value={form.reporting_details} onChange={e => update("reporting_details", e.target.value)}
                    placeholder="e.g., Meet at the main entrance near the fountain."
                    className={`${INPUT_CLASS} h-24 resize-none pt-2.5`} />
                </div>
                <div>
                  <label htmlFor="create-instructions" className={LABEL_CLASS}>Special Instructions</label>
                  <textarea id="create-instructions" value={form.instructions} onChange={e => update("instructions", e.target.value)}
                    placeholder="e.g., Bring your own water bottle. Arrive 15 mins early."
                    className={`${INPUT_CLASS} h-24 resize-none pt-2.5`} />
                </div>
                <div>
                  <label htmlFor="create-contact" className={LABEL_CLASS}>Contact Person <span className="text-gray-400 font-normal">(on-site)</span></label>
                  <input id="create-contact" value={form.contact_person_notes} onChange={e => update("contact_person_notes", e.target.value)}
                    placeholder="e.g., Rajesh — 98765 43210" className={INPUT_CLASS} />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3 animate-fade-in">
                <div className="bg-emerald-50 rounded-[14px] p-4 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Ready to publish</p>
                    <p className="text-xs text-emerald-700 mt-0.5">Review the details below before publishing.</p>
                  </div>
                </div>
                <div className="space-y-2 bg-gray-50 rounded-[14px] p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-400 text-xs block">Title</span><span className="font-medium">{form.title}</span></div>
                    <div><span className="text-gray-400 text-xs block">Category</span><span className="font-medium capitalize">{form.category || "—"}</span></div>
                    <div><span className="text-gray-400 text-xs block">Date</span><span className="font-medium">{form.date_display || form.date}</span></div>
                    <div><span className="text-gray-400 text-xs block">Time</span><span className="font-medium">{form.time}{form.end_time ? `-${form.end_time}` : ""}</span></div>
                    <div><span className="text-gray-400 text-xs block">Workers</span><span className="font-medium">{form.worker_count}</span></div>
                    <div><span className="text-gray-400 text-xs block">Location</span><span className="font-medium truncate block">{form.location || "—"}</span></div>
                  </div>
                  {form.payment_info && (
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <span className="text-gray-400 text-xs block">Payment</span>
                      <span className="font-medium text-emerald-700">{form.payment_info}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-[rgba(0,0,0,0.06)] flex items-center justify-between bg-gray-50/50 rounded-b-[20px]">
            <div>
              {step > 0 ? (
                <button type="button" onClick={() => setStep(s => s - 1)}
                  className="h-10 px-4 rounded-[10px] text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all active:scale-[0.97] flex items-center gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <button type="button" onClick={onClose}
                  className="h-10 px-4 rounded-[10px] text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all active:scale-[0.97]">
                  Cancel
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={nextStep}
                  className={`h-10 px-5 rounded-[10px] text-sm font-semibold transition-all active:scale-[0.97] flex items-center gap-1.5 ${
                    isStepValid() ? "bg-[#0D9488] text-white hover:bg-teal-700 shadow-[0_2px_8px_rgba(13,148,136,0.2)]" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}>
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button type="submit" onClick={() => setPublishAfter(false)} disabled={loading}
                    className="h-10 px-5 rounded-[10px] border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all active:scale-[0.97] flex items-center gap-1.5">
                    <Save className="w-4 h-4" /> Draft
                  </button>
                  <button type="submit" onClick={() => setPublishAfter(true)} disabled={loading}
                    className="h-10 px-5 rounded-[10px] bg-[#0D9488] text-white text-sm font-semibold hover:bg-teal-700 transition-all active:scale-[0.97] flex items-center gap-1.5 shadow-[0_2px_8px_rgba(13,148,136,0.2)] disabled:opacity-50">
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Publish</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
