# Putting Warka Furniture online

Yes, this can be hosted. It needs two things the static file did not: somewhere
to run Node.js, and a Postgres database. Both have free tiers that need no
payment card, which matters because paying an international host from Ethiopia
is often the hardest part of the whole exercise.

Budget about an hour the first time.

---

## The short version

| What | Where | Cost |
|---|---|---|
| The app | **Vercel** — vercel.com | Free tier is enough to start |
| The database | **Neon** — neon.tech | Free tier, 0.5 GB |
| The domain | Namecheap, Cloudflare, or an `.et` from ethiotelecom | ~$10–15/year |

You do not have to use these two. Railway and Render host the app just as well;
Supabase hosts the database just as well. The steps below are nearly identical
for any of them.

---

## 1. Put the code on GitHub

Hosts deploy from a repository. If you already have this on GitHub, skip ahead.

```bash
git init
git add .
git commit -m "Warka Furniture"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/warka-furniture.git
git push -u origin main
```

Make the repository **private**. Nothing secret is in it — the `.gitignore`
keeps `.env` out — but there is no reason to publish your shop's source.

---

## 2. Make the database

1. Sign up at **neon.tech** and create a project. Pick the region closest to
   Ethiopia — **Frankfurt (eu-central-1)** is usually the fastest from Addis.
2. Neon shows you a connection string. Copy the **pooled** one; it looks like:

   ```
   postgresql://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

   The word `-pooler` matters. Without it you will run out of connections the
   first time more than a few people are on the site at once.

Keep that string somewhere for the next step.

---

## 3. Deploy the app

1. Sign up at **vercel.com** with your GitHub account.
2. **Add New → Project**, pick the repository, and press Deploy.
3. The first build will fail or the site will error. That is expected — it has
   no environment variables yet. Carry on.

Go to **Settings → Environment Variables** and add these:

| Name | Value |
|---|---|
| `DATABASE_URL` | the pooled string from Neon |
| `APP_URL` | `https://your-project.vercel.app` for now |
| `AUTH_SECRET` | a **new** long random string — not the one from your laptop |
| `SEED_ADMIN_EMAIL` | your real email |
| `SEED_ADMIN_PASSWORD` | a strong password |

For `AUTH_SECRET`, run `openssl rand -base64 32`, or use any password
generator set to 40+ characters.

Then **Deployments → the latest one → Redeploy**.

---

## 4. Create the tables and load the catalogue

This runs once, from your own computer, against the live database.

Put the Neon string in your local `.env` **temporarily**:

```ini
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
```

Then:

```bash
npx prisma db push
npm run db:seed
```

That builds the 21 tables, loads your 7 categories, 9 lines, 102 pieces and 6
photographs, and creates your admin login.

**Put your local `DATABASE_URL` back to `localhost` afterwards**, or you will be
editing the live shop every time you work on your laptop.

Your site is now live at `https://your-project.vercel.app`.

---

## 5. Point your domain at it

1. Buy the domain.
2. In Vercel: **Settings → Domains → Add**, type it in, and follow the two DNS
   records it gives you. Your registrar has a DNS page where these go.
3. Wait — usually minutes, sometimes a few hours.
4. **Change `APP_URL`** to `https://your-real-domain.com` and redeploy.

> `APP_URL` has to be exactly right. Payment callbacks are built from it. If it
> still says `vercel.app` after you move to a real domain, customers will pay
> and then land on the wrong address.

HTTPS is automatic. You do not need to buy a certificate.

---

## 6. Switch payments on

This is the last step because Chapa needs a real, public `https://` address —
it cannot call `localhost`.

1. **dashboard.chapa.co** → finish the merchant checks. They will want your
   business documents and a bank account. This part takes days, not minutes,
   so start it early.
2. **Settings → API Keys.** Add to Vercel's environment variables:

   | Name | Value |
   |---|---|
   | `CHAPA_SECRET_KEY` | starts `CHASECK-` for live, `CHASECK_TEST-` for testing |
   | `CHAPA_PUBLIC_KEY` | starts `CHAPUBK-` |
   | `CHAPA_WEBHOOK_SECRET` | a long random string you invent |

3. **Settings → Webhooks** in Chapa. Set:

   - **URL:** `https://your-real-domain.com/api/payments/chapa/webhook`
   - **Secret hash:** the *same* string you put in `CHAPA_WEBHOOK_SECRET`

   If those two strings do not match exactly, every callback is rejected as a
   forgery — which is the system working, but it will look like a bug.

4. Redeploy.

Test with the `CHASECK_TEST-` keys first and Chapa's test card. Put an order
through, check it appears in your admin as **Paid**, then switch to live keys.

---

## 7. Keeping it safe

- **Never commit `.env`.** It is already ignored. Keep it that way.
- Use a **different `AUTH_SECRET`** in production from the one on your laptop.
- If you ever paste a secret key somewhere public by accident, rotate it in the
  Chapa dashboard immediately. Assume it is compromised.
- Your admin password is the only thing between a stranger and your orders.
  Make it long.
- Turn on Neon's backups. The free tier keeps recent history; check it is on.

---

## What it costs once real

| | Free tier limit | When you outgrow it |
|---|---|---|
| Vercel | 100 GB traffic/month | Far more than a furniture shop uses |
| Neon | 0.5 GB storage | Tens of thousands of orders |
| Chapa | — | They take a percentage per transaction; check their current rate |

Realistically you will pay for the domain and nothing else for a long while.

---

## If the deploy fails

**Build error mentioning Prisma** — check `DATABASE_URL` is set in the host's
environment variables, not just in your local `.env`. The build itself does not
need the database (it is designed not to), but the running site does.

**Site loads but every page errors** — `DATABASE_URL` is wrong, or you skipped
`prisma db push`. Check the host's runtime logs.

**"Too many connections"** — you used Neon's direct string instead of the
**pooled** one. Swap it and redeploy.

**Payments start but never complete** — `APP_URL` does not match your real
domain, so Chapa is calling the wrong address. This is the most common one.

**Callbacks rejected** — `CHAPA_WEBHOOK_SECRET` and the secret hash in Chapa's
dashboard are not identical. Retype both carefully; trailing spaces count.

---

## A note on what is actually verified

The build has been tested with the database completely switched off and it
completes cleanly, which is what a deploy host does. The payment path has been
tested against forged callbacks, replayed callbacks, and a gateway that cannot
be reached — in every case the order correctly stays unpaid. What has **not**
been tested is a real transaction against Chapa's live API, because that needs
merchant credentials only you can obtain. Do step 6's test-key run before you
trust it with real money.
