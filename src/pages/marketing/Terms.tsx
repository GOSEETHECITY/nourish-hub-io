import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default function Terms() {
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
          <h1 className="text-4xl font-bold text-black mb-2">Terms of Service — Hariet.AI and GO See The City</h1>
          <p className="text-sm text-[#6d412a]/70 mb-8">
            <strong>Effective date:</strong> October 15, 2026
          </p>
          <div className="prose prose-sm max-w-none text-[#6d412a]/70 space-y-4">
            <p>
              These Terms of Service ("Terms") govern your use of the Hariet.AI platform and the GO See The City
              consumer app (together, the "Service"), operated by Hariet.AI ("we," "us," or "our"). By creating an
              account or using the Service, you agree to these Terms.
            </p>

            <h2 className="text-xl font-bold text-black">1. What the Service does</h2>
            <p>
              Hariet.AI is a food diversion marketplace. Venues list surplus food at discounted prices, consumers
              purchase it for pickup, and nonprofits claim donated food. GO See The City helps consumers discover
              grand openings, new businesses, and local events. Features may change over time as the Service evolves.
            </p>

            <h2 className="text-xl font-bold text-black">2. Accounts</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                You must be at least 18 years old (or the age of majority in your state) to create an account and
                make purchases.
              </li>
              <li>
                You are responsible for keeping your login credentials confidential and for all activity under your
                account.
              </li>
              <li>
                One account per person or organization. Team or multi-user accounts for an organization must be
                authorized by that organization.
              </li>
              <li>We may suspend or terminate accounts that violate these Terms or misuse the Service.</li>
            </ul>

            <h2 className="text-xl font-bold text-black">3. Orders, payments, and pickups</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Pricing.</strong> Prices are set by the venue. Taxes and fees are shown at checkout.
              </li>
              <li>
                <strong>Checkout hold.</strong> When you begin checkout, your items are reserved for 5 minutes while
                you complete payment. A countdown timer is shown. If payment is not completed in time, the
                reservation expires and the items are released back for others. Nothing is charged for an expired
                reservation.
              </li>
              <li>
                <strong>Late payments.</strong> If your payment completes after the reservation expired, we will
                restore your order if the items are still available. If they are gone, you will be refunded in full
                automatically.
              </li>
              <li>
                <strong>Pickup.</strong> You must pick up your order within the venue's stated pickup window. Missed
                pickups are not refunded unless the venue failed to have your order ready.
              </li>
              <li>
                <strong>Refunds.</strong> If a venue cancels your order or cannot fulfill it, you will be refunded.
                Refunds are issued to the original payment method and may take several business days to appear.
              </li>
              <li>
                <strong>Payments</strong> are processed by Stripe and subject to Stripe's terms. We do not store full
                card numbers.
              </li>
            </ul>

            <h2 className="text-xl font-bold text-black">4. Rules for venues</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Listings must be accurate: food type, quantity, pickup window, and price.</li>
              <li>
                Food must be safe, properly stored, and handled in compliance with all applicable health and food
                safety laws. You are solely responsible for the safety and quality of the food you list.
              </li>
              <li>You must honor confirmed orders during the stated pickup window.</li>
              <li>
                Payouts are issued through Stripe to your connected account, less our platform fee, taxes, and
                refunds.
              </li>
            </ul>

            <h2 className="text-xl font-bold text-black">5. Rules for nonprofits</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Donation claims must be truthful, and claimed food must be picked up within the stated window.
              </li>
              <li>
                Food received through the Service must be used for charitable purposes consistent with your mission.
              </li>
              <li>
                Tax receipts, where offered, are issued based on the information you and the donor venue provide.
                Consult your own tax advisor.
              </li>
            </ul>

            <h2 className="text-xl font-bold text-black">6. Grand openings and event information</h2>
            <p>
              Event listings, including grand openings, are provided for discovery purposes. Dates, locations, and
              details are supplied by organizers or third-party sources and may change. We are not responsible for
              the accuracy of event information or for events that are cancelled or rescheduled. Third-party services
              mentioned in the app, such as ride providers, are independent companies with their own terms.
            </p>

            <h2 className="text-xl font-bold text-black">7. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any unlawful purpose or in violation of any law.</li>
              <li>Misrepresent your identity, organization, or eligibility.</li>
              <li>Attempt to manipulate inventory, pricing, payments, or the referral program.</li>
              <li>
                Interfere with the Service's operation, probe its security, or access data you are not authorized to
                see.
              </li>
              <li>Post content that is false, misleading, infringing, or harmful.</li>
            </ul>

            <h2 className="text-xl font-bold text-black">8. Intellectual property</h2>
            <p>
              The Service, including its design, text, graphics, and software, is owned by Hariet.AI and protected by
              intellectual property laws. You may not copy, modify, or distribute any part of the Service without our
              written permission. By submitting content such as listing photos or reviews, you grant us a license to
              use it in operating the Service.
            </p>

            <h2 className="text-xl font-bold text-black">9. Disclaimers</h2>
            <p>
              The Service is provided "as is" and "as available." We do not guarantee that listings will always be
              available, that the Service will be uninterrupted or error-free, or that event information is complete
              or accurate. Venues are solely responsible for the food they sell; we are a marketplace, not the seller
              or preparer of the food.
            </p>

            <h2 className="text-xl font-bold text-black">10. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, Hariet.AI will not be liable for indirect, incidental,
              consequential, or punitive damages arising from your use of the Service. Our total liability for any
              claim will not exceed the greater of $100 or the amounts you paid us in the 12 months before the claim.
            </p>

            <h2 className="text-xl font-bold text-black">11. Disputes</h2>
            <p>
              If you have a problem, contact us first at{" "}
              <a href="mailto:support@hariet.ai" className="text-[#6d412a] font-semibold hover:underline">
                support@hariet.ai
              </a>{" "}
              so we can try to resolve it. Any dispute that cannot be resolved informally will be handled under the
              laws of the State of Oklahoma, and you agree to exclusive jurisdiction of the state and federal courts
              located in Tulsa County, Oklahoma, unless applicable law requires otherwise.
            </p>

            <h2 className="text-xl font-bold text-black">12. Changes to these Terms</h2>
            <p>
              We may update these Terms from time to time. We will post the new version with a new effective date,
              and for material changes we will notify you through the Service or by email. Continuing to use the
              Service after changes take effect means you accept the new Terms.
            </p>

            <h2 className="text-xl font-bold text-black">13. Contact us</h2>
            <p>
              Questions about these Terms:{" "}
              <a href="mailto:support@hariet.ai" className="text-[#6d412a] font-semibold hover:underline">
                support@hariet.ai
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
