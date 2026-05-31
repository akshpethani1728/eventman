export const SHADOWS = {
  sm: "shadow-sm shadow-black/[0.04]",
  md: "shadow-md shadow-black/[0.06]",
  lg: "shadow-lg shadow-black/[0.08]",
  xl: "shadow-xl shadow-black/[0.1]",
  float: "shadow-lg shadow-black/[0.08] ring-1 ring-black/[0.02]",
  card: "shadow-sm shadow-black/[0.03] shadow-indigo-900/[0.02]",
  cardHover: "shadow-lg shadow-black/[0.06] shadow-indigo-900/[0.03]",
  elevated: "shadow-xl shadow-black/[0.08] shadow-indigo-900/[0.04]",
  inner: "shadow-inner shadow-black/[0.02]",
} as const;

export const RADIUS = {
  sm: "rounded-xl",
  md: "rounded-2xl",
  lg: "rounded-3xl",
  full: "rounded-full",
} as const;

export const SPACING = {
  card: "p-5",
  cardCompact: "p-4",
  section: "py-5",
  gutter: "px-4",
} as const;

export const BUTTON = {
  heights: { sm: "h-10", md: "h-12", lg: "h-14" },
  padding: { sm: "px-5", md: "px-6", lg: "px-7" },
  radius: "rounded-2xl",
  font: "text-sm font-semibold",
} as const;

export const VARIANTS = {
  primary:
    "bg-indigo-700 text-white hover:bg-indigo-800 active:scale-[0.97] disabled:opacity-50 transition-all duration-200 shadow-sm shadow-indigo-200",
  secondary:
    "bg-white text-gray-700 border border-gray-200/80 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.97] disabled:opacity-50 shadow-sm transition-all duration-200",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97] disabled:opacity-50 transition-all duration-200 shadow-sm shadow-emerald-200",
  warning:
    "bg-amber-600 text-white hover:bg-amber-700 active:scale-[0.97] disabled:opacity-50 transition-all duration-200 shadow-sm shadow-amber-200",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:scale-[0.97] disabled:opacity-50 transition-all duration-200 shadow-sm shadow-red-200",
  ghost:
    "text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-[0.97] disabled:opacity-50 transition-all duration-200",
} as const;

export const CARD = {
  base: "bg-white border border-gray-200/60 shadow-sm shadow-black/[0.02] shadow-indigo-900/[0.01]",
  hover: "hover:shadow-lg hover:shadow-black/[0.05] hover:border-gray-300/70 transition-all duration-300",
  active: "active:scale-[0.99]",
  radius: "rounded-3xl",
  inner: "bg-gray-50/80 rounded-2xl border border-gray-100/70",
  section: "bg-white rounded-2xl border border-gray-100/80 shadow-sm shadow-black/[0.01]",
  floating: "bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-lg shadow-black/[0.05] shadow-indigo-900/[0.02]",
} as const;

export const BADGE = {
  pending: "bg-amber-50 text-amber-700 border-amber-200/50",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
  rejected: "bg-gray-50 text-gray-500 border-gray-200/50",
  cancelled: "bg-gray-50 text-gray-400 border-gray-200/50",
  waitlisted: "bg-purple-50 text-purple-700 border-purple-200/50",
  draft: "bg-gray-50 text-gray-600 border-gray-200/50",
  published: "bg-indigo-50 text-indigo-700 border-indigo-200/50",
  filling: "bg-green-50 text-green-700 border-green-200/50",
  full: "bg-purple-50 text-purple-700 border-purple-200/50",
  closed: "bg-amber-50 text-amber-700 border-amber-200/50",
  completed: "bg-gray-50 text-gray-500 border-gray-200/50",
  urgent: "bg-red-50 text-red-700 border-red-200/50",
  soon: "bg-amber-50 text-amber-700 border-amber-200/50",
  trusted: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
  verified: "bg-indigo-50 text-indigo-700 border-indigo-200/50",
  basicVerified: "bg-sky-50 text-sky-700 border-sky-200/50",
  unverified: "bg-gray-50 text-gray-500 border-gray-200/50",
  new: "bg-slate-700 text-white border-slate-600/30",
  deadline: "bg-gray-50 text-gray-500 border-gray-200/50",
} as const;

export const LAYER = {
  surface: "bg-gradient-to-b from-gray-50 to-white",
  section: "bg-white rounded-3xl border border-gray-100/80 shadow-sm shadow-black/[0.02] p-5",
  innerCard: "bg-gray-50/80 rounded-2xl border border-gray-100/70 p-4",
  actionBar: "bg-white/95 backdrop-blur-xl border-t border-gray-100/80",
  floating: "bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg shadow-black/[0.05]",
} as const;
