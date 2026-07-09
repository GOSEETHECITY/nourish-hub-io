import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Search } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatArticleDate,
  getAllArticles,
  getFeaturedArticle,
  type NewsArticle,
  type NewsCategory,
} from "@/lib/news";

const PAGE_SIZE = 6;
type Filter = "all" | NewsCategory;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  ...CATEGORY_ORDER.map((c) => ({ key: c as Filter, label: CATEGORY_LABELS[c] })),
];

function CategoryTag({ category }: { category: NewsCategory }) {
  return (
    <span className="text-[11px] font-bold text-[#6d412a] uppercase tracking-widest">
      {CATEGORY_LABELS[category]}
    </span>
  );
}

function FeaturedCard({ article }: { article: NewsArticle }) {
  return (
    <Link
      to={`/news/${article.slug}`}
      className="group grid md:grid-cols-2 gap-8 bg-white rounded-2xl border border-[#ede5dc] overflow-hidden hover:border-black hover:shadow-xl transition-all"
    >
      <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden bg-[#fdf8f4]">
        <img
          src={article.cover_image_url}
          alt={article.cover_image_alt}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
        />
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur">
          <span className="text-[10px] font-bold text-[#6d412a] uppercase tracking-widest">
            Featured
          </span>
        </div>
      </div>
      <div className="p-8 md:p-10 flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-4">
          <CategoryTag category={article.category} />
          <span className="w-1 h-1 rounded-full bg-black/30" />
          <span className="text-xs font-semibold text-black/50 uppercase tracking-wider">
            {formatArticleDate(article.published_date)}
          </span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-black leading-tight tracking-tight mb-4 group-hover:underline underline-offset-4 decoration-2">
          {article.title}
        </h2>
        <p className="text-lg text-[#6d412a]/80 leading-relaxed mb-6">
          {article.excerpt}
        </p>
        <div className="text-sm font-bold text-black inline-flex items-center gap-2">
          Read more <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}

function ArticleCard({ article }: { article: NewsArticle }) {
  return (
    <Link
      to={`/news/${article.slug}`}
      className="group flex flex-col bg-white rounded-2xl border border-[#ede5dc] overflow-hidden hover:border-black hover:shadow-xl transition-all"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#fdf8f4]">
        <img
          src={article.cover_image_url}
          alt={article.cover_image_alt}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
        />
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-3">
          <CategoryTag category={article.category} />
          <span className="w-1 h-1 rounded-full bg-black/30" />
          <span className="text-xs font-semibold text-black/50 uppercase tracking-wider">
            {formatArticleDate(article.published_date)}
          </span>
        </div>
        <h3 className="text-xl font-bold text-black leading-snug mb-3 group-hover:underline underline-offset-4 decoration-2">
          {article.title}
        </h3>
        <p className="text-sm text-[#6d412a]/80 leading-relaxed mb-5 flex-1">
          {article.excerpt}
        </p>
        <div className="text-sm font-bold text-black inline-flex items-center gap-2">
          Read more <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}

export default function News() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const featured = getFeaturedArticle();
  const all = getAllArticles();

  const filtered = useMemo(() => {
    const list = all.filter((a) => a.id !== featured?.id);
    const byCategory = filter === "all" ? list : list.filter((a) => a.category === filter);
    const q = query.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        CATEGORY_LABELS[a.category].toLowerCase().includes(q),
    );
  }, [all, featured, filter, query]);

  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > shown.length;

  const onFilter = (next: Filter) => {
    setFilter(next);
    setVisible(PAGE_SIZE);
  };
  const onQuery = (value: string) => {
    setQuery(value);
    setVisible(PAGE_SIZE);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>News | HarietAI</title>
        <meta
          name="description"
          content="Press releases, product updates, partnership announcements, and company milestones from HarietAI and Go See The City."
        />
        <link rel="canonical" href="https://hariet.ai/news" />
        <meta property="og:title" content="News | HarietAI" />
        <meta
          property="og:description"
          content="Press releases, product updates, partnership announcements, and company milestones from HarietAI and Go See The City."
        />
        <meta property="og:url" content="https://hariet.ai/news" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="News | HarietAI" />
        <meta
          name="twitter:description"
          content="Press releases, product updates, partnership announcements, and company milestones from HarietAI and Go See The City."
        />
      </Helmet>

      <MarketingNav variant="light" />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-white border-b border-[#ede5dc]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-14">
            <div className="text-sm font-semibold text-black/50 uppercase tracking-widest mb-5">
              Newsroom
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-black tracking-tight leading-[1.05] mb-6 max-w-3xl">
              News
            </h1>
            <p className="text-xl text-[#6d412a]/80 leading-relaxed max-w-2xl">
              Updates, press coverage, and announcements from Hariet.AI and Go See The City.
            </p>
          </div>
        </section>

        {/* Featured */}
        {featured && (
          <section className="bg-white py-16 border-b border-[#ede5dc]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <FeaturedCard article={featured} />
            </div>
          </section>
        )}

        {/* Filter + search */}
        <section className="bg-white pt-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter articles by category">
                {FILTERS.map((f) => {
                  const active = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => onFilter(f.key)}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition border ${
                        active
                          ? "bg-black text-white border-black"
                          : "bg-white text-[#3a2617] border-[#ede5dc] hover:border-black"
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
              <div className="relative w-full lg:w-72">
                <Search className="w-4 h-4 text-[#6d412a]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <label htmlFor="news-search" className="sr-only">
                  Search news articles
                </label>
                <input
                  id="news-search"
                  type="search"
                  value={query}
                  onChange={(e) => onQuery(e.target.value)}
                  placeholder="Search news"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[#ede5dc] bg-white text-sm text-[#3a2617] placeholder:text-[#6d412a]/50 focus:outline-none focus:border-black transition"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="bg-white py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {shown.length === 0 ? (
              <div className="py-24 text-center text-[#6d412a]/70">
                No articles match that filter yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {shown.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}

            {hasMore && (
              <div className="mt-12 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="px-8 py-3 rounded-xl border border-[#6d412a]/25 text-[#6d412a] font-semibold hover:bg-[#6d412a]/5 transition"
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Newsletter / press CTA */}
        <section className="bg-[#1c0e07] text-white py-20 border-t border-[#ede5dc]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-bold text-white/60 uppercase tracking-widest mb-4">
                Stay in the loop
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Get HarietAI news and updates
              </h2>
              <p className="text-white/70 leading-relaxed">
                One short email a month, sent when we actually have something to share.
                Product ships, new partners, meaningful milestones.
              </p>
            </div>
            <form
              className="flex flex-col sm:flex-row gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const email = (form.elements.namedItem("email") as HTMLInputElement)?.value;
                if (!email) return;
                window.location.href = `mailto:Hello@Hariet.AI?subject=Subscribe%20to%20HarietAI%20news&body=Please%20add%20${encodeURIComponent(
                  email,
                )}%20to%20the%20HarietAI%20newsletter.`;
              }}
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                required
                placeholder="you@company.com"
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/50 focus:outline-none focus:border-white/50"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition"
              >
                Subscribe
              </button>
            </form>
          </div>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between border-t border-white/10 pt-8">
            <p className="text-sm text-white/60">
              GO See The City is the parent consumer platform powering HarietAI's marketplace.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/get-started"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6d412a] text-white font-bold hover:bg-[#5a3422] transition"
              >
                Request a demo <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/feed-it-onward"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 transition"
              >
                #FeedItOnward
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
