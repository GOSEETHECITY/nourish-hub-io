// News content model. Ships as a typed data module so the team can publish
// by adding an entry below and shipping — no dev-only tooling required.
// Wire to a `news_articles` table later without changing the UI: mirror this
// shape from Supabase and swap `getAllArticles`/`getArticleBySlug` for
// awaited fetches. Keep `is_featured` on at most one article at a time.

export type NewsCategory =
  | "press_release"
  | "product_update"
  | "partnership"
  | "company_news"
  | "milestone";

export type NewsStatus = "draft" | "published";

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  category: NewsCategory;
  excerpt: string;
  /** Markdown-ish body: `##` headings, blank-line paragraphs, `>` blockquotes, `-` bullets, and `**bold**`. */
  body: string;
  cover_image_url: string;
  cover_image_alt: string;
  author: string;
  published_date: string; // YYYY-MM-DD
  is_featured: boolean;
  status: NewsStatus;
  read_time_minutes: number;
}

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  press_release: "Press Release",
  product_update: "Product Update",
  partnership: "Partnership",
  company_news: "Company News",
  milestone: "Milestone",
};

export const CATEGORY_ORDER: NewsCategory[] = [
  "press_release",
  "product_update",
  "partnership",
  "company_news",
  "milestone",
];

const ARTICLES: NewsArticle[] = [
  {
    id: "a1",
    title: "HarietAI Launches Hospital Food Diversion Program with Regional Health Systems",
    slug: "hariet-ai-launches-hospital-food-diversion-program",
    category: "press_release",
    excerpt:
      "HarietAI's donate-only pathway is now live inside three regional health systems, routing surplus patient and cafeteria meals to vetted food banks the same day.",
    cover_image_url:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80",
    cover_image_alt: "Hospital cafeteria trays being packed for donation pickup.",
    author: "HarietAI Team",
    published_date: "2026-06-24",
    is_featured: true,
    status: "published",
    read_time_minutes: 4,
    body: `
## A quiet supply chain, made visible

Hospitals produce a predictable, high-quality surplus of edible meals every single day. Most of it goes to the landfill because the software to move it, document it, and prove it landed with a nonprofit does not exist inside their existing kitchen stack. HarietAI is changing that.

Today we are announcing three new regional health system partners running our donate-only pathway across seven campuses. Every eligible patient tray, unopened cafeteria pan, and pre-portioned meal is now logged, matched to a nearby nonprofit partner, and picked up the same day.

## Why hospitals, why now

Health systems face a rare alignment of pressure and opportunity:

- **ESG mandates** are asking for measurable Scope 3 reductions.
- **State-level organic waste bans** are extending from California and Vermont to more markets each year.
- **Community benefit reporting** rewards documented food recovery.

HarietAI turns each of those into a single workflow. The kitchen manager scans a tray. The system routes it. The nonprofit picks it up. Every meal is counted, and the tax and ESG paperwork writes itself.

> "In the first thirty days we diverted more than 4,200 meals that would have gone to the compactor. Every one of them fed a neighbor." — Director of Nutrition Services, partner hospital

## What comes next

We are onboarding two additional health systems this quarter and adding condition-of-food photo capture to the mobile scan flow. If you run food service inside a hospital, health plan, or long-term-care network, we would like to talk.
`.trim(),
  },
  {
    id: "a2",
    title: "GO See The City and Levy Restaurants Expand Stadium Recovery to Six New Venues",
    slug: "gsttc-levy-restaurants-stadium-recovery-expansion",
    category: "partnership",
    excerpt:
      "The stadium partnership that started at Paycom Center and Owen Field is expanding to six additional Levy-operated venues this season.",
    cover_image_url:
      "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1600&q=80",
    cover_image_alt: "Stadium seats before an evening event under warm lighting.",
    author: "HarietAI Team",
    published_date: "2026-06-10",
    is_featured: false,
    status: "published",
    read_time_minutes: 3,
    body: `
## From two venues to eight

What began with Oklahoma City Thunder and University of Oklahoma football is now a multi-venue partnership. Levy Restaurants and GO See The City are extending post-event surplus recovery to six additional stadiums and arenas this season.

Every venue will run the same operator workflow: back-of-house staff mark surplus pans as available at the end of an event, HarietAI matches to a nonprofit within the venue's radius, and pickup happens before the doors close on the loading dock.

## The number that matters

Across the pilot venues, the partnership diverted **more than 25,000 pounds** of prepared food in a single season. Every pound has a nonprofit recipient documented on it.

## Coming this fall

We will publish per-venue diversion dashboards inside the operator app, so kitchen leadership can compare event-to-event performance without a separate report.
`.trim(),
  },
  {
    id: "a3",
    title: "Product Update: One Dashboard for Sell, Donate, and Track",
    slug: "product-update-one-dashboard-sell-donate-track",
    category: "product_update",
    excerpt:
      "The unified operator dashboard is now live. Restaurants, hotels, stadiums, and hospitals can sell same-day surplus and route donations from a single view.",
    cover_image_url:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
    cover_image_alt: "Operator reviewing analytics on a laptop dashboard.",
    author: "HarietAI Product",
    published_date: "2026-05-28",
    is_featured: false,
    status: "published",
    read_time_minutes: 5,
    body: `
## One workflow, two pathways

Operators kept telling us the same thing: they did not want two systems, one to sell and one to donate. So we built one.

The updated HarietAI operator dashboard now shows:

- **Today's surplus** across every location, in pounds and in pans.
- **Sell pathway** for what can go to consumers through GO See The City.
- **Donate pathway** for what should route directly to nonprofit partners.
- **Impact ledger** with real-time CO2, water, and meal-equivalent tallies.

## Multi-location made simple

Chains and multi-unit operators can now switch between location views from the header, or roll everything up to org-wide totals in a single click. Permissions follow the existing organization → location hierarchy.

## What's next

Automated end-of-day reconciliation and per-location ESG exports are shipping next month.
`.trim(),
  },
  {
    id: "a4",
    title: "50,000 Meals Diverted: A Milestone With Room to Grow",
    slug: "50000-meals-diverted-milestone",
    category: "milestone",
    excerpt:
      "The HarietAI network has crossed 50,000 meals diverted from landfill. Here is the breakdown and where we go from here.",
    cover_image_url:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1600&q=80",
    cover_image_alt: "Fresh prepared meals ready for distribution.",
    author: "HarietAI Team",
    published_date: "2026-05-15",
    is_featured: false,
    status: "published",
    read_time_minutes: 2,
    body: `
## The number

**50,000 meals.** That is the running total moved from operator kitchens into the hands of nonprofits and consumers through the HarietAI platform.

## The breakdown

- **62%** routed through the donate pathway to food banks, shelters, and community fridges.
- **38%** recovered as revenue through the GO See The City consumer marketplace.
- **12 cities** currently active across the country.

## Why it matters

Every meal is a small proof that the surplus is not the problem. The lack of infrastructure to move it is. We are building that infrastructure, one operator at a time.
`.trim(),
  },
  {
    id: "a5",
    title: "HarietAI Joins the U.S. EPA #FeedItOnward Campaign",
    slug: "hariet-ai-joins-epa-feed-it-onward",
    category: "partnership",
    excerpt:
      "HarietAI and Go See The City are proud to join the U.S. EPA's Freedom 250 Feed It Onward campaign as a technology partner.",
    cover_image_url:
      "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1600&q=80",
    cover_image_alt: "Volunteers packing food boxes for community distribution.",
    author: "HarietAI Team",
    published_date: "2026-04-30",
    is_featured: false,
    status: "published",
    read_time_minutes: 3,
    body: `
## About the campaign

The U.S. EPA's **#FeedItOnward** initiative, part of the Freedom 250 program, is a nationwide push to cut food waste and get more edible surplus to the neighbors who need it.

## Our role

As a technology partner, HarietAI provides the operator-side infrastructure that participating venues use to log, route, and document surplus food recovery. Nonprofits receive verified pickups. Regulators receive audit-quality data.

Read more on our dedicated page at [/feed-it-onward](/feed-it-onward).
`.trim(),
  },
  {
    id: "a6",
    title: "Welcoming Our New Head of Nonprofit Partnerships",
    slug: "welcoming-head-of-nonprofit-partnerships",
    category: "company_news",
    excerpt:
      "We are growing the team responsible for standing up nonprofit networks in every new city HarietAI enters.",
    cover_image_url:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1600&q=80",
    cover_image_alt: "Team member smiling in a professional portrait.",
    author: "HarietAI Team",
    published_date: "2026-04-08",
    is_featured: false,
    status: "published",
    read_time_minutes: 2,
    body: `
## Why this role matters

Every new HarietAI city stands on a strong nonprofit network. The donate pathway only works when the receiving organizations are ready, trained, and integrated into our dispatch flow.

Our new Head of Nonprofit Partnerships will lead that work end-to-end: vetting partners, onboarding food banks and community fridges, and standing up the local network before venues go live.

## What's ahead

Expect us in three additional metros this year. If your organization serves food-insecure neighbors and would like to receive from local kitchens, reach out at [Hello@Hariet.AI](mailto:Hello@Hariet.AI).
`.trim(),
  },
];

export function getAllArticles(): NewsArticle[] {
  return ARTICLES
    .filter((a) => a.status === "published")
    .slice()
    .sort((a, b) => (a.published_date < b.published_date ? 1 : -1));
}

export function getArticleBySlug(slug: string): NewsArticle | undefined {
  return getAllArticles().find((a) => a.slug === slug);
}

export function getFeaturedArticle(): NewsArticle | undefined {
  const all = getAllArticles();
  return all.find((a) => a.is_featured) ?? all[0];
}

export function getRelatedArticles(article: NewsArticle, count = 3): NewsArticle[] {
  const others = getAllArticles().filter((a) => a.id !== article.id);
  const sameCategory = others.filter((a) => a.category === article.category);
  return [...sameCategory, ...others.filter((a) => !sameCategory.includes(a))].slice(0, count);
}

export function formatArticleDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
