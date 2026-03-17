import { Bell } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const ConsumerNotifications = () => {
  const navigate = useNavigate();

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Notifications</h1>
      </header>
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Bell className="w-16 h-16 text-gray-300" />
        <p className="text-gray-400">No notifications yet</p>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerNotifications;
