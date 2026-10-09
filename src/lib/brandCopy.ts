export function normalizeBrandCopy(text: string): string {
  return text
    .replace(/\bHarietAI\b/g, "Hariet.AI")
    .replace(/\bGo See The City\b/g, "GO See The City");
}

export function normalizeArticleBrandCopy<T extends { title: string; excerpt: string; author: string; body?: string }>(article: T): T {
  return {
    ...article,
    title: normalizeBrandCopy(article.title),
    excerpt: normalizeBrandCopy(article.excerpt),
    author: normalizeBrandCopy(article.author),
    ...(article.body === undefined ? {} : { body: normalizeBrandCopy(article.body) }),
  };
}