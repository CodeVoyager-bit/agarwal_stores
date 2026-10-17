// Needs local MongoDB running. Run: npm test
// The bugs found in the end-to-end bug bash, each pinned so it stays fixed.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import mongoose from "mongoose";

// Always a throwaway local database (it is dropped), never the one in .env; and never a real SMS.
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017/agarwal_fatake_bugbash_test";
process.env.MOCK_OTP = "true";
const { connectDB, Order, Product, User } = await import("../src/lib/db");
const { assignDelivery, completeDelivery, placeOrder, setOrderStatus, startDelivery } = await import("../src/lib/orders");
const { applyImport, planImport, readSheet } = await import("../src/lib/stock-import");
const { xlsx } = await import("../src/lib/xlsx");
const { safeNext } = await import("../src/lib/auth");
const { goesWith } = await import("../src/lib/pairs");

await connectDB();
await mongoose.connection.dropDatabase();
await Order.createIndexes(); // dropping the database took the unique booking-id index with it
after(() => mongoose.disconnect());

const details = { name: "Bug Bash", phone: "9876543210", line: "12 Station Road, Civil Lines", landmark: "", pincode: "226001" };
let phones = 9876511000;
const person = async (fields = {}) => {
  const u = await User.create({ phone: String(phones++), ...fields });
  return { id: String(u._id) };
};

test("status by hand: no Out for Delivery, nothing after Delivered, Delivered by hand puts the cash on the books", async () => {
  const who = await person();
  const p = await Product.create({ name: "Hand Anar", category: "Anar", mrp: 100, price: 40, stock: 10 });
  const order = await placeOrder(who, [{ id: String(p._id), qty: 2 }], details);
  const id = String(order._id);
  const status = async () => (await Order.findById(id).lean())!;

  await setOrderStatus(id, "out_for_delivery", "Shop");
  assert.equal((await status()).status, "placed", "only Start Delivery sends it out");
  await setOrderStatus(id, "delivered", "Shop");
  const done = await status();
  assert.equal(done.status, "delivered");
  assert.equal(done.cash?.collected, 80);
  assert.equal(done.cash?.collectedBy, "Shop");
  await setOrderStatus(id, "cancelled", "Shop");
  await setOrderStatus(id, "placed", "Shop");
  assert.equal((await status()).status, "delivered", "delivered is final");
  assert.equal((await Product.findById(p._id).lean())!.stock, 8, "no restock of goods the customer has");
});

test("handover: a wrong amount doesn't use a code try; an order without a code can't be closed", async () => {
  const who = await person();
  const rider = await person({ role: "delivery" });
  const p = await Product.create({ name: "Door Rocket", category: "Rockets", mrp: 100, price: 50, stock: 10 });
  const order = await placeOrder(who, [{ id: String(p._id), qty: 1 }], details);
  const id = String(order._id);
  await assignDelivery(id, rider.id, "Shop");
  await startDelivery(id, rider.id, "Rider");
  const code = (await Order.findById(id).select("+handoverCode").lean())!.handoverCode!;
  for (let i = 0; i < 6; i++) await assert.rejects(completeDelivery(id, rider.id, code, 49, "Rider"), /full 50 rupees/);
  assert.equal((await Order.findById(id).lean())!.handoverTries, 0);

  await Order.updateOne({ _id: id }, { $unset: { handoverCode: 1 } });
  await assert.rejects(completeDelivery(id, rider.id, "", 50, "Rider"), /not right/);
});

test("ordering: one product split over many lines still counts as one; five waiting orders is the most", async () => {
  const who = await person();
  const p = await Product.create({ name: "Bulk Bomb", category: "Bombs", mrp: 10, price: 5, stock: 5000 });
  const line = { id: String(p._id), qty: 300 };
  await assert.rejects(placeOrder(who, [line, line], details), /At most 500/);
  assert.equal((await Product.findById(p._id).lean())!.stock, 5000);
  for (let i = 0; i < 5; i++) await placeOrder(who, [{ id: String(p._id), qty: 1 }], details);
  await assert.rejects(placeOrder(who, [{ id: String(p._id), qty: 1 }], details), /waiting for our call/);
});

test("checkout doesn't rename an account that has a name", async () => {
  const who = await person({ name: "Shop Owner" });
  const p = await Product.create({ name: "Phone Order Chakri", category: "Chakri", mrp: 10, price: 5, stock: 10 });
  await placeOrder(who, [{ id: String(p._id), qty: 1 }], { ...details, name: "Caller Name" });
  assert.equal((await User.findById(who.id).lean())!.name, "Shop Owner");
});

test("import: a blank Stock leaves the shelf alone, Add stock adds, Stock replaces", async () => {
  const p = await Product.create({ name: "Live Sparklers", category: "Sparklers", mrp: 100, price: 40, stock: 10 });
  const plan = (await planImport([["Name", "Price", "Stock now", "Add stock"], ["Live Sparklers", "45", "10", ""]])).rows;
  await Product.updateOne({ _id: p._id }, { $inc: { stock: -4 } }); // an order came in after the sheet was read
  await applyImport(plan, "test");
  let now = (await Product.findById(p._id).lean())!;
  assert.equal(now.price, 45);
  assert.equal(now.stock, 6, "the 4 sold stay sold");

  await applyImport((await planImport([["Name", "Price", "Add stock"], ["Live Sparklers", "45", "20"]])).rows, "test");
  now = (await Product.findById(p._id).lean())!;
  assert.equal(now.stock, 26);
  const recount = (await planImport([["Name", "Price", "Stock"], ["Live Sparklers", "45", "30"]])).rows[0];
  assert.match(recount.message!, /stock 26 → 30/);
});

