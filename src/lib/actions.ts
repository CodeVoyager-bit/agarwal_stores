"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { allowStaff, currentUser, endSession, ownerPhones, safeNext, sendLoginCode, tenDigits, validPhone, verifyLoginCode, who } from "./auth";
import { audit, connectDB, ORDER_STATUSES, Photo, Product, User, type OrderStatus } from "./db";
import { addNote, assignDelivery, completeDelivery, deliveryFailed, OrderError, placeOrder, receiveCash, setOrderStatus, startDelivery } from "./orders";
import { ROLE_LABEL, ROLES, type Role } from "./roles";
import { applyImport, planImport, readSheet, type PlanRow } from "./stock-import";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export type LoginState = { phone?: string; error?: string } | null;

export async function sendCodeAction(_: LoginState, form: FormData): Promise<LoginState> {
  const phone = tenDigits(text(form, "phone"));
  if (!validPhone(phone)) return { error: "Enter a valid 10-digit mobile number." };
  const error = await sendLoginCode(phone);
  return error ? { error } : { phone };
}

export async function verifyCodeAction(_: LoginState, form: FormData): Promise<LoginState> {
  const phone = tenDigits(text(form, "phone"));
  const code = text(form, "code").replace(/\D/g, "");
  if (!validPhone(phone)) return { error: "Enter a valid 10-digit mobile number." };
  if (code.length !== 6) return { phone, error: "Enter the 6‑digit code." };
  const error = await verifyLoginCode(phone, code);
  if (error) return { phone, error };
  redirect(safeNext(text(form, "next")));
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

export type CheckoutState = { error?: string; number?: number } | null;

export async function placeOrderAction(_: CheckoutState, form: FormData): Promise<CheckoutState> {
  const user = await currentUser();
  if (!user) return { error: "Please log in again to place your order." };
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
    const before = await User.findOneAndUpdate({ phone }, { role, ...(name && { name }), $setOnInsert: { phone } }, { upsert: true });
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
