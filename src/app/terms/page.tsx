import Link from 'next/link';
import { LegalDocument } from '@/components/legal-document';

export default function TermsPage() {
  return <LegalDocument
    title="Terms of Service"
    effective="21 September 2026"
    intro="These Terms explain the current Dअख़बार service, including source attribution, reader accounts, and the Stripe test subscription flow."
  >
    <h2>1. The service</h2>
    <p>Dअख़बार indexes, organizes, and links to developer-ecosystem reporting and public discussion. It does not host or claim ownership of third-party reporting. Headlines, short excerpts, metadata, and links remain attributable to their original sources. Follow the source links to read the complete work. Our <Link href="/methodology">Methodology</Link> explains deterministic sourcing, grouping, and ranking.</p>

    <h2>2. Accounts and eligibility</h2>
    <p>You may browse the public edition without an account. Clerk-authenticated accounts are required for Following, the Brief, and billing controls. You are responsible for activity through your account and for maintaining access to its verified email address. Do not share access in a way that compromises another person or the service.</p>

    <h2>3. Acceptable use</h2>
    <p>Do not probe or bypass access controls, interfere with ingestion or queues, submit malicious requests, abuse source links, or use the service in a way that violates applicable law or another party’s rights. Automated access must respect published limits and source terms.</p>

    <h2>4. Source material and attribution</h2>
    <p>Third-party publishers retain their rights in their reporting and media. Inclusion does not imply endorsement or a commercial relationship. Dअख़बार may correct attribution, remove metadata, or disable a link when a source or rights holder raises a supported concern.</p>

    <h2>5. Desk subscription in test mode</h2>
    <p>Desk currently represents two implemented capabilities: unlimited entity Following and a deterministic morning Brief delivered by email. The displayed price is USD $5 per month, but the present checkout is Stripe test mode. No real charge is processed and test subscriptions have no cash value.</p>

    <h2>6. Cancellation and refunds</h2>
    <p>Test subscriptions can be managed or canceled through Stripe’s hosted Customer Portal. Because no real payment is collected in test mode, there is no refund policy for the current service. Billing-cycle, cancellation, and refund terms for any future live paid service will be published and presented before live billing is enabled.</p>

    <h2>7. Email Briefs</h2>
    <p>Active test subscribers can receive the morning Brief at their verified account email. Every Brief includes an unsubscribe mechanism. Unsubscribing stops email delivery while leaving the account, follows, and in-app Brief available.</p>

    <h2>8. Availability</h2>
    <p>The service is under active development. Sources, clusters, rankings, emails, and features may change, pause, or be removed. We work to preserve attribution and deterministic behavior, but do not guarantee uninterrupted availability or that every source record is complete or error-free.</p>

    <h2>9. Disclaimers and responsibility</h2>
    <p>Dअख़बार provides an index and reading aid, not professional, legal, financial, or investment advice. Readers should assess claims in the linked original reporting. To the extent permitted by applicable law, the service is provided as available and liability is limited to loss directly caused by a failure that cannot lawfully be excluded.</p>

    <h2>10. Changes and contact</h2>
    <p>Material changes will be reflected by a new effective date on this page. Rights holders may report attribution, excerpt, or removal concerns to <a href="mailto:codecraftkavya@gmail.com">codecraftkavya@gmail.com</a>; include the affected URL and enough information to evaluate the request.</p>
  </LegalDocument>;
}
