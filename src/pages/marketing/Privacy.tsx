import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingNav variant="light" />

      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[#6d412a]/70 hover:text-[#6d412a] transition mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-4xl font-bold text-black mb-2">Privacy Policy — Hariet.AI and GO See The City</h1>
          <p className="text-sm text-[#6d412a]/70 mb-8">
            <strong>Effective date:</strong> October 15, 2026
          </p>
          <div className="prose prose-sm max-w-none text-[#6d412a]/70 space-y-4">
            <p>
              Hariet.AI ("we," "us," or "our") operates the Hariet.AI platform and the GO See The City consumer app
              (together, the "Service"). This Privacy Policy explains what information we collect, how we use it, and
              the choices you have. By using the Service, you agree to this policy.
            </p>

            <h2 className="text-xl font-bold text-black">1. Information we collect</h2>
            <p>
              <strong>Account information.</strong> When you create an account, we collect your name, email address,
              phone number, and password. Venues, nonprofits, and government organizations also provide business
              details such as business name, address, contact information, tax identification numbers, and
              verification documents.
            </p>
            <p>
              <strong>Order and transaction information.</strong> When you place an order, we collect order details,
              pickup information, and payment metadata. Payments are processed by Stripe. We never see or store your
              full card number; Stripe handles that under its own privacy policy.
            </p>
            <p>
              <strong>Location information.</strong> With your permission, we use your device location to show nearby
              food listings, grand openings, and events. You can turn location access off in your device settings,
              though some features may work less well.
            </p>
            <p>
              <strong>Usage and device information.</strong> We collect information about how you use the Service,
              such as pages viewed, listings claimed, device type, and push notification tokens so we can send you
              alerts you asked for.
            </p>
            <p>
              <strong>Business and donation records.</strong> Venues provide listing details, pickup windows, and
              pricing. Nonprofits provide donation claims and pickup confirmations. These records are used to operate
              the marketplace and to generate aggregate impact reports.
            </p>

            <h2 className="text-xl font-bold text-black">2. How we use your information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Operate the marketplace:</strong> list surplus food, process orders and payments, coordinate
                pickups, and manage donations.
              </li>
              <li>
                <strong>Send transactional messages:</strong> order confirmations, pickup reminders, and account
                notices by email, SMS, or push.
              </li>
              <li>
                <strong>Show relevant content:</strong> nearby listings, grand openings, and events based on your
                location and preferences.
              </li>
              <li>
                <strong>Keep the Service safe:</strong> prevent fraud, enforce our Terms, and protect the integrity
                of inventory and payments.
              </li>
              <li>
                <strong>Improve the Service:</strong> understand usage patterns and fix problems.
              </li>
              <li>
                <strong>Meet legal obligations:</strong> tax reporting, record keeping, and responding to lawful
                requests.
              </li>
            </ul>

            <h2 className="text-xl font-bold text-black">3. How we share your information</h2>
            <p>We do not sell your personal information.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Service providers.</strong> Stripe processes payments. We also use hosting, messaging, and
                analytics providers who handle data only on our instructions.
              </li>
              <li>
                <strong>Transaction counterparties.</strong> When you order from a venue or claim a donation as a
                nonprofit, the other party receives the information needed to fulfill the transaction, such as your
                name and pickup details.
              </li>
              <li>
                <strong>Government and impact partners.</strong> Government organizations receive aggregate,
                non-identifying impact statistics for their jurisdiction (for example, total meals diverted). They do
                not receive your personal details beyond what is needed for program administration.
              </li>
              <li>
                <strong>Legal requirements.</strong> We may disclose information if required by law or to protect the
                rights, safety, or property of our users and the public.
              </li>
              <li>
                <strong>Business transfers.</strong> If Hariet.AI is acquired or merged, your information may
                transfer as part of that transaction, and this policy will continue to apply.
              </li>
            </ul>

            <h2 className="text-xl font-bold text-black">4. Your choices and rights</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Access and correction.</strong> You can view and update your account information in your
                settings.
              </li>
              <li>
                <strong>Deletion.</strong> You can request deletion of your account and personal data by contacting
                us at the address below. Some records (such as transaction history) may be retained as required by
                law.
              </li>
              <li>
                <strong>Marketing messages.</strong> You can opt out of promotional messages at any time;
                transactional messages about your orders cannot be disabled while your account is active.
              </li>
              <li>
                <strong>Location.</strong> You can disable location access in your device settings.
              </li>
            </ul>

            <h2 className="text-xl font-bold text-black">5. Data retention</h2>
            <p>
              We keep your information for as long as your account is active and as needed to operate the Service,
              comply with legal obligations, resolve disputes, and enforce agreements. Transaction records are
              retained for at least seven years for tax and accounting purposes.
            </p>

            <h2 className="text-xl font-bold text-black">6. Security</h2>
            <p>
              We use administrative, technical, and physical safeguards to protect your information, including
              encrypted connections, access controls, and secure payment processing through Stripe. No system is
              completely secure, and we cannot guarantee absolute security.
            </p>

            <h2 className="text-xl font-bold text-black">7. Children's privacy</h2>
            <p>
              The Service is not directed to children under 13, and we do not knowingly collect their personal
              information. If you believe a child has provided us with personal information, contact us and we will
              delete it.
            </p>

            <h2 className="text-xl font-bold text-black">8. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. We will post the new version with a new effective date,
              and for material changes we will notify you through the Service or by email.
            </p>

            <h2 className="text-xl font-bold text-black">9. Contact us</h2>
            <p>
              Questions about this policy or your data:{" "}
              <a href="mailto:privacy@hariet.ai" className="text-[#6d412a] font-semibold hover:underline">
                privacy@hariet.ai
              </a>
            </p>

            <p className="italic text-[#6d412a]/60 pt-4">
              <em>This is a draft prepared for review. Have it reviewed by a licensed attorney before publishing.</em>
            </p>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
