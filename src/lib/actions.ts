"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword } from "better-auth/crypto";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { allowStaff, clientIp, currentUser, overLimit, ownerPhones, safeNext, tenDigits, validPhone, who } from "./auth";
import { getAuth } from "./better-auth";
import { isPlaceholderEmail, placeholderEmail } from "./email";
import { audit, connectDB, ORDER_STATUSES, Photo, Product, User, type OrderStatus } from "./db";
import { addNote, assignDelivery, completeDelivery, deliveryFailed, OrderError, placeOrder, receiveCash, setOrderStatus, startDelivery } from "./orders";
import { ROLE_LABEL, ROLES, type Role } from "./roles";
import { applyImport, planImport, readSheet, type PlanRow } from "./stock-import";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export type LoginState = { phone?: string; email?: string; error?: string; ok?: string } | null;

const headerList = async () => await headers();
const authApi = async () => (await getAuth()).api;
/** better-auth's message when it is one we wrote (phone sending), otherwise a calm general one. */
const authMessage = (error: unknown, fallback: string) =>
  error instanceof Error && /code|SMS|set up|minute|Too many/i.test(error.message) ? error.message : fallback;

/** Everyday login with mobile number and password. Costs nothing, unlike a code. */
export async function loginPhoneAction(_: LoginState, form: FormData): Promise<LoginState> {
  const phone = tenDigits(text(form, "phone"));
  const password = String(form.get("password") ?? "");
  if (!validPhone(phone)) return { error: "Enter a valid 10‑digit mobile number." };
  if (!password) return { phone, error: "Enter your password." };
  if ((await overLimit(`login:${phone}`, 10)) || (await overLimit(`login-ip:${await clientIp()}`, 60)))
    return { phone, error: "Too many tries. Please wait 15 minutes, or use Forgot password." };
  try {
    await (await authApi()).signInPhoneNumber({ body: { phoneNumber: phone, password }, headers: await headerList() });
  } catch {
    return { phone, error: "That number and password don't match. Check them, or use Forgot password (also for staff setting a first password)." };
  }
  redirect(safeNext(text(form, "next")));
}

