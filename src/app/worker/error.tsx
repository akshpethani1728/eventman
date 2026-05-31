"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function WorkerErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[WorkerError]", error.name, error.message, error.stack);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-base font-bold text-gray-900 mb-1">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-4">We encountered an error loading your dashboard. Please try again.</p>
        <div className="flex gap-2 justify-center">
          <button onClick={reset}
            className="h-11 px-6 rounded-lg bg-indigo-700 text-white text-sm font-semibold hover:bg-indigo-800 active:scale-[0.97] transition-all shadow-sm">
            Retry
          </button>
          <Link href="/login"
            className="h-11 px-6 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 active:scale-[0.97] transition-all shadow-sm flex items-center">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
