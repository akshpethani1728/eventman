import { LegalPageShell } from "@/components/LegalPageShell";

export default function RefundPolicyPage() {
  return (
    <LegalPageShell title="Refund Policy">
      <h1 className="text-2xl font-bold !mb-1">Refund Policy</h1>
        <p className="text-gray-500 text-sm !mt-0 !mb-6">Last updated: September 2026</p>

      <h2>A. Free Platform</h2>
        <p>EventMan is a free platform for all workers and organizers. There are no subscription fees or charges required to use the core features of the platform, including browsing events, applying to events, and managing your profile.</p>

      <h2>B. Future Premium Features</h2>
        <p>If premium features are introduced in the future, refund terms will be clearly stated at the time of purchase. Any changes to this policy will be communicated in advance.</p>

      <h2>C. Contact for Concerns</h2>
        <p>If you have any billing concerns or questions, please contact us through the platform. Include your registered email address and a brief description of the issue. We aim to respond within 5 business days.</p>
    </LegalPageShell>
  );
}
