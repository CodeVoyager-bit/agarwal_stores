"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword } from "better-auth/crypto";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { allowStaff, clientIp, currentUser, overLimit, ownerPhones, safeNext, tenDigits, validPhone, who } from "./auth";
import { getAuth, googleEnabled } from "./better-auth";
import { isPlaceholderEmail, placeholderEmail } from "./email";
import { ADDRESS_LABELS, audit, connectDB, MAX_ADDRESSES, ORDER_STATUSES, Photo, Product, User, type OrderStatus } from "./db";
import { addNote, assignDelivery, checkDetails, completeDelivery, deliveryFailed, OrderError, saveToBook, placeOrder, receiveCash, setOrderStatus, startDelivery } from "./orders";
import { ROLE_LABEL, ROLES, type Role } from "./roles";
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

async function sendCodeTo(by: LoginStep["by"], id: string) {
  // generous per network: Indian mobile carriers put many phones behind one address
  if ((await overLimit(`code:${id}`, 3, 10 * 60_000)) || (await overLimit(`code-ip:${await clientIp()}`, 30, 10 * 60_000)))
    return "Too many codes asked for. Please wait 10 minutes and try again.";
  try {
    if (by === "phone") await (await authApi()).sendPhoneNumberOTP({ body: { phoneNumber: id }, headers: await headerList() });
    else await (await authApi()).sendVerificationOTP({ body: { email: id, type: "sign-in" }, headers: await headerList() });
    return null;
  } catch (error) {
    return authMessage(error, "We couldn't send the code. Please try again in a minute.");
  }
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
    const name = user?.name && user.name !== "Customer" ? user.name : undefined;
    if (intent === "identify" && user && (await hasPassword(user._id))) return { ...at, step: "password", name };
    // made with Google and no password yet: Google already knows it's them, so no code is needed
    if (intent === "identify" && user && googleEnabled() && (await mongoose.connection.collection("authAccounts").findOne({ userId: user._id, providerId: "google" })))
      return { ...at, step: "google", name };
    const problem = await sendCodeTo(by, id);
    if (problem) return intent === "forgot" ? { ...at, step: "password", name, error: problem } : { by, error: problem };
    return { ...at, step: "code", name, isNew: !user, ok: intent === "forgot" ? "Code sent." : undefined };
  }

  if (intent === "password") {
    const password = String(form.get("password") ?? "");
    if ((await overLimit(`login:${id}`, 10)) || (await overLimit(`login-ip:${await clientIp()}`, 60)))
      return { ...at, step: "password", error: "Too many tries. Please wait 15 minutes, or use Forgot password." };
    try {
      if (by === "phone") await (await authApi()).signInPhoneNumber({ body: { phoneNumber: id, password }, headers: await headerList() });
      else await (await authApi()).signInEmail({ body: { email: id, password }, headers: await headerList() });
    } catch {
      return { ...at, step: "password", name: text(form, "known") || undefined, error: "That password isn't right. Try again, or use Forgot password." };
    }
    redirect(safeNext(text(form, "next")));
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
  redirect(safeNext(text(form, "next")));
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

/** Step 1 of adding a mobile number to the logged-in account (people who joined with Google or email). */
export async function sendPhoneCodeAction(_: LoginState, form: FormData): Promise<LoginState> {
  const phone = tenDigits(text(form, "phone"));
  if (!validPhone(phone)) return { error: "Enter a valid 10‑digit mobile number." };
  const me = await currentUser();
  if (!me) return { error: "Please log in again." };
  await connectDB();
  const owner = await User.findOne({ phone }).lean();
  if (owner && String(owner._id) !== me.id) return { error: "This number already has its own account. Log out and log in with it instead." };
  const problem = await sendCodeTo("phone", phone);
  return problem ? { error: problem } : { phone };
}

/** Step 2: the code adds the verified number to the account. */
export async function addPhoneAction(_: LoginState, form: FormData): Promise<LoginState> {
  const phone = tenDigits(text(form, "phone"));
  const code = text(form, "code").replace(/\D/g, "");
  if (!validPhone(phone) || code.length !== 6) return { phone, error: "Enter the 6‑digit code." };
  try {
    await (await authApi()).verifyPhoneNumber({ body: { phoneNumber: phone, code, updatePhoneNumber: true }, headers: await headerList() });
  } catch {
    return { phone, error: "That code is not right, or it has expired. Check it, or ask for a new one." };
  }
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
  const address = { line: text(form, "line"), landmark: text(form, "landmark"), pincode: text(form, "pincode") };
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
    const { line, landmark, pincode, label } = addressFrom(form);
    const { matchedCount } = await User.updateOne(
      { _id: user.id, "addresses._id": text(form, "id") },
      { $set: { "addresses.$.line": line, "addresses.$.landmark": landmark, "addresses.$.pincode": pincode, "addresses.$.label": label } },
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
    await me();
    const current = String(form.get("current") ?? "");
    const password = String(form.get("password") ?? "");
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
  if (await overLimit(`code:${email}`, 3, 10 * 60_000)) return { error: "Too many codes asked for. Please wait 10 minutes." };
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
export async function linkGoogleAction() {
  const { url } = await (await authApi()).linkSocialAccount({
    body: { provider: "google", callbackURL: "/account?google=linked", errorCallbackURL: "/account?google=failed", disableRedirect: true },
    headers: await headerList(),
  });
  redirect(url);
}

/** Logs out here and on every other phone or computer. */
export async function logoutEverywhereAction() {
  const api = await authApi();
  await api.revokeSessions({ headers: await headerList() }).catch(() => undefined);
  await api.signOut({ headers: await headerList() }).catch(() => undefined);
  redirect("/");
}

export async function logoutAction() {
  await (await authApi()).signOut({ headers: await headerList() }).catch(() => undefined);
  redirect("/");
}

export type CheckoutState = { error?: string; number?: number } | null;

export async function placeOrderAction(_: CheckoutState, form: FormData): Promise<CheckoutState> {
  const user = await currentUser();
  if (!user) return { error: "Please log in again to place your order." };
  if (!user.phone) return { error: "Add your mobile number first, so we can call you about delivery." };
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
  const details = saved
    ? { name: text(form, "name"), line: saved.line, landmark: saved.landmark, pincode: saved.pincode }
    : { name: text(form, "name"), line: text(form, "line"), landmark: text(form, "landmark"), pincode: text(form, "pincode"), label: text(form, "label") };
  try {
    const order = await placeOrder(user, lines.map((l) => ({ id: String(l?.id), qty: Number(l?.qty) })), details);
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

export async function saveProductAction(form: FormData) {
  const user = await allowStaff("catalog");
  await connectDB();
  const fields = {
    name: text(form, "name"),
    category: text(form, "category"),
    unit: text(form, "unit") || "1 box",
    mrp: rupees(form, "mrp"),
    price: rupees(form, "price"),
    stock: rupees(form, "stock"),
    active: form.get("active") === "on",
  };
  const photo = form.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  // components/photo-input.tsx shrinks phone photos to ~150 KB before they are sent
  if (hasPhoto && (!/^image\/(jpeg|png|webp)$/.test(photo.type) || photo.size > 1_500_000))
    throw new Error("The photo must be a JPEG, PNG or WebP under 1.5 MB");

  const id = text(form, "id");
  const before = id ? await Product.findById(id).lean() : null;
  const product = id ? await Product.findByIdAndUpdate(id, fields, { runValidators: true }) : await Product.create(fields);
  if (product && hasPhoto) {
    await Photo.updateOne({ _id: product._id }, { data: Buffer.from(await photo.arrayBuffer()), type: photo.type }, { upsert: true });
    // the version in the address lets browsers keep each photo forever (app/photo/[id]/route.ts)
    await Product.updateOne({ _id: product._id }, { image: `/photo/${product._id}?v=${Date.now()}` });
  }
  const changes = before
    ? (Object.keys(fields) as (keyof typeof fields)[]).filter((f) => fields[f] !== before[f]).map((f) => `${f} ${before[f]} → ${fields[f]}`)
    : ["added"];
  if (hasPhoto) changes.push("new photo");
  if (changes.length) await audit(who(user), before ? "product.edit" : "product.add", fields.name, changes.join(", "));
  revalidatePath("/", "layout");
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
    await completeDelivery(text(form, "id"), user.id, text(form, "code").replace(/\D/g, ""), Number(text(form, "collected")), who(user));
    return "Delivered. Hand the cash in at the shop.";
  });
}

export async function deliveryFailedAction(_: Result, form: FormData): Promise<Result> {
  return attempt(async () => {
    const user = await allowStaff("delivery");
    await deliveryFailed(text(form, "id"), user.id, text(form, "reason"), who(user));
    return "Recorded. The shop will plan another try.";
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
    // a new person gets what better-auth expects of a user; they set their password with Forgot password
    const now = new Date();
    const before = await User.findOneAndUpdate(
      { phone },
      { role, ...(name && { name }), $setOnInsert: { phone, email: placeholderEmail(phone), emailVerified: false, ...(!name && { name: "Customer" }), createdAt: now, updatedAt: now } },
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
