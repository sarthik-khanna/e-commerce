# Getting started — step by step

This guide takes you from zero to a live deployment. Steps 1–3 get the app running on your laptop; steps 4–8 add each real integration; step 9 deploys.

## 1. Install tools

- **Node.js 20.9+** (22 LTS recommended) — https://nodejs.org
- **Git** — https://git-scm.com
- A code editor (VS Code recommended)

## 2. Create a database (Neon — free)

1. Sign up at https://neon.tech and create a project (region: *AWS Asia Pacific (Singapore)* or closest to your users).
2. On the dashboard click **Connect**, choose **Pooled connection**, copy the connection string.
3. In that string, change `sslmode=require` to `sslmode=verify-full`. The connection is secure either way; this only stops the Postgres driver printing an SSL-mode warning on every start.

*Alternatives:*
- **Local, no account:** `npx prisma dev --name ecommerce --detach` prints a `postgres://…` URL. It accepts one connection at a time, so also set `DATABASE_POOL_MAX=1`. Data is kept between runs; after restarting your computer, run the same command again.
- **Docker:** `docker compose up -d db` (needs Docker Desktop).

## 3. Run the app locally

```bash
cd enterprise-ecommerce
npm install
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://…your Neon string…"
AUTH_SECRET="…"          # paste the output of the command below
```

```bash
node -e "console.log(require('crypto').randomBytes(33).toString('base64'))"
```

```bash
npm run db:deploy        # creates tables (applies prisma/migrations)
npm run db:seed          # demo data + demo logins
npm run dev
```

Use `npm run db:migrate` later, when you change `prisma/schema.prisma` and need a new migration.

Open http://localhost:3000 and sign in as `admin@nexus.test` / `Password123`. Checkout works in **simulated payment** mode until you add Razorpay keys.

## 4. Razorpay (payments)

1. Sign up at https://dashboard.razorpay.com — stay in **Test Mode** (toggle at the top).
2. **Settings → API Keys → Generate Test Key.** Copy both values:
   ```env
   RAZORPAY_KEY_ID="rzp_test_…"
   RAZORPAY_KEY_SECRET="…"
   ```
3. Restart `npm run dev`. Checkout now opens the real Razorpay popup.
   Pay with UPI ID `success@razorpay` (or `failure@razorpay` to test a failed payment). Test card numbers are listed on Razorpay's "Test Card Details" docs page. No real money moves in Test Mode.
4. **Webhook** (after you deploy — Razorpay can't reach localhost): **Settings → Webhooks → Add**
   - URL: `https://YOUR-DOMAIN/api/payments/razorpay/webhook`
   - Secret: any strong random string → put the same value in `RAZORPAY_WEBHOOK_SECRET`
   - Events: `payment.captured`, `payment.failed`

   To test webhooks locally, expose your dev server with a tunnel (e.g. `npx ngrok http 3000`) and use the tunnel URL.

## 5. Cloudinary (image uploads)

1. Sign up at https://cloudinary.com (free).
2. **Dashboard → API Keys**:
   ```env
   CLOUDINARY_CLOUD_NAME="…"
   CLOUDINARY_API_KEY="…"
   CLOUDINARY_API_SECRET="…"
   ```
3. Admin → Products → Add product → **Upload** now sends images straight to Cloudinary.

## 6. Resend (emails)

1. Sign up at https://resend.com → **API Keys → Create**.
   ```env
   RESEND_API_KEY="re_…"
   EMAIL_FROM="Nexus Commerce <onboarding@resend.dev>"
   ```
2. Without a verified domain, Resend only delivers to **your own account email** — register a customer with that address to test. To email anyone, verify a domain under **Domains** and change `EMAIL_FROM` to `orders@yourdomain.com`.

Emails sent: welcome, password reset, order confirmation, shipped / delivered / cancelled updates.

## 7. Google sign-in (optional)

1. https://console.cloud.google.com → create a project → **APIs & Services → OAuth consent screen** (External, add your email as a test user).
2. **Credentials → Create credentials → OAuth client ID → Web application.**
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://YOUR-DOMAIN/api/auth/callback/google`
3. ```env
   AUTH_GOOGLE_ID="….apps.googleusercontent.com"
   AUTH_GOOGLE_SECRET="…"
   ```

## 8. Make yourself an admin

Register with your own email, then either sign in as the seeded admin and change your role in **Admin → Users & roles**, or run `npm run db:studio` and set `role` to `ADMIN`.

## 9. Deploy

Follow [DEPLOYMENT.md](DEPLOYMENT.md) — push to GitHub, import into Vercel, paste the environment variables, run migrations. Takes about 10 minutes.

## Troubleshooting

| Symptom | Fix |
|---|---|
| PowerShell: `running scripts is disabled on this system` when running `npm` | Use Command Prompt or Git Bash instead (VS Code: terminal dropdown next to **+**), or allow local scripts once with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| `SECURITY WARNING: The SSL modes 'prefer', 'require'…` | Harmless. Change `sslmode=require` to `sslmode=verify-full` in `DATABASE_URL` to silence it. |
| `npx prisma dev …` says `Port 51215 is not available` | The local database is already running, so nothing to do. Check with `npx prisma dev ls`. |
| `Server has closed the connection` locally | Using `npx prisma dev`? Add `DATABASE_POOL_MAX=1` to `.env`, and make sure the database is running (`npx prisma dev ls`). |
| `Port 3000 is in use` | Another dev server is running. Stop it (Ctrl+C in its terminal) or open the URL Next.js prints (e.g. port 3001). |
| `MissingSecret` / redirect loop on login | `AUTH_SECRET` is missing. On non-Vercel hosts also set `AUTH_TRUST_HOST=true`. |
| Google login: `redirect_uri_mismatch` | The callback URL in Google Console must match exactly (protocol, domain, path). |
| Images from a pasted URL don't load | Only `https://` URLs; hosts outside `next.config.ts` → `images.remotePatterns` are served unoptimized. |
| Orders stay “Pending” after paying on production | Webhook not configured or `RAZORPAY_WEBHOOK_SECRET` mismatch — check Razorpay → Webhooks → delivery logs. |
