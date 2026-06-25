import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

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
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
          <ShieldCheck className="w-10 h-10 text-[#F97316] mx-auto mb-3" />
          <p className="font-semibold text-[#1B2A4A] mb-1">Payments coming soon</p>
          <p className="text-sm text-gray-500">
            Card payments will be handled through our PCI-compliant processor.
            We never store raw card numbers in the app.
          </p>
        </div>
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
