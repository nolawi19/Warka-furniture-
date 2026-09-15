# Warka Furniture

A furniture shop in Kebena, Addis Ababa, and the website that sells for it.

There are **two things** in this repository, and both work:

| | What it is | When to use it |
|---|---|---|
| `index.html` | The original site: one self-contained 1 MB file. No server, no internet, no install. Double-click it. | A brochure you can email, put on a USB stick, or upload to any host. |
| everything else | The shop: Next.js + Postgres, with accounts, a basket, verified payments, order tracking and an admin. | The real store. |

The static file was not replaced. It is still there, still opens by itself, and
still contains the whole catalogue.

---

## Running it

```bash
npm install
cp .env.example .env        # then fill it in — see below
./scripts/dev-db.sh         # local Postgres on :5433 (development only)
npx prisma db push
npm run db:seed
npm run dev                 # http://localhost:3000
```

The seed loads the shop's real catalogue out of `index.html`: 7 categories,
9 product lines, 102 variants, the 3 known prices and the 6 photographs. It is
not demo data.

### The admin account

The seed also owns the admin, from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
**Set a real password before doing this anywhere but your own machine.**

Changing that password later is the same command:

```bash
# edit SEED_ADMIN_PASSWORD in .env, then
npm run db:seed
```

It finds the account by email and resets the password on it — the same row,
never a second admin — and also puts the role back to ADMIN, re-enables the
account, and clears any failed-attempt lockout. Sessions opened with the old
password stop working, which is the point. Nothing else about the account
(name, orders, addresses) is touched, and re-seeding does not overwrite prices
you have set in the admin.

---

## What needs filling in

### 1. The shop's phone number and email

`src/lib/shop-details.ts` still has the placeholders from the original site.
They appear in the footer, on every order page, on the contact page, and in the
structured data Google reads. The admin overview warns about this until it is
fixed.

### 2. Prices

Everything is currently **0 ETB** — see the section at the end of this file for
how to put the real prices back. Prices go in through **Admin → Products →
(a line) → variants**, in Birr.

### 3. Payment credentials

Nothing can be charged until these exist. Checkout says so plainly rather than
showing a button that cannot work.

**Chapa** — https://dashboard.chapa.co

| Variable | Where it comes from |
|---|---|
| `CHAPA_SECRET_KEY` | Dashboard → Settings → API Keys. Test keys start `CHASECK_TEST-`. |
| `CHAPA_PUBLIC_KEY` | Same page. |
| `CHAPA_WEBHOOK_SECRET` | You choose it. Set the **same** string in Dashboard → Settings → Webhooks. |

Also set the webhook URL in that dashboard to:

```
https://YOUR-DOMAIN/api/payments/chapa/webhook
```

Chapa was chosen because one NBE-licensed integration covers Telebirr, CBE Birr,
Awash Birr, Visa and Mastercard, and settles to an Ethiopian bank account.
PayPal is deliberately **not** offered directly: an Ethiopian merchant cannot
withdraw PayPal funds to a local bank.

All five methods are listed individually at checkout and the customer picks one,
which is stored on the order. Chapa's initialize endpoint has no payment-method
field, so the final selection happens on their hosted page — the UI says so
rather than implying we send it.

### 4. Photographs

The six product photos were compressed to thumbnails (168×264 to 432×511) to
fit inside the single HTML file. They are too small for a premium furniture
site. Re-shoot or supply the originals at **2000px on the long edge, 4:3, JPEG**
and drop them in `public/products/`.

---

## How money is handled

Two rules, enforced in code and covered by a probe:

1. **Totals are computed on the server**, from current database prices, at
   checkout. Nothing the browser sends about price is read.
2. **An order becomes paid only after the gateway is asked directly.** A
   webhook body, a redirect back, or a `?status=success` parameter proves
   nothing. The signature is checked, the delivery is recorded and deduplicated,
   and then the server makes its own call to Chapa.

`scripts` in the scratchpad exercise this: forged callbacks are refused, a
correctly signed "success" body with an unreachable gateway leaves the order
unpaid, and a replayed delivery is a no-op.

Money is stored everywhere as an integer number of **santim** (1 ETB = 100).
No float touches a total.

---

## Layout

```
index.html                  the original single-file site, untouched
prisma/schema.prisma        21 tables
prisma/seed.ts              loads the real catalogue out of index.html
src/app/                    routes (public, account, admin, api)
src/components/hero/        the hero and its typographic brand plate
src/components/ui/          ActionButton — every interactive button
src/lib/
  orders.ts                 pricing and the order state machine
  payments/                 provider interface + Chapa adapter
  auth.ts, admin-guard.ts   sessions, roles, audit log
src/styles/tokens.css       the design system
```

## The logo

Text, nothing else. The header is the wordmark; the hero panel sets it larger
with the Amharic name beneath. There is no canvas, no WebGL context and no
animation loop anywhere on the site — the 3D sign and three.js were removed,
which took about 500 KB and a per-frame render loop out with them.

## Buttons

`src/components/ui/ActionButton.tsx` is the one button. Ripple, sheen, hover
lift, press, icon travel, loading spinner, success tick, animated focus ring
and touch feedback — all CSS, all 90–220ms.

The rule it exists to enforce: **the action fires first and the animation
decorates it.** Nothing awaits a visual effect before calling the handler.
Measured at 4ms from click to the network request going out, with the ripple
already painted in that same frame.

---

## Prices are currently set to 0 ETB

Every variant is at **0 ETB** for testing, and the UI says so plainly. The real
prices were saved before the switch:

```bash
npx tsx scripts/set-prices.ts restore   # puts the original prices back
npx tsx scripts/set-prices.ts zero      # sets everything to 0 again
```

A basket that comes to zero is settled without contacting a payment gateway.
The order page says **"No payment needed"**, not "Payment confirmed", and no
Payment row is written — because nothing was collected.
