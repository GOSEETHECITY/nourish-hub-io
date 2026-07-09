import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Search, Newspaper } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { supabase } from "@/integrations/supabase/client";
import { externalPressReleases } from "@/lib/pressReleases";

type Article = {
  id: string;
  title: string;
  slug: string;
  category: "press_release" | "product_update" | "partnership" | "company_news" | "milestone";
  excerpt: string;
  cover_image_url: string | null;
  author: string;
  published_date: string;
  is_featured: boolean;
};

type Tab = "all" | "press" | "product_update" | "partnership" | "company_news" | "milestone";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "press", label: "Press" },
  { key: "product_update", label: "Updates" },
  { key: "partnership", label: "Partnerships" },
  { key: "company_news", label: "Company News" },
  { key: "milestone", label: "Milestones" },
];

const CATEGORY_LABEL: Record<Article["category"], string> = {
  press_release: "Press Release",
  product_update: "Product Update",
  partnership: "Partnership",
  company_news: "Company News",
  milestone: "Milestone",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const PAGE_SIZE = 6;

export default function News() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    document.title = "News | Hariet.AI";
    const desc = "Updates, press coverage, and announcements from Hariet.AI and Go See The City.";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("articles")
        .select("id,title,slug,category,excerpt,cover_image_url,author,published_date,is_featured")
        .eq("status", "published")
        .order("published_date", { ascending: false });
      setArticles((data ?? []) as Article[]);
      setLoading(false);
    })();
  }, []);

  const featured = useMemo(
    () => articles.find((a) => a.is_featured) ?? articles[0],
    [articles],
  );

  const filtered = useMemo(() => {
    const rest = articles.filter((a) => a.id !== featured?.id);
    let list = rest;
    if (tab === "press") list = [];
    else if (tab !== "all") list = rest.filter((a) => a.category === tab);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (a) => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q),
      );
    }
    return list;
  }, [articles, featured, tab, query]);

  const pressList = useMemo(() => {
    if (!query.trim()) return externalPressReleases;
    const q = query.toLowerCase();
    return externalPressReleases.filter(
      (p) => p.title.toLowerCase().includes(q) || p.outlet.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => setVisible(PAGE_SIZE), [tab, query]);

  const showFeatured = tab === "all" && !query.trim() && featured;
  const showPress = tab === "all" || tab === "press";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingNav variant="light" />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-white border-b border-[#ede5dc]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
            <div className="text-sm font-semibold text-black/50 uppercase tracking-widest mb-4">
              Newsroom
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black tracking-tight leading-[1.05] mb-5">
              News
            </h1>
            <p className="text-lg text-[#6d412a]/70 max-w-2xl leading-relaxed">
              Updates, press coverage, and announcements from Hariet.AI and Go See The City.
            </p>
          </div>
        </section>

        {/* Filter & search */}
        <section className="bg-white border-b border-[#ede5dc] sticky top-16 z-30 backdrop-blur-md bg-white/90">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition border ${
                      active
                        ? "bg-black text-white border-black"
                        : "bg-white text-black border-[#e8e0d8] hover:border-black"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className="relative md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search news..."
                className="w-full pl-9 pr-3 py-2 rounded-full border border-[#e8e0d8] bg-white text-sm text-black focus:outline-none focus:border-black transition"
              />
            </div>
          </div>
        </section>

        {/* Featured */}
        {showFeatured && (
          <section className="bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
              <Link
                to={`/news/${featured.slug}`}
                className="group grid grid-cols-1 lg:grid-cols-2 gap-8 rounded-3xl border border-[#ede5dc] overflow-hidden hover:border-black hover:shadow-xl transition-all"
              >
                <div className="aspect-[16/10] lg:aspect-auto bg-[#fdf8f4] overflow-hidden">
                  {featured.cover_image_url ? (
                    <img
                      src={featured.cover_image_url}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Newspaper className="w-16 h-16 text-[#6d412a]/30" />
                    </div>
                  )}
                </div>
                <div className="p-8 lg:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-xs font-bold uppercase tracking-widest text-white bg-[#6d412a] px-3 py-1 rounded-full">
                      Featured
                    </span>
                    <span className="text-xs font-semibold text-black/50 uppercase tracking-wider">
                      {CATEGORY_LABEL[featured.category]}
                    </span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-black tracking-tight leading-tight mb-4 group-hover:underline underline-offset-4 decoration-2">
                    {featured.title}
                  </h2>
                  <p className="text-lg text-[#6d412a]/70 leading-relaxed mb-6">
                    {featured.excerpt}
                  </p>
                  <div className="text-sm text-black/60">
                    {featured.author} · {formatDate(featured.published_date)}
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* Grid */}
        <section className="bg-white py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading && (
              <p className="text-center text-black/50 py-12">Loading news...</p>
            )}

            {!loading && tab !== "press" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.slice(0, visible).map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            )}

            {!loading && tab !== "press" && filtered.length > visible && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="px-8 py-3 rounded-xl border border-[#6d412a]/25 text-[#6d412a] font-semibold hover:bg-[#6d412a]/5 transition"
                >
                  Load more
                </button>
              </div>
            )}

            {!loading && tab !== "press" && filtered.length === 0 && (
              <p className="text-center text-black/50 py-12">
                No articles match your search yet.
              </p>
            )}

            {/* Press tab shows external outlet coverage */}
            {!loading && showPress && (
              <div className={tab === "press" ? "" : "mt-16"}>
                {tab === "all" && (
                  <div className="mb-6 flex items-baseline justify-between">
                    <h3 className="text-2xl font-bold text-black">In the Press</h3>
                    <button
                      onClick={() => setTab("press")}
                      className="text-sm font-semibold text-[#6d412a] hover:underline"
                    >
                      View all press
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {pressList.map((release) => (
                    <PressCard key={release.url} release={release} />
                  ))}
                </div>
                {tab === "press" && pressList.length === 0 && (
                  <p className="text-center text-black/50 py-12">
                    No press coverage matches your search.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-white border-t border-[#ede5dc]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-black mb-3">
                Get Hariet.AI news and updates
              </h2>
              <p className="text-[#6d412a]/70 leading-relaxed">
                Occasional press releases, product updates, and milestones from the
                network built by Go See The City.
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = (e.currentTarget.elements.namedItem("email") as HTMLInputElement);
                if (input?.value) {
                  window.location.href = `mailto:Hello@Hariet.AI?subject=Subscribe%20to%20news&body=Please%20add%20${encodeURIComponent(input.value)}%20to%20the%20newsletter.`;
                }
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                name="email"
                type="email"
                required
                placeholder="you@company.com"
                className="flex-1 px-4 py-3 rounded-xl border border-[#e8e0d8] bg-white text-black focus:outline-none focus:border-black transition"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-black text-white font-bold hover:bg-[#222] transition"
              >
                Subscribe <ArrowRight className="w-4 h-4" />
              </button>
            </form>
            <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 pt-4 border-t border-[#ede5dc]">
              <Link
                to="/get-started"
                className="inline-flex items-center gap-2 text-sm font-semibold text-black hover:underline"
              >
                Request a demo <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://hariet.ai/app/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#6d412a] hover:underline"
              >
                Powered by Go See The City <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      to={`/news/${article.slug}`}
      className="group flex flex-col bg-white rounded-2xl border border-[#ede5dc] overflow-hidden hover:border-black hover:shadow-xl transition-all"
    >
      <div className="aspect-[16/10] overflow-hidden bg-[#fdf8f4]">
        {article.cover_image_url ? (
          <img
            src={article.cover_image_url}
            alt={article.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Newspaper className="w-12 h-12 text-[#6d412a]/30" />
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold text-[#6d412a] uppercase tracking-widest">
            {CATEGORY_LABEL[article.category]}
          </span>
        </div>
        <h3 className="text-xl font-bold text-black leading-snug mb-3 group-hover:underline underline-offset-4 decoration-2">
          {article.title}
        </h3>
        <p className="text-sm text-[#6d412a]/70 leading-relaxed line-clamp-2 mb-5">
          {article.excerpt}
        </p>
        <div className="mt-auto flex items-center justify-between text-xs text-black/50">
          <span>{formatDate(article.published_date)}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-black group-hover:gap-2 transition-all">
            Read more <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function PressCard({ release }: { release: (typeof externalPressReleases)[number] }) {
  const [errored, setErrored] = useState(false);
  return (
    <a
      href={release.url}
      target="_blank"
      rel="noreferrer"
      className="group block bg-white rounded-2xl border border-[#ede5dc] overflow-hidden hover:border-black hover:shadow-xl transition-all"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-black/5">
        {errored ? (
          <div className={`w-full h-full bg-gradient-to-br ${release.accent} flex items-center justify-center`}>
            <Newspaper className="w-12 h-12 text-white/40" strokeWidth={1.5} />
            <div className="absolute bottom-4 left-4 text-white font-bold uppercase tracking-widest text-xs">
              {release.outlet}
            </div>
          </div>
        ) : (
          <img
            src={release.screenshot}
            alt={`${release.outlet}: ${release.title}`}
            loading="lazy"
            onError={() => setErrored(true)}
            className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-500"
          />
        )}
        <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white border border-black/10 flex items-center justify-center group-hover:bg-black group-hover:border-black transition">
          <ArrowUpRight className="w-4 h-4 text-black group-hover:text-white transition" />
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-bold text-black uppercase tracking-widest">
            {release.outlet}
          </span>
          <span className="w-1 h-1 rounded-full bg-black/30" />
          <span className="text-xs font-semibold text-black/50 uppercase tracking-wider">
            {release.category}
          </span>
        </div>
        <h3 className="text-lg font-bold text-black leading-snug group-hover:underline underline-offset-4 decoration-2">
          {release.title}
        </h3>
      </div>
    </a>
  );
}
