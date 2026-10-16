import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB, Otp, Session, User } from "./db";
import { can, type Permission, type Role } from "./roles";
import { mockOtp, sendCode } from "./sms";

const COOKIE = "sid";
const SESSION_DAYS = 60;

export { mockOtp };

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

function otpHash(phone: string, code: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be 32+ characters");
  return createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
}

/** Digits only, +91 or a leading 0 dropped. */
export const tenDigits = (value: string) => value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
export const validPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);

/** Only paths on this site, so a crafted ?next= can't send people elsewhere after login. */
export const safeNext = (next: unknown) => (typeof next === "string" && /^\/(?![\/\\])/.test(next) ? next : "/");

/** ADMIN_PHONES are the owners: always Owner, whatever the Staff page says, so the shop can never lock itself out. */
export const ownerPhones = () => (process.env.ADMIN_PHONES ?? "").split(",").map(tenDigits).filter(Boolean);

/** Memoised per request: the layout and the page both ask. */
export const currentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  await connectDB();
  const session = await Session.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } });
  const user = session && (await User.findById(session.user));
  if (!user) return null;
  return {
    id: String(user._id),
    phone: user.phone,
    name: user.name,
    address: user.address ? { line: user.address.line, landmark: user.address.landmark, pincode: user.address.pincode } : null,
    role: (ownerPhones().includes(user.phone) ? "owner" : (user.role ?? "customer")) as Role,
  };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;
/** "Name · phone", how staff appear in order history and the audit log. */
export const who = (user: CurrentUser) => (user.name ? `${user.name} · ${user.phone}` : user.phone);

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

/** Sends a login code. Returns an error message for the customer, or null. */
export async function sendLoginCode(phone: string) {
  await connectDB();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const since = new Date(Date.now() - 10 * 60_000);
  // generous per network: Indian mobile carriers put many phones behind one address
  if ((await Otp.countDocuments({ phone, createdAt: { $gt: since } })) >= 3 || (await Otp.countDocuments({ ip, createdAt: { $gt: since } })) >= 30)
    return "Too many codes asked for. Please wait 10 minutes and try again.";

  const code = mockOtp() ? process.env.MOCK_OTP_CODE || "123456" : String(randomInt(100000, 1000000));
  await Otp.create({ phone, ip, hash: otpHash(phone, code) });
  return mockOtp() ? null : sendCode(phone, code);
}

/** Checks the latest code for the number; on a match, logs the person in (making their account if new). */
export async function verifyLoginCode(phone: string, code: string) {
  await connectDB();
  const otp = await Otp.findOne({ phone, createdAt: { $gt: new Date(Date.now() - 10 * 60_000) } }).sort({ createdAt: -1 });
  if (!otp || otp.attempts >= 5) return "This code has expired. Please ask for a new one.";
  const a = Buffer.from(otp.hash, "hex");
  const b = Buffer.from(otpHash(phone, code), "hex");
  if (!timingSafeEqual(a, b)) {
    await Otp.updateOne({ _id: otp._id }, { $inc: { attempts: 1 } });
    return "That code is not right. Please check and try again.";
  }
  await Otp.deleteMany({ phone });

  const user = await User.findOneAndUpdate({ phone }, { $setOnInsert: { phone } }, { upsert: true, returnDocument: "after" });
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await Session.create({ tokenHash: sha256(token), user: user!._id, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return null;
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await connectDB();
    await Session.deleteOne({ tokenHash: sha256(token) });
  }
  jar.delete(COOKIE);
}
