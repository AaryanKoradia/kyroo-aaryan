import type { MetadataRoute } from "next";

const BASE_URL = "https://www.kyroo.co.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/pricing", "/onboarding", "/privacy", "/unsubscribe"];
  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.6,
  }));
}
