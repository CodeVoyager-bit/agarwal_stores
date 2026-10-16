# Agarwal Stores · Crackers

Firecracker catalog → cart → mobile-number login (OTP) → delivery address → order.
Pay cash or UPI on delivery; delivery in 3–4 days. Staff run orders, inventory, deliveries and cash from `/admin`,
with the admin system ported from Agarwal Online (roles, delivery handover codes, packing slips, audit log).

Same stack as Agarwal Online: Next.js 16, MongoDB (Mongoose), MiniMoth for login codes.

## Run locally

```bash
cp .env.example .env   # fill AUTH_SECRET (openssl rand -hex 32) and ADMIN_PHONES
npm install
npm run seed           # 24 sample crackers, only into an empty catalog
npm run dev            # http://127.0.0.1:3000
```

In development no SMS is sent: the login code is `MOCK_OTP_CODE` (123456).

`npm test` checks orders, stock, deliveries, cash and the price-list import against **local** MongoDB
(throwaway `agarwal_fatake_*test` databases, never the one in `.env`).

## Roles

Everyone logs in with their mobile number. What they see depends on their role:

| Role | Gets |
| --- | --- |
| Customer | the shop, cart, their orders (with the handover code when out for delivery) |
| Delivery | `/delivery`: orders given to them, start delivery, check the customer's code, record cash or a missed delivery |
| Admin | `/admin`: orders, inventory, customers, sales, cash |
| Owner | all of Admin plus Staff and the Audit Log. Owners are the numbers in `ADMIN_PHONES` |

Owners set roles on `/admin/staff`.

## Pages

| Path | Who | What |
| --- | --- | --- |
| `/` | everyone | catalog, search, categories, add to cart |
| `/cart` | everyone | cart; after login, address + place order |
| `/orders` | customer | their orders and status |
| `/admin` | admin | all orders, search, status, who is delivering |
| `/admin/orders/[id]` | admin | one order: items, history, notes, give for delivery, cash; printable packing slip |
| `/admin/products` | admin | edit price/stock/photo; import a price list (Excel or CSV) and download the catalog as Excel |
| `/admin/customers` | admin | everyone who ordered: orders, spend, last order |
| `/admin/reports` | admin | sales by day, top items, categories, pincodes |
| `/admin/cash` | admin | cash the delivery team holds, counted at the shop, differences |
| `/admin/staff` | owner | give people the Delivery or Admin role |
| `/admin/audit` | owner | who changed what |
| `/delivery` | delivery | the day's stops |

Stock is taken when an order is placed and goes back if the shop cancels it. A delivery closes only with the
6‑digit code the customer reads out at the door and the full amount collected.

## Go live

- `MONGODB_URI` → Atlas, a fresh `AUTH_SECRET`, the shop's numbers in `ADMIN_PHONES`, `SHOP_PHONE`.
- `MOCK_OTP=false` with `MINIMOTH_HOOK_URL` and `MINIMOTH_HOOK_TOKEN` (same hook as Agarwal Online).
  Production never uses the mock code.
