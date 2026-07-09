import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Copy, Linkedin, Twitter, Check } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { supabase } from "@/integrations/supabase/client";

type Article = {
  id: string;
  title: string;
  slug: string;
  category: "press_release" | "product_update" | "partnership" | "company_news" | "milestone";
  excerpt: string;
  body: string;
  cover_image_url: string | null;
  author: string;
  published_date: string;
};

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
    month: "long",
    day: "numeric",
  });
}

function readTime(body: string) {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

// Tiny markdown renderer: ## h2, ### h3, - bullet, **bold**, [text](url).
function renderMarkdown(md: string) {
  const lines = md.split(/\r?\n/);
  const out: JSX.Element[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="list-disc pl-6 my-4 space-y-2 text-[#6d412a]/85">
          {list.map((li, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(li) }} />
          ))}
        </ul>,
      );
      list = [];
    }
  };
  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="underline underline-offset-2 text-black" target="_blank" rel="noreferrer">$1</a>',
      );

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (line.startsWith("### ")) {
      flush();
      out.push(
        <h3 key={i} className="text-xl font-bold text-black mt-8 mb-3">
          {line.slice(4)}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      flush();
      out.push(
        <h2 key={i} className="text-2xl font-bold text-black mt-10 mb-4">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith("> ")) {
      flush();
      out.push(
        <blockquote key={i} className="border-l-4 border-[#6d412a] pl-4 italic text-[#6d412a]/80 my-6">
          {line.slice(2)}
        </blockquote>,
      );
    } else if (line.startsWith("- ")) {
      list.push(line.slice(2));
    } else if (line.trim() === "") {
      flush();
    } else {
      flush();
      out.push(
        <p
          key={i}
          className="text-lg text-[#6d412a]/85 leading-relaxed my-4"
          dangerouslySetInnerHTML={{ __html: inline(line) }}
        />,
      );
    }
  });
  flush();
  return out;
}

export default function NewsArticle() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    (async () => {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setArticle(data as Article);
      const { data: rel } = await supabase
        .from("articles")
        .select("id,title,slug,category,excerpt,body,cover_image_url,author,published_date")
        .eq("status", "published")
        .eq("category", (data as Article).category)
        .neq("id", (data as Article).id)
        .order("published_date", { ascending: false })
        .limit(3);
      setRelated((rel ?? []) as Article[]);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (!article) return;
    document.title = `${article.title} | Hariet.AI News`;
    const setMeta = (attr: "name" | "property", key: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
    };
    const url = `https://hariet.ai/news/${article.slug}`;
    setMeta("name", "description", article.excerpt);
    setMeta("property", "og:title", article.title);
    setMeta("property", "og:description", article.excerpt);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", "article");
    if (article.cover_image_url) setMeta("property", "og:image", article.cover_image_url);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", article.title);
    setMeta("name", "twitter:description", article.excerpt);
    if (article.cover_image_url) setMeta("name", "twitter:image", article.cover_image_url);

    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = url;
  }, [article]);

  const shareUrl = useMemo(
    () => (article ? `https://hariet.ai/news/${article.slug}` : ""),
    [article],
  );

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <MarketingNav variant="light" />
        <main className="flex-1 flex items-center justify-center text-black/50">Loading...</main>
        <MarketingFooter />
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <MarketingNav variant="light" />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
          <h1 className="text-3xl font-bold text-black">Article not found</h1>
          <Link to="/news" className="text-[#6d412a] font-semibold hover:underline">
            Back to News
          </Link>
        </main>
        <MarketingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingNav variant="light" />

      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          <Link
            to="/news"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#6d412a] hover:underline mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back to News
          </Link>

          <div className="text-xs font-bold text-[#6d412a] uppercase tracking-widest mb-4">
            {CATEGORY_LABEL[article.category]}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-black tracking-tight leading-[1.1] mb-6">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-black/60 mb-10">
            <span className="font-semibold text-black">{article.author}</span>
            <span>·</span>
            <span>{formatDate(article.published_date)}</span>
            <span>·</span>
            <span>{readTime(article.body)} min read</span>
          </div>

          {article.cover_image_url && (
            <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-[#fdf8f4] mb-10">
              <img
                src={article.cover_image_url}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="prose-body">{renderMarkdown(article.body)}</div>

          {/* Share */}
          <div className="mt-12 pt-8 border-t border-[#ede5dc] flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-black/60 mr-2">Share</span>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#e8e0d8] text-sm font-semibold text-black hover:border-black transition"
            >
              <Linkedin className="w-4 h-4" /> LinkedIn
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#e8e0d8] text-sm font-semibold text-black hover:border-black transition"
            >
              <Twitter className="w-4 h-4" /> X
            </a>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#e8e0d8] text-sm font-semibold text-black hover:border-black transition"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </article>

        {related.length > 0 && (
          <section className="bg-white border-t border-[#ede5dc] py-16">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-black mb-8">Related articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    to={`/news/${r.slug}`}
                    className="group flex flex-col bg-white rounded-2xl border border-[#ede5dc] overflow-hidden hover:border-black hover:shadow-xl transition-all"
                  >
                    {r.cover_image_url && (
                      <div className="aspect-[16/10] overflow-hidden bg-[#fdf8f4]">
                        <img
                          src={r.cover_image_url}
                          alt={r.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-1">
                      <div className="text-xs font-bold text-[#6d412a] uppercase tracking-widest mb-2">
                        {CATEGORY_LABEL[r.category]}
                      </div>
                      <h3 className="text-lg font-bold text-black leading-snug mb-2 group-hover:underline underline-offset-4 decoration-2">
                        {r.title}
                      </h3>
                      <p className="text-sm text-[#6d412a]/70 leading-relaxed line-clamp-2 mb-4">
                        {r.excerpt}
                      </p>
                      <div className="mt-auto text-xs text-black/50 flex items-center justify-between">
                        <span>{formatDate(r.published_date)}</span>
                        <ArrowRight className="w-4 h-4 text-black" />
                      </div>
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
