"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { allowStaff, clientIp, currentUser, overLimit, ownerPhones, roleOf, safeNext, tenDigits, validPhone, who } from "./auth";
import { getAuth, googleEnabled } from "./better-auth";
import { isPlaceholderEmail, placeholderEmail } from "./email";
import { MAX_PHOTOS, tidyLines } from "./format";
import { cloudinaryEnabled, uploadPhoto } from "./cloudinary";
import { ADDRESS_LABELS, Audit, audit, connectDB, MAX_ADDRESSES, ORDER_STATUSES, Photo, Product, Shop, User, type OrderStatus } from "./db";
import { addNote, assignDelivery, checkDetails, completeDelivery, deleteAccount, deliveryFailed, OrderError, saveToBook, placeOrder, receiveCash, setOrderStatus, startDelivery } from "./orders";
import { checkShop, SHOP_FIELDS, shopDetails, type ShopDetails } from "./legal";
import { ROLE_LABEL, ROLES, staffHome, type Role } from "./roles";
import { applyImport, planImport, readSheet, type PlanRow } from "./stock-import";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export type LoginState = { phone?: string; email?: string; error?: string; ok?: string } | null;

const headerList = async () => await headers();
const authApi = async () => (await getAuth()).api;
/** better-auth's message when it is one we wrote (sending a code), otherwise a calm general one. */
const authMessage = (error: unknown, fallback: string) =>
  error instanceof Error && /code|SMS|set up|minute|Too many|email/i.test(error.message) ? error.message : fallback;
const looksLikeEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !isPlaceholderEmail(email);
const hasPassword = async (userId: unknown) =>
  Boolean(await mongoose.connection.collection("authAccounts").findOne({ userId, providerId: "credential" }));

/**
 * One way in, step by step. "identify": a mobile number or email. Someone with a password is asked for
 * it; anyone else (new, or never set one) gets a 6‑digit code (WhatsApp/SMS to a number, a free email
 * to an email) and then sets a password. "forgot" sends the code to someone who has a password.
 */
export type LoginStep = {
  step?: "password" | "code" | "google";
  by: "phone" | "email";
  id?: string;
  name?: string;
  isNew?: boolean;
  error?: string;
  ok?: string;
};

/** Every code that goes out (WhatsApp/SMS or email) passes these, or gets the message back. */
async function codeLimit(id: string) {
  const ip = await clientIp();
  // generous per network: Indian mobile carriers put many phones behind one address; the daily cap
  // keeps one network from using up the shop's whole day
  if ((await overLimit(`code:${id}`, 3, 10 * 60_000)) || (await overLimit(`code-ip:${ip}`, 30, 10 * 60_000)) || (await overLimit(`code-ip-day:${ip}`, 150, 86_400_000)))
    return "Too many codes asked for. Please wait 10 minutes and try again.";
  // ponytail: one daily ceiling for the whole shop; raise it if real sign-ups ever reach it
  if (await overLimit("code-all", 1500, 86_400_000)) return "We can't send more codes today. Please call the shop.";
  return null;
}

async function sendCodeTo(by: LoginStep["by"], id: string) {
  const limited = await codeLimit(id);
  if (limited) return limited;
  try {
    if (by === "phone") await (await authApi()).sendPhoneNumberOTP({ body: { phoneNumber: id }, headers: await headerList() });
    else await (await authApi()).sendVerificationOTP({ body: { email: id, type: "sign-in" }, headers: await headerList() });
    return null;
  } catch (error) {
    return authMessage(error, "We couldn't send the code. Please try again in a minute.");
  }
}

/** Where a login lands: the page they came from, or, from the plain Log In page, a staff member's own work. */
async function landing(form: FormData, by: "phone" | "email", id: string) {
  const next = safeNext(text(form, "next"));
  if (next !== "/") return next;
  const user = await User.findOne(by === "phone" ? { phone: id } : { email: id }, "phone role").lean();
  return (user && staffHome(roleOf(user))) || "/";
}

