import type { MetadataRoute } from "next";

/**
 * What browsers need to offer "Install app" (Agarwal Online's, for this shop): a name, icons, where the
 * app starts and that it opens in its own window. The icons are src/app/icon.svg drawn by sharp: rounded,
 * and for phones that cut their own shape, a full-bleed copy with the art inside the safe zone.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Agarwal Stores · Crackers",
    short_name: "AGS Crackers",
    description: "Book Diwali crackers from Agarwal Stores. Home delivery within 2 days, pay cash or UPI at the door.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fff8f0",
    // the browser bar's colour (viewport.themeColor in the root layout)
    theme_color: "#ff9933",
    lang: "en-IN",
    categories: ["shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // a long press on the app icon
    shortcuts: [
      { name: "Cart", url: "/cart" },
      { name: "My Orders", url: "/orders" },
    ],
  };
}
