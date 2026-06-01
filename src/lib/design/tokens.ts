export const SPACING = {
  card: "p-6",
  cardCompact: "p-4",
  section: "py-6",
  gutter: "px-5",
  stack: "space-y-4",
  stackCompact: "space-y-2",
} as const;

export const TYPOGRAPHY = {
  display: "text-[32px] font-bold leading-[1.1] tracking-tight",
  h1: "text-[26px] font-bold leading-[1.2] tracking-tight",
  h2: "text-[22px] font-semibold leading-[1.25] tracking-tight",
  h3: "text-[18px] font-semibold leading-[1.35] tracking-tight",
  h4: "text-[16px] font-semibold leading-[1.4]",
  body: "text-[15px] leading-[1.55]",
  bodySmall: "text-[13px] leading-[1.45]",
  caption: "text-[12px] font-medium leading-[1.3]",
  label: "text-[11px] font-semibold leading-[1.2] tracking-[0.04em] uppercase",
} as const;

export const SHADOWS = {
  none: "shadow-none",
  subtle: "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
  low: "shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]",
  medium: "shadow-[0_4px_16px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.03)]",
  high: "shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]",
  floating: "shadow-[0_12px_48px_rgba(0,0,0,0.10),0_4px_12px_rgba(0,0,0,0.05)]",
  brand: "shadow-[0_2px_12px_rgba(13,148,136,0.25)]",
  brandHover: "shadow-[0_4px_16px_rgba(13,148,136,0.35)]",
} as const;

export const RADIUS = {
  sm: "rounded-[10px]",
  md: "rounded-[16px]",
  lg: "rounded-[20px]",
  xl: "rounded-[24px]",
  full: "rounded-full",
} as const;

export const BUTTON = {
  heights: { sm: "h-9", md: "h-11", lg: "h-13" },
  padding: { sm: "px-4", md: "px-5", lg: "px-7" },
  radius: "rounded-[10px]",
  font: "text-[14px] font-semibold",
} as const;

export const VARIANTS = {
  primary:
    "btn-primary",
  secondary:
    "btn-secondary",
  success:
    "bg-[#059669] text-white shadow-[0_2px_12px_rgba(5,150,105,0.25)] active:scale-[0.97] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(5,150,105,0.35)]",
  warning:
    "bg-[#D97706] text-white shadow-[0_2px_12px_rgba(217,119,6,0.25)] active:scale-[0.97] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(217,119,6,0.35)]",
  danger:
    "bg-[#DC2626] text-white shadow-[0_2px_12px_rgba(220,38,38,0.25)] active:scale-[0.97] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(220,38,38,0.35)]",
  ghost:
    "text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F0F0EE] active:scale-[0.97] transition-all duration-200",
} as const;

export const CARD = {
  base: "card-base",
  hover: "hover:shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300",
  active: "active:scale-[0.99]",
  radius: "rounded-[16px]",
  inner: "card-inner",
  section: "section-surface",
  floating: "card-floating",
} as const;

export const BADGE = {
  pending: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]/50",
  approved: "bg-[#F0FDF4] text-[#047857] border-[#BBF7D0]/50",
  rejected: "bg-[#F5F5F4] text-[#78716C] border-[#D6D3D1]/50",
  cancelled: "bg-[#F5F5F4] text-[#78716C] border-[#D6D3D1]/50",
  waitlisted: "bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF]/50",
  draft: "bg-[#F5F5F4] text-[#78716C] border-[#D6D3D1]/50",
  published: "bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]/50",
  filling: "bg-[#F0FDF4] text-[#047857] border-[#BBF7D0]/50",
  full: "bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF]/50",
  closed: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]/50",
  completed: "bg-[#F5F5F4] text-[#78716C] border-[#D6D3D1]/50",
  urgent: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]/50",
  soon: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]/50",
  trusted: "bg-[#F0FDF4] text-[#047857] border-[#BBF7D0]/50",
  verified: "bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]/50",
  basicVerified: "bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]/50",
  unverified: "bg-[#F5F5F4] text-[#78716C] border-[#D6D3D1]/50",
  new: "bg-[#0D9488] text-white border-transparent",
  deadline: "bg-[#F5F5F4] text-[#78716C] border-[#D6D3D1]/50",
} as const;

export const LAYER = {
  surface: "bg-[#F8F8F6]",
  section: "card-base p-6",
  innerCard: "card-inner p-4",
  actionBar: "bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] shadow-[0_-2px_12px_rgba(0,0,0,0.04)]",
  floating: "card-floating p-4",
  modal: "bg-white rounded-[20px] shadow-[0_24px_64px_rgba(0,0,0,0.15),0_8px_20px_rgba(0,0,0,0.08)]",
  bottomSheet: "bg-white rounded-t-[20px] shadow-[0_-8px_32px_rgba(0,0,0,0.10)]",
} as const;

export const DEPTH = {
  content: "z-0",
  sticky: "z-10",
  nav: "z-40",
  overlay: "z-50",
  modal: "z-100",
  toast: "z-110",
} as const;