export async function loginStepAction(_: LoginStep, form: FormData): Promise<LoginStep> {
  const by: LoginStep["by"] = text(form, "by") === "email" ? "email" : "phone";
  const id = by === "phone" ? tenDigits(text(form, "id")) : text(form, "id").toLowerCase();
  if (by === "phone" ? !validPhone(id) : !looksLikeEmail(id)) return { by, error: by === "phone" ? "Enter a valid 10‑digit mobile number." : "Enter your email address." };
  const intent = text(form, "intent");
  const at = { by, id };
  await connectDB();

  if (intent === "identify" || intent === "forgot") {
    if (await overLimit(`identify-ip:${await clientIp()}`, 60)) return { ...at, error: "Too many tries. Please wait 15 minutes." };
    const user = await User.findOne(by === "phone" ? { phone: id } : { email: id }).lean();
    // no name back: anyone can type any number, so the next step must not say whose account it is
    if (intent === "identify" && user && (await hasPassword(user._id))) return { ...at, step: "password" };
    // made with Google and no password yet: Google already knows it's them, so no code is needed
    if (intent === "identify" && user && googleEnabled() && (await mongoose.connection.collection("authAccounts").findOne({ userId: user._id, providerId: "google" })))
      return { ...at, step: "google" };
    const problem = await sendCodeTo(by, id);
    if (problem) return intent === "forgot" ? { ...at, step: "password", error: problem } : { by, error: problem };
    return { ...at, step: "code", isNew: !user, ok: intent === "forgot" ? "Code sent." : undefined };
  }

  if (intent === "password") {
    const password = String(form.get("password") ?? "");
    // counted per number and network, so a stranger's wrong guesses can't lock the owner out; the wider
    // cap per number still stops slow guessing from many networks
    const ip = await clientIp();
    if ((await overLimit(`login:${id}:${ip}`, 10)) || (await overLimit(`login:${id}`, 100)) || (await overLimit(`login-ip:${ip}`, 60)))
      return { ...at, step: "password", error: "Too many tries. Please wait 15 minutes, or use Forgot password." };
    try {
      if (by === "phone") await (await authApi()).signInPhoneNumber({ body: { phoneNumber: id, password }, headers: await headerList() });
      else await (await authApi()).signInEmail({ body: { email: id, password }, headers: await headerList() });
    } catch {
      return { ...at, step: "password", error: "That password isn't right. Try again, or use Forgot password." };
    }
    redirect(await landing(form, by, id));
  }

  // "code": check it, set the password (and a name for a new account), log in
  const code = text(form, "code").replace(/\D/g, "");
  const password = String(form.get("password") ?? "");
  const name = text(form, "name").slice(0, 80);
  const isNew = text(form, "isNew") === "1";
  const again = { ...at, step: "code" as const, isNew };
  if (code.length !== 6) return { ...again, error: "Enter the 6‑digit code." };
  if (isNew && name.length < 2) return { ...again, error: "Enter your name." };
  if (password.length < 8 || password.length > 128) return { ...again, error: "Choose a password of at least 8 characters." };
  if (password !== String(form.get("confirm") ?? "")) return { ...again, error: "The two passwords don't match." };
  const verifying = new Date();
  let userId: string;
  try {
    const result =
      by === "phone"
        ? await (await authApi()).verifyPhoneNumber({ body: { phoneNumber: id, code }, headers: await headerList() })
        : await (await authApi()).signInEmailOTP({ body: { email: id, otp: code, ...(name && { name }) }, headers: await headerList() });
    userId = result.user.id;
  } catch {
    return { ...again, error: "That code is not right, or it has expired. Check it, or send a new one." };
  }
  const uid = new mongoose.Types.ObjectId(userId);
  if (name) await User.updateOne({ _id: uid }, { name });
  const now = new Date();
  await mongoose.connection
    .collection("authAccounts")
    .updateOne(
      { userId: uid, providerId: "credential" },
      { $set: { password: await hashPassword(password), accountId: userId, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
  // a new password logs every other device out, in case someone else knew the old one
  await mongoose.connection.collection("authSessions").deleteMany({ userId: uid, createdAt: { $lt: verifying } });
  redirect(await landing(form, by, id));
}

/** "Continue with Google": better-auth sets its state cookie, then the browser goes to Google. */
export async function googleAction(form: FormData) {
  const { url } = await (await authApi()).signInSocial({
    body: { provider: "google", callbackURL: safeNext(text(form, "next")), errorCallbackURL: "/login", disableRedirect: true },
    headers: await headerList(),
  });
  if (!url) throw new Error("Google sign-in is not available.");
  redirect(url);
}

/**
 * What hands the account to someone else (a number or email, Google, a new password, deleting it) needs
 * the current password when the account has one, so a phone left unlocked for a minute isn't enough;
 * ten wrong tries in 15 minutes, then a wait. Returns what's wrong, or null.
 */
async function passwordProblem(userId: string, password: string) {
  const hash = await passwordHash(userId);
  if (!hash) return null;
  if (await overLimit(`pw:${userId}`, 10)) return "Too many tries. Please wait 15 minutes.";
  return password && (await verifyPassword({ hash, password })) ? null : "Your password isn't right.";
}

/** Step 1 of adding a mobile number to the logged-in account (people who joined with Google or email). */
export async function sendPhoneCodeAction(_: LoginState, form: FormData): Promise<LoginState> {
  const phone = tenDigits(text(form, "phone"));
  if (!validPhone(phone)) return { error: "Enter a valid 10‑digit mobile number." };
  const me = await currentUser();
  if (!me) return { error: "Please log in again." };
  await connectDB();
  const owner = await User.findOne({ phone }).lean();
  if (owner && String(owner._id) !== me.id) return { error: "This number already has its own account. Log out and log in with it instead." };
  const wrong = await passwordProblem(me.id, String(form.get("current") ?? ""));
  if (wrong) return { error: wrong };
  const problem = await sendCodeTo("phone", phone);
  return problem ? { error: problem } : { phone };
}

/** Step 2: the code adds the verified number to the account. */
export async function addPhoneAction(_: LoginState, form: FormData): Promise<LoginState> {
  const phone = tenDigits(text(form, "phone"));
  const code = text(form, "code").replace(/\D/g, "");
  if (!validPhone(phone) || code.length !== 6) return { phone, error: "Enter the 6‑digit code." };
  // checked here too: a code for any number can also come from the sign-up screen
  const me = await currentUser();
  if (!me) return { phone, error: "Please log in again." };
  const wrong = await passwordProblem(me.id, String(form.get("current") ?? ""));
  if (wrong) return { phone, error: wrong };
  try {
    await (await authApi()).verifyPhoneNumber({ body: { phoneNumber: phone, code, updatePhoneNumber: true }, headers: await headerList() });
  } catch {
    return { phone, error: "That code is not right, or it has expired. Check it, or ask for a new one." };
  }
  // a phone account's stand-in email follows the number, so the old number is free to sign up again
  const user = await currentUser();
  if (user && !user.email) await User.updateOne({ _id: user.id }, { email: placeholderEmail(phone) }).catch(() => {});
  revalidatePath("/", "layout");
  return { phone, ok: "Number added." };
}

// ---- Account page ----

async function me() {
  const user = await currentUser();
  if (!user) throw new OrderError("Please log in again.");
  return user;
}

export async function saveNameAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await me();
    const name = text(form, "name").slice(0, 80);
    if (name.length < 2) throw new OrderError("Enter your name.");
    await User.updateOne({ _id: user.id }, { name });
    return "Name saved.";
  });
}

