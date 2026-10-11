import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import CheckoutCountdown from "@/components/consumer/CheckoutCountdown";

// Payments are not yet wired to a PCI-compliant processor.
// Collecting raw PAN / CCV in HTML inputs is a PCI DSS violation, so this
// screen is intentionally a placeholder until Stripe Elements (or another
// hosted tokenization solution) is integrated.
const ConsumerAddPayment = () => {
  const navigate = useNavigate();

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="w-6 h-6 text-[#1B2A4A]" />
        </button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Add Payment</h1>
      </header>
      <div className="px-6 pb-8">
        <CheckoutCountdown />
        <div aria-disabled="true" className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center opacity-60 grayscale pointer-events-none select-none">
          <ShieldCheck className="w-10 h-10 text-[#F97316] mx-auto mb-3" />
          <p className="font-semibold text-[#1B2A4A] mb-1">Payments coming soon</p>
          <p className="text-sm text-gray-500">
            Card payments will be handled through our PCI-compliant processor.
            We never store raw card numbers in the app.
          </p>
          <div className="mt-4 space-y-2 text-left">
            <input disabled placeholder="Card number" className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
            <button disabled className="w-full py-2 rounded-full bg-gray-300 text-gray-500 font-semibold cursor-not-allowed">Save payment method</button>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-3">Coming soon — adding a payment method isn't available yet.</p>
        <button
          onClick={() => navigate(-1)}
          className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] transition-colors mt-6"
        >
          Back to cart
        </button>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerAddPayment;
