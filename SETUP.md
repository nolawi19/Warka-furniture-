# Running Warka Furniture

Two separate things are in this folder. Read this bit first, because it saves
you a lot of time.

### `index.html` — needs nothing

Right-click it → Open with → Chrome. That is the whole static site. No install,
no database, no internet. If all you want is the brochure, **you are done**.

### Everything else — the shop

Accounts, basket, payments, order tracking and the admin. This one needs a
computer that can run a server and a database. Follow the rest of this file.

---

## 1. Install two things

**Node.js 20 or newer** — https://nodejs.org (take the LTS button)

**PostgreSQL 16** — https://www.postgresql.org/download/

> During the Postgres install it asks you to set a password for the `postgres`
> user. **Write it down.** You need it in step 3.

Check both worked. Open a terminal (Command Prompt on Windows, Terminal on Mac)
and type:

```bash
node --version     # should print v20.x or higher
psql --version     # should print psql (PostgreSQL) 16.x
```

If `psql` is "not recognised" on Windows, Postgres installed but is not on your
PATH. Easiest fix: use **pgAdmin**, which installs alongside it, for step 3.

---

## 2. Install the project

In a terminal, go to this folder and run:

```bash
npm install
```

That takes a minute or two and downloads what the project needs. It creates a
`node_modules` folder — ignore it, never edit it.

---

## 3. Make a database

Create an empty database called `warka`:

```bash
createdb -U postgres warka
```

If that command is not available, open **pgAdmin** → right-click *Databases* →
*Create* → *Database* → name it `warka` → Save.

---

## 4. Make the `.env` file

Copy `.env.example` to a new file named exactly `.env` — no other name works.

```bash
cp .env.example .env          # Mac / Linux
copy .env.example .env        # Windows
```

Open `.env` in Notepad or any text editor and fill in these four lines:

```ini
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/warka?schema=public"
APP_URL="http://localhost:3000"
AUTH_SECRET="paste-a-long-random-string-here"
SEED_ADMIN_PASSWORD="pick-a-password-for-yourself"
```

- `YOUR_PASSWORD` is the Postgres password from step 1.
- `AUTH_SECRET` can be any long random text — it signs the login cookies.
  Generate one with `openssl rand -base64 32`, or just mash the keyboard for
  40+ characters.
- `SEED_ADMIN_PASSWORD` is the password **you** will log into the admin with.

Leave the Chapa lines empty for now. Section 8 covers them.

> **Never put the `.env` file on GitHub or email it.** It holds your passwords.
> The project already tells git to ignore it.

---

## 5. Build the tables and load the catalogue

```bash
npx prisma db push
npm run db:seed
```

The second command loads the shop's real catalogue — 7 categories, 9 lines,
102 pieces, your 3 known prices and your 6 photographs — and creates your
admin login.

You should see:

```
  admin: admin@warkafurniture.et
  categories: 7
  products: 9  variants: 102  photographs: 6
  delivery zones: 3
Done.
```

---

## 6. Start it

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

The admin is at **http://localhost:3000/admin** — sign in with
`admin@warkafurniture.et` and the `SEED_ADMIN_PASSWORD` you chose.

To stop it, press `Ctrl` + `C` in the terminal.

---

## 7. First three things to do in the admin

**a) Fix your phone number and email.** Open `src/lib/shop-details.ts` in a text
editor and replace the two placeholder lines. They appear in the footer, on
every order page, on the contact page, and in the information Google reads.

**b) Add your prices.** Admin → Products → click a line → each variant has a
price box. Type the figure in Birr (e.g. `30000`) and press Save. Leave it empty
for anything you quote in the shop — the site says *Priced in the shop*, which
is honest.

**c) Mark what is actually in the showroom.** On any variant, tick **Track** and
set the stock number. Everything else stays "made to order · about 2 weeks".

---

## 8. Taking payments

Nothing can be charged until this is done. Until then, checkout tells customers
to call you instead of showing a button that cannot work.