/** The address fields of a form, checked; the label is one of Home, Work, Other. */
function addressFrom(form: FormData) {
  const address = { line: text(form, "line"), landmark: text(form, "landmark"), pincode: text(form, "pincode"), phone: tenDigits(text(form, "phone")) };
  const problem = checkDetails({ name: "ok", ...address });
  if (problem) throw new OrderError(problem);
  const label = ADDRESS_LABELS.includes(text(form, "label") as never) ? text(form, "label") : "Home";
  return { ...address, label };
}

export async function addAddressAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await me();
    if (!(await saveToBook(user.id, addressFrom(form)))) throw new OrderError(`You can keep up to ${MAX_ADDRESSES} addresses. Remove one first.`);
    return "Address saved.";
  });
}

export async function editAddressAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await me();
    const { line, landmark, pincode, phone, label } = addressFrom(form);
    const { matchedCount } = await User.updateOne(
      { _id: user.id, "addresses._id": text(form, "id") },
      { $set: { "addresses.$.line": line, "addresses.$.landmark": landmark, "addresses.$.pincode": pincode, "addresses.$.phone": phone, "addresses.$.label": label } },
    );
    if (!matchedCount) throw new OrderError("That address is gone. Refresh the page.");
    return "Address saved.";
  });
}

export async function removeAddressAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await me();
    await User.updateOne({ _id: user.id }, { $pull: { addresses: { _id: text(form, "id") } } });
    return "Address removed.";
  });
}

