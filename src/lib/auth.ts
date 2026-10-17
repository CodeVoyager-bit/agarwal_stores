import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./better-auth";
import { connectDB, RateLimit, User } from "./db";
import { isPlaceholderEmail } from "./email";
import { can, type Permission, type Role } from "./roles";
import { mockOtp } from "./sms";

export { mockOtp };

/** Digits only, +91 or a leading 0 dropped. */
export const tenDigits = (value: string) => value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
export const validPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);

/** Only paths on this site, so a crafted ?next= can't send people elsewhere after login. */
export const safeNext = (next: unknown) => (typeof next === "string" && /^\/(?![\/\\])/.test(next) ? next : "/");

/** ADMIN_PHONES are the owners: always Owner, whatever the Staff page says, so the shop can never lock itself out. */
export const ownerPhones = () => (process.env.ADMIN_PHONES ?? "").split(",").map(tenDigits).filter(Boolean);

/** Memoised per request: the layout and the page both ask. The session is better-auth's. */
export const currentUser = cache(async () => {
  const found = await (await getAuth()).api.getSession({ headers: await headers() });
  if (!found) return null;
  await connectDB();
  let user = await User.findById(found.user.id).lean();
  if (!user) return null;
  // the single address from before the address book becomes its first entry, once
  if (user.address && !user.addresses?.length) {
    const { line, landmark, pincode } = user.address;
    user = (await User.findByIdAndUpdate(user._id, { addresses: [{ label: "Home", line, landmark, pincode }], $unset: { address: 1 } }, { returnDocument: "after" }).lean())!;
  }
  const addresses = (user.addresses ?? []).map((a) => ({ id: String(a._id), label: a.label ?? "Home", line: a.line, landmark: a.landmark ?? "", pincode: a.pincode, phone: a.phone || user.phone || "" }));
  return {
    id: String(user._id),
    /** "" for someone who joined with Google and hasn't added a number yet */
    phone: user.phone ?? "",
    email: isPlaceholderEmail(user.email) ? "" : user.email!,
    emailVerified: Boolean(user.emailVerified),
    name: user.name === "Customer" ? "" : (user.name ?? ""),
    addresses,
    /** the default: first in the book */
    address: addresses[0] ?? null,
    role: (user.phone && ownerPhones().includes(user.phone) ? "owner" : (user.role ?? "customer")) as Role,
  };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;
/** "Name · phone", how staff appear in order history and the audit log. */
export const who = (user: CurrentUser) => [user.name, user.phone || user.email].filter(Boolean).join(" · ");

export async function requireUser(next: string) {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** For pages: log in first, and send people without this permission back to the shop. */
export async function requireStaff(permission: Permission, next: string) {
  const user = await requireUser(next);
  if (!can(user.role, permission)) redirect("/");
  return user;
}

/** For server actions: refuse outright, since there is no page to redirect. */
export async function allowStaff(permission: Permission) {
  const user = await currentUser();
  if (!user || !can(user.role, permission)) throw new Error("You are not allowed to do this.");
  return user;
}

export const clientIp = async () => (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "local";

/** True once `key` has been tried more than `max` times in this window (Agarwal Online's rate limit). */
export async function overLimit(key: string, max: number, windowMs = 15 * 60_000) {
  await connectDB();
  const bucket = Math.floor(Date.now() / windowMs);
  const record = await RateLimit.findOneAndUpdate(
    { key: `${key}:${bucket}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 1) * windowMs) } },
    { upsert: true, returnDocument: "after" },
  );
  return record!.count > max;
}
