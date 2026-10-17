import type { NextConfig } from "next";
import { IMAGE_HOSTS } from "./src/lib/image-hosts";

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  images: {
    // product photos from the brand sites, shrunk to card size (components/category.tsx)
    remotePatterns: IMAGE_HOSTS.map((hostname) => ({ protocol: "https", hostname })),
    qualities: [75],
    // the brand sites are slow and their photos don't change: keep our small copies for a month
    minimumCacheTTL: 2678400,
  },
  // a second dev server (Claude's preview) builds into its own folder beside yours
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // product photos are shrunk in the browser first; this is the safety net
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};
export default config;
