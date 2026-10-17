# Agarwal Stores · Crackers

Firecracker catalog → cart → login (mobile or email + password, or Google) → delivery address → order.
Pay cash or UPI on delivery; delivery in 3–4 days. Staff run orders, inventory, deliveries and cash from `/admin`,
with the admin system ported from Agarwal Online (roles, delivery handover codes, packing slips, audit log).

Same stack as Agarwal Online: Next.js 16, MongoDB (Mongoose), better-auth for logins, MiniMoth for WhatsApp/SMS
codes, the Hostinger mailbox for emails.

## Run locally

```bash
cp .env.example .env   # fill AUTH_SECRET (openssl rand -hex 32) and ADMIN_PHONES
npm install
npm run seed           # 24 sample crackers, only into an empty catalog
npm run dev            # http://127.0.0.1:3000
```

Logins run on better-auth, set up as in Agarwal Online. One Log In page does everything:

1. Enter a **mobile number or email** (separate tabs, so each gets the right keyboard).
2. Someone with a password types it. Anyone new, or without a password yet, gets a **6-digit code**
   (WhatsApp/SMS to a number, a free email to an email), then sets a password (and a name if new).
3. **Forgot password?** sends the same code. An account made with **Google** is offered Continue with Google
   instead of a code, and can set a password on the Account page after logging in.

Google (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, redirect URI `<APP_ORIGIN>/api/auth/callback/google`) signs in
to the account that already has that email, never a second one: emails are always verified by their code.
In development no SMS goes out (the code is `MOCK_OTP_CODE`, 123456), and with no mailbox set (or
`EMAIL_TO_LOG=true`) emails are printed in the server log.

## Roles

Everyone logs in with their mobile number and password. What they see depends on their role:

| Role | Gets |
| --- | --- |
| Customer | the shop, cart, their orders (with the handover code when out for delivery) |
| Delivery | `/delivery`: orders given to them, start delivery, check the customer's code, record cash or a missed delivery |
| Admin | `/admin`: orders, inventory, customers, sales, cash |
| Owner | all of Admin plus Staff and the Audit Log. Owners are the numbers in `ADMIN_PHONES` |

Owners set roles on `/admin/staff`; the person then taps **Forgot password?** once to set their own password.

## Pages

| Path | Who | What |
| --- | --- | --- |
| `/` | everyone | catalog, search, categories, add to cart |
| `/cart` | everyone | cart; after login, address + place order |
| `/login` | everyone | log in, sign up and forgot password in one flow (mobile, email or Google) |
| `/account` | logged in | name, mobile, email, password, Google, delivery address, log out everywhere |
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
- `APP_ORIGIN` = the live address (e.g. `https://crackers.agarwalonline.in`), `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`,
  and Google's two keys if you want the Google button.
- `MOCK_OTP=false` with `MINIMOTH_HOOK_URL` and `MINIMOTH_HOOK_TOKEN` (same hook as Agarwal Online).
  Production never uses the mock code.
