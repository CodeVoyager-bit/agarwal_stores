import { createHash } from "node:crypto";

/** The three values on the Cloudinary dashboard (Settings > API Keys); uploads go there once all are set. */
export const cloudinaryEnabled = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

/** Cloudinary's request signature: the parameters in name order, joined like a query, then the secret, through SHA-1. */
export function sign(params: Record<string, string>, secret: string) {
  const query = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(query + secret).digest("hex");
}

/**
 * Puts a product's photo on Cloudinary as products/<name> (the product's id for its main photo, the id
 * and a photo id for more), replacing the one before, and returns its https address. The address
 * carries a new version each time, so browsers fetch the new photo.
 */
export async function uploadPhoto(file: File, name: string) {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  const params = { public_id: `products/${name}`, timestamp: String(Math.floor(Date.now() / 1000)) };
  const body = new FormData();
  for (const [k, v] of Object.entries(params)) body.set(k, v);
  body.set("api_key", CLOUDINARY_API_KEY!);
  body.set("signature", sign(params, CLOUDINARY_API_SECRET!));
  body.set("file", file);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body, signal: AbortSignal.timeout(20_000) });
  const result = (await response.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!response.ok || !result.secure_url) {
    console.error("Cloudinary upload failed:", response.status, result.error?.message);
    throw new Error("We couldn't upload the photo. Please try again in a minute.");
  }
  return result.secure_url;
}