test("import: names, headings, money and header forms shops really use", async () => {
  await Product.create({ name: "Old Bomb", category: "Bombs", mrp: 20, price: 10, stock: 3 });
  const rows = (
    await planImport([
      ["Description", "Name", "Category", "Price (Rs.)", "MRP (₹)", "On sale", "Pack"],
      ["Lasts 30 seconds, gold sparks", "Golden Rain", "Anar", "60/-", "Rs. 150/-", "", ""],
      ["", "Old Bomb", "", "", "", "no", ""],
      ["", "Long Pack Rocket", "Rockets", "10", "20", "", "x".repeat(41)],
    ])
  ).rows;
  const [rain, old, long] = rows;
  assert.equal(rain.fields?.name, "Golden Rain");
  assert.equal(rain.fields?.description, "Lasts 30 seconds, gold sparks");
  assert.equal(rain.fields?.price, 60);
  assert.equal(rain.fields?.mrp, 150);
  assert.equal(old.outcome, "update", "an existing product with only On sale changed is not a heading");
  assert.equal(old.fields?.active, false);
  assert.equal(long.outcome, "error");
});

test("login links only ever go to this site", () => {
  for (const bad of ["//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "https://evil.example", "/x\\y"]) assert.equal(safeNext(bad), "/");
  for (const good of ["/", "/cart", "/orders?placed=1005", "/admin/orders/abc"]) assert.equal(safeNext(good), good);
});

test("suggestions skip a sold-out shelf instead of showing nothing", () => {
  const item = (id: string, category: string, stock: number) => ({ id, name: id, category, unit: "", mrp: 10, price: 10, stock, image: "" });
  const items = [item("kids", "Kids Special", 0), item("anar-2", "Anar", 5), item("spark", "Sparklers", 5)];
  const picks = goesWith(items, ["Sparklers", "Chakri", "Anar"], new Set(["spark"]), []).map((i) => i.id);
  assert.deepEqual(picks, ["anar-2"]);
});


test("pressing Book again with the same booking id gives back the first order, even at the same moment", async () => {
  const who = await person();
  const p = await Product.create({ name: "Retry Anar", category: "Anar", mrp: 100, price: 40, stock: 10 });
  const line = [{ id: String(p._id), qty: 2 }];
  const first = await placeOrder(who, line, { ...details, key: "booking-key-1" });
  const again = await placeOrder(who, line, { ...details, key: "booking-key-1" });
  assert.equal(again.number, first.number);
  const both = await Promise.all([1, 2].map(() => placeOrder(who, line, { ...details, key: "booking-key-2" })));
  assert.equal(both[0].number, both[1].number);
  assert.equal(await Order.countDocuments({ user: who.id }), 2);
  assert.equal((await Product.findById(p._id).lean())!.stock, 6, "stock taken once per booking");
  const other = await person();
  assert.notEqual((await placeOrder(other, line, { ...details, key: "booking-key-1" })).number, first.number, "ids are per account");
});

test("paid by UPI at the door: recorded as UPI, not cash the rider carries", async () => {
  const who = await person();
  const rider = await person({ role: "delivery" });
  const p = await Product.create({ name: "UPI Rocket", category: "Rockets", mrp: 100, price: 70, stock: 5 });
  const id = String((await placeOrder(who, [{ id: String(p._id), qty: 1 }], details))._id);
  await assignDelivery(id, rider.id, "Shop");
  await startDelivery(id, rider.id, "Rider");
  const code = (await Order.findById(id).select("+handoverCode").lean())!.handoverCode!;
  await completeDelivery(id, rider.id, code, 70, "Rider", "upi");
  const done = (await Order.findById(id).lean())!;
  assert.equal(done.cash?.method, "upi");
  assert.match(done.history.at(-1)!.text!, /paid by UPI/);
  assert.equal(await Order.countDocuments({ assignedTo: rider.id, "cash.receivedAt": { $exists: false }, "cash.method": { $ne: "upi" }, "cash.collected": { $exists: true } }), 0);
});

test("Excel leaves out empty rows; problems still name the row people see", async () => {
  const dir = mkdtempSync(join(tmpdir(), "xlsx-gap-"));
  writeFileSync(join(dir, "a.xlsx"), xlsx([{ name: "Price list", rows: [["Name", "Category", "Price"], [], ["Gap Bomb", "Bombs", "abc"]] }]));
  execFileSync("unzip", ["-q", "a.xlsx", "-d", "parts"], { cwd: dir });
  const sheet = join(dir, "parts/xl/worksheets/sheet1.xml");
  writeFileSync(sheet, readFileSync(sheet, "utf8").replace(/<row r="2"[^>]*>(<\/row>)?|<row r="2"\/>/, ""));
  execFileSync("zip", ["-q", "-r", "-X", "../b.xlsx", "."], { cwd: join(dir, "parts") });
  const rows = readSheet(new Uint8Array(readFileSync(join(dir, "b.xlsx"))));
  assert.deepEqual(rows[2], ["Gap Bomb", "Bombs", "abc"]);
  const plan = (await planImport(rows)).rows.find((r) => r.name === "Gap Bomb")!;
  assert.equal(plan.outcome, "error");
  assert.equal(plan.line, 3);
});
