import { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://marketplace.vercel.app/", lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: "https://marketplace.vercel.app/products", lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: "https://marketplace.vercel.app/deals", lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: "https://marketplace.vercel.app/vendors", lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ];
}
