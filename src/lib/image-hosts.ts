/**
 * Where product photos come from: Cloudinary (the shop's own uploads, lib/cloudinary.ts) and the brand
 * sites in the price-list import. Vercel shrinks their photos to
 * the size each card needs and keeps the copy (next.config.ts); a photo from any other site is shown as
 * it is. Add a site here when a new brand's photos load slowly or full size.
 */
const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD || process.env.CLOUDINARY_CLOUD_NAME;
// on shared hosts only the shop's own folder, and no ?query (next.config.ts), so nobody can spend the
// shop's image quota on other photos or on endless ?n=1, ?n=2 copies of one
export const IMAGE_SOURCES: { hostname: string; pathname?: string }[] = [
  ...(cloud ? [{ hostname: "res.cloudinary.com", pathname: `/${cloud}/**` }] : []),
  ...["ayyansworld.com", "standardcrackers.in", "vadivelpyrotechs.com", "www.sonnyvinayagashop.com", "siyafireworks.com"].map((hostname) => ({ hostname })),
  { hostname: "cdn.shopify.com", pathname: "/s/files/1/0029/8011/8646/**" },
];

export function resizable(src: string) {
  try {
    const url = new URL(src);
    return url.protocol === "https:" && !url.search && IMAGE_SOURCES.some((s) => s.hostname === url.hostname && (!s.pathname || url.pathname.startsWith(s.pathname.slice(0, -2))));
  } catch {
    return false; // /photo/… uploads kept in the database (no Cloudinary): already shrunk to 900px in the browser
  }
}
