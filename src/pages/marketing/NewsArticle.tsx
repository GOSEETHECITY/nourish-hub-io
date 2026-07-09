import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, Clock, Copy, Linkedin, Twitter, Check } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { ArticleBody } from "@/components/marketing/ArticleBody";
import {
  CATEGORY_LABELS,
  formatArticleDate,
  getArticleBySlug,
  getRelatedArticles,
  type NewsArticle,
} from "@/lib/news";

function ShareButtons({ article }: { article: NewsArticle }) {
  const url = `https://hariet.ai/news/${article.slug}`;
  const encoded = encodeURIComponent(url);
  const title = encodeURIComponent(article.title);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const btn =
    "inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#ede5dc] text-sm font-semibold text-[#3a2617] hover:border-black hover:bg-white transition";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-bold text-black/50 uppercase tracking-widest mr-1">
        Share
      </span>
      <a
        className={btn}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on LinkedIn"
      >
        <Linkedin className="w-4 h-4" /> LinkedIn
      </a>
      <a
        className={btn}
        href={`https://twitter.com/intent/tweet?url=${encoded}&text=${title}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on X"
      >
        <Twitter className="w-4 h-4" /> X
      </a>
      <button type="button" onClick={copy} className={btn} aria-label="Copy link">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

export default function NewsArticle() {
  const { slug = "" } = useParams();
  const article = getArticleBySlug(slug);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  if (!article) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Helmet>
          <title>Article not found | HarietAI News</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <MarketingNav variant="light" />
        <main className="flex-1 flex items-center justify-center px-4 py-24">
          <div className="text-center max-w-md">
            <div className="text-sm font-semibold text-black/50 uppercase tracking-widest mb-4">
              404
            </div>
            <h1 className="text-3xl font-bold text-black mb-4">Article not found</h1>
            <p className="text-[#6d412a]/70 mb-8">
              The article you are looking for was moved or does not exist.
            </p>
            <Link
              to="/news"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-black text-white font-bold hover:bg-[#222] transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back to News
            </Link>
          </div>
        </main>
        <MarketingFooter />
      </div>
    );
  }

  const related = getRelatedArticles(article, 3);
  const url = `https://hariet.ai/news/${article.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    image: article.cover_image_url,
    datePublished: article.published_date,
    author: { "@type": "Organization", name: article.author },
    publisher: {
      "@type": "Organization",
      name: "HarietAI",
      logo: {
        "@type": "ImageObject",
        url: "https://hariet.ai/hariet-logo.svg",
      },
    },
    mainEntityOfPage: url,
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>{`${article.title} | HarietAI News`}</title>
        <meta name="description" content={article.excerpt} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.excerpt} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={article.cover_image_url} />
        <meta property="article:published_time" content={article.published_date} />
        <meta property="article:section" content={CATEGORY_LABELS[article.category]} />
        <meta property="article:author" content={article.author} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.excerpt} />
        <meta name="twitter:image" content={article.cover_image_url} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <MarketingNav variant="light" />

      <main className="flex-1">
        <article>
          {/* Header */}
          <header className="bg-white border-b border-[#ede5dc]">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
              <Link
                to="/news"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#6d412a] hover:text-black transition mb-8"
              >
                <ArrowLeft className="w-4 h-4" /> Back to News
              </Link>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-xs font-bold text-[#6d412a] uppercase tracking-widest">
                  {CATEGORY_LABELS[article.category]}
                </span>
                <span className="w-1 h-1 rounded-full bg-black/30" />
                <span className="text-xs font-semibold text-black/50 uppercase tracking-wider">
                  {formatArticleDate(article.published_date)}
                </span>
                <span className="w-1 h-1 rounded-full bg-black/30" />
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/50 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" /> {article.read_time_minutes} min read
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-black tracking-tight leading-tight mb-6">
                {article.title}
              </h1>
              <div className="text-sm font-semibold text-[#6d412a]/80">
                By {article.author}
              </div>
            </div>
          </header>

          {/* Cover */}
          <div className="bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
              <img
                src={article.cover_image_url}
                alt={article.cover_image_alt}
                className="w-full aspect-[16/9] object-cover rounded-2xl border border-[#ede5dc]"
              />
            </div>
          </div>

          {/* Body */}
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <ArticleBody source={article.body} />

            <div className="mt-14 pt-8 border-t border-[#ede5dc]">
              <ShareButtons article={article} />
            </div>
          </div>
        </article>

        {/* Related */}
        {related.length > 0 && (
          <section className="bg-white border-t border-[#ede5dc] py-16">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="text-sm font-semibold text-black/50 uppercase tracking-widest mb-2">
                    More from HarietAI
                  </div>
                  <h2 className="text-3xl font-bold text-black tracking-tight">
                    Related articles
                  </h2>
                </div>
                <Link
                  to="/news"
                  className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-black hover:underline underline-offset-4 decoration-2"
                >
                  All news <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    to={`/news/${r.slug}`}
                    className="group flex flex-col bg-white rounded-2xl border border-[#ede5dc] overflow-hidden hover:border-black hover:shadow-xl transition-all"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#fdf8f4]">
                      <img
                        src={r.cover_image_url}
                        alt={r.cover_image_alt}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[11px] font-bold text-[#6d412a] uppercase tracking-widest">
                          {CATEGORY_LABELS[r.category]}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-black/30" />
                        <span className="text-xs font-semibold text-black/50 uppercase tracking-wider">
                          {formatArticleDate(r.published_date)}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-black leading-snug group-hover:underline underline-offset-4 decoration-2">
                        {r.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <MarketingFooter />
    </div>
  );
}
