import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // account-specific and internal pages have no SEO value and
      // shouldn't show up as "log in to see your account" search results
      disallow: ["/chat", "/payment", "/success", "/admin", "/account", "/delete-account"],
    },
    sitemap: "https://www.kyroo.co.in/sitemap.xml",
  };
}