/** The default is the first address: moving one to the front makes it the default. */
export async function defaultAddressAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await me();
    const record = await User.findById(user.id).select("addresses");
    const pick = record?.addresses?.find((a) => String(a._id) === text(form, "id"));
    if (!record || !pick) throw new OrderError("That address is gone. Refresh the page.");
    record.set("addresses", [pick, ...record.addresses!.filter((a) => a !== pick)]);
    await record.save();
    return "Default address changed.";
  });
}

/** A new or changed password. With one already set, the current password is checked first. */
export async function passwordAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await me();
    const current = String(form.get("current") ?? "");
    const password = String(form.get("password") ?? "");
    if (current && (await overLimit(`pw:${user.id}`, 10))) throw new OrderError("Too many tries. Please wait 15 minutes.");
    if (password.length < 8 || password.length > 128) throw new OrderError("Choose a password of at least 8 characters.");
    if (password !== String(form.get("confirm") ?? "")) throw new OrderError("The two passwords don't match.");
    const api = await authApi();
    try {
      if (current) await api.changePassword({ body: { currentPassword: current, newPassword: password, revokeOtherSessions: true }, headers: await headerList() });
      else await api.setPassword({ body: { newPassword: password }, headers: await headerList() });
    } catch {
      throw new OrderError(current ? "Your current password isn't right." : "Couldn't set the password. Log out and back in, then try again.");
    }
    return current ? "Password changed. Other devices are logged out." : "Password set. You can log in with it now.";
  });
}

export type EmailChangeState = { email?: string; error?: string; ok?: string } | null;

/** Step 1 of adding or changing the email: a code goes to the new address (free). */
export async function requestEmailChangeAction(_: EmailChangeState, form: FormData): Promise<EmailChangeState> {
  const user = await currentUser();
  if (!user) return { error: "Please log in again." };
  const email = text(form, "email").toLowerCase();
  if (!looksLikeEmail(email)) return { error: "Enter the email address." };
  if (email === user.email) return { error: "That's already your email." };
  await connectDB();
  if (await User.exists({ email })) return { error: "That email is on another account. Log in with it instead, or use a different one." };
  const wrong = await passwordProblem(user.id, String(form.get("current") ?? ""));
  if (wrong) return { error: wrong };
  const limited = await codeLimit(email);
  if (limited) return { error: limited };
  try {
    await (await authApi()).requestEmailChangeEmailOTP({ body: { newEmail: email }, headers: await headerList() });
  } catch (error) {
    return { error: authMessage(error, "Couldn't send the code. Log out and back in, then try again.") };
  }
  return { email };
}

/** Step 2: the code makes it the account's email (verified, so it can be used to log in). */
export async function confirmEmailChangeAction(_: EmailChangeState, form: FormData): Promise<EmailChangeState> {
  const email = text(form, "email").toLowerCase();
  const code = text(form, "code").replace(/\D/g, "");
  if (code.length !== 6) return { email, error: "Enter the 6‑digit code." };
  try {
    await (await authApi()).changeEmailEmailOTP({ body: { newEmail: email, otp: code }, headers: await headerList() });
  } catch {
    return { email, error: "That code is not right, or it has expired. Check it, or start again." };
  }
  revalidatePath("/", "layout");
  return { email, ok: "Email saved. You can log in with it now." };
}

