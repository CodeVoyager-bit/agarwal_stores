import type { ShopItem } from "./format";
import { ROLES } from "./roles";
import mongoose, { Schema, model, type InferSchemaType, type Model } from "mongoose";
import { unstable_cache } from "next/cache";

const g = globalThis as typeof globalThis & { mongo?: Promise<typeof mongoose> };

/** One connection per server process; kept on globalThis so dev hot reloads reuse it. */
export function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  g.mongo ??= mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 }).catch((error) => {
    g.mongo = undefined;
    throw error;
  });
  return g.mongo;
}

export const CATEGORIES = [
  "Sparklers",
  "Chakri",
  "Anar",
  "Rockets",
  "Bombs",
  "Sky Shots",
  "Kids Special",
  "Gift Boxes",
] as const;

export const ORDER_STATUSES = ["placed", "packed", "out_for_delivery", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Prices are whole rupees.
const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true },
    unit: { type: String, trim: true, default: "1 box", maxlength: 40 },
    mrp: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    image: { type: String, trim: true, default: "" },
    /** more photos, after `image`, for the product page's gallery (at most MAX_PHOTOS, lib/format.ts) */
    photos: { type: [String], default: undefined },
    /** a few lines for the product page: what it does, how long it lasts; line breaks kept */
    description: { type: String, trim: true, default: "", maxlength: 1000 },
    /** the maker's name and address, which Legal Metrology wants shown before purchase */
    maker: { type: String, trim: true, default: "", maxlength: 200 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const addressSchema = new Schema(
  {
    line: { type: String, required: true, trim: true, maxlength: 300 },
    landmark: { type: String, trim: true, default: "", maxlength: 120 },
    pincode: { type: String, required: true, match: /^\d{6}$/ },
  },
  { _id: false },
);

export const ADDRESS_LABELS = ["Home", "Work", "Other"] as const;
export const MAX_ADDRESSES = 10;

/** One saved delivery address; the first in the list is the default. */
const bookAddressSchema = new Schema({
  label: { type: String, enum: ADDRESS_LABELS, default: "Home" },
  line: { type: String, required: true, trim: true, maxlength: 300 },
  landmark: { type: String, trim: true, default: "", maxlength: 120 },
  pincode: { type: String, required: true, match: /^\d{6}$/ },
  /** who the delivery person calls; any number, the same one can be on many addresses and accounts */
  phone: { type: String, match: /^[6-9]\d{9}$/ },
});

const userSchema = new Schema(
  {
    // shared with better-auth (lib/better-auth.ts), which also writes email, emailVerified, phoneVerified
    // and image; phone and email are each unique when present (its ensureIndexes), not required:
    // Google accounts start without a phone, phone accounts with a placeholder email
    phone: { type: String, match: /^[6-9]\d{9}$/ },
    phoneVerified: Boolean,
    email: { type: String, lowercase: true, trim: true },
    emailVerified: Boolean,
    image: String,
    name: { type: String, trim: true, default: "" },
    addresses: { type: [bookAddressSchema], default: undefined },
    /** the one address kept before the address book; moved into `addresses` on the next visit */
    address: { type: addressSchema, required: false },
    role: { type: String, enum: ROLES, default: "customer", index: true },
  },
  { timestamps: true },
);

const counterSchema = new Schema({ _id: String, seq: Number });

/** The shop's legal details: one document, _id "shop", saved by owners on /admin/shop (lib/legal.ts). */
const shopSchema = new Schema({
  _id: String,
  legalName: String,
  address: String,
  gstin: String,
  gstScheme: String,
  licence: String,
  grievanceOfficer: String,
  email: String,
  courts: String,
});

/** Counts tries per key in a time window (copied from Agarwal Online's rate limit); Mongo removes old windows. */
const rateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
});

// Product photos live apart from products, so listing the catalog never loads image bytes.
const photoSchema = new Schema({ _id: Schema.Types.ObjectId, data: { type: Buffer, required: true }, type: { type: String, required: true } });

const orderSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true },
    address: { type: addressSchema, required: true },
    items: [
      {
        _id: false,
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: String,
        unit: String,
        price: Number,
        qty: Number,
      },
    ],
    total: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "placed" },
    deliverBy: { type: Date, required: true },
    /** the TERMS_VERSION (lib/legal.ts) the customer agreed to when booking */
    terms: String,
    /** made when it's delivered (lib/orders.ts issueBill): the number in the financial year's series, and the shop as it was then */
    bill: {
      number: String,
      at: Date,
      /** the GST rate when it was made, and whether the law needs the buyer's name, address and State on it */
      rate: Number,
      named: Boolean,
      shop: { legalName: String, address: String, gstin: String, gstScheme: String },
    },
    /** What happened to the order and who did it, oldest first; staff notes too. */
    history: [{ _id: false, at: { type: Date, default: Date.now }, by: String, text: String }],
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    assignedName: String,
    /** The code the customer reads out at the door; made when the delivery starts. */
    handoverCode: { type: String, select: false },
    handoverTries: { type: Number, default: 0 },
    /** The checkout's own id for this booking: pressing Book again after a lost answer finds this order. */
    key: String,
    cash: {
      collected: Number,
      collectedAt: Date,
      collectedBy: String,
      /** UPI goes straight to the shop's account: nothing to hand in, only to check it arrived. */
      method: { type: String, enum: ["cash", "upi"], default: "cash" },
      received: Number,
      receivedAt: Date,
      receivedBy: String,
    },
  },
  { timestamps: true },
);
// Each matches how a page finds and sorts orders, so Mongo reads only the orders it shows:
orderSchema.index({ user: 1, createdAt: -1 }); // My Orders, newest first
orderSchema.index({ status: 1, deliverBy: 1 }); // Admin: open orders, due soonest first; overdue count
orderSchema.index({ assignedTo: 1, status: 1, deliverBy: 1 }); // a delivery person's run
orderSchema.index({ createdAt: -1 }); // Admin "all" and Sales reports, by date

orderSchema.index({ user: 1, key: 1 }, { unique: true, partialFilterExpression: { key: { $type: "string" } } });

const auditSchema = new Schema({
  at: { type: Date, default: Date.now, index: true },
  actor: String,
  action: { type: String, index: true },
  target: String,
  detail: String,
});

// A dev hot reload brings the newest schema instead of the one cached on mongoose.
function define<S extends Schema>(name: string, schema: S) {
  if (mongoose.models[name]) mongoose.deleteModel(name);
  return model(name, schema) as Model<InferSchemaType<S>>;
}

export const Product = define("Product", productSchema);
export const User = define("User", userSchema);
export const Counter = define("Counter", counterSchema);
export const Shop = define("Shop", shopSchema);
export const RateLimit = define("RateLimit", rateLimitSchema);
export const Photo = define("Photo", photoSchema);
export const Audit = define("Audit", auditSchema);
export const Order = define("Order", orderSchema);

export async function shopItems(): Promise<ShopItem[]> {
  await connectDB();
  // not the descriptions: up to 1000 characters each, and only the product page shows one
  const products = await Product.find({ active: true }, "name category unit mrp price stock image").sort({ price: 1, name: 1 }).lean();
  // cheapest first, but the ones not priced yet (price 0) after all the ones people can book
  products.sort((a, b) => Number(!a.price) - Number(!b.price));
  return products.map((p) => ({
    id: String(p._id),
    name: p.name,
    category: p.category,
    unit: p.unit ?? "",
    mrp: p.mrp,
    price: p.price,
    stock: p.stock,
    image: p.image ?? "",
  }));
}

/**
 * Product ids by units sold, best first (cancelled orders don't count): what other shoppers pick.
 * It reads every order, so it's worked out at most every 10 minutes, not on each product or cart view.
 */
export const bestSellers = unstable_cache(
  async () => {
    await connectDB();
    const sold = await Order.aggregate<{ _id: unknown }>([
      { $match: { status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.product", qty: { $sum: "$items.qty" } } },
      { $sort: { qty: -1, _id: 1 } },
      { $limit: 300 },
    ]);
    return sold.map((s) => String(s._id));
  },
  ["best-sellers"],
  { revalidate: 600 },
);

/** The usual categories in shelf order, then any new ones the shop has typed in. */
export function categoriesOf(items: { category: string }[]) {
  const used = new Set(items.map((i) => i.category));
  return [...CATEGORIES.filter((c) => used.delete(c)), ...used];
}

/** One line in the owner's audit log: who did what to which order, product or person. */
export async function audit(actor: string, action: string, target: string, detail = "") {
  await Audit.create({ actor, action, target, detail: detail.slice(0, 500) });
}
