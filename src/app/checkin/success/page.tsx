import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function CheckinSuccessPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-[24px] bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Checked In!</h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">Attendance recorded successfully for this event.</p>
        <Link href="/organizer/dashboard"
          className="mt-8 inline-flex h-12 px-8 rounded-[14px] bg-[#0D9488] text-white text-sm font-semibold items-center gap-2 hover:bg-teal-700 transition-all shadow-[0_4px_16px_rgba(13,148,136,0.25)]">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
