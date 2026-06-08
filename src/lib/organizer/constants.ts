import type { Profile } from "@/lib/supabase/types";

export function computeCompletion(p: Profile): number;
export function computeCompletion(p: Profile, detailed: true): { percent: number; missing: string[] };
export function computeCompletion(p: Profile, detailed?: true): number | { percent: number; missing: string[] } {
  const checks: [keyof Profile, string, number][] = [
    ["phone", "Phone", 20], ["age", "Age", 10], ["gender", "Gender", 10],
    ["city", "City", 10], ["area", "Area", 10],
    ["skills", "Skills", 20], ["experience", "Experience", 10], ["bio", "Bio", 10],
  ];
  let percent = 0;
  const missing: string[] = [];
  for (const [key, label, weight] of checks) {
    const val = p[key];
    if (key === "skills") { if (Array.isArray(val) && val.length > 0) percent += weight; else missing.push(label); }
    else if (val !== null && val !== undefined && val !== "") percent += weight; else missing.push(label);
  }
  if (detailed) return { percent, missing };
  return percent;
}

export const AVAIL_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  available_today: { label: "Available Today", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  available_this_week: { label: "Available This Week", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  available: { label: "Available", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  weekends: { label: "Weekends", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  evenings: { label: "Evenings", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700 border-purple-200" },
  busy: { label: "Busy", dot: "bg-red-500", badge: "bg-red-100 text-red-700 border-red-200" },
  unavailable: { label: "Unavailable", dot: "bg-gray-400", badge: "bg-gray-100 text-gray-500 border-gray-200" },
};

export const AVAIL_SORT_KEY: Record<string, number> = {
  available_today: 0, available_this_week: 1, available: 2,
  weekends: 3, evenings: 4, busy: 5, unavailable: 6,
};

export const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-emerald-50 text-emerald-700",
  filling: "bg-blue-50 text-blue-700",
  full: "bg-purple-50 text-purple-700",
  closed: "bg-amber-50 text-amber-700",
  completed: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-50 text-red-700",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", published: "Published", filling: "Filling",
  full: "Full", closed: "Closed", completed: "Completed", cancelled: "Cancelled",
};

export const CATEGORIES = [
  "promotion", "event_setup", "crowd_management", "registration",
  "hospitality", "cleaning", "security", "other",
];

export const CATEGORY_LABELS: Record<string, string> = {
  promotion: "Promotion", event_setup: "Setup", crowd_management: "Crowd Mgmt",
  registration: "Registration", hospitality: "Hospitality", cleaning: "Cleaning",
  security: "Security", other: "Other",
};

export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "draft", label: "Draft" }, { value: "published", label: "Published" },
  { value: "filling", label: "Filling" }, { value: "full", label: "Full" },
  { value: "closed", label: "Closed" }, { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const APPLICANT_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected: "bg-gray-50 text-gray-500 border border-gray-200",
  cancelled: "bg-gray-50 text-gray-400 border border-gray-200",
};

export const APPLICANT_STATUS_LABELS: Record<string, string> = {
  pending: "Applied", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled",
};

export const INPUT_CLASS = "w-full h-11 px-3.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white text-sm outline-none transition-all focus:border-[#0D9488] focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]";
export const LABEL_CLASS = "block text-xs font-medium text-gray-600 mb-1.5";
export const SELECT_CLASS = INPUT_CLASS;

export const CATEGORY_OPTIONS = CATEGORIES.map(c => ({
  value: c,
  label: c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
}));

export function parseCommaList(value: string): string[] {
  return value.split(",").map((s: string) => s.trim()).filter(Boolean);
}

export function formatDate(dateStr: string, displayStr?: string | null): string {
  if (displayStr) return displayStr;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
