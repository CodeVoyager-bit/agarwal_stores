// Needs local MongoDB running. Run: npm test
import assert from "node:assert/strict";
import { after, test } from "node:test";
import mongoose from "mongoose";

// Always a throwaway local database (it is dropped), never the one in .env.
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017/agarwal_fatake_legal_test";
const { connectDB, Order, Shop, User } = await import("../src/lib/db");
const { billTitle, checkShop, gstSplit, readSettings, servesPincode, SETTING_DEFAULTS, shopDetails } = await import("../src/lib/legal");
const { deleteAccount, financialYear, issueBill, OrderError, placeOrder } = await import("../src/lib/orders");
const { Product } = await import("../src/lib/db");
const { planImport } = await import("../src/lib/stock-import");

await connectDB();
// the index builds Mongoose starts on import finish first, or they can outlive this quick file's disconnect
await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
await mongoose.connection.dropDatabase();
after(() => mongoose.disconnect());

const shop = { ...SETTING_DEFAULTS, legalName: "Agarwal Stores", address: "Main Road, Nagothane 402106", phone: "", courts: "" };

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

test("the Settings form: numbers, ticks, a phone typed any way, pincodes in any spacing", () => {
  const form = new Map<string, string>([
    ["legalName", "  Agarwal   Stores "],
    ["address", "Main Road\r\nNagothane 402106"],
    ["phone", "+91 98765 43210"],
    ["gstScheme", "regular"],
    ["gstRate", "18"],
    ["billPrefix", "ags/"],
    ["billLogo", "on"],
    ["hsn", "3604"],
    ["deliveryFrom", "2"],
    ["deliveryTo", "5"],
    ["pincodes", "402106 402107,402108"],
    ["minOrder", "500"],
    ["maxWaiting", "5"],
    ["showLeftBelow", "10"],
    ["lowStock", "5"],
  ]);
  const s = readSettings((key) => form.get(key) ?? null);
  assert.equal(s.legalName, "Agarwal Stores");
  assert.equal(s.address, "Main Road\nNagothane 402106");
  assert.equal(s.phone, "9876543210");
  assert.equal(s.billPrefix, "AGS/");
  assert.equal(s.gstRate, 18);
  assert.equal(s.billLogo, true);
  assert.equal(s.billHsnColumn, false, "an unticked box is off");
  assert.equal(s.pincodes, "402106, 402107, 402108");
  assert.equal(checkShop(s), null);
  assert.ok(servesPincode(s, "402107"));
  assert.ok(!servesPincode(s, "400001"));
  assert.ok(servesPincode({ ...s, pincodes: "" }, "400001"), "no list takes any pincode");
  // each rule refuses what it should
  assert.match(checkShop({ ...s, deliveryFrom: 6 })!, /first delivery day/);
  assert.match(checkShop({ ...s, minOrder: Number.NaN })!, /whole number/);
  assert.match(checkShop({ ...s, maxWaiting: 0 })!, /whole number/);
  assert.match(checkShop({ ...s, billPrefix: "AGS#" })!, /prefix/);
  assert.match(checkShop({ ...s, hsn: "36" })!, /HSN/);
  assert.match(checkShop({ ...s, pincodes: "4021, 402107" })!, /Pincodes/);
  assert.match(checkShop({ ...s, upiId: "shop" })!, /UPI/);
  assert.match(checkShop({ ...s, gstRate: 12 })!, /choices/);
  assert.match(checkShop({ ...s, phone: "12345" })!, /mobile/);
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

// made in the first test that needs it: a top-level await here would let the runner finish the tests
// above and close the database while it's still running
let customer: { _id: mongoose.Types.ObjectId };
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
  customer = await User.create({ phone: "9811111111", name: "Bill Buyer" });
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

test("Settings rule booking: paused, the pincodes served and the smallest booking; staff aren't held to them", async () => {
  const buyer = await User.create({ phone: "9822222222", name: "Rule Tester" });
  const p = await Product.create({ name: "Settings Anar", category: "Anar", mrp: 100, price: 100, stock: 50 });
  const where = { name: "Rule Tester", phone: "9822222222", line: "4 Market Road, Nagothane", landmark: "", pincode: "402106" };
  const book = (role = "customer", pincode = "402106", qty = 1) => placeOrder({ id: String(buyer._id), role }, [{ id: String(p._id), qty }], { ...where, pincode });
  await Shop.updateOne({ _id: "shop" }, { bookingsOpen: false, closedMessage: "Closed till Monday." });
  await assert.rejects(book(), /Closed till Monday/);
  await book("admin");
  await Shop.updateOne({ _id: "shop" }, { bookingsOpen: true, pincodes: "402106, 402107", minOrder: 300, deliveryTo: 2 });
  await assert.rejects(book("customer", "400001", 3), /deliver to 400001/);
  await assert.rejects(book("customer", "402107", 2), /smallest booking is ₹300/);
  const order = await book("customer", "402107", 3);
  const days = (order.deliverBy.getTime() - order.createdAt.getTime()) / 86_400_000;
  assert.ok(days > 1.9 && days < 2.1, "deliver by follows Settings");
});

test("a new bill takes Settings' prefix, HSN and rate; it keeps them after Settings change", async () => {
  await Shop.updateOne({ _id: "shop" }, { billPrefix: "AGS/", hsn: "36041000", gstRate: 5, phone: "9876543210" });
  const sold = await order("delivered", 1000);
  await issueBill(String(sold._id));
  await Shop.updateOne({ _id: "shop" }, { billPrefix: "", gstRate: 18 });
  const bill = (await Order.findById(sold._id))!.bill!;
  assert.match(bill.number!, /^AGS\/\d\d-\d\d\/\d{4}$/);
  assert.equal(bill.hsn, "36041000");
  assert.equal(bill.rate, 5);
  assert.equal(bill.shop!.phone, "9876543210");
});
