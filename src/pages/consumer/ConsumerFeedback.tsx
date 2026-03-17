import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const ConsumerFeedback = () => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = () => { setSent(true); setFeedback(""); };

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Feedback</h1>
      </header>
      <div className="px-6 pb-8">
        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={6} placeholder="Tell us what you think..."
          className="w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316] resize-none" />
        {sent && <p className="text-[#8DC63F] text-sm mt-2">Thank you for your feedback!</p>}
        <button onClick={handleSubmit} disabled={!feedback.trim()}
          className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] disabled:opacity-50 transition-colors mt-4">
          Submit
        </button>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerFeedback;
