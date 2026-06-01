export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };
  return (
    <span className={`${sizes[size]} border-2 border-[rgba(0,0,0,0.08)] border-t-[#0D9488] rounded-full animate-spin ${className}`} />
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-3 text-sm text-[#A1A1AA]">Loading...</p>
      </div>
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`bg-[rgba(0,0,0,0.04)] animate-pulse rounded-[10px] ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card-base overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <SkeletonBlock className="w-9 h-9 rounded-[10px]" />
        <div className="space-y-2 flex-1">
          <SkeletonBlock className="w-28 h-3.5" />
          <SkeletonBlock className="w-20 h-3" />
        </div>
      </div>
      <div className="px-5 py-3 space-y-3">
        <SkeletonBlock className="w-16 h-5" />
        <SkeletonBlock className="w-3/4 h-5" />
        <SkeletonBlock className="w-32 h-8" />
        <SkeletonBlock className="w-full h-3" />
        <SkeletonBlock className="w-full h-2.5" />
        <div className="flex gap-2">
          <SkeletonBlock className="w-16 h-6" />
          <SkeletonBlock className="w-18 h-6" />
        </div>
      </div>
      <div className="h-px bg-[rgba(0,0,0,0.04)] mx-5" />
      <div className="px-5 py-3 flex justify-end">
        <SkeletonBlock className="w-32 h-11" />
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-16 px-6">
      {icon && (
        <div className="w-16 h-16 rounded-[20px] bg-[#F0F0EE] flex items-center justify-center mx-auto mb-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {icon}
        </div>
      )}
      <p className="text-[16px] font-semibold text-[#1A1A1A]">{title}</p>
      <p className="text-[13px] text-[#6B6B6B] mt-1.5 leading-relaxed max-w-xs mx-auto">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
