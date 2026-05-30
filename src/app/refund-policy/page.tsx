import { LegalPageShell } from "@/components/LegalPageShell";

export default function RefundPolicyPage() {
  return (
    <LegalPageShell title="Refund Policy">
      <h1 className="text-2xl font-bold !mb-1">Refund Policy</h1>
        <p className="text-gray-500 text-sm !mt-0 !mb-6">Last updated: May 2026</p>

      <h2>A. What Your Subscription Provides</h2>
        <p>When you purchase a monthly subscription as a worker, you gain access to apply for events on EventMan for the subscription period. The subscription covers platform access — it does not guarantee selection for any event, nor does it guarantee any payment from organizers.</p>

      <h2>B. Free Trial Period</h2>
        <p>Every new worker receives a <strong>10-day free trial</strong> from the date of account creation. During this period you can use all platform features, including applying to events, at no charge. We encourage you to explore the platform thoroughly before purchasing a subscription.</p>
        <p>No payment information is required to start your trial.</p>

      <h2>C. Payment &amp; Non-Refundable Policy</h2>
        <p>Subscription payments are generally <strong>non-refundable</strong> once the subscription has been activated and you have begun using the platform features. This is because the subscription grants immediate access to the platform&apos;s functionality for the entire billing period.</p>
        <p>We understand that issues can arise. While our policy is non-refundable, we review the following situations individually:</p>
        <ul>
          <li><strong>Duplicate charges:</strong> if a technical error results in you being charged twice for the same period.</li>
          <li><strong>Billing errors:</strong> incorrect amount charged due to a system error.</li>
          <li><strong>Account access issues:</strong> if a platform issue prevents you from using your subscription for an extended period.</li>
        </ul>
        <p>Refund requests for these situations should be submitted through the support channel with relevant details. Each request is reviewed on its merits.</p>

      <h2>D. Failed or Cancelled Payments</h2>
        <p>If a payment fails or is cancelled before completion:</p>
        <ul>
          <li>Your subscription will <strong>not</strong> be activated.</li>
          <li>You will not be charged.</li>
          <li>Your account will retain its current status (trial or expired).</li>
        </ul>
        <p>No refund is needed because no payment was successfully processed.</p>

      <h2>E. Subscription Cancellation</h2>
        <p>You may choose not to renew your subscription at any time. Your access will continue until the end of the current billing period, after which your account will revert to the expired state. You will not be charged for the next period.</p>
        <p>There are no cancellation fees.</p>

      <h2>F. Contact for Billing Concerns</h2>
        <p>If you have a billing concern or believe you qualify for a refund under the circumstances described above, please contact us through the platform. Include your registered email address, payment details, and a brief description of the issue. We aim to respond within 5 business days.</p>
    </LegalPageShell>
  );
}
