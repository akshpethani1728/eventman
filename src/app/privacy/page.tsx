import { LegalPageShell } from "@/components/LegalPageShell";

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <h1 className="text-2xl font-bold !mb-1">Privacy Policy</h1>
        <p className="text-gray-500 text-sm !mt-0 !mb-6">Last updated: May 2026</p>

      <h2>A. Information We Collect</h2>
        <p>When you create an account and use EventMan, we collect the following information:</p>
        <ul>
          <li><strong>Account information:</strong> your name, email address, phone number, and account type (worker or organizer).</li>
          <li><strong>Profile information:</strong> age, gender, city, area, skills, experience, availability, bio, and any other details you choose to add.</li>
          <li><strong>Usage information:</strong> events you apply to, your application status, events you create, and your interactions on the platform.</li>
          <li><strong>Subscription information:</strong> trial dates, subscription status, payment confirmation details (we do not store full payment card information).</li>
          <li><strong>Ratings:</strong> ratings and reviews you give or receive as part of platform activity.</li>
          <li><strong>Device information:</strong> basic technical data such as browser type and device type for platform optimization.</li>
        </ul>

      <h2>B. How We Use Your Information</h2>
        <p>We use the information collected to:</p>
        <ul>
          <li>Create and manage your account.</li>
          <li>Match workers with relevant event opportunities.</li>
          <li>Enable organizers to review applicant profiles.</li>
          <li>Process subscription payments and manage plan access.</li>
          <li>Send notifications about application updates, subscription status, and platform announcements.</li>
          <li>Improve and maintain the platform.</li>
          <li>Prevent misuse, fraud, and violations of our terms.</li>
        </ul>
        <p>We do not sell your personal information to third parties.</p>

      <h2>C. Contact Privacy</h2>
        <p>Your phone number and email address are kept hidden from other users by default. They are only revealed when:</p>
        <ul>
          <li>An organizer approves your application and needs to coordinate event logistics.</li>
          <li>You approve a worker&apos;s application to your event.</li>
        </ul>
        <p>This ensures contact details are shared only when necessary for event coordination. Once shared, we ask all users to respect each other&apos;s privacy and not misuse contact information.</p>

      <h2>D. Data Protection</h2>
        <p>We implement reasonable security measures to protect your information, including encrypted data transmission (SSL/TLS) and secure authentication through Supabase. However, no online service can guarantee absolute security. You are responsible for keeping your account credentials confidential.</p>

      <h2>E. Third-Party Services</h2>
        <p>EventMan uses the following third-party services:</p>
        <ul>
          <li><strong>Supabase:</strong> our database and authentication provider. Your account data and profile information are stored securely on Supabase infrastructure.</li>
          <li><strong>Razorpay:</strong> our payment processing partner. When you purchase a subscription, payment details are handled securely by Razorpay. We receive only confirmation of payment status — not your full payment card details.</li>
        </ul>
        <p>These services have their own privacy policies governing how they handle your data. We encourage you to review them.</p>

      <h2>F. Your Rights</h2>
        <p>You may update or correct your profile information at any time through your account settings. You may request deletion of your account by contacting support. Note that some information may be retained as required by law or for legitimate business purposes.</p>
        <p>You may also choose what information to include in your profile. Providing accurate information helps organizers make informed decisions and improves your chances of being selected.</p>

      <h2>G. Contact</h2>
        <p>If you have questions about this privacy policy or how your data is handled, please contact us through the platform or reach out to our support team.</p>
    </LegalPageShell>
  );
}