export async function loginEmailAction(_: LoginState, form: FormData): Promise<LoginState> {
  const email = text(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || isPlaceholderEmail(email)) return { error: "Enter your email address." };
  if (!password) return { email, error: "Enter your password." };
  if ((await overLimit(`login:${email}`, 10)) || (await overLimit(`login-ip:${await clientIp()}`, 60)))
    return { email, error: "Too many tries. Please wait 15 minutes, or use Forgot password." };
  try {
    await (await authApi()).signInEmail({ body: { email, password }, headers: await headerList() });
  } catch {
    return { email, error: "That email and password don't match. Check them, or use Forgot password." };
  }
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

type Purpose = "signup" | "reset" | "add";
const purposeOf = (form: FormData): Purpose => (["reset", "add"].includes(text(form, "purpose")) ? (text(form, "purpose") as Purpose) : "signup");
const hasPassword = async (userId: unknown) =>
  Boolean(await mongoose.connection.collection("authAccounts").findOne({ userId, providerId: "credential" }));

/**
 * The one paid message: a 6‑digit code by WhatsApp/SMS, sent only to create an account, to set a new
 * password, or to add a number to a Google account. Refused up front when it would be wasted.
 */
export async function sendCodeAction(_: LoginState, form: FormData): Promise<LoginState> {
  const phone = tenDigits(text(form, "phone"));
  const purpose = purposeOf(form);
  if (!validPhone(phone)) return { error: "Enter a valid 10‑digit mobile number." };
  await connectDB();
  const existing = await User.findOne({ phone }).lean();
  if (purpose === "signup" && existing && (await hasPassword(existing._id)))
    return { error: "This number already has an account. Log in, or use Forgot password." };
  if (purpose === "reset" && !existing) return { error: "There's no account with this number yet. Create one instead." };
  if (purpose === "add") {
    const me = await currentUser();
    if (!me) return { error: "Please log in again." };
    if (existing && String(existing._id) !== me.id) return { error: "This number already has its own account. Log out and log in with it instead." };
  }
  // generous per network: Indian mobile carriers put many phones behind one address
  if ((await overLimit(`code:${phone}`, 3, 10 * 60_000)) || (await overLimit(`code-ip:${await clientIp()}`, 30, 10 * 60_000)))
    return { error: "Too many codes asked for. Please wait 10 minutes and try again." };
  try {
    await (await authApi()).sendPhoneNumberOTP({ body: { phoneNumber: phone }, headers: await headerList() });
  } catch (error) {
    return { error: authMessage(error, "We couldn't send the code. Please try again in a minute.") };
  }
  return { phone };
}

/**
 * Checks the code, then (for a new account or a reset) sets the password and logs in. A new account
 * may add an email: it gets a confirmation link and can be used to log in too. A reset logs every
 * other device out.
 */
export async function setPasswordAction(_: LoginState, form: FormData): Promise<LoginState> {
  const phone = tenDigits(text(form, "phone"));
  const code = text(form, "code").replace(/\D/g, "");
  const purpose = purposeOf(form);
  const password = String(form.get("password") ?? "");
  const name = text(form, "name").slice(0, 80);
  const email = text(form, "email").toLowerCase();
  if (!validPhone(phone)) return { error: "Enter a valid 10‑digit mobile number." };
  if (code.length !== 6) return { phone, error: "Enter the 6‑digit code." };
  if (password.length < 8 || password.length > 128) return { phone, error: "Choose a password of at least 8 characters." };
  if (password !== String(form.get("confirm") ?? "")) return { phone, error: "The two passwords don't match." };
  if (purpose === "signup" && name.length < 2) return { phone, error: "Enter your name." };
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || isPlaceholderEmail(email))) return { phone, error: "Check the email address, or leave it empty." };
  await connectDB();
  // checked before the code is used up, so a taken email doesn't cost a second message
  if (email && (await User.exists({ email, phone: { $ne: phone } }))) return { phone, error: "That email is on another account. Use a different one, or leave it empty." };

  const verifying = new Date();
  let userId: string;
  try {
    const result = await (await authApi()).verifyPhoneNumber({ body: { phoneNumber: phone, code }, headers: await headerList() });
    userId = result.user.id;
  } catch {
    return { phone, error: "That code is not right, or it has expired. Check it, or go back and ask for a new one." };
  }
  const id = new mongoose.Types.ObjectId(userId);
  if (name || email) await User.updateOne({ _id: id }, { ...(name && { name }), ...(email && { email, emailVerified: false }) });
  const now = new Date();
  await mongoose.connection
    .collection("authAccounts")
    .updateOne(
      { userId: id, providerId: "credential" },
      { $set: { password: await hashPassword(password), accountId: userId, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
  if (purpose === "reset") await mongoose.connection.collection("authSessions").deleteMany({ userId: id, createdAt: { $lt: verifying } });
  // a confirmation link for the new email; never fail the sign-up over it
  if (email) await (await authApi()).sendVerificationEmail({ body: { email, callbackURL: "/login?email=verified" } }).catch((e) => console.error("verification email:", e));
  redirect(safeNext(text(form, "next")));
}

/** Adds a verified mobile number to the logged-in account (people who joined with Google). */
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

/** Forgot password by email: a free link instead of a paid code. Says the same whether or not the email is known. */
export async function emailResetAction(_: LoginState, form: FormData): Promise<LoginState> {
  const email = text(form, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || isPlaceholderEmail(email)) return { error: "Enter your email address." };
  if (await overLimit(`reset-email:${email}`, 3)) return { email, error: "Too many links asked for. Please wait 15 minutes." };
  try {
    await (await authApi()).requestPasswordReset({ body: { email, redirectTo: "/reset/new" }, headers: await headerList() });
  } catch (error) {
    console.error("reset email:", error);
  }
  return { email, ok: "If an account has this email, a link to set a new password is on its way. Check your inbox (and spam)." };
}

/** The page the email link opens: the new password, then log in with it. */
export async function newPasswordAction(_: LoginState, form: FormData): Promise<LoginState> {
  const token = text(form, "token");
  const password = String(form.get("password") ?? "");
  if (password.length < 8 || password.length > 128) return { error: "Choose a password of at least 8 characters." };
  if (password !== String(form.get("confirm") ?? "")) return { error: "The two passwords don't match." };
  try {
    await (await authApi()).resetPassword({ body: { newPassword: password, token }, headers: await headerList() });
  } catch {
    return { error: "This link has expired or was already used. Ask for a new one." };
  }
  redirect("/login?reset=done");
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
  const details = { name: text(form, "name"), line: text(form, "line"), landmark: text(form, "landmark"), pincode: text(form, "pincode") };
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
