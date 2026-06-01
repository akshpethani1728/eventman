"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RouteError]", error.name, error.message, error.stack);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center p-4">
      <div className="card-base p-6 text-center max-w-md w-full">
        <div className="w-12 h-12 rounded-[10px] bg-red-50 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-base font-bold text-[#1A1A1A] mb-1">Page Error</h1>
        <p className="text-sm text-[#6B6B6B] mb-4">This page ran into a problem. Try again or go back.</p>
        <div className="flex gap-2 justify-center">
          <button onClick={reset}
            className="btn-base btn-primary h-11 px-6">
            Retry
          </button>
          <Link href="/login"
            className="btn-base btn-secondary h-11 px-6">
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
