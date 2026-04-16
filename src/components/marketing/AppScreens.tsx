// Real GO See The City app screenshots rendered inside phone frames
function Phone({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-[2.5rem] bg-black p-1.5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] ${className}`}
    >
      <div className="rounded-[2.2rem] bg-white overflow-hidden relative aspect-[9/19] w-[180px] sm:w-[210px]">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover object-top"
          loading="lazy"
        />
      </div>
    </div>
  );
}

export default function AppScreens() {
  return (
    <div className="relative w-full">
      <div className="absolute -inset-8 bg-gradient-to-br from-[#fb9014]/20 to-[#92c216]/20 rounded-3xl blur-3xl" />
      <div className="relative flex items-end justify-center gap-3 sm:gap-5">
        <Phone
          src="/app/menu.png"
          alt="GO See The City menu screen"
          className="translate-y-6 rotate-[-4deg] hidden sm:block"
        />
        <Phone
          src="/app/restaurants.png"
          alt="GO See The City restaurants screen"
          className="z-10"
        />
        <Phone
          src="/app/events.png"
          alt="GO See The City events screen"
          className="translate-y-6 rotate-[4deg]"
        />
      </div>
    </div>
  );
}
