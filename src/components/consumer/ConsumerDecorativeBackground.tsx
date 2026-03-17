const ConsumerDecorativeBackground = () => (
  <>
    {/* Top-left orange blob */}
    <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[#F97316] opacity-20 blur-2xl pointer-events-none" />
    {/* Top-right green blob */}
    <div className="absolute -top-6 -right-8 w-32 h-32 rounded-full bg-[#8DC63F] opacity-20 blur-2xl pointer-events-none" />
    {/* Bottom-left navy blob */}
    <div className="absolute -bottom-8 -left-6 w-36 h-36 rounded-full bg-[#1B2A4A] opacity-15 blur-2xl pointer-events-none" />
    {/* Bottom-right orange blob */}
    <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-[#F97316] opacity-15 blur-2xl pointer-events-none" />
  </>
);

export default ConsumerDecorativeBackground;
