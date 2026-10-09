import { describe, expect, it } from "vitest";
import { normalizeArticleBrandCopy, normalizeBrandCopy } from "./brandCopy";

describe("brand copy", () => {
  it("normalizes names without changing destinations", () => {
    expect(normalizeBrandCopy("Go See The City and HarietAI: https://hariet.ai/app/login"))
      .toBe("GO See The City and Hariet.AI: https://hariet.ai/app/login");
  });
  it("normalizes article display fields without changing stored routing fields", () => {
    const article = { title: "Go See The City", excerpt: "HarietAI", author: "HarietAI", body: "Go See The City", slug: "original-slug", cover_image_url: "original-image" };
    expect(normalizeArticleBrandCopy(article)).toEqual({ ...article, title: "GO See The City", excerpt: "Hariet.AI", author: "Hariet.AI", body: "GO See The City" });
    expect(article.title).toBe("Go See The City");
  });
});