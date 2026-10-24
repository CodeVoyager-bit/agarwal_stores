import { isValidObjectId, Types } from "mongoose";
import { couponCode, couponDiscount } from "./coupons";
import { ADDRESS_LABELS, audit, connectDB, Counter, Coupon, MAX_ADDRESSES, Order, Product, User, type OrderStatus } from "./db";
import { BY_HAND, MAX_QTY, STATUS_LABEL } from "./format";
import { billTitle, gstSplit, servesPincode, SETTING_DEFAULTS, shopDetails, TERMS_VERSION } from "./legal";

/** The defaults; an owner changes them on Admin > Settings (lib/legal.ts), which is what booking reads. */
export const DELIVERY_DAYS = SETTING_DEFAULTS.deliveryTo;
/** Bookings one account may have waiting for the shop's call: stock is held from the moment of booking. */
export const MAX_WAITING = SETTING_DEFAULTS.maxWaiting;

/** A mistake the person can fix; its message is safe to show them. */
export class OrderError extends Error {}

type Line = { id: string; qty: number };
/** `total` and `discount` are what the customer saw; `coupon` is the code they applied. */
type Details = { name: string; phone: string; line: string; landmark: string; pincode: string; label?: string; key?: string; total?: number; coupon?: string; discount?: number };

export function checkDetails(d: Details) {
  if (d.name.length < 2 || d.name.length > 80) return "Enter your name.";
  if (d.line.length < 10 || d.line.length > 300) return "Enter your full address (house, street, area).";
  if (d.landmark.length > 120) return "Keep the landmark under 120 characters.";
  if (!/^\d{6}$/.test(d.pincode)) return "Enter a 6‑digit pincode.";
  if (!/^[6-9]\d{9}$/.test(d.phone)) return "Enter a 10‑digit mobile number for delivery.";
  return null;
}

/**
 * Takes the stock for every line, then writes the order at today's prices. If any line is short,
 * the stock already taken is put back and nothing is ordered.
 * ponytail: no transaction (plain local Mongo has none); a crash between taking stock and writing
 * the order loses that stock. Move to session.withTransaction on a replica set if that ever matters.
 */
