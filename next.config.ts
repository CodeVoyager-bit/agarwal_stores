import type { NextConfig } from "next";
import { IMAGE_SOURCES } from "./src/lib/image-hosts";

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // the Cloudinary account's name is in every photo address (not a secret): lib/image-hosts.ts needs it in the browser too
  env: { NEXT_PUBLIC_CLOUDINARY_CLOUD: process.env.CLOUDINARY_CLOUD_NAME ?? "" },
  images: {
    // product photos from Cloudinary and the brand sites, shrunk to card size (components/category.tsx)
    remotePatterns: IMAGE_SOURCES.map((source) => ({ protocol: "https", ...source })),
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
