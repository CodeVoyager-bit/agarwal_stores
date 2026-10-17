// Needs local MongoDB running. Run: npm test
import assert from "node:assert/strict";
import { after, test } from "node:test";
import mongoose from "mongoose";

// Always a throwaway local database (it is dropped), never the one in .env; and never a real SMS.
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017/agarwal_fatake_test";
process.env.MOCK_OTP = "true";
const { Audit, connectDB, Order, Product, User } = await import("../src/lib/db");
const { assignDelivery, completeDelivery, deliveryFailed, OrderError, placeOrder, receiveCash, saveToBook, setOrderStatus, startDelivery } = await import("../src/lib/orders");

await connectDB();
await mongoose.connection.dropDatabase();
after(() => mongoose.disconnect());

const details = { name: "Test Customer", phone: "9876543210", line: "12 Station Road, Civil Lines", landmark: "", pincode: "226001" };

test("stock is taken once, never oversold, and returned once on cancel", async () => {
  const user = await User.create({ phone: "9876543210" });
  const who = { id: String(user._id), phone: user.phone! };
  const a = await Product.create({ name: "Anar", category: "Anar", mrp: 100, price: 40, stock: 3 });
  const b = await Product.create({ name: "Rocket", category: "Rockets", mrp: 50, price: 20, stock: 1 });

  const order = await placeOrder(who, [{ id: String(a._id), qty: 2 }, { id: String(b._id), qty: 1 }], details);
  assert.equal(order.total, 2 * 40 + 20);
  assert.equal((await Product.findById(a._id))!.stock, 1);

  // short on one line: nothing ordered, the other line's stock is put back
  await assert.rejects(placeOrder(who, [{ id: String(a._id), qty: 1 }, { id: String(b._id), qty: 1 }], details), OrderError);
  assert.equal((await Product.findById(a._id))!.stock, 1);
  assert.equal(await Order.countDocuments(), 1);

  // two customers racing for the last one: exactly one gets it
  const race = await Promise.allSettled([1, 2].map(() => placeOrder(who, [{ id: String(a._id), qty: 1 }], details)));
  assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await Product.findById(a._id))!.stock, 0);

  await setOrderStatus(String(order._id), "cancelled", "test");
  await setOrderStatus(String(order._id), "cancelled", "test");
  await setOrderStatus(String(order._id), "delivered", "test"); // cancelled is final
  assert.equal((await Order.findById(order._id))!.status, "cancelled");
  assert.equal((await Product.findById(a._id))!.stock, 2);
  assert.equal((await Product.findById(b._id))!.stock, 1);
});

test("bad carts and details are refused before touching stock", async () => {
  const who = { id: String(new mongoose.Types.ObjectId()), phone: "9876543211" };
  await assert.rejects(placeOrder(who, [], details), /empty/);
  await assert.rejects(placeOrder(who, [{ id: "nope", qty: 1 }], details), OrderError);
  await assert.rejects(placeOrder(who, [{ id: String(new mongoose.Types.ObjectId()), qty: 0 }], details), OrderError);
  await assert.rejects(placeOrder(who, [{ id: String(new mongoose.Types.ObjectId()), qty: 1 }], { ...details, pincode: "12" }), /pincode/);
});

test("delivery: only the assigned person, only with the customer's code and the full amount", async () => {
  const customer = await User.create({ phone: "9876500001" });
  const rider = await User.create({ phone: "9876500002", name: "Ramesh", role: "delivery" });
  const other = await User.create({ phone: "9876500003", role: "delivery" });
  const shopper = await User.create({ phone: "9876500004" }); // a customer can't be given deliveries
  const p = await Product.create({ name: "Chakri", category: "Chakri", mrp: 200, price: 80, stock: 10 });
  const order = await placeOrder({ id: String(customer._id) }, [{ id: String(p._id), qty: 2 }], details);
  const id = String(order._id);

  await assert.rejects(assignDelivery(id, String(shopper._id), "owner"), OrderError);
  await assignDelivery(id, String(rider._id), "owner");
  await assert.rejects(startDelivery(id, String(other._id), "other"), OrderError);
  await startDelivery(id, String(rider._id), "Ramesh");
  const code = (await Order.findById(id).select("+handoverCode"))!.handoverCode!;
  assert.match(code, /^\d{6}$/);
  assert.equal((await Order.findById(id).lean())!.handoverCode, undefined, "the code is not selected by default");

  const wrong = code === "000000" ? "111111" : "000000";
  await assert.rejects(completeDelivery(id, String(rider._id), wrong, 160, "Ramesh"), /code is not right/);
  await assert.rejects(completeDelivery(id, String(rider._id), code, 100, "Ramesh"), /full 160/);
  await assert.rejects(completeDelivery(id, String(other._id), code, 160, "other"), OrderError);
  await completeDelivery(id, String(rider._id), code, 160, "Ramesh");
  const done = (await Order.findById(id).select("+handoverCode").lean())!;
  assert.equal(done.status, "delivered");
  assert.equal(done.cash!.collected, 160);
  assert.equal(done.handoverCode, undefined, "a used code is gone");

  await receiveCash(id, 150, "owner");
  await assert.rejects(receiveCash(id, 160, "owner"), /already counted/);
  assert.equal((await Order.findById(id).lean())!.cash!.received, 150);
  assert.ok(await Audit.findOne({ action: "cash.received", detail: /10 short/ }));
});

