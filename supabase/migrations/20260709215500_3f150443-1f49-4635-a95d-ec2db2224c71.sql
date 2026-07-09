
CREATE TYPE public.article_category AS ENUM ('press_release','product_update','partnership','company_news','milestone');
CREATE TYPE public.article_status AS ENUM ('draft','published');

CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category public.article_category NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  author TEXT NOT NULL DEFAULT 'Hariet.AI Team',
  published_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  status public.article_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.articles TO anon;
GRANT SELECT ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published articles"
  ON public.articles FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins manage articles"
  ON public.articles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.articles_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.articles_set_updated_at();

CREATE INDEX idx_articles_status_date ON public.articles (status, published_date DESC);
CREATE INDEX idx_articles_category ON public.articles (category);

INSERT INTO public.articles (title, slug, category, excerpt, body, cover_image_url, author, published_date, is_featured, status) VALUES
('Hariet.AI Launches Unified Food Diversion Operating System', 'hariet-ai-launches-unified-food-diversion-operating-system', 'press_release',
 'Go See The City unveils Hariet.AI, a single dashboard for stadiums, restaurants, hotels, and healthcare operators to sell, donate, and track surplus food.',
 E'## A single operating system for surplus food\n\nHariet.AI, built by Go See The City, today launched publicly as the first operating system that lets food operators sell, donate, and measure surplus food from one dashboard.\n\n## Why now\n\nRoughly 40% of food produced in the United States is wasted while one in six Americans faces food insecurity. Hariet.AI closes that gap with infrastructure operators actually use.\n\n## What it does\n\n- Donate pathway for stadiums, hospitals, and corporate cafeterias to route surplus to vetted nonprofits.\n- Sell plus Donate pathway for restaurants and hotels to recover revenue on same-day surplus through the GO See The City consumer marketplace.\n- ESG and tax reporting handled automatically.',
 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80', 'Hariet.AI Team', now() - interval '2 days', true, 'published'),
('Hariet.AI Partners with Levy Restaurants to Divert Stadium Surplus', 'hariet-ai-partners-with-levy-restaurants', 'partnership',
 'Levy Restaurants deploys Hariet.AI across Thunder and OU game days, routing leftover concessions to nonprofits within hours of the final whistle.',
 E'## Stadium food, redirected\n\nLevy Restaurants is deploying Hariet.AI across Oklahoma City Thunder and University of Oklahoma events. Post-game surplus now moves from concessions to vetted nonprofits within hours.\n\n## Measured impact\n\nEvery pound is logged, timestamped, and attributed to a receiving partner, giving Levy full ESG documentation without additional operational overhead.',
 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1600&q=80', 'Hariet.AI Team', now() - interval '10 days', false, 'published'),
('Product Update: Grand Opening Agent Now Live for Operators', 'product-update-grand-opening-agent-live', 'product_update',
 'The Grand Opening Agent surfaces new venues opening in every city Hariet.AI serves, giving operators a first look at the market they will feed.',
 E'## Grand Opening Agent\n\nThe Grand Opening Agent runs nightly, pulling verified grand openings from public sources and preparing them for operator review inside the Hariet.AI dashboard.\n\n## What is new\n\n- Automated deduplication across sources\n- One click approval routes events into the consumer feed\n- AI generated flyers for events without provided imagery',
 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1600&q=80', 'Hariet.AI Team', now() - interval '18 days', false, 'published'),
('25,000 Pounds of Food Diverted Across the Network', '25000-pounds-diverted-milestone', 'milestone',
 'Hariet.AI operators have collectively diverted over 25,000 pounds of surplus food, the equivalent of more than 20,000 meals reaching community partners.',
 E'## A meaningful marker\n\nAcross 40 partner venues in 12 cities, the Hariet.AI network has diverted more than 25,000 pounds of surplus food.\n\n## What that translates to\n\n- Over 20,000 meals routed to community partners\n- Roughly 62,500 pounds of CO2 emissions avoided\n- 25 nonprofit partners strengthened',
 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&q=80', 'Hariet.AI Team', now() - interval '25 days', false, 'published'),
('Hariet.AI Expands into Healthcare with Hospital Cafeteria Pilots', 'hariet-ai-healthcare-hospital-cafeteria-pilots', 'company_news',
 'New pilots bring Hariet.AI into hospital foodservice, where consistent daily surplus meets urgent community need.',
 E'## Healthcare joins the network\n\nHospital cafeterias produce steady, predictable surplus every day. Hariet.AI is now piloting inside multiple health systems, routing daily overproduction to food banks and shelters within delivery windows that meet food safety standards.\n\n## Why healthcare\n\nHospitals are anchor institutions in their communities. Turning their surplus into meals for neighbors is one of the highest leverage moves in food recovery.',
 'https://images.unsplash.com/photo-1587351021355-a479a299d2f9?w=1600&q=80', 'Hariet.AI Team', now() - interval '32 days', false, 'published'),
('Introducing the #FeedItOnward Campaign with the U.S. EPA', 'introducing-feed-it-onward-campaign-us-epa', 'partnership',
 'Go See The City joins the U.S. EPA Freedom 250 Feed It Onward Campaign to amplify food rescue in cities nationwide.',
 E'## A national moment\n\nGo See The City is partnering with the U.S. EPA Freedom 250 Feed It Onward Campaign, a national initiative bringing communities together around food rescue.\n\n## How to participate\n\nOperators, nonprofits, and consumers can all join. Learn more on the campaign page.',
 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1600&q=80', 'Hariet.AI Team', now() - interval '40 days', false, 'published');
