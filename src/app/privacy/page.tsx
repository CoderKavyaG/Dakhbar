import { LegalDocument } from '@/components/legal-document';

export default function PrivacyPage() {
  return <LegalDocument
    title="Privacy Policy"
    effective="21 September 2026"
    intro="This policy describes the limited personal data Dअख़बार processes to provide reader accounts, Following, Briefs, and Stripe test-mode subscriptions."
  >
    <h2>1. Data you provide</h2>
    <p>When you sign in, Clerk supplies an account identifier and verified email address. We store the entities you follow, your email-Brief preference, and the time you last opened the Brief. We do not ask for profile details that the product does not need.</p>

    <h2>2. Billing data</h2>
    <p>Stripe receives checkout and payment-method information. Dअख़बार stores only the Stripe customer identifier and a subscription status such as free, active, canceled, or past due. We do not receive or store full card numbers, CVC values, or bank credentials. Current checkout is test mode and processes no real transaction.</p>

    <h2>3. Service and security data</h2>
    <p>The application and its providers may process ordinary request data such as timestamps, IP addresses, user-agent information, error logs, and webhook event identifiers. We use this information to operate, secure, diagnose, and prevent duplicate processing. Clerk uses essential session cookies or equivalent browser storage to keep readers signed in; Dअख़बार does not currently use advertising cookies or sell audiences.</p>

    <h2>4. Public source data</h2>
    <p>Story records contain public source metadata such as titles, URLs, authors shown by the source, publication timestamps, excerpts, and Open Graph metadata. This material supports attribution and the source-linked reading experience. It is separate from a reader’s account data.</p>

    <h2>5. How data is used</h2>
    <ul>
      <li>Authenticate readers and protect account-only routes.</li>
      <li>Save follows and select deterministic For You and Brief results.</li>
      <li>Enforce free and test-subscriber entitlements.</li>
      <li>Deliver subscribed email Briefs and honor unsubscribe requests.</li>
      <li>Verify Stripe webhooks, reconcile checkout, and prevent duplicate events.</li>
      <li>Maintain security, reliability, attribution, and source integrity.</li>
    </ul>

    <h2>6. Service providers</h2>
    <p>Clerk processes authentication data. Stripe processes checkout, payment, and Customer Portal data. Resend processes the recipient address and Brief content needed for email delivery. PostgreSQL stores application records and Redis coordinates queued jobs. These providers process data to supply their services under their own terms and privacy commitments.</p>

    <h2>7. Sharing and sale</h2>
    <p>We share data with service providers only as needed to run the product, respond to a lawful request, protect readers or the service, or complete a future business transfer subject to appropriate notice. We do not sell personal data, rent email addresses, or use reader data for third-party behavioral advertising.</p>

    <h2>8. Retention</h2>
    <p>Follows, preferences, and visit timestamps are retained while the account is used. Billing identifiers, subscription status, and processed webhook IDs may be retained as needed for billing integrity, security, dispute handling, and legal obligations. Logs are kept only for operationally reasonable periods. Public source records may remain in the searchable archive unless corrected or removed.</p>

    <h2>9. Email choices</h2>
    <p>Paid Brief emails include an unsubscribe link and one-click unsubscribe header. Unsubscribing disables email delivery without deleting the account or follows. Readers can continue using the in-app Brief.</p>

    <h2>10. Security and international processing</h2>
    <p>We use access controls, signed webhooks, idempotency records, encrypted provider connections, and secret isolation appropriate to the current service. No system can guarantee absolute security. Providers may process data in countries different from yours subject to their contractual and legal safeguards.</p>

    <h2>11. Your choices and rights</h2>
    <p>You can unfollow entities, unsubscribe from email, and manage Stripe test subscriptions through the product. Depending on applicable law, you may request access, correction, deletion, restriction, or a copy of personal data. Send requests to <a href="mailto:codecraftkavya@gmail.com">codecraftkavya@gmail.com</a> from the account email so ownership can be verified.</p>

    <h2>12. Children and policy changes</h2>
    <p>The service is intended for a general developer audience and is not directed to children under 13. Material policy changes will appear here with a revised effective date. Privacy questions may be sent to <a href="mailto:codecraftkavya@gmail.com">codecraftkavya@gmail.com</a>.</p>
  </LegalDocument>;
}