test("delivery: five wrong codes lock it; a missed delivery goes back to packed", async () => {
  const customer = await User.create({ phone: "9876500005" });
  const rider = await User.create({ phone: "9876500006", role: "delivery" });
  const p = await Product.create({ name: "Rocket", category: "Rockets", mrp: 50, price: 20, stock: 10 });
  const order = await placeOrder({ id: String(customer._id) }, [{ id: String(p._id), qty: 1 }], details);
  const id = String(order._id);
  await assignDelivery(id, String(rider._id), "owner");
  await startDelivery(id, String(rider._id), "r");
  const code = (await Order.findById(id).select("+handoverCode"))!.handoverCode!;
  const wrong = code === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++) await assert.rejects(completeDelivery(id, String(rider._id), wrong, 20, "r"));
  await assert.rejects(completeDelivery(id, String(rider._id), code, 20, "r"), /too many times/);

  await assert.rejects(deliveryFailed(id, String(rider._id), "no", "r"), /few words/);
  await deliveryFailed(id, String(rider._id), "Nobody home", "r");
  const back = (await Order.findById(id).lean())!;
  assert.equal(back.status, "packed");
  assert.match(back.history.at(-1)!.text!, /Nobody home/);
});

test("address book: a new checkout address is saved once, any capitals; at most 10", async () => {
  const customer = await User.create({ phone: "9876500007" });
  const who = { id: String(customer._id) };
  const p = await Product.create({ name: "Pencil", category: "Kids Special", mrp: 40, price: 20, stock: 50 });
  await placeOrder(who, [{ id: String(p._id), qty: 1 }], { ...details, label: "Work" });
  await placeOrder(who, [{ id: String(p._id), qty: 1 }], { ...details, line: details.line.toUpperCase() });
  let book = (await User.findById(customer._id).lean())!.addresses!;
  assert.equal(book.length, 1);
  assert.equal(book[0].label, "Work");
  // the same number may sit on many addresses, here and on other accounts; a repeat address takes the newest number
  const other = await User.create({ phone: "9876500008" });
  await placeOrder({ id: String(other._id) }, [{ id: String(p._id), qty: 1 }], details);
  await placeOrder(who, [{ id: String(p._id), qty: 1 }], { ...details, phone: "9000000001" });
  book = (await User.findById(customer._id).lean())!.addresses!;
  assert.equal(book.length, 1);
  assert.equal(book[0].phone, "9000000001");
  assert.equal((await User.findById(other._id).lean())!.addresses![0].phone, details.phone);
  await assert.rejects(placeOrder(who, [{ id: String(p._id), qty: 1 }], { ...details, phone: "12345" }), /mobile number/);
  assert.equal(await saveToBook(who.id, { line: "Flat 2, (Old) Market Rd.", landmark: "", pincode: "226002", phone: details.phone }), true);
  for (let i = 0; i < 12; i++) await saveToBook(who.id, { line: `House ${i}, Some Long Street`, landmark: "", pincode: "226003", phone: details.phone });
  book = (await User.findById(customer._id).lean())!.addresses!;
  assert.equal(book.length, 10);
  assert.equal(await saveToBook(who.id, { line: "One more house, far away", landmark: "", pincode: "226004", phone: details.phone }), false);
});
