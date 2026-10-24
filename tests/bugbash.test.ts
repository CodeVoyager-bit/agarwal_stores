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
const { assignDelivery, completeDelivery, deleteAccount, issueBill, placeOrder, setOrderStatus, startDelivery } = await import("../src/lib/orders");
const { applyImport, planImport, readSheet } = await import("../src/lib/stock-import");
const { xlsx } = await import("../src/lib/xlsx");
const { safeNext } = await import("../src/lib/auth");
const { goesWith } = await import("../src/lib/pairs");
const { catName } = await import("../src/lib/i18n");
const { DICTS } = await import("../src/lib/i18n/dict");

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
  assert.equal((await status()).status, "out_for_delivery", "the shop can send it out by hand");
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
  await completeDelivery(id, rider.id, 70, "Rider", "upi");
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

// ---- bug bash 2

test("a product the shop hasn't priced yet (₹0) can't be booked, even from an old cart", async () => {
  const who = await person();
  const p = await Product.create({ name: "Unpriced Rocket", category: "Rockets", mrp: 0, price: 0, stock: 50 });
  await assert.rejects(placeOrder(who, [{ id: String(p._id), qty: 5 }], details), /no longer sold/);
  assert.equal((await Product.findById(p._id).lean())!.stock, 50);
});

test("an old booking id books afresh instead of bringing back a cancelled order", async () => {
  const who = await person();
  const p = await Product.create({ name: "Key Anar", category: "Anar", mrp: 100, price: 40, stock: 10 });
  const line = [{ id: String(p._id), qty: 1 }];
  const first = await placeOrder(who, line, { ...details, key: "old-booking-key" });
  await setOrderStatus(String(first._id), "cancelled", "Shop");
  await Order.collection.updateOne({ _id: first._id }, { $set: { createdAt: new Date(Date.now() - 2 * 3_600_000) } }); // two hours ago
  const again = await placeOrder(who, line, { ...details, key: "old-booking-key" });
  assert.notEqual(again.number, first.number);
  assert.equal(again.status, "placed");
});

test("bookings sent all at once still stop at five waiting", async () => {
  const who = await person();
  const p = await Product.create({ name: "Rush Bomb", category: "Bombs", mrp: 10, price: 5, stock: 1000 });
  const tries = await Promise.allSettled(Array.from({ length: 12 }, (_, n) => placeOrder(who, [{ id: String(p._id), qty: 10 }], { ...details, key: `rush-key-${n}` })));
  const waiting = await Order.countDocuments({ user: who.id, status: "placed" });
  assert.ok(waiting <= 5, `${waiting} waiting`);
  assert.equal((await Product.findById(p._id).lean())!.stock, 1000 - 10 * waiting, "stock of the undone ones is back");
  assert.ok(tries.some((t) => t.status === "rejected"));
});

test("a bill opened many times at once takes exactly one number", async () => {
  const who = await person();
  const p = await Product.create({ name: "Bill Chakri", category: "Chakri", mrp: 100, price: 50, stock: 10 });
  const order = await placeOrder(who, [{ id: String(p._id), qty: 1 }], details);
  await Order.updateOne({ _id: order._id }, { status: "delivered", cash: { collected: 50, collectedAt: new Date(), collectedBy: "Shop" } });
  const before = (await mongoose.connection.collection("counters").find({ _id: { $regex: /^bill / } as never }).toArray()).reduce((n, c) => n + (c.seq as number), 0);
  await Promise.all(Array.from({ length: 8 }, () => issueBill(String(order._id))));
  const after = (await mongoose.connection.collection("counters").find({ _id: { $regex: /^bill / } as never }).toArray()).reduce((n, c) => n + (c.seq as number), 0);
  assert.equal(after - before, 1);
  assert.ok((await Order.findById(order._id).lean())!.bill?.number);
});

test("deleting an account makes any bill still owed first, so a big one keeps the buyer's name", async () => {
  const who = await person({ name: "Big Buyer" });
  const p = await Product.create({ name: "Gift Box Grand", category: "Gift Boxes", mrp: 70000, price: 60000, stock: 2 });
  const order = await placeOrder(who, [{ id: String(p._id), qty: 1 }], { ...details, name: "Big Buyer" });
  await Order.updateOne({ _id: order._id }, { status: "delivered", cash: { collected: 60000, collectedAt: new Date(), collectedBy: "Shop" } });
  await deleteAccount(who.id, "customer");
  const kept = (await Order.findById(order._id).lean())!;
  assert.equal(kept.bill?.named, true);
  assert.equal(kept.name, "Big Buyer");
  assert.equal(kept.phone, "removed");
});