export async function placeOrder(user: { id: string; role?: string }, lines: Line[], details: Details) {
  await connectDB();
  // the same booking sent again (the answer to the first got lost on the way): it already stands
  const key = details.key && /^[\w-]{8,64}$/.test(details.key) ? details.key : undefined;
  const already = key && (await Order.findOne({ user: user.id, key }));
  if (already && Date.now() - already.createdAt.getTime() < 60 * 60_000) return already;
  // the same id on an older order (the cart stayed open after it): that order lets go of it, this one books
  if (already) await Order.updateOne({ _id: already._id }, { $unset: { key: 1 } });
  const wanted = new Map<string, number>();
  for (const { id, qty } of lines) {
    if (!isValidObjectId(id) || !Number.isInteger(qty) || qty < 1)
      throw new OrderError("Your cart has an item we can't read. Please refresh the page.");
    // ids compared as Mongo writes them, lower case
    wanted.set(id.toLowerCase(), (wanted.get(id.toLowerCase()) ?? 0) + qty);
  }
  if (!wanted.size) throw new OrderError("Your cart is empty.");
  // counted after the lines are added up, so splitting one product over many lines doesn't get past it
  if ([...wanted.values()].some((qty) => qty > MAX_QTY)) throw new OrderError(`At most ${MAX_QTY} of one item per order. Call the shop for more.`);
  // staff booking for callers from their own account aren't held to a customer's limits (Settings)
  const capped = (user.role ?? "customer") === "customer";
  const settings = await shopDetails();
  if (capped && !settings.bookingsOpen) throw new OrderError(settings.closedMessage || "Bookings are paused right now. Please call the shop.");
  const waitingCap = `You have ${settings.maxWaiting} orders waiting for our call already. We'll call you soon, or call the shop.`;
  if (capped && (await Order.countDocuments({ user: user.id, status: "placed" })) >= settings.maxWaiting) throw new OrderError(waitingCap);
  const problem = checkDetails(details);
  if (problem) throw new OrderError(problem);
  if (capped && !servesPincode(settings, details.pincode)) throw new OrderError(`We don't deliver to ${details.pincode} yet. Please call the shop.`);

  const products = await Product.find({ _id: { $in: [...wanted.keys()] }, active: true, price: { $gt: 0 } });
  if (products.length !== wanted.size)
    throw new OrderError("Some items in your cart are no longer sold. Please refresh the page.");
  const total = products.reduce((sum, p) => sum + p.price * wanted.get(String(p._id))!, 0);
  // the Terms promise the price shown when booking: if it changed since the cart was opened, say so first
  if (details.total !== undefined && details.total !== total)
    throw new OrderError("Prices have changed since you opened your cart. The cart shows the new ones now: check them, then book again.");
  if (capped && total < settings.minOrder) throw new OrderError(`The smallest booking is ₹${settings.minOrder}. Please add a little more.`);
  // checked again here: it may have ended, or been turned off, since the customer applied it
  let coupon: { code: string; percent: number; discount: number } | undefined;
  if (details.coupon) {
    const found = await Coupon.findOne({ code: couponCode(details.coupon) }).lean();
    const off = couponDiscount(found, total);
    if ("error" in off) throw new OrderError(off.error);
    if (details.discount !== undefined && details.discount !== off.discount)
      throw new OrderError("The coupon has changed since you applied it. Apply it again, then book.");
    coupon = { code: found!.code, percent: found!.percent, discount: off.discount };
  }

  const taken: { id: Types.ObjectId; qty: number }[] = [];
  try {
    for (const p of products) {
      const qty = wanted.get(String(p._id))!;
      const { modifiedCount } = await Product.updateOne({ _id: p._id, stock: { $gte: qty } }, { $inc: { stock: -qty } });
      if (!modifiedCount) {
        const left = (await Product.findById(p._id, "stock"))?.stock ?? 0;
        throw new OrderError(left ? `Only ${left} left of ${p.name}. Please lower the quantity.` : `${p.name} is out of stock. Please remove it.`);
      }
      taken.push({ id: p._id, qty });
    }

    const items = products.map((p) => ({ product: p._id, name: p.name, unit: p.unit, price: p.price, qty: wanted.get(String(p._id))! }));
    const counter = await Counter.findOneAndUpdate({ _id: "order" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
    const address = { line: details.line, landmark: details.landmark, pincode: details.pincode };
    // the address's own number, not the account's: it may be a family member's, or shared
    const order = await Order.create({
      number: 1000 + counter!.seq!,
      user: user.id,
      ...(key && { key }),
      name: details.name,
      phone: details.phone,
      address,
      items,
      // what's paid at the door: the items less any coupon
      total: total - (coupon?.discount ?? 0),
      ...(coupon && { coupon }),
      deliverBy: new Date(Date.now() + settings.deliveryTo * 86_400_000),
      terms: TERMS_VERSION,
      history: [{ by: `${details.name} · ${details.phone}`, text: coupon ? `Booked with coupon ${coupon.code}, ₹${coupon.discount} off` : "Booked" }],
    });
    // bookings sent at the same moment all pass the count above: the ones past the cap are undone here
    if (capped && (await Order.countDocuments({ user: user.id, status: "placed", createdAt: { $lte: order.createdAt } })) > settings.maxWaiting) {
      await Order.deleteOne({ _id: order._id });
      throw new OrderError(waitingCap);
    }
    // the order stands from here: a failure below must not put its stock back (the catch would)
    taken.length = 0;
    // remembered for next time: the name if the account has none yet (staff booking for a caller keep
    // theirs), and a new address joins the address book; neither is worth failing a booked order for
    await User.updateOne({ _id: user.id, name: { $in: [null, "", "Customer"] } }, { name: details.name }).catch(console.error);
    await saveToBook(user.id, { ...address, phone: details.phone, label: details.label }).catch(console.error);
    return order;
  } catch (error) {
    await Promise.all(taken.map((t) => Product.updateOne({ _id: t.id }, { $inc: { stock: t.qty } })));
    // the same booking sent twice at once: the unique key let only the first through, and it stands
    const first = key && (error as { code?: number }).code === 11000 ? await Order.findOne({ user: user.id, key }) : null;
    if (first) return first;
    throw error;
  }
}

const sameAddress = (line: string, pincode: string) => ({ $elemMatch: { line: new RegExp(`^${line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), pincode } });

/**
 * Adds an address to the person's book unless it is already there (same address and pincode, any
 * capitals), in which case it keeps the number given this time. The first one becomes the default.
 * Returns false when the book is full.
 */
export async function saveToBook(userId: string, a: { line: string; landmark: string; pincode: string; phone: string; label?: string }) {
  await connectDB();
  const { matchedCount } = await User.updateOne({ _id: userId, addresses: sameAddress(a.line, a.pincode) }, { $set: { "addresses.$.phone": a.phone } });
  if (matchedCount) return true;
  const label = ADDRESS_LABELS.includes(a.label as never) ? a.label : "Home";
  const { modifiedCount } = await User.updateOne(
    { _id: userId, [`addresses.${MAX_ADDRESSES - 1}`]: { $exists: false } },
    { $push: { addresses: { label, line: a.line, landmark: a.landmark, pincode: a.pincode, phone: a.phone } } },
  );
  return modifiedCount > 0;
}

const OPEN: OrderStatus[] = ["placed", "packed", "out_for_delivery"];

type Stocked = { product?: Types.ObjectId | null; name?: string | null; qty?: number | null };
const putBack = (items: Stocked[]) => Promise.all(items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty! } })));

/** A cancelled order's lines taken off the shelf again, all or none. A product deleted since has no shelf to take from. */
async function takeBack(items: Stocked[]) {
  const taken: Stocked[] = [];
  for (const i of items) {
    if ((await Product.updateOne({ _id: i.product, stock: { $gte: i.qty } }, { $inc: { stock: -i.qty! } })).modifiedCount) taken.push(i);
    else if (await Product.exists({ _id: i.product })) {
      await putBack(taken);
      const left = (await Product.findById(i.product, "stock"))?.stock ?? 0;
      throw new OrderError(left ? `Only ${left} left of ${i.name}, so the order can't be booked again. Add stock first.` : `${i.name} is out of stock, so the order can't be booked again. Add stock first.`);
    }
  }
}

/**
 * Staff changing the status by hand, only the moves BY_HAND allows. Cancelling puts the stock back on
 * the shelf; booking a cancelled order again takes it off again, or says what's short. Delivered by hand
 * records the full amount as collected by that staff member, so the Cash page still asks for it.
 */
export async function setOrderStatus(orderId: string, status: OrderStatus, by: string) {
  if (!isValidObjectId(orderId)) return;
  await connectDB();
  const from = Object.keys(BY_HAND).filter((s) => BY_HAND[s].includes(status)) as OrderStatus[];
  const open = await Order.findOne({ _id: orderId, status: { $in: from } }, "total status items");
  if (!open) return;
  const reopening = open.status === "cancelled";
  if (reopening) await takeBack(open.items);
  const text = reopening ? "Cancel undone, booked again" : status === "delivered" ? `Marked ${STATUS_LABEL[status]}, ₹${open.total} to count in` : `Marked ${STATUS_LABEL[status]}`;
  const order = await Order.findOneAndUpdate(
    // reopening only from Cancelled: the stock just taken is for exactly that
    { _id: orderId, status: reopening ? "cancelled" : { $in: from } },
    {
      status,
      $push: { history: { by, text } },
      // delivered by the shop: the staff member holds the cash (Cash page), not the rider it was given to
      ...(status === "delivered" && { cash: { collected: open.total, collectedAt: new Date(), collectedBy: by }, $unset: { assignedTo: 1, assignedName: 1 } }),
    },
  );
  if (!order) {
    if (reopening) await putBack(open.items);
    return;
  }
  if (status === "cancelled") await putBack(order.items);
  if (status === "delivered") await issueBill(orderId);
  await audit(by, "order.status", `Order #${order.number}`, `${STATUS_LABEL[order.status]} → ${STATUS_LABEL[status]}`);
}

/** Gives an open order to a delivery person, or takes it back (staffId empty). */
export async function assignDelivery(orderId: string, staffId: string, by: string) {
  await connectDB();
  const rider = staffId ? await User.findOne({ _id: staffId, role: "delivery" }) : null;
  if (staffId && !rider) throw new OrderError("Pick someone from the delivery team.");
  const name = rider ? rider.name || rider.phone : "";
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: ["placed", "packed"] } },
    rider
      ? { assignedTo: rider._id, assignedName: name, $push: { history: { by, text: `Given to ${name} for delivery` } } }
      : { $unset: { assignedTo: 1, assignedName: 1 }, $push: { history: { by, text: "Taken off delivery" } } },
  );
  if (!order) throw new OrderError("Only orders not yet out for delivery can be given to someone.");
  await audit(by, "order.assign", `Order #${order.number}`, rider ? `to ${name}` : "unassigned");
}

/** The delivery person leaves with the order. */
export async function startDelivery(orderId: string, riderId: string, by: string) {
  await connectDB();
  const order = await Order.findOneAndUpdate(
    { _id: orderId, assignedTo: riderId, status: { $in: ["placed", "packed"] } },
    { status: "out_for_delivery", $push: { history: { by, text: "Out for delivery" } } },
  );
  if (!order) throw new OrderError("This order isn't waiting for you any more.");
  await audit(by, "delivery.start", `Order #${order.number}`, "");
}

/** At the door: the full amount in cash or UPI closes the order; the customer signs the printed delivery sheet. */
export async function completeDelivery(orderId: string, riderId: string, collected: number, by: string, method: "cash" | "upi" = "cash") {
  await connectDB();
  const open = await Order.findOne({ _id: orderId, assignedTo: riderId, status: "out_for_delivery" }, "total");
  if (!open) throw new OrderError("This delivery isn't open for you. Call the shop.");
  if (collected !== open.total) throw new OrderError(`Collect the full ${open.total} rupees before marking it delivered.`);

  const done = await Order.findOneAndUpdate(
    { _id: orderId, assignedTo: riderId, status: "out_for_delivery" },
    {
      status: "delivered",
      cash: { collected, collectedAt: new Date(), collectedBy: by, method },
      $push: { history: { by, text: `Delivered, ₹${collected} ${method === "upi" ? "paid by UPI" : "in cash"}` } },
    },
  );
  if (!done) throw new OrderError("This delivery has already changed.");
  await issueBill(orderId);
  await audit(by, "delivery.done", `Order #${done.number}`, `₹${collected} ${method === "upi" ? "by UPI" : "in cash"}`);
}

/** The Indian financial year a moment falls in, by India time: "26-27" runs 1 April 2026 to 31 March 2027. */
export function financialYear(at: Date) {
  const ist = new Date(at.getTime() + 330 * 60_000);
  const start = ist.getUTCFullYear() - (ist.getUTCMonth() < 3 ? 1 : 0);
  return `${String(start % 100).padStart(2, "0")}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/**
 * Orders a bill can be printed for: from when the shop accepts it (Packed), so a paper copy goes with the
 * delivery. GST lets the invoice be made before the goods leave (CGST Act s. 31(1)(a)).
 */
export const BILLABLE: OrderStatus[] = ["packed", "out_for_delivery", "delivered"];

/**
 * Gives an accepted order its bill (GST wants one for every sale) the first time staff open it, or at
 * delivery: the next number in the financial year's series, that moment, and the shop's details as they
 * are now, so a later change on Shop Details never rewrites an old bill. Safe to call again: an order
 * keeps its first bill. The order is claimed first, so two calls at the same moment can't both take a number.
 * ponytail: a crash between taking the number and saving it still skips one (the claim lapses after a
 * minute); GST wants the series unbroken, so note any such gap in the books.
 */

export async function issueBill(orderId: string) {
  await connectDB();
  const order = await Order.findOne({ _id: orderId, status: { $in: BILLABLE }, "bill.number": { $exists: false } }, "cash");
  if (!order) return;
  const claim = await Order.collection.updateOne(
    { _id: order._id, "bill.number": { $exists: false }, $or: [{ "bill.claimed": { $exists: false } }, { "bill.claimed": { $lt: new Date(Date.now() - 60_000) } }] },
    { $set: { "bill.claimed": new Date() } },
  );
  if (!claim.modifiedCount) return;
  const at = order.cash?.collectedAt ?? new Date();
  const fy = financialYear(at);
  const { legalName, address, gstin, gstScheme, phone, email, billPrefix, hsn, gstRate } = await shopDetails();
  const total = (await Order.findById(orderId, "total"))!.total;
  // CGST rule 46(e): an unregistered buyer is named, with address and State, from ₹50,000 of taxable value
  const taxable = billTitle({ gstin, gstScheme }) === "Tax Invoice" ? gstSplit(total, gstRate).taxable / 100 : total;
  const counter = await Counter.findOneAndUpdate({ _id: `bill ${fy}` }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  await Order.updateOne(
    { _id: orderId, "bill.number": { $exists: false } },
    {
      bill: {
        number: `${billPrefix}${fy}/${String(counter!.seq).padStart(4, "0")}`,
        at,
        rate: gstRate,
        hsn,
        named: taxable >= 50_000,
        shop: { legalName, address, gstin, gstScheme, phone, email },
      },
    },
  );
}

/**
 * Erases a customer at their request (DPDP Act, s. 12): the account, password, Google link, logins
 * and address book go. Bookings stay for the GST records, without the name, number and street address
 * (the pincode stays, for sales by area); a bill that must name its buyer (CGST rule 46) keeps them.
 */
export async function deleteAccount(userId: string, role: string) {
  await connectDB();
  if (role !== "customer") throw new OrderError("Staff accounts are removed by an owner on the Staff page.");
  if (await Order.exists({ user: userId, status: { $in: OPEN } }))
    throw new OrderError("You have a booking that isn’t delivered yet. Receive it, or ask the shop to cancel it, then delete your account.");
  for (const o of await Order.find({ user: userId, status: "delivered", "bill.number": { $exists: false } }, "_id")) await issueBill(String(o._id));
  const booked = { "h.text": { $in: ["Booked", "Order placed"] } };
  await Order.updateMany(
    { user: userId, "bill.named": { $ne: true } },
    { name: "Deleted customer", phone: "removed", "address.line": "Removed at the customer’s request", "address.landmark": "", "history.$[h].by": "Customer" },
    { arrayFilters: [booked] },
  );
  await Order.updateMany({ user: userId, "bill.named": true }, { phone: "removed", "history.$[h].by": "Customer" }, { arrayFilters: [booked] });
  const db = Order.db.db!;
  const ids = [new Types.ObjectId(userId), userId];
  await Promise.all([db.collection("authSessions").deleteMany({ userId: { $in: ids } }), db.collection("authAccounts").deleteMany({ userId: { $in: ids } })]);
  await User.deleteOne({ _id: userId });
  await audit("Customer", "account.delete", "A customer account", "deleted at the customer’s request");
}

/** Nobody home, wrong address…: the order goes back to Packed for another try. */
export async function deliveryFailed(orderId: string, riderId: string, reason: string, by: string) {
  await connectDB();
  if (reason.trim().length < 5) throw new OrderError("Say what happened, in a few words.");
  const order = await Order.findOneAndUpdate(
    { _id: orderId, assignedTo: riderId, status: "out_for_delivery" },
    { status: "packed", $push: { history: { by, text: `Couldn't deliver: ${reason.trim().slice(0, 300)}` } } },
  );
  if (!order) throw new OrderError("This delivery isn't open for you.");
  await audit(by, "delivery.failed", `Order #${order.number}`, reason.trim().slice(0, 300));
}

export async function addNote(orderId: string, text: string, by: string) {
  await connectDB();
  const note = text.trim().slice(0, 500);
  if (note.length < 2) throw new OrderError("Write the note first.");
  await Order.updateOne({ _id: orderId }, { $push: { history: { by, text: `Note: ${note}` } } });
}

/** The cash a delivery person brought back, counted at the shop. A difference stays on record. */
export async function receiveCash(orderId: string, received: number, by: string) {
  await connectDB();
  if (!Number.isInteger(received) || received < 0) throw new OrderError("Enter the rupees received.");
  const order = await Order.findOneAndUpdate(
    { _id: orderId, "cash.collected": { $exists: true }, "cash.receivedAt": { $exists: false } },
    { "cash.received": received, "cash.receivedAt": new Date(), "cash.receivedBy": by, $push: { history: { by, text: `Cash received at shop: ₹${received}` } } },
  );
  if (!order) throw new OrderError("This cash is already counted.");
  const short = order.cash!.collected! - received;
  await audit(by, "cash.received", `Order #${order.number}`, short ? `₹${received} of ₹${order.cash!.collected} (₹${short} short)` : `₹${received}`);
}

export { OPEN };
