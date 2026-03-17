import { ReactNode } from "react";

const ConsumerMobileLayout = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`max-w-[430px] mx-auto min-h-screen bg-white relative ${className}`}>
    {children}
  </div>
);

export default ConsumerMobileLayout;