test("suggestions leave out products not priced yet", () => {
  const item = (id: string, category: string, price: number) => ({ id, name: id, category, unit: "", mrp: price, price, stock: 5, image: "" });
  const picks = goesWith([item("free-anar", "Anar", 0), item("anar", "Anar", 40)], ["Sparklers"], new Set(), []).map((i) => i.id);
  assert.deepEqual(picks, ["anar"]);
});

test("blank rows under a short price list don't count towards the row limit", async () => {
  const rows = [["Name", "Category", "Price"], ["Blank Tail Sparkler", "Sparklers", "30"], ...Array.from({ length: 1200 }, () => ["", "", ""])];
  const { problem, rows: plan } = await planImport(rows);
  assert.equal(problem, undefined);
  assert.equal(plan.filter((r) => r.outcome === "create").length, 1);
});

test("a shelf named like a built-in name shows as typed instead of crashing the page", () => {
  assert.equal(catName(DICTS.hi, "constructor"), "constructor");
  assert.equal(catName(DICTS.hi, "Anar"), DICTS.hi.common.categories.Anar);
});


test("the shelves list products not priced yet after all the ones people can book", async () => {
  await Product.create([
    { name: "Unpriced Sorting Rocket", category: "Rockets", mrp: 120, price: 0, stock: 5 },
    { name: "Priced Sorting Rocket", category: "Rockets", mrp: 120, price: 60, stock: 5 },
  ]);
  const { shopItems } = await import("../src/lib/db");
  const prices = (await shopItems()).map((i) => i.price);
  assert.ok(prices.includes(0));
  assert.equal(prices.findIndex((p) => p === 0), prices.length - prices.filter((p) => p === 0).length, "an unpriced one before a priced one");
});

test("the shelves list sold-out products after all the ones in stock", async () => {
  await Product.create([
    { name: "Cheap Sold-out Rocket", category: "Rockets", mrp: 20, price: 1, stock: 0 },
    { name: "Dear In-stock Rocket", category: "Rockets", mrp: 900, price: 800, stock: 5 },
  ]);
  const { shopItems } = await import("../src/lib/db");
  const names = (await shopItems()).map((i) => i.name);
  assert.ok(names.indexOf("Dear In-stock Rocket") < names.indexOf("Cheap Sold-out Rocket"));
});

test("photo links with a ?query aren't shrunk by the image service, so nobody can spend its quota with ?n=1, ?n=2…", async () => {
  const { resizable } = await import("../src/lib/image-hosts");
  assert.equal(resizable("https://standardcrackers.in/assets/uploads/a.jpg"), true);
  assert.equal(resizable("https://standardcrackers.in/assets/uploads/a.jpg?n=1"), false);
  assert.equal(resizable("https://example.com/a.jpg"), false);
});

test("a form whose connection drops gets a message back, with what was there kept; a server error still throws", async () => {
  const { offlineSafe } = await import("../src/components/action-form");
  const form = new FormData();
  const offline = offlineSafe(async (): Promise<{ id?: string; error?: string; ok?: string }> => {
    throw new TypeError("Failed to fetch");
  });
  assert.deepEqual(await offline({ id: "9876543210", ok: "Code sent." }, form), { id: "9876543210", ok: undefined, error: "Couldn't reach the shop. Check your internet and try again." });
  const broken = offlineSafe(async (): Promise<{ error?: string } | null> => {
    throw Object.assign(new TypeError("x is undefined"), { digest: "123" });
  });
  await assert.rejects(broken(null, form), /x is undefined/);
  assert.ok(DICTS.hi.messages["Couldn't reach the shop. Check your internet and try again."], "the message has a Hindi version");
});

test("a cancelled order can be booked again: its stock comes off the shelf again, or it says what's short", async () => {
  const who = await person();
  const p = await Product.create({ name: "Undo Chakri", category: "Chakri", mrp: 100, price: 50, stock: 3 });
  const order = await placeOrder(who, [{ id: String(p._id), qty: 2 }], details);
  const id = String(order._id);
  const stock = async () => (await Product.findById(p._id).lean())!.stock;
  await setOrderStatus(id, "cancelled", "Shop");
  assert.equal(await stock(), 3, "cancelling puts the stock back");

  await Product.updateOne({ _id: p._id }, { stock: 1 });
  await assert.rejects(setOrderStatus(id, "placed", "Shop"), /Only 1 left of Undo Chakri/);
  assert.equal((await Order.findById(id).lean())!.status, "cancelled");
  assert.equal(await stock(), 1, "nothing taken when it can't be booked again");

  await Product.updateOne({ _id: p._id }, { stock: 5 });
  await setOrderStatus(id, "placed", "Shop");
  const again = (await Order.findById(id).lean())!;
  assert.equal(again.status, "placed");
  assert.equal(again.history.at(-1)?.text, "Cancel undone, booked again");
  assert.equal(await stock(), 3, "its 2 come off the shelf again");
});
