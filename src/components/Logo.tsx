import { Briefcase } from "lucide-react";

export function Logo({ showText = true, size = "sm", muted = false }: { showText?: boolean; size?: "sm" | "md" | "lg"; muted?: boolean }) {
  const iconSizes = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-12 w-12" };
  const iconInner = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-6 w-6" };
  const textSizes = { sm: "text-sm", md: "text-base", lg: "text-xl" };

  return (
    <div className="flex items-center justify-center gap-2.5">
      <div className={`flex items-center justify-center rounded-[10px] bg-gradient-to-br from-[#0D9488] to-[#0F766E] text-white shadow-[0_2px_12px_rgba(13,148,136,0.25)] ${iconSizes[size]}`}>
        <Briefcase className={iconInner[size]} />
      </div>
      {showText && (
        <span className={`font-extrabold tracking-tight ${muted ? "text-[#A1A1AA]" : "text-[#1A1A1A]"} ${textSizes[size]}`}>
          EventMan
        </span>
      )}
    </div>
  );
}