/** Connects Google to the logged-in account, so it can be used to log in next time. */
/** The account's password, if it has one: the hash, or null. */
async function passwordHash(userId: string) {
  const account = await mongoose.connection.collection("authAccounts").findOne({ userId: new mongoose.Types.ObjectId(userId), providerId: "credential" });
  return (account?.password as string | undefined) ?? null;
}

/**
 * Connecting Google adds a second way into the account, so someone who only has the phone in their hand
 * for a minute mustn't be able to: it asks for the password (when there is one), and only one Google.
 */
export async function linkGoogleAction(form: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  await connectDB();
  if (await mongoose.connection.collection("authAccounts").findOne({ userId: new mongoose.Types.ObjectId(user.id), providerId: "google" })) redirect("/account");
  if (await passwordProblem(user.id, String(form.get("current") ?? ""))) redirect("/account?google=password");
  const { url } = await (await authApi()).linkSocialAccount({
    body: { provider: "google", callbackURL: "/account?google=linked", errorCallbackURL: "/account?google=failed", disableRedirect: true },
    headers: await headerList(),
  });
  redirect(url);
}

/** Logs out here and on every other phone or computer. */
/** Takes Google off the account; the password stays the way in, so it's needed (and checked) first. */
export async function unlinkGoogleAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await me();
    const hash = await passwordHash(user.id);
    if (!hash) throw new OrderError("Set a password first, so you can still log in without Google.");
    const wrong = await passwordProblem(user.id, String(form.get("current") ?? ""));
    if (wrong) throw new OrderError(wrong);
    await mongoose.connection.collection("authAccounts").deleteMany({ userId: new mongoose.Types.ObjectId(user.id), providerId: "google" });
    await audit(who(user), "account.google", "Own account", "Google disconnected");
    return "Google is disconnected. Log in with your number or email and password.";
  });
}

export async function logoutEverywhereAction() {
  const api = await authApi();
  await api.revokeSessions({ headers: await headerList() }).catch(() => undefined);
  await api.signOut({ headers: await headerList() }).catch(() => undefined);
  redirect("/");
}

/** Deletes the person's own account (lib/orders.ts deleteAccount), logs them out and says goodbye on the shop page. */
export async function deleteAccountAction(_: Result, form: FormData): Promise<Result> {
  const user = await currentUser();
  if (!user) return { error: "Please log in again." };
  if (text(form, "confirm").toUpperCase() !== "DELETE") return { error: "Type DELETE to confirm." };
  const wrong = await passwordProblem(user.id, String(form.get("current") ?? ""));
  if (wrong) return { error: wrong };
  try {
    await deleteAccount(user.id, user.role);
    // their name and number leave the audit log too (written there when they changed their own login)
    await Audit.updateMany({ actor: who(user) }, { actor: "Customer" });
  } catch (error) {
    if (error instanceof OrderError) return { error: error.message };
    throw error;
  }
  // the login is already gone; this clears its cookie
  await (await authApi()).signOut({ headers: await headerList() }).catch(() => undefined);
  redirect("/?deleted=1");
}

export async function logoutAction() {
  await (await authApi()).signOut({ headers: await headerList() }).catch(() => undefined);
  redirect("/");
}

export type CheckoutState = { error?: string; number?: number } | null;

export async function placeOrderAction(_: CheckoutState, form: FormData): Promise<CheckoutState> {
  const user = await currentUser();
  if (!user) return { error: "Please log in again to book." };
  if (text(form, "agree") !== "yes") return { error: "Tick the box to confirm you’re 18 or older and agree to the terms." };
  let lines: { id: string; qty: number }[];
  try {
    lines = JSON.parse(text(form, "cart"));
    if (!Array.isArray(lines)) throw new Error();
  } catch {
    return { error: "Your cart could not be read. Please refresh the page." };
  }
  // a saved address from the book, or a new one typed in (saved to the book when the order goes through)
  const saved = user.addresses.find((a) => a.id === text(form, "addressId"));
  if (text(form, "addressId") && text(form, "addressId") !== "new" && !saved) return { error: "That address is gone. Pick another, or add a new one." };
  // a saved address brings its number; one without (from before numbers were kept) gets it typed in
  const phone = tenDigits(text(form, "phone")) || (saved?.phone ?? "");
  const details = saved
    ? { name: text(form, "name"), phone, line: saved.line, landmark: saved.landmark, pincode: saved.pincode }
    : { name: text(form, "name"), phone, line: text(form, "line"), landmark: text(form, "landmark"), pincode: text(form, "pincode"), label: text(form, "label") };
  try {
    const order = await placeOrder(user, lines.map((l) => ({ id: String(l?.id), qty: Number(l?.qty) })), { ...details, key: text(form, "key"), ...(/^\d+$/.test(text(form, "total")) && { total: Number(text(form, "total")) }) });
    revalidatePath("/", "layout");
    return { number: order.number };
  } catch (error) {
    if (error instanceof OrderError) return { error: error.message };
    throw error;
  }
}

