export const SHADOWS = {
  sm: "shadow-sm shadow-black/[0.03]",
  md: "shadow-md shadow-black/[0.05]",
  lg: "shadow-lg shadow-black/[0.06]",
  xl: "shadow-xl shadow-black/[0.08]",
} as const;

export const RADIUS = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  full: "rounded-full",
} as const;

export const SPACING = {
  card: "p-4",
  cardCompact: "p-3.5",
  section: "py-4",
  gutter: "px-4",
} as const;

export const BUTTON = {
  heights: { sm: "h-9", md: "h-11", lg: "h-12" },
  padding: { sm: "px-4", md: "px-5", lg: "px-6" },
  radius: "rounded-lg",
  font: "text-sm font-semibold",
} as const;

export const VARIANTS = {
  primary:
    "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm shadow-blue-600/20 hover:shadow-md hover:shadow-blue-600/30 hover:from-blue-700 hover:to-blue-600 active:scale-[0.97] disabled:opacity-50 disabled:hover:shadow-sm transition-all duration-150",
  secondary:
    "bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.97] disabled:opacity-50 shadow-sm transition-all duration-150",
  success:
    "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm shadow-emerald-600/20 hover:shadow-md hover:shadow-emerald-600/30 hover:from-emerald-700 hover:to-emerald-600 active:scale-[0.97] disabled:opacity-50 transition-all duration-150",
  warning:
    "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/20 hover:shadow-md hover:shadow-amber-500/30 hover:from-amber-600 hover:to-orange-600 active:scale-[0.97] disabled:opacity-50 transition-all duration-150",
  danger:
    "bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-sm shadow-red-600/20 hover:shadow-md hover:shadow-red-600/30 hover:from-red-700 hover:to-rose-600 active:scale-[0.97] disabled:opacity-50 transition-all duration-150",
  ghost:
    "text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-[0.97] disabled:opacity-50 transition-all duration-150",
} as const;

export const CARD = {
  base: "bg-white border border-gray-200/70 shadow-sm shadow-black/[0.02]",
  hover: "hover:shadow-md hover:shadow-black/[0.04] hover:border-gray-300/80 transition-all duration-200",
  active: "active:scale-[0.99]",
  radius: "rounded-2xl",
} as const;

export const BADGE = {
  pending: "bg-amber-50 text-amber-700 border-amber-200/60",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  rejected: "bg-gray-50 text-gray-500 border-gray-200/60",
  cancelled: "bg-gray-50 text-gray-400 border-gray-200/60",
  waitlisted: "bg-purple-50 text-purple-700 border-purple-200/60",
  draft: "bg-gray-50 text-gray-600 border-gray-200/60",
  published: "bg-blue-50 text-blue-700 border-blue-200/60",
  filling: "bg-green-50 text-green-700 border-green-200/60",
  full: "bg-purple-50 text-purple-700 border-purple-200/60",
  closed: "bg-amber-50 text-amber-700 border-amber-200/60",
  completed: "bg-gray-50 text-gray-500 border-gray-200/60",
  urgent: "bg-red-50 text-red-700 border-red-200/60",
  soon: "bg-amber-50 text-amber-700 border-amber-200/60",
  trusted: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  verified: "bg-blue-50 text-blue-700 border-blue-200/60",
  basicVerified: "bg-sky-50 text-sky-700 border-sky-200/60",
  unverified: "bg-gray-50 text-gray-500 border-gray-200/60",
  new: "bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent",
  deadline: "bg-gray-100/50 text-gray-500 border-gray-200/60",
} as const;
