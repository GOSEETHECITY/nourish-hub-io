import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Menu, X, ArrowRight } from "lucide-react";

const C = {
  green: "#2D5016",
  greenAccent: "#4A7C1F",
  cream: "#F5F0E8",
  navy: "#1B2A4A",
  navyLight: "#243558",
  red: "#B22222",
  gold: "#C9A84C",
  dark: "#1A1A1A",
  muted: "#5A5A5A",
  white: "#FFFFFF",
};

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };
const sans = { fontFamily: "'Inter', system-ui, sans-serif" };

// --- Hooks ---
function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const o = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          o.disconnect();
        }
      },
      { threshold }
    );
    o.observe(ref.current);
    return () => o.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function Reveal({ children, delay = 0, as: As = "div", style, ...rest }: any) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <As
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 700ms ease ${delay}ms, transform 700ms ease ${delay}ms`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </As>
  );
}

function Counter({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    const dur = 1600;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setN(Math.floor(value * (0.5 - Math.cos(Math.PI * p) / 2)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value]);
  return (
    <span ref={ref}>
      {prefix}
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}

// --- Reusable bits ---
const Eyebrow = ({ children, color = C.gold }: any) => (
  <div
    style={{
      ...sans,
      color,
      fontSize: 12,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      fontWeight: 600,
    }}
  >
    {children}
  </div>
);

const GoldBtn = ({ href, children, full = false }: any) => (
  <a
    href={href}
    target={href?.startsWith("http") ? "_blank" : undefined}
    rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    style={{
      ...sans,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      background: C.gold,
      color: C.dark,
      padding: "14px 26px",
      borderRadius: 999,
      fontWeight: 700,
      textDecoration: "none",
      transition: "transform .2s ease, filter .2s ease",
      width: full ? "100%" : "auto",
    }}
    onMouseEnter={(e) => ((e.currentTarget.style.filter = "brightness(.92)"), (e.currentTarget.style.transform = "translateY(-2px)"))}
    onMouseLeave={(e) => ((e.currentTarget.style.filter = "none"), (e.currentTarget.style.transform = "none"))}
  >
    {children}
  </a>
);

const OutlineBtn = ({ href, children, color = C.white }: any) => (
  <a
    href={href}
    target={href?.startsWith("http") ? "_blank" : undefined}
    rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    style={{
      ...sans,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      background: "transparent",
      color,
      padding: "13px 26px",
      borderRadius: 999,
      fontWeight: 600,
      textDecoration: "none",
      border: `2px solid ${color}`,
      transition: "background .2s ease",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
  >
    {children}
  </a>
);

const CaptionCard = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Caption copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — please copy manually");
    }
  };
  return (
    <div
      style={{
        background: C.cream,
        borderRadius: 14,
        padding: 24,
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        position: "relative",
        transition: "transform .2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
    >
      <p style={{ ...sans, color: C.dark, fontSize: 15, lineHeight: 1.6, margin: 0, paddingRight: 36 }}>{text}</p>
      <button
        onClick={copy}
        aria-label="Copy caption"
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: C.gold,
          color: C.dark,
          border: "none",
          borderRadius: 8,
          padding: "6px 10px",
          ...sans,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
};

// --- Page ---
export default function FeedItOnward() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.title = "Feed It Onward — Go See The City × Hariet.AI × U.S. EPA Freedom 250";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Go See The City and Hariet.AI are proud partners in the U.S. EPA's Freedom 250 Feed It Onward Campaign — redirecting surplus food from landfills to families, veterans, and neighbors.");
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = [
    { label: "Our Story", href: "#story" },
    { label: "How It Works", href: "#how" },
    { label: "The Platforms", href: "#platforms" },
    { label: "Get Involved", href: "#get-involved" },
  ];

  return (
    <div style={{ ...sans, background: C.white, color: C.dark, scrollBehavior: "smooth" }}>
      <style>{`
        html { scroll-behavior: smooth; }
        .fio-grid-2 { display: grid; grid-template-columns: 1fr; gap: 32px; }
        .fio-grid-3 { display: grid; grid-template-columns: 1fr; gap: 24px; }
        .fio-grid-4 { display: grid; grid-template-columns: 1fr; gap: 20px; }
        .fio-nav-links { display: none; }
        .fio-plus { display: none; }
        .fio-split { display: grid; grid-template-columns: 1fr; }
        @media (min-width: 768px) {
          .fio-grid-2 { grid-template-columns: 1fr 1fr; gap: 40px; }
          .fio-grid-3 { grid-template-columns: repeat(3, 1fr); }
          .fio-grid-4 { grid-template-columns: 1fr 1fr; }
          .fio-nav-links { display: flex; gap: 28px; align-items: center; }
          .fio-burger { display: none !important; }
          .fio-split { grid-template-columns: 1fr 1fr; }
          .fio-plus { display: flex; }
          .fio-h1 { font-size: 64px !important; }
          .fio-h2 { font-size: 40px !important; }
          .fio-h-emotional { font-size: 52px !important; }
        }
      `}</style>

      {/* NAV */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: C.white,
          boxShadow: scrolled ? "0 4px 18px rgba(0,0,0,0.08)" : "none",
          transition: "box-shadow .2s ease",
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <a href="#top" style={{ ...serif, color: C.green, fontWeight: 800, fontSize: 22, textDecoration: "none" }}>
            Go See The City
          </a>
          <nav className="fio-nav-links">
            {nav.map((n) => (
              <a key={n.href} href={n.href} style={{ ...sans, color: C.dark, textDecoration: "none", fontSize: 15, fontWeight: 500 }}>
                {n.label}
              </a>
            ))}
            <div
              style={{
                ...sans,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: C.cream,
                color: C.navy,
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${C.gold}`,
              }}
            >
              🇺🇸 Proud Feed It Onward Partner
            </div>
          </nav>
          <button
            className="fio-burger"
            aria-label="Menu"
            onClick={() => setMenuOpen((v) => !v)}
            style={{ background: "transparent", border: "none", color: C.dark, cursor: "pointer", padding: 6 }}
          >
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
        <div
          style={{
            maxHeight: menuOpen ? 400 : 0,
            overflow: "hidden",
            transition: "max-height .3s ease",
            background: C.white,
            borderTop: menuOpen ? `1px solid ${C.cream}` : "none",
          }}
        >
          <div style={{ padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setMenuOpen(false)}
                style={{ ...sans, color: C.dark, textDecoration: "none", fontSize: 16, fontWeight: 500 }}
              >
                {n.label}
              </a>
            ))}
            <div style={{ ...sans, fontSize: 11, fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              🇺🇸 Proud Feed It Onward Partner
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section
        id="top"
        style={{
          background: `radial-gradient(ellipse at top, ${C.navyLight} 0%, ${C.navy} 60%)`,
          color: C.white,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            opacity: 0.5,
            mixBlendMode: "overlay",
          }}
        />
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "100px 20px 0", position: "relative", textAlign: "center" }}>
          <Reveal>
            <Eyebrow>Go See The City × Hariet.AI × U.S. EPA Freedom 250</Eyebrow>
          </Reveal>
          <Reveal delay={120}>
            <h1
              className="fio-h1"
              style={{
                ...serif,
                fontSize: 40,
                lineHeight: 1.08,
                margin: "22px auto 22px",
                fontWeight: 700,
                maxWidth: 940,
              }}
            >
              No Meal Left Behind.
              <br />
              No Story Left Untold.
              <br />
              No Community Overlooked.
            </h1>
          </Reveal>
          <Reveal delay={240}>
            <p style={{ ...sans, color: C.cream, fontSize: 18, lineHeight: 1.6, maxWidth: 620, margin: "0 auto 36px" }}>
              Go See The City and Hariet.AI are proud partners in the U.S. EPA's Freedom 250 Feed It Onward Campaign — a national movement to redirect surplus food from landfills to the families, veterans, and neighbors who need it most.
            </p>
          </Reveal>
          <Reveal delay={360}>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 80 }}>
              <GoldBtn href="https://hariet.ai/get-started">
                Join the Movement <ArrowRight size={18} />
              </GoldBtn>
              <OutlineBtn href="#story">Learn Our Story ↓</OutlineBtn>
            </div>
          </Reveal>
        </div>

        {/* Stat strip */}
        <div style={{ background: C.navyLight, position: "relative" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
            <div className="fio-grid-3">
              {[
                { icon: "🗑️", n: 1, suf: " in 3", label: "Meals worth of food wasted in the U.S. annually" },
                { icon: "💸", n: 3000, pre: "~$", label: "Lost per family of four each year to food waste" },
                { icon: "🌱", n: 1, pre: "#", label: "Food is the single largest landfill material in America" },
              ].map((s, i) => (
                <Reveal key={i} delay={i * 120}>
                  <div
                    style={{
                      background: C.cream,
                      color: C.dark,
                      borderTop: `4px solid ${C.gold}`,
                      borderRadius: "4px 4px 10px 10px",
                      padding: "22px 22px 18px",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: 26, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ ...serif, fontSize: 32, fontWeight: 700, color: C.navy, lineHeight: 1 }}>
                      <Counter value={s.n} prefix={s.pre || ""} suffix={s.suf || ""} />
                    </div>
                    <div style={{ ...sans, fontSize: 14, color: C.dark, marginTop: 8, lineHeight: 1.45 }}>{s.label}</div>
                    <div style={{ ...sans, fontSize: 11, color: C.muted, marginTop: 10, letterSpacing: "0.04em" }}>Source: EPA 2025 Report</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. SPIRIT BEHIND THE NAME */}
      <section id="story" style={{ background: C.white, padding: "100px 20px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div className="fio-grid-2">
            <Reveal>
              <Eyebrow>The Story Behind the Name</Eyebrow>
              <h2 className="fio-h2" style={{ ...serif, color: C.green, fontSize: 34, lineHeight: 1.15, margin: "16px 0 28px", fontWeight: 700 }}>
                She Never Lost a Passenger.
                <br />
                We Won't Lose a Meal.
              </h2>
              <div style={{ ...sans, color: C.dark, fontSize: 17, lineHeight: 1.75, display: "flex", flexDirection: "column", gap: 18 }}>
                <p>
                  Harriet Tubman didn't just dream of freedom — she engineered it. Through the Underground Railroad, she built a network of safe houses, trusted partners, and seamless handoffs that guided hundreds of people to safety. She operated through ingenuity, courage, and the willingness of ordinary people — farmers, business owners, community members — to open their doors and share what they had.
                </p>
                <p>
                  Hariet.AI carries that name — and that mission — into today's food system. The platform is a modern Underground Railroad for surplus food: a technology-powered network of restaurants, stadiums, hotels, healthcare operators, and nonprofits working together to ensure that what goes unsold doesn't go to waste. It goes to someone's table. No food abandoned. No community left behind.
                </p>
                <p>
                  Go See The City extends that network one step further — creating same-day coupons that give customers a reason to walk through the door before closing time, turning surplus into sales and saving food before it ever needs to be donated. Commerce and compassion, working in tandem.
                </p>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div
                style={{
                  background: C.green,
                  color: C.cream,
                  borderLeft: `6px solid ${C.gold}`,
                  padding: 40,
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minHeight: 360,
                }}
              >
                <div style={{ ...serif, fontStyle: "italic", color: C.cream, fontSize: 26, lineHeight: 1.4 }}>
                  "I never ran my train off the track and I never lost a passenger."
                </div>
                <div style={{ ...sans, color: C.gold, fontSize: 14, marginTop: 18, fontWeight: 600 }}>— Harriet Tubman</div>
                <div style={{ width: 40, height: 1, background: C.gold, margin: "26px 0" }} />
                <div style={{ ...sans, fontSize: 14, color: C.cream, opacity: 0.85, lineHeight: 1.6 }}>
                  Hariet.AI honors her legacy by making sure no meal — and no community — is ever left behind.
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 4. PROBLEM */}
      <section style={{ background: C.cream, padding: "100px 20px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <Eyebrow color={C.navy}>Why This Matters</Eyebrow>
            <h2 className="fio-h2" style={{ ...serif, color: C.dark, fontSize: 32, fontWeight: 700, margin: "16px auto 22px", maxWidth: 820 }}>
              America Wastes Too Much. Together, We Can Change That.
            </h2>
            <p style={{ ...sans, color: C.dark, fontSize: 17, lineHeight: 1.7, maxWidth: 720, margin: "0 auto 50px" }}>
              In the United States, more than one-third of all food goes uneaten — and most of it ends up in landfills, making food the single largest component of landfill material in the country. This strains disposal systems, wastes resources, and costs families thousands of dollars a year. The solution isn't a new system — it's activating the one we already have.
            </p>
          </Reveal>
          <div className="fio-grid-3">
            {[
              { icon: "🗑️", n: 133, suf: " Billion lbs", label: "of food wasted in the U.S. each year" },
              { icon: "💸", n: 3000, pre: "$", suf: " / Year", label: "lost per family of four — roughly 11% of their food budget" },
              { icon: "🌱", n: 1, pre: "Landfill #", label: "Food is America's single largest landfill contributor — and the most preventable" },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 120}>
                <div
                  style={{
                    background: C.white,
                    borderRadius: 14,
                    padding: 32,
                    boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
                    textAlign: "left",
                    borderTop: `4px solid ${C.gold}`,
                    height: "100%",
                    transition: "transform .2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
                >
                  <div style={{ fontSize: 30, marginBottom: 10 }}>{s.icon}</div>
                  <div style={{ ...serif, fontSize: 30, color: C.green, fontWeight: 800, lineHeight: 1.1 }}>
                    <Counter value={s.n} prefix={s.pre || ""} suffix={s.suf || ""} />
                  </div>
                  <div style={{ ...sans, color: C.dark, fontSize: 15, marginTop: 12, lineHeight: 1.5 }}>{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5. TWO-PLATFORM SOLUTION */}
      <section id="platforms" style={{ background: C.white, padding: "100px 20px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <Eyebrow>Our Ecosystem</Eyebrow>
            <h2 className="fio-h2" style={{ ...serif, color: C.dark, fontSize: 32, fontWeight: 700, margin: "16px 0 50px" }}>
              Two Platforms. One Mission. Zero Waste.
            </h2>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 28, alignItems: "stretch" }} className="fio-platform-grid">
            <style>{`@media(min-width:900px){.fio-platform-grid{grid-template-columns:1fr auto 1fr !important;gap:24px !important}}`}</style>
            <Reveal>
              <PlatformCard
                bg={C.green}
                name="Go See The City"
                sub="The Commerce Layer"
                headline="Turn Closing Time Into Community Time"
                body="Go See The City drives foot traffic to local businesses by enabling them to create same-day coupons for surplus food — giving customers a reason to show up before closing and giving businesses a way to convert unsold inventory into revenue instead of waste."
                features={[
                  "Same-day surplus coupons published instantly",
                  "Drives real foot traffic to local businesses",
                  "Turns unsold food into revenue before it becomes waste",
                  "Supports nonprofits through community engagement",
                  "Works for restaurants, cafes, food trucks, grocers, and more",
                ]}
                ctaLabel="Visit goseethecity.com →"
                ctaHref="https://goseethecity.com"
              />
            </Reveal>
            <div className="fio-plus" style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 8px" }}>
              <div style={{ ...serif, color: C.gold, fontSize: 56, fontWeight: 800, lineHeight: 1 }}>+</div>
              <div style={{ ...sans, color: C.muted, fontSize: 12, marginTop: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                working together
              </div>
            </div>
            <Reveal delay={150}>
              <PlatformCard
                bg={C.navy}
                name="Hariet.AI"
                sub="The Operating System"
                headline="One Dashboard. Every Meal. Nothing Wasted."
                body="Hariet.AI is the operating system for food businesses that want to eliminate waste entirely. Stadiums, restaurants, hotels, and healthcare operators use one unified dashboard to sell, donate, and track every meal that would otherwise be thrown away — connecting seamlessly with nonprofits in their own communities."
                features={[
                  "Unified dashboard: sell, donate, and track in one place",
                  "Nonprofit matching and pickup logistics managed for you",
                  "Real-time impact reports (pounds, meals, tax deductions)",
                  "Works for stadiums, hospitals, hotels, restaurants, schools, farms, and venues",
                  "Protected under the Bill Emerson Good Samaritan Food Donation Act",
                ]}
                ctaLabel="Visit hariet.ai →"
                ctaHref="https://hariet.ai"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 6. WHAT IS FEED IT ONWARD */}
      <section style={{ background: C.cream, padding: "100px 20px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <Reveal>
            <Eyebrow color={C.navy}>EPA's Freedom 250 Initiative</Eyebrow>
            <h2 className="fio-h2" style={{ ...serif, color: C.dark, fontSize: 32, fontWeight: 700, margin: "16px 0 22px", maxWidth: 760 }}>
              A National Movement Built on American Ingenuity
            </h2>
            <div style={{ ...sans, color: C.dark, fontSize: 17, lineHeight: 1.75, maxWidth: 760, display: "flex", flexDirection: "column", gap: 18, marginBottom: 50 }}>
              <p>
                Feed It Onward is the U.S. EPA's national storytelling and partnership initiative, launched as part of Freedom 250 — America's 250th birthday celebration. It shines a light on the farms, businesses, nonprofits, and communities already doing the work of keeping food in use and out of landfills — and amplifies their stories so others can follow.
              </p>
              <p>
                This isn't about new mandates or big spending. It's about celebrating what's already working. When something is broken or wasted, Americans fix it. When there's work to be done, we do it. Feed It Onward tells that story — and Go See The City and Hariet.AI are proud to be part of it.
              </p>
            </div>
          </Reveal>
          <div className="fio-grid-3">
            {[
              { icon: "🌾", title: "Highlight Success Stories", body: "Real-world examples from farms, grocers, food service providers, and waste operators showing what's already possible across America." },
              { icon: "🤝", title: "Connect Partners", body: "Building bridges between food businesses and the nonprofits already serving their neighborhoods — no new infrastructure required." },
              { icon: "📣", title: "Amplify Impact", body: "Dedicated partner features, short-form social content, and the \"Impact in Action\" newsletter making local success visible nationally." },
            ].map((t, i) => (
              <Reveal key={i} delay={i * 120}>
                <div
                  style={{
                    background: C.navy,
                    color: C.white,
                    borderTop: `4px solid ${C.gold}`,
                    padding: 28,
                    borderRadius: "4px 4px 12px 12px",
                    height: "100%",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{t.icon}</div>
                  <div style={{ ...serif, fontSize: 22, fontWeight: 700, marginBottom: 10 }}>{t.title}</div>
                  <div style={{ ...sans, fontSize: 15, lineHeight: 1.6, opacity: 0.92 }}>{t.body}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 7. HOW HARIET POWERS PIPELINE */}
      <section id="how" className="fio-split" style={{ minHeight: 520 }}>
        <div style={{ background: C.green, color: C.white, padding: "80px 36px", display: "flex", alignItems: "center" }}>
          <Reveal>
            <div style={{ maxWidth: 520 }}>
              <Eyebrow color={C.gold}>Powered by Hariet.AI</Eyebrow>
              <h2 style={{ ...serif, color: C.white, fontSize: 34, fontWeight: 700, margin: "16px 0 20px", lineHeight: 1.15 }}>
                The Technology Behind the Mission
              </h2>
              <p style={{ ...sans, fontSize: 16, lineHeight: 1.7, color: C.white, marginBottom: 18 }}>
                Hariet.AI handles the logistics so food businesses don't have to. From restaurants and hotels to food trucks, stadiums, grocery stores, farms, schools, and venues — if you have surplus food, Hariet.AI connects you with a nonprofit neighbor ready to receive it, tracks every pound, and generates the impact reports and tax documentation your business needs.
              </p>
              <p style={{ ...sans, fontSize: 13, color: C.cream, fontStyle: "italic", marginBottom: 24, opacity: 0.85 }}>
                Food donations are protected under the Bill Emerson Good Samaritan Food Donation Act.
              </p>
              <OutlineBtn href="https://hariet.ai/get-started">Get Started at Hariet.AI →</OutlineBtn>
              <div style={{ ...sans, fontSize: 14, color: C.cream, marginTop: 16, opacity: 0.9 }}>
                surplusgrocers@hariet.ai | 352-900-1505
              </div>
            </div>
          </Reveal>
        </div>
        <div style={{ background: C.cream, padding: "80px 36px", display: "flex", alignItems: "center" }}>
          <div className="fio-grid-4" style={{ width: "100%", maxWidth: 560 }}>
            {[
              { t: "Donate on Your Terms", b: "No required frequency. No minimum amount. Donate when it works for your operation." },
              { t: "We Handle Logistics", b: "Pickup coordination fully managed — no extra administrative burden on your team." },
              { t: "Tax Deduction Opportunities", b: "Maximize deductions on every donation your business makes, automatically documented." },
              { t: "Impact Reports", b: "Track pounds donated and meals supported in real time — shareable directly to your social channels." },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 100}>
                <div
                  style={{
                    background: C.white,
                    padding: 22,
                    borderRadius: 12,
                    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                    height: "100%",
                    transition: "transform .2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
                >
                  <div style={{ ...serif, fontSize: 18, fontWeight: 700, color: C.green, marginBottom: 8 }}>{f.t}</div>
                  <div style={{ ...sans, fontSize: 14, color: C.dark, lineHeight: 1.55 }}>{f.b}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 8. WHO HARIET SERVES */}
      <section style={{ background: C.white, padding: "100px 20px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <Eyebrow>Built for Every Food Business</Eyebrow>
            <h2 className="fio-h2" style={{ ...serif, color: C.dark, fontSize: 32, fontWeight: 700, margin: "16px 0 36px" }}>
              Whatever You Serve. Whatever Remains.
            </h2>
          </Reveal>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, maxWidth: 900, margin: "0 auto" }}>
            {[
              ["🍽️", "Restaurants"],
              ["🏨", "Hotels"],
              ["🚚", "Food Trucks"],
              ["🏫", "Schools"],
              ["🛒", "Grocery Stores"],
              ["🌾", "Farms"],
              ["🎪", "Venues"],
              ["🏟️", "Stadiums"],
              ["🏥", "Healthcare"],
            ].map(([icon, label], i) => (
              <Reveal key={label} delay={i * 60}>
                <div
                  style={{
                    background: C.cream,
                    color: C.green,
                    padding: "12px 20px",
                    borderRadius: 999,
                    ...sans,
                    fontWeight: 600,
                    fontSize: 15,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>{icon}</span> {label}
                </div>
              </Reveal>
            ))}
          </div>
          <p style={{ ...sans, color: C.muted, fontSize: 14, marginTop: 28 }}>
            If you serve food, Hariet.AI has a place for you in the network.
          </p>
        </div>
      </section>

      {/* 9. PARTNER SPOTLIGHTS */}
      <section style={{ background: C.cream, padding: "100px 20px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <Eyebrow color={C.navy}>Feed It Onward in Action</Eyebrow>
            <h2 className="fio-h2" style={{ ...serif, color: C.dark, fontSize: 32, fontWeight: 700, margin: "16px 0 50px" }}>
              Real Partners. Real Impact.
            </h2>
          </Reveal>
          <div className="fio-grid-3">
            {[
              { loc: "St. Clair County, Illinois", body: "Frey Farms delivered a truckload of fresh produce — otherwise destined for a landfill — to support military families at Scott Air Force Base. EPA Administrator Lee Zeldin announced Feed It Onward here as the program's inaugural event." },
              { loc: "Lincoln, Alabama", body: "At Talladega Superspeedway, NASCAR and Denali Water partnered to redirect leftover race food to people in need — proving that even the biggest events can give back to their communities." },
              { loc: "Kansas City, MO & Emporia, KS", body: "EPA Administrator toured Kanbe's Market and Pete's Garden to see firsthand how local partners are promoting sustainability and community well-being at the neighborhood level." },
            ].map((c, i) => (
              <Reveal key={i} delay={i * 120}>
                <div
                  style={{
                    background: C.white,
                    borderRadius: 14,
                    overflow: "hidden",
                    textAlign: "left",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform .2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
                >
                  <div style={{ background: C.navy, color: C.white, padding: "14px 20px", ...sans, fontWeight: 600, fontSize: 14 }}>
                    📍 {c.loc}
                  </div>
                  <div style={{ padding: 22, flex: 1, display: "flex", flexDirection: "column" }}>
                    <p style={{ ...sans, fontSize: 15, color: C.dark, lineHeight: 1.6, flex: 1 }}>{c.body}</p>
                    <div
                      style={{
                        alignSelf: "flex-end",
                        marginTop: 18,
                        ...sans,
                        fontSize: 12,
                        fontWeight: 700,
                        color: C.dark,
                        background: C.gold,
                        padding: "6px 12px",
                        borderRadius: 999,
                      }}
                    >
                      #FeedItOnward Partner
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 10. EMOTIONAL PEAK */}
      <section style={{ background: C.navy, color: C.white, padding: "120px 20px", textAlign: "center", position: "relative" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ width: 80, height: 2, background: C.gold, margin: "0 auto 36px" }} />
          <Reveal>
            <h2
              className="fio-h-emotional"
              style={{ ...serif, color: C.white, fontSize: 36, fontWeight: 700, lineHeight: 1.2, margin: 0 }}
            >
              The Underground Railroad Ran on Open Doors.
              <br />
              So Does This.
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <div style={{ ...sans, color: C.cream, fontSize: 18, lineHeight: 1.75, margin: "32px auto 0", maxWidth: 680, display: "flex", flexDirection: "column", gap: 18 }}>
              <p>
                Harriet Tubman's network didn't require a government program or a new bureaucracy. It required ordinary people — farmers, storekeepers, neighbors — who said yes. Who opened their doors. Who trusted that what they gave would carry someone forward to freedom.
              </p>
              <p>
                Today, Go See The City and Hariet.AI are asking food businesses across America to say yes again. Open your doors before closing time. Share your surplus. Trust that the network will carry it forward — to a veteran's family at a nearby base, to a school cafeteria running low, to a neighbor who needs it tonight.
              </p>
              <p>
                This is what American leadership looks like in its 250th year.
                <br />
                <span style={{ color: C.gold, fontWeight: 600 }}>This is Feed It Onward.</span>
              </p>
            </div>
          </Reveal>
          <Reveal delay={300}>
            <blockquote style={{ ...serif, color: C.gold, fontStyle: "italic", fontSize: 26, lineHeight: 1.5, maxWidth: 560, margin: "60px auto 16px" }}>
              "Every great dream begins with a dreamer. Always remember, you have within you the strength, the patience, and the passion."
            </blockquote>
            <div style={{ ...sans, color: C.white, fontSize: 14, marginBottom: 36 }}>— Harriet Tubman</div>
          </Reveal>
          <div style={{ width: 80, height: 2, background: C.gold, margin: "0 auto" }} />
        </div>
      </section>

      {/* 11. GET INVOLVED */}
      <section id="get-involved" style={{ background: C.cream, padding: "100px 20px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <Eyebrow>Take Action</Eyebrow>
            <h2 className="fio-h2" style={{ ...serif, color: C.dark, fontSize: 32, fontWeight: 700, margin: "16px 0 44px" }}>
              Ready to Feed More and Waste Less?
            </h2>
          </Reveal>
          <div className="fio-grid-2">
            <Reveal>
              <div style={{ background: C.green, color: C.white, padding: 40, borderRadius: 16, textAlign: "left", height: "100%", display: "flex", flexDirection: "column" }}>
                <h3 style={{ ...serif, fontSize: 26, fontWeight: 700, marginBottom: 14 }}>Turn Surplus Into Impact</h3>
                <p style={{ ...sans, fontSize: 16, lineHeight: 1.65, marginBottom: 18 }}>
                  Whether you run a restaurant, stadium, hotel, grocery store, school, or healthcare facility — Hariet.AI connects you with nonprofits in your own community and handles everything else. No required minimums. No extra overhead. Just impact.
                </p>
                <div style={{ ...sans, fontSize: 14, lineHeight: 1.9, marginBottom: 22, opacity: 0.95 }}>
                  📧 surplusgrocers@hariet.ai<br />
                  📞 352-900-1505<br />
                  🌐 www.Hariet.AI
                </div>
                <div style={{ marginTop: "auto" }}>
                  <GoldBtn href="https://hariet.ai/get-started" full>
                    Get Started at Hariet.AI →
                  </GoldBtn>
                </div>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div style={{ background: C.navy, color: C.white, padding: 40, borderRadius: 16, textAlign: "left", height: "100%", display: "flex", flexDirection: "column" }}>
                <h3 style={{ ...serif, fontSize: 26, fontWeight: 700, marginBottom: 14 }}>
                  Shop Surplus. Save Money. Feed Your City.
                </h3>
                <p style={{ ...sans, fontSize: 16, lineHeight: 1.65, marginBottom: 22 }}>
                  Go See The City makes it easy to find same-day deals on surplus food from businesses in your neighborhood — saving you money while keeping good food out of the landfill. Every coupon redeemed is a meal saved and a local business supported.
                </p>
                <div style={{ marginTop: "auto" }}>
                  <GoldBtn href="https://goseethecity.com" full>
                    Find Deals at GoSeeTheCity.com →
                  </GoldBtn>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 12. SOCIAL SHARE */}
      <section style={{ background: C.white, padding: "100px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <Eyebrow>Spread the Word</Eyebrow>
            <h2 style={{ ...serif, color: C.dark, fontSize: 32, fontWeight: 700, margin: "16px 0 12px" }}>Share the Mission</h2>
            <p style={{ ...sans, color: C.muted, fontSize: 16, margin: "0 auto 44px", maxWidth: 580 }}>
              Use these ready-made captions to amplify Feed It Onward on your channels.
            </p>
          </Reveal>
          <div className="fio-grid-2" style={{ textAlign: "left" }}>
            {[
              "Every day, we make sure good food feeds people, not landfills. Proud to join @EPA's #FeedItOnward with @GoSeeTheCity and @HarietAI — celebrating American ingenuity, responsibility, and community.",
              "No meal should go to waste. That's why we're part of @EPA's #FeedItOnward. Together, every pound counts. #Freedom250 #GoSeeTheCity",
              "She never lost a passenger. @HarietAI won't lose a meal. Proud partners in @EPA's #FeedItOnward — carrying freedom forward, one plate at a time. #Freedom250",
              "Food is too valuable to waste. @GoSeeTheCity same-day coupons + @HarietAI donation network = zero waste, real impact. Join us. #FeedItOnward #Freedom250",
              "Good food. Good neighbors. No waste. @GoSeeTheCity and @HarietAI are proud EPA #FeedItOnward partners — celebrating America's 250th by making sure every meal counts.",
            ].map((t, i) => (
              <Reveal key={i} delay={i * 80}>
                <CaptionCard text={t} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: C.green, color: C.white }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "60px 20px 40px" }}>
          <div className="fio-grid-3" style={{ gap: 36 }}>
            <div>
              <div style={{ ...serif, color: C.white, fontWeight: 800, fontSize: 22, marginBottom: 10 }}>Go See The City</div>
              <p style={{ ...sans, color: C.cream, fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
                Connecting People to the Places That Feed Their Cities
              </p>
              <a href="https://goseethecity.com" target="_blank" rel="noopener noreferrer" style={{ ...sans, color: C.gold, fontSize: 14, textDecoration: "none" }}>
                goseethecity.com
              </a>
            </div>
            <div>
              <div style={{ ...serif, color: C.white, fontWeight: 800, fontSize: 22, marginBottom: 10 }}>Hariet.AI</div>
              <p style={{ ...sans, color: C.cream, fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>No Waste. Just Food.</p>
              <div style={{ ...sans, fontSize: 14, lineHeight: 1.9 }}>
                <a href="https://hariet.ai" target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: "none", display: "block" }}>
                  hariet.ai
                </a>
                <a href="https://hariet.ai/get-started" target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: "none", display: "block" }}>
                  hariet.ai/get-started
                </a>
                <span style={{ color: C.cream, display: "block", marginTop: 6 }}>surplusgrocers@hariet.ai</span>
                <span style={{ color: C.cream, display: "block" }}>352-900-1505</span>
              </div>
            </div>
            <div>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: C.white,
                  color: C.green,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  marginBottom: 12,
                }}
              >
                🍴
              </div>
              <div style={{ ...sans, color: C.white, fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
                Proud EPA Freedom 250 Partner
              </div>
              <div style={{ ...sans, color: C.gold, fontSize: 14, fontWeight: 600 }}>
                #FeedItOnward #Freedom250
              </div>
            </div>
          </div>
        </div>
        <div style={{ background: "#234011", borderTop: `1px solid ${C.gold}`, padding: "18px 20px" }}>
          <p style={{ ...sans, color: C.cream, fontSize: 12, textAlign: "center", margin: 0, lineHeight: 1.6, maxWidth: 920, marginLeft: "auto", marginRight: "auto" }}>
            Food donations facilitated through Hariet.AI are protected under the Bill Emerson Good Samaritan Food Donation Act. Go See The City and Hariet.AI are proud partners in the U.S. EPA's Freedom 250 Feed It Onward Campaign.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PlatformCard({ bg, name, sub, headline, body, features, ctaLabel, ctaHref }: any) {
  return (
    <div
      style={{
        background: bg,
        color: C.white,
        borderRadius: 20,
        padding: 44,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        textAlign: "left",
        transition: "transform .2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
    >
      <div style={{ ...serif, color: C.white, fontSize: 26, fontWeight: 800, marginBottom: 18 }}>{name}</div>
      <div style={{ ...sans, color: C.gold, fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>
        {sub}
      </div>
      <div style={{ ...serif, color: C.white, fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>{headline}</div>
      <p style={{ ...sans, fontSize: 16, color: C.white, lineHeight: 1.7, marginBottom: 22, opacity: 0.96 }}>{body}</p>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 26px", display: "flex", flexDirection: "column", gap: 10 }}>
        {features.map((f: string, i: number) => (
          <li key={i} style={{ ...sans, color: C.white, fontSize: 15, lineHeight: 1.5, display: "flex", gap: 10 }}>
            <span style={{ color: C.gold, fontWeight: 800 }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: "auto" }}>
        <GoldBtn href={ctaHref}>{ctaLabel}</GoldBtn>
      </div>
    </div>
  );
}
