export const SHADOWS = {
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
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
  radius: "rounded-xl",
  font: "text-sm font-semibold",
} as const;

export const VARIANTS = {
  primary:
    "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm shadow-blue-600/20 hover:shadow-md hover:shadow-blue-600/30 active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-sm",
  secondary:
    "bg-white text-gray-700 border border-gray-200/80 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50 shadow-sm",
  success:
    "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm shadow-emerald-600/20 hover:shadow-md hover:shadow-emerald-600/30 active:scale-[0.98] disabled:opacity-50",
  warning:
    "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/20 hover:shadow-md hover:shadow-amber-500/30 active:scale-[0.98] disabled:opacity-50",
  danger:
    "bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-sm shadow-red-600/20 hover:shadow-md hover:shadow-red-600/30 active:scale-[0.98] disabled:opacity-50",
  ghost:
    "text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-[0.98] disabled:opacity-50",
} as const;

export const CARD = {
  base: "bg-white border border-gray-200/80 shadow-sm",
  hover: "hover:shadow-md hover:border-gray-300 transition-all duration-300",
  active: "active:scale-[0.99]",
  radius: "rounded-2xl",
} as const;

export const BADGE = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-gray-100 text-gray-500 border-gray-200",
  cancelled: "bg-gray-100 text-gray-400 border-gray-200",
  waitlisted: "bg-purple-100 text-purple-700 border-purple-200",
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  published: "bg-blue-100 text-blue-700 border-blue-200",
  filling: "bg-green-100 text-green-700 border-green-200",
  full: "bg-purple-100 text-purple-700 border-purple-200",
  closed: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-gray-100 text-gray-500 border-gray-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
  soon: "bg-amber-50 text-amber-700 border-amber-200",
  trusted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  verified: "bg-blue-100 text-blue-700 border-blue-200",
  basicVerified: "bg-sky-100 text-sky-700 border-sky-200",
  unverified: "bg-gray-100 text-gray-500 border-gray-200",
  new: "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
  deadline: "bg-gray-500/10 text-gray-500 border-gray-200/60",
} as const;