// ---- Staff ----
// Staff forms (components/action-form.tsx) get back a message to show instead of an error page.

export type Result = { ok?: string; error?: string } | null;

async function attempt(work: () => Promise<string | void>): Promise<Result> {
  try {
    const ok = (await work()) || "Saved.";
    revalidatePath("/", "layout");
    return { ok };
  } catch (error) {
    if (error instanceof OrderError) return { error: error.message };
    console.error(error);
    return { error: error instanceof Error && error.message.startsWith("You are not allowed") ? error.message : "That didn't work. Please try again." };
  }
}

const rupees = (form: FormData, key: string) => {
  const n = Number(text(form, key));
  if (!Number.isInteger(n) || n < 0) throw new OrderError(`${key} must be a whole number`);
  return n;
};

// components/photo-input.tsx shrinks phone photos to ~150 KB before they are sent
const isPhoto = (file: FormDataEntryValue | null): file is File => file instanceof File && file.size > 0;
function checkPhoto(file: File) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 1_500_000) throw new OrderError("The photo must be a JPEG, PNG or WebP under 1.5 MB.");
}

/**
 * Keeps one product photo and returns its address: on Cloudinary as products/<name>, or, with no
 * Cloudinary account set, in the database under `dbId`; the version in that address lets browsers keep
 * each photo forever (app/photo/[id]/route.ts).
 */
async function storePhoto(file: File, name: string, dbId: string) {
  if (cloudinaryEnabled()) return uploadPhoto(file, name).catch((error: Error) => Promise.reject(new OrderError(error.message)));
  await Photo.updateOne({ _id: dbId }, { data: Buffer.from(await file.arrayBuffer()), type: file.type }, { upsert: true });
  return `/photo/${dbId}?v=${Date.now()}`;
}

