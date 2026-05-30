import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function LegalPageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-gray-100 z-10">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center gap-3">
          <Link href="/" className="p-1 -ml-1 text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <article className="prose prose-gray prose-sm max-w-none">{children}</article>
        <div className="mt-10 pt-6 border-t border-gray-100 text-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
