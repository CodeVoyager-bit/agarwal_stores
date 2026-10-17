/**
 * Where product photos come from: Cloudinary (the shop's own uploads, lib/cloudinary.ts) and the brand
 * sites in the price-list import. Vercel shrinks their photos to
 * the size each card needs and keeps the copy (next.config.ts); a photo from any other site is shown as
 * it is. Add a site here when a new brand's photos load slowly or full size.
 */
export const IMAGE_HOSTS = ["res.cloudinary.com", "ayyansworld.com", "standardcrackers.in", "vadivelpyrotechs.com", "www.sonnyvinayagashop.com", "siyafireworks.com", "cdn.shopify.com"];

export function resizable(src: string) {
  try {
    const url = new URL(src);
    return url.protocol === "https:" && IMAGE_HOSTS.includes(url.hostname);
  } catch {
    return false; // /photo/… uploads kept in the database (no Cloudinary): already shrunk to 900px in the browser
  }
}
