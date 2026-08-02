import type { MetadataRoute } from "next";

const BASE_URL = "https://www.kyroo.co.in";

export default function sitemap(): MetadataRoute.Sitemap {
  // account/admin pages are excluded here (and disallowed in robots.ts) -
  // no SEO value in advertising a "log in to see your data" page
  const routes = ["", "/pricing", "/onboarding", "/privacy", "/terms", "/about", "/contact"];
  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.6,
  }));
}
