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
      <div className="card-base p-6 text-center max-w-md w-full">
        <div className="w-12 h-12 rounded-[14px] bg-red-50 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-base font-bold text-gray-900 mb-1">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-4">We encountered an error loading your dashboard. Please try again.</p>
        <div className="flex gap-2 justify-center">
          <button onClick={reset}
            className="h-11 px-6 rounded-[14px] bg-indigo-700 text-white text-sm font-semibold hover:bg-indigo-800 active:scale-[0.97] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
            Retry
          </button>
          <Link href="/login"
            className="h-11 px-6 rounded-[14px] border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 active:scale-[0.97] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] flex items-center">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
