// Needs local MongoDB running. Run: npm test
import assert from "node:assert/strict";
import { after, test } from "node:test";
import mongoose from "mongoose";

// Always a throwaway local database (it is dropped), never the one in .env.
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017/agarwal_fatake_legal_test";
const { connectDB, Order, Shop, User } = await import("../src/lib/db");
const { billTitle, checkShop, gstSplit, shopDetails } = await import("../src/lib/legal");
const { deleteAccount, financialYear, issueBill, OrderError } = await import("../src/lib/orders");
const { planImport } = await import("../src/lib/stock-import");

await connectDB();
// the index builds Mongoose starts on import finish first, or they can outlive this quick file's disconnect
await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
await mongoose.connection.dropDatabase();
after(() => mongoose.disconnect());

const shop = { legalName: "Agarwal Stores", address: "Main Road, Nagothane 402106", gstin: "", gstScheme: "regular", licence: "", grievanceOfficer: "", email: "", courts: "" };

test("shop details: name and address needed, GSTIN and email checked only when given", () => {
  assert.equal(checkShop(shop), null);
  assert.match(checkShop({ ...shop, address: "" })!, /address/);
  assert.equal(checkShop({ ...shop, gstin: "27ABCDE1234F1Z5" }), null);
  assert.match(checkShop({ ...shop, gstin: "27ABCDE1234F1" })!, /GSTIN/);
  assert.match(checkShop({ ...shop, email: "shop@" })!, /email/);
});

test("the pages show the defaults until an owner saves, then exactly what was saved", async () => {
  assert.equal((await shopDetails()).courts, "Raigad, Maharashtra");
  await Shop.updateOne({ _id: "shop" }, { ...shop }, { upsert: true });
  assert.deepEqual(await shopDetails(), shop);
});

test("a price list's Manufacturer column fills the maker", async () => {
  const { rows } = await planImport([["Name", "Category", "Price", "Manufacturer"], ["Maker Anar", "Anar", "90", "Standard Fireworks, Sivakasi"]]);
  assert.equal(rows[0].fields!.maker, "Standard Fireworks, Sivakasi");
});

test("GST inside a price: taxable value, CGST and SGST add back up to the paise", () => {
  assert.deepEqual(gstSplit(100), { taxable: 8474, cgst: 763, sgst: 763 });
  for (const total of [1, 47, 999, 12345]) {
    const t = gstSplit(total);
    assert.equal(t.taxable + t.cgst + t.sgst, total * 100);
    assert.equal(t.cgst, t.sgst, "both 9%, so both the same amount");
  }
  assert.equal(billTitle({ gstin: "" }), "Bill");
  assert.equal(billTitle({ gstin: "27ABCDE1234F1Z5", gstScheme: "regular" }), "Tax Invoice");
  assert.equal(billTitle({ gstin: "27ABCDE1234F1Z5", gstScheme: "composition" }), "Bill of Supply");
});

test("the financial year turns at midnight on 1 April, India time", () => {
  assert.equal(financialYear(new Date("2026-03-31T18:00:00Z")), "25-26"); // 11:30 pm, 31 March
  assert.equal(financialYear(new Date("2026-03-31T19:00:00Z")), "26-27"); // 12:30 am, 1 April
  assert.equal(financialYear(new Date("2027-01-15T06:00:00Z")), "26-27");
});

const customer = await User.create({ phone: "9811111111", name: "Bill Buyer" });
let number = 5000;
const order = (status: "placed" | "delivered", total = 300, at = new Date("2026-10-20T10:00:00Z")) =>
  Order.create({
    number: number++,
    user: customer._id,
    name: "Bill Buyer",
    phone: "9811111111",
    address: { line: "4 Market Road, Nagothane", pincode: "402106" },
    items: [{ product: new mongoose.Types.ObjectId(), name: "Anar", unit: "10 pcs", price: total, qty: 1 }],
    total,
    status,
    deliverBy: at,
    history: [{ by: "Bill Buyer · 9811111111", text: "Booked" }],
    ...(status === "delivered" && { cash: { collected: total, collectedAt: at, collectedBy: "Rider" } }),
  });

test("each delivery gets the next bill number of its year, once, with the shop as it was then", async () => {
  const [a, b, open] = [await order("delivered"), await order("delivered", 60_000), await order("placed")];
  await issueBill(String(a._id));
  await issueBill(String(b._id));
  await issueBill(String(a._id));
  await issueBill(String(open._id));
  await Shop.updateOne({ _id: "shop" }, { legalName: "Renamed Later" });
  const [billA, billB] = [(await Order.findById(a._id))!.bill!, (await Order.findById(b._id))!.bill!];
  assert.equal(billA.number, "26-27/0001");
  assert.equal(billB.number, "26-27/0002");
  assert.equal(billA.shop!.legalName, "Agarwal Stores");
  assert.equal((await Order.findById(open._id))!.bill?.number, undefined);
});

test("deleting an account: blocked while a booking is open, then the person's details go", async () => {
  await assert.rejects(deleteAccount(String(customer._id), "customer"), OrderError);
  await assert.rejects(deleteAccount(String(customer._id), "admin"), /Staff/);
  await Order.updateMany({ user: customer._id, status: "placed" }, { status: "cancelled" });
  await mongoose.connection.db!.collection("authSessions").insertOne({ userId: customer._id, token: "t", expiresAt: new Date(Date.now() + 1e6) });

  await deleteAccount(String(customer._id), "customer");
  assert.equal(await User.exists({ _id: customer._id }), null);
  assert.equal(await mongoose.connection.db!.collection("authSessions").countDocuments({ userId: customer._id }), 0);
  const small = (await Order.findOne({ user: customer._id, total: 300, status: "delivered" }))!;
  assert.equal(small.name, "Deleted customer");
  assert.equal(small.phone, "removed");
  assert.equal(small.history[0].by, "Customer");
  assert.equal(small.bill!.number, "26-27/0001", "the bill stays, for GST");
  // ₹50,000 or more: the bill must name the buyer, so the name and address stay
  const big = (await Order.findOne({ user: customer._id, total: 60_000 }))!;
  assert.equal(big.name, "Bill Buyer");
  assert.equal(big.phone, "removed");
});