1. Sign up at **https://dashboard.chapa.co** and finish their merchant checks.
2. Go to **Settings → API Keys** and copy both keys into `.env`:
   ```ini
   CHAPA_SECRET_KEY="CHASECK_TEST-..."
   CHAPA_PUBLIC_KEY="CHAPUBK_TEST-..."
   ```
   Keys starting `CHASECK_TEST-` are for testing; the live ones start
   `CHASECK-`.
3. Invent a long random string and put it in **both** places — your `.env`:
   ```ini
   CHAPA_WEBHOOK_SECRET="another-long-random-string"
   ```
   and in Chapa's dashboard under **Settings → Webhooks**.
4. In that same Chapa webhook screen, set the URL to:
   ```
   https://YOUR-DOMAIN/api/payments/chapa/webhook
   ```
   This has to be a real `https://` address that Chapa can reach from the
   internet — `localhost` will not work. So this step only works once you have
   done section 9.
5. Restart the server. Chapa now appears at checkout.

Chapa covers Telebirr, CBE Birr, Awash Birr, Visa and Mastercard in one
integration and pays into an Ethiopian bank account.

**PayPal is deliberately not offered.** An Ethiopian merchant cannot withdraw
PayPal money to a local bank, so a PayPal button would be a lie. Chapa carries
PayPal as a payment *method*, which is the legitimate route.

---

## 9. Putting it on the internet

`npm run dev` only runs on your own computer. For a real shop you need:

- **A domain name** — e.g. warkafurniture.com
- **A host that runs Node.js** — Vercel, Railway and Render all have free or
  cheap tiers and connect straight to a GitHub repository.
- **A hosted Postgres** — Neon, Supabase and Railway all offer one free. You
  get a `DATABASE_URL` from them; paste it into the host's environment settings
  instead of your local one.

On the host, set these environment variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | from your hosted Postgres |
| `APP_URL` | `https://your-real-domain.com` |
| `AUTH_SECRET` | a **new** long random string, not the one from your laptop |
| `SEED_ADMIN_EMAIL` | your real email |
| `SEED_ADMIN_PASSWORD` | a strong password |
| `CHAPA_SECRET_KEY` | live key from Chapa |
| `CHAPA_PUBLIC_KEY` | live key from Chapa |
| `CHAPA_WEBHOOK_SECRET` | the same string you set in Chapa's dashboard |

Then run `npx prisma db push` and `npm run db:seed` once against that database.

`APP_URL` **must** be your real https address — the payment callbacks are built
from it. If it is wrong, payments start but never come back.

---

## 10. Your photographs

The six product photos in `public/products/` are between 168 and 432 pixels
wide. They were squeezed down to fit inside the single HTML file, and they are
too small for a furniture site where the picture does the selling.

Re-shoot or find the originals and save them at roughly **2000 pixels on the
long edge, landscape 4:3, JPEG**, over the files of the same name. Nothing else
needs changing.

---

## If something goes wrong

**`npm install` fails** — check `node --version` prints 20 or higher.

**`Can't reach database server`** — Postgres is not running, or `DATABASE_URL`
is wrong. On Windows, open Services and check `postgresql-x64-16` is started.

**`Environment variable not found: DATABASE_URL`** — the file is not named
exactly `.env`, or it is not in this folder. On Windows, Explorer may have named
it `.env.txt`; turn on "File name extensions" in the View menu and rename it.

**`Port 3000 is already in use`** — something else is using it. Run
`npm run dev -- -p 3001` and use http://localhost:3001 instead.

**The admin says "phone number and email are still placeholders"** — that is
correct and intentional, until you do step 7a.

---

## What the files are

```
index.html              the standalone site — needs nothing
EDITING.md              how to edit that standalone file

src/app/                the pages
src/components/hero/    the 3D Warka sign
  logo-geometry.ts      YOUR LOGO — traced outlines, do not redraw these
src/lib/                prices, orders, payments, logins
src/styles/tokens.css   colours, type sizes, spacing — change the brand here
prisma/schema.prisma    the database design
public/products/        your photographs
.env.example            the template for your .env
```
