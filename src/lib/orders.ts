import { randomInt, timingSafeEqual } from "node:crypto";
import { isValidObjectId, type Types } from "mongoose";
import { ADDRESS_LABELS, audit, connectDB, Counter, MAX_ADDRESSES, Order, Product, User, type OrderStatus } from "./db";
import { STATUS_LABEL } from "./format";
import { mockOtp, sendCode } from "./sms";

export const DELIVERY_DAYS = 4;

/** A mistake the person can fix; its message is safe to show them. */
export class OrderError extends Error {}

type Line = { id: string; qty: number };
type Details = { name: string; phone: string; line: string; landmark: string; pincode: string; label?: string };

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
export async function placeOrder(user: { id: string }, lines: Line[], details: Details) {
  await connectDB();
  const wanted = new Map<string, number>();
  for (const { id, qty } of lines) {
    if (!isValidObjectId(id) || !Number.isInteger(qty) || qty < 1 || qty > 500)
      throw new OrderError("Your cart has an item we can't read. Please refresh the page.");
    wanted.set(id, (wanted.get(id) ?? 0) + qty);
  }
  if (!wanted.size) throw new OrderError("Your cart is empty.");
  const problem = checkDetails(details);
  if (problem) throw new OrderError(problem);

  const products = await Product.find({ _id: { $in: [...wanted.keys()] }, active: true });
  if (products.length !== wanted.size)
    throw new OrderError("Some items in your cart are no longer sold. Please refresh the page.");

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
      name: details.name,
      phone: details.phone,
      address,
      items,
      total: items.reduce((sum, i) => sum + i.price * i.qty, 0),
      deliverBy: new Date(Date.now() + DELIVERY_DAYS * 86_400_000),
      history: [{ by: `${details.name} · ${details.phone}`, text: "Order placed" }],
    });
    // remembered for next time: the name, and a new address joins the address book
    await User.updateOne({ _id: user.id }, { name: details.name });
    await saveToBook(user.id, { ...address, phone: details.phone, label: details.label });
    return order;
  } catch (error) {
    await Promise.all(taken.map((t) => Product.updateOne({ _id: t.id }, { $inc: { stock: t.qty } })));
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

/** Staff changing the status by hand. Cancelled is final: its stock goes back on the shelf exactly once. */
export async function setOrderStatus(orderId: string, status: OrderStatus, by: string) {
  await connectDB();
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: { $nin: ["cancelled", status] } },
    { status, $push: { history: { by, text: `Marked ${STATUS_LABEL[status]}` } }, ...(status === "cancelled" && { $unset: { handoverCode: 1 } }) },
  );
  if (!order) return;
  if (status === "cancelled")
    await Promise.all(order.items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty! } })));
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

/**
 * The delivery person leaves with the order. A fresh handover code goes to the customer (shown on
 * their My Orders page, and by WhatsApp/SMS when MiniMoth is set up).
 */
export async function startDelivery(orderId: string, riderId: string, by: string) {
  await connectDB();
  const code = String(randomInt(100000, 1000000));
  const order = await Order.findOneAndUpdate(
    { _id: orderId, assignedTo: riderId, status: { $in: ["placed", "packed"] } },
    { status: "out_for_delivery", handoverCode: code, handoverTries: 0, $push: { history: { by, text: "Out for delivery" } } },
  );
  if (!order) throw new OrderError("This order isn't waiting for you any more.");
  await audit(by, "delivery.start", `Order #${order.number}`, "");
  // the customer can always read the code on their order page, so a failed message isn't fatal
  if (!mockOtp()) await sendCode(order.phone, code);
}

/** At the door: the customer's code and the full amount in cash or UPI close the order. */
export async function completeDelivery(orderId: string, riderId: string, code: string, collected: number, by: string) {
  await connectDB();
  // one try used per check, so five wrong codes lock it until the shop restarts the delivery
  const order = await Order.findOneAndUpdate(
    { _id: orderId, assignedTo: riderId, status: "out_for_delivery", handoverTries: { $lt: 5 } },
    { $inc: { handoverTries: 1 } },
  ).select("+handoverCode");
  if (!order) throw new OrderError("This delivery isn't open for you, or the code was tried too many times. Call the shop.");
  const a = Buffer.from(order.handoverCode ?? "");
  const b = Buffer.from(code);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new OrderError("That code is not right. Ask the customer to read it again from their order page.");
  if (collected !== order.total) throw new OrderError(`Collect the full ${order.total} rupees before marking it delivered.`);

  const now = new Date();
  const done = await Order.findOneAndUpdate(
    { _id: orderId, status: "out_for_delivery" },
    {
      status: "delivered",
      cash: { collected, collectedAt: now, collectedBy: by },
      $unset: { handoverCode: 1 },
      $push: { history: { by, text: `Delivered, collected ₹${collected}` } },
    },
  );
  if (!done) throw new OrderError("This delivery has already changed.");
  await audit(by, "delivery.done", `Order #${order.number}`, `collected ₹${collected}`);
}

/** Nobody home, wrong address…: the order goes back to Packed for another try. */
export async function deliveryFailed(orderId: string, riderId: string, reason: string, by: string) {
  await connectDB();
  if (reason.trim().length < 5) throw new OrderError("Say what happened, in a few words.");
  const order = await Order.findOneAndUpdate(
    { _id: orderId, assignedTo: riderId, status: "out_for_delivery" },
    { status: "packed", $unset: { handoverCode: 1 }, $push: { history: { by, text: `Couldn't deliver: ${reason.trim().slice(0, 300)}` } } },
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