export async function saveProductAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await allowStaff("catalog");
    await connectDB();
    // spaces collapsed as the price-list import does, so a re-imported export finds nothing changed
    const fields = {
      name: text(form, "name").replace(/\s+/g, " "),
      category: text(form, "category").replace(/\s+/g, " "),
      unit: text(form, "unit").replace(/\s+/g, " ") || "1 box",
      mrp: rupees(form, "mrp"),
      price: rupees(form, "price"),
      stock: rupees(form, "stock"),
      description: tidyLines(text(form, "description")).slice(0, 1000),
      maker: text(form, "maker").replace(/\s+/g, " ").slice(0, 200),
      active: form.get("active") === "on",
    };
    const photo = form.get("photo");
    const hasPhoto = isPhoto(photo);
    // more photos for the product page: new ones picked, old ones ticked to remove
    const adding = form.getAll("photos").filter(isPhoto);
    const removing = new Set(form.getAll("removePhoto").map(String));
    [...(hasPhoto ? [photo] : []), ...adding].forEach(checkPhoto);
    if (!fields.name || !fields.category) throw new OrderError("Enter the name and category.");
    if (fields.price > fields.mrp) throw new OrderError("The price can’t be more than the MRP.");

    const id = text(form, "id");
    if (id && !mongoose.isValidObjectId(id)) throw new OrderError("This product is gone. Refresh the page.");
    // products are matched by name on a price-list import, so two with one name would get mixed up
    const sameName = new RegExp(`^${fields.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (await Product.exists({ name: sameName, ...(id && { _id: { $ne: id } }) })) throw new OrderError(`Another product is already called “${fields.name}”. Give this one a different name.`);
    const before = id ? await Product.findById(id).lean() : null;
    const productId = id || String(new mongoose.Types.ObjectId());
    const kept = (before?.photos ?? []).filter((url) => !removing.has(url));
    if (kept.length + adding.length > MAX_PHOTOS) throw new OrderError(`A product can have up to ${MAX_PHOTOS} more photos. Remove some first.`);
    // the photos first: if one fails, nothing is half saved
    const image = hasPhoto ? await storePhoto(photo, productId, productId) : undefined;
    const added: string[] = [];
    for (const file of adding) {
      const photoId = String(new mongoose.Types.ObjectId());
      added.push(await storePhoto(file, `${productId}-${photoId}`, photoId));
    }
    const photos = adding.length || kept.length !== (before?.photos?.length ?? 0) ? [...kept, ...added] : undefined;
    // the stock on the page may be minutes old while orders keep taking from it: a changed number is
    // applied as the change made (+5 received, −2 broken), so sales in between aren't undone
    const stockWas = Number(text(form, "stockWas") || NaN);
    const relative = Boolean(id) && Number.isInteger(stockWas);
    const { stock, ...rest } = fields;
    const product = id
      ? await Product.findByIdAndUpdate(id, { ...(relative ? rest : fields), ...(image && { image }), ...(photos && { photos }) }, { runValidators: true })
      : await Product.create({ _id: productId, ...fields, ...(image && { image }), ...(photos && { photos }) });
    if (!product) throw new OrderError("This product is gone. Refresh the page.");
    if (relative && stock !== stockWas)
      await Product.collection.updateOne({ _id: product._id }, [{ $set: { stock: { $max: [0, { $add: ["$stock", stock - stockWas] }] } } }]);
    // what was asked for: a stock typed over the page's number is logged as the change made, not as the number
    const changes = before
      ? (Object.keys(fields) as (keyof typeof fields)[])
          .filter((f) => (f === "stock" && relative ? stock !== stockWas : fields[f] !== (before[f] ?? (f === "description" || f === "maker" ? "" : undefined))))
          .map((f) => (f === "description" ? "description" : f === "stock" && relative ? `stock ${stock > stockWas ? "+" : ""}${stock - stockWas}` : `${f} ${before[f]} → ${fields[f]}`))
      : ["added"];
    if (hasPhoto) changes.push("new photo");
    if (added.length) changes.push(`${added.length} more ${added.length === 1 ? "photo" : "photos"}`);
    const dropped = (before?.photos ?? []).filter((url) => removing.has(url));
    if (dropped.length) {
      changes.push(`${dropped.length} ${dropped.length === 1 ? "photo" : "photos"} removed`);
      // ones kept in the database go with it; ponytail: Cloudinary copies stay there (free plan room is plenty)
      const ids = dropped.flatMap((url) => url.match(/^\/photo\/([\da-f]{24})/)?.[1] ?? []);
      if (ids.length) await Photo.deleteMany({ _id: { $in: ids } });
    }
    if (changes.length) await audit(who(user), before ? "product.edit" : "product.add", fields.name, changes.join(", "));
    return before ? "Saved." : `Added ${fields.name}.`;
  });
}

export async function setStatusAction(form: FormData) {
  const user = await allowStaff("orders");
  const status = text(form, "status") as OrderStatus;
  if (!ORDER_STATUSES.includes(status)) throw new Error("Unknown status");
  await setOrderStatus(text(form, "id"), status, who(user));
  revalidatePath("/", "layout");
}

export async function assignAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await allowStaff("orders");
    await assignDelivery(text(form, "id"), text(form, "staff"), who(user));
    return text(form, "staff") ? "Given for delivery." : "Taken off delivery.";
  });
}

export async function noteAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await allowStaff("orders");
    await addNote(text(form, "id"), text(form, "note"), who(user));
    return "Note added.";
  });
}

export async function receiveCashAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await allowStaff("cash");
    await receiveCash(text(form, "id"), Number(text(form, "received")), who(user));
    return "Cash counted.";
  });
}

export async function startDeliveryAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await allowStaff("delivery");
    await startDelivery(text(form, "id"), user.id, who(user));
    return "On the way. Ask the customer for the code from their order page.";
  });
}

export async function completeDeliveryAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await allowStaff("delivery");
    const method = text(form, "method") === "upi" ? "upi" : "cash";
    await completeDelivery(text(form, "id"), user.id, text(form, "code").replace(/\D/g, ""), Number(text(form, "collected")), who(user), method);
    return method === "upi" ? "Delivered. Paid by UPI: the shop checks it arrived." : "Delivered. Hand the cash in at the shop.";
  });
}

export async function deliveryFailedAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await allowStaff("delivery");
    await deliveryFailed(text(form, "id"), user.id, text(form, "reason"), who(user));
    return "Recorded. The shop will plan another try.";
  });
}

export async function saveShopAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await allowStaff("shop");
    const details = Object.fromEntries(SHOP_FIELDS.map(({ key, max }) => [key, text(form, key).replace(/\s+/g, " ").slice(0, max)])) as ShopDetails;
    details.gstin = details.gstin.toUpperCase();
    const problem = checkShop(details);
    if (problem) throw new OrderError(problem);
    const before = await shopDetails();
    await Shop.updateOne({ _id: "shop" }, details, { upsert: true });
    const changed = SHOP_FIELDS.filter(({ key }) => before[key] !== details[key]).map(({ label }) => label);
    if (changed.length) await audit(who(user), "shop.edit", "Shop details", changed.join(", "));
    return "Saved. The Terms, Privacy and product pages show these now.";
  });
}

export async function setRoleAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await allowStaff("staff");
    const phone = tenDigits(text(form, "phone"));
    const role = text(form, "role") as Role;
    if (!validPhone(phone)) throw new OrderError("Enter a valid 10‑digit mobile number.");
    if (!ROLES.includes(role) || role === "owner") throw new OrderError("Pick Customer, Delivery or Admin. Owners are set in ADMIN_PHONES.");
    if (ownerPhones().includes(phone)) throw new OrderError("This number is an owner (ADMIN_PHONES), so its role can't change here.");
    await connectDB();
    const name = text(form, "name").slice(0, 80);
    // the team picks people by name (who delivers what), so nobody new joins as "Customer"
    if (!name && !(await User.exists({ phone }))) throw new OrderError("Enter their name too, so the team can tell people apart.");
    // a new person gets what better-auth expects of a user (Mongoose adds createdAt/updatedAt); they set
    // their password with Forgot password
    const before = await User.findOneAndUpdate(
      { phone },
      { role, ...(name && { name }), $setOnInsert: { phone, email: placeholderEmail(phone), emailVerified: false, ...(!name && { name: "Customer" }) } },
      { upsert: true },
    );
    await audit(who(user), "staff.role", name || before?.name || phone, `${ROLE_LABEL[(before?.role as Role) ?? "customer"]} → ${ROLE_LABEL[role]}`);
    return `${name || before?.name || phone} is now ${ROLE_LABEL[role]}.`;
  });
}

export type ImportState = (Result & { rows?: PlanRow[]; applied?: boolean }) | null;

/** Checks a price list (intent "check") or saves it (intent "apply"); both read the file afresh. */
export async function importAction(_: ImportState, form: FormData): Promise<ImportState> {
  try {
    const user = await allowStaff("catalog");
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return { error: "Choose an Excel (.xlsx) or CSV file first." };
    const plan = await planImport(readSheet(new Uint8Array(await file.arrayBuffer())));
    if (plan.problem) return { error: plan.problem };
    if (text(form, "intent") !== "apply") return { rows: plan.rows };
    const { created, updated } = await applyImport(plan.rows, who(user));
    revalidatePath("/", "layout");
    return { rows: plan.rows, applied: true, ok: `Saved: ${created} added, ${updated} changed.` };
  } catch (error) {
    console.error(error);
    return { error: error instanceof Error && /Excel|too big|damaged|sheet/.test(error.message) ? error.message : "Couldn't read that file. Save it as .xlsx or .csv and try again." };
  }
}
