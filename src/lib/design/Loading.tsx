export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };
  return (
    <span className={`${sizes[size]} border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin ${className}`} />
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-200 animate-pulse rounded-xl ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 overflow-hidden shadow-sm">
      <div className="px-4 pt-3.5 pb-2 flex items-center gap-2.5">
        <SkeletonBlock className="w-8 h-8 rounded-xl" />
        <div className="space-y-1.5 flex-1">
          <SkeletonBlock className="w-28 h-3" />
          <SkeletonBlock className="w-20 h-2.5" />
        </div>
      </div>
      <div className="px-4 py-2 space-y-3">
        <SkeletonBlock className="w-16 h-5" />
        <SkeletonBlock className="w-3/4 h-5" />
        <SkeletonBlock className="w-32 h-7" />
        <SkeletonBlock className="w-full h-3" />
        <SkeletonBlock className="w-full h-2" />
        <div className="flex gap-1.5">
          <SkeletonBlock className="w-14 h-5" />
          <SkeletonBlock className="w-16 h-5" />
        </div>
      </div>
      <div className="h-px bg-gray-100 mx-4" />
      <div className="px-4 py-3 flex justify-end">
        <SkeletonBlock className="w-28 h-10" />
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/60 flex items-center justify-center mx-auto mb-5 shadow-sm">
        {icon}
      </div>
      <p className="text-lg font-bold text-gray-900">{title}</p>
      <p className="text-sm text-gray-500 mt-1.5 leading-relaxed max-w-xs mx-auto">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
