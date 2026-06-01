import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function LegalPageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] z-10">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center gap-3">
          <Link href="/" className="p-1 -ml-1 text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="label-sm">{title}</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <article className="prose prose-gray prose-sm max-w-none">{children}</article>
        <div className="mt-10 pt-6 border-t border-[rgba(0,0,0,0.06)] text-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#6B6B6B] font-medium hover:text-[#1A1A1A] transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
