import { LegalPageShell } from "@/components/LegalPageShell";

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms & Conditions">
      <h1 className="text-2xl font-bold !mb-1">Terms &amp; Conditions</h1>
        <p className="text-gray-500 text-sm !mt-0 !mb-6">Last updated: May 2026</p>

      <h2>A. Introduction</h2>
        <p>EventMan is an event manpower coordination platform that connects event organizers with workers in Ahmedabad. The platform enables organizers to post opportunities and workers to discover and apply for them.</p>
        <p>By using EventMan, you agree to these terms. If you do not agree, do not use the platform.</p>

      <h2>B. User Eligibility</h2>
        <p>You must be at least 18 years old to use EventMan. You agree to provide accurate and complete information during registration and keep your profile updated. You are responsible for maintaining the confidentiality of your account credentials.</p>
        <p>Each user may hold only one account. Multiple or fake accounts are not permitted.</p>

      <h2>C. Worker Responsibilities</h2>
        <p>Workers using EventMan agree to:</p>
        <ul>
          <li>Maintain an accurate and honest profile, including skills, experience, and availability.</li>
          <li>Attend events they have been approved for, on time and prepared.</li>
          <li>Follow reasonable instructions from the organizer during the event.</li>
          <li>Communicate respectfully with organizers and other workers.</li>
          <li>Notify the organizer as early as possible if unable to attend.</li>
          <li>Not provide false information or misrepresent their qualifications.</li>
        </ul>

      <h2>D. Organizer Responsibilities</h2>
        <p>Organizers using EventMan agree to:</p>
        <ul>
          <li>Post genuine event opportunities with accurate details including date, time, location, pay, and requirements.</li>
          <li>Communicate honestly and respectfully with workers.</li>
          <li>Manage worker payments independently and promptly. EventMan does not process or guarantee any payments.</li>
          <li>Provide clear instructions and expectations to approved workers.</li>
          <li>Not misuse worker contact information obtained through the platform.</li>
        </ul>

      <h2>E. Subscription Terms</h2>
        <p>Workers receive a 10-day free trial from the date of account creation. During the trial period, workers may apply to events and use all platform features.</p>
        <p>After the trial period ends, a paid subscription is required to submit new applications. Workers may continue browsing events, viewing organizer profiles, and accessing their existing applications without an active subscription.</p>
        <p>Subscriptions are billed monthly and grant access to platform features. They do not guarantee selection for any event. Organizers use the platform free of charge with no subscription required.</p>

      <h2>F. Ratings &amp; Reviews</h2>
        <p>Users may leave ratings and reviews based on genuine experiences. Ratings must be fair, honest, and not abusive. EventMan reserves the right to remove ratings or restrict accounts that misuse the rating system.</p>

      <h2>G. Privacy &amp; Contact Rules</h2>
        <p>Contact details such as phone numbers and email addresses remain hidden until an organizer approves a worker&apos;s application. Once approved, the organizer may view the worker&apos;s contact information for coordination purposes.</p>
        <p>Misuse of contact information obtained through the platform — including unsolicited messaging, harassment, or sharing with third parties — is strictly prohibited and may result in account suspension.</p>

      <h2>H. Platform Disclaimer</h2>
        <p>EventMan is a coordination platform only. We are not an employer, employment agency, or staffing firm. We do not employ any workers and are not a party to any agreement between organizers and workers.</p>
        <p><strong>EventMan makes no guarantees regarding:</strong></p>
        <ul>
          <li>Employment or ongoing work opportunities.</li>
          <li>Selection for any event or position.</li>
          <li>Payment by organizers to workers.</li>
          <li>The accuracy of event listings or organizer representations.</li>
          <li>The conduct of any user on or off the platform.</li>
        </ul>
        <p>All arrangements regarding compensation, scope of work, and working conditions are solely between the organizer and the worker. EventMan is not responsible for disputes arising between users.</p>

      <h2>I. Account Suspension</h2>
        <p>EventMan may suspend or terminate accounts at its discretion for violations including but not limited to:</p>
        <ul>
          <li>Providing false or misleading information.</li>
          <li>Fraudulent activity or attempted manipulation of the platform.</li>
          <li>Abusive, harassing, or threatening behavior toward other users.</li>
          <li>Misuse of contact information obtained through the platform.</li>
          <li>Creating multiple or fake accounts.</li>
          <li>Violating any applicable law or regulation.</li>
        </ul>
        <p>Suspended users may lose access to their applications, subscriptions, and account data.</p>

      <h2>J. Changes to Terms</h2>
        <p>EventMan may update these terms from time to time. Users will be notified of material changes. Continued use of the platform after changes take effect constitutes acceptance of the updated terms.</p>
    </LegalPageShell>
  );
}
