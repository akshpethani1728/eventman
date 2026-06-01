export const SHADOWS = {
  sm: "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]",
  md: "shadow-[0_4px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)]",
  lg: "shadow-[0_8px_24px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.03)]",
  xl: "shadow-[0_12px_32px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.03)]",
  float: "shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03]",
  card: "shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]",
  cardHover: "shadow-[0_8px_24px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.03)]",
  elevated: "shadow-[0_12px_32px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.03)]",
  inner: "shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]",
  primary: "shadow-[0_2px_8px_rgba(67,56,202,0.2)]",
  primaryHover: "shadow-[0_4px_12px_rgba(67,56,202,0.3)]",
} as const;

export const RADIUS = {
  sm: "rounded-[10px]",
  md: "rounded-[14px]",
  lg: "rounded-[18px]",
  xl: "rounded-[22px]",
  xxl: "rounded-[26px]",
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
  radius: "rounded-[14px]",
  font: "text-sm font-semibold",
} as const;

export const VARIANTS = {
  primary:
    "btn-primary",
  secondary:
    "btn-secondary",
  success:
    "bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-[0_2px_8px_rgba(5,150,105,0.2)] hover:shadow-[0_4px_12px_rgba(5,150,105,0.3)] hover:-translate-y-px transition-all duration-200 active:scale-[0.97]",
  warning:
    "bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-[0_2px_8px_rgba(217,119,6,0.2)] hover:shadow-[0_4px_12px_rgba(217,119,6,0.3)] hover:-translate-y-px transition-all duration-200 active:scale-[0.97]",
  danger:
    "bg-gradient-to-br from-red-600 to-red-700 text-white shadow-[0_2px_8px_rgba(220,38,38,0.2)] hover:shadow-[0_4px_12px_rgba(220,38,38,0.3)] hover:-translate-y-px transition-all duration-200 active:scale-[0.97]",
  ghost:
    "text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-[0.97] transition-all duration-200",
} as const;

export const CARD = {
  base: "card-base",
  hover: "hover:shadow-[0_8px_24px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300",
  active: "active:scale-[0.99]",
  radius: "rounded-[18px]",
  inner: "card-inner",
  section: "section-surface",
  floating: "card-floating",
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
  new: "bg-indigo-700 text-white border-indigo-600/30",
  deadline: "bg-gray-50 text-gray-500 border-gray-200/50",
} as const;

export const LAYER = {
  surface: "bg-[#f5f5f7]",
  section: "card-base p-5",
  innerCard: "card-inner p-4",
  actionBar: "bg-white/95 backdrop-blur-xl border-t border-gray-200/80 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]",
  floating: "card-floating p-4",
} as const;
