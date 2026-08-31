import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://done.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Every authenticated surface requires sign-in and returns nothing
        // useful to a crawler — keep the index to the public marketing route.
        disallow: [
          "/dashboard",
          "/tasks/",
          "/request/",
          "/receipts",
          "/notifications",
          "/messages",
          "/support",
          "/doer/",
          "/auth/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
