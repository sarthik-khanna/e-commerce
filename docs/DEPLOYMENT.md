# Deployment

**Recommended:** Vercel (app) + Neon (PostgreSQL). Both have free tiers and need no server management. A Docker setup is included for any other host.

## Option A — Vercel + Neon (recommended)

### 1. Push the code to GitHub

```bash
git init            # skip if already a repo
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/enterprise-ecommerce.git
git push -u origin main
```

### 2. Create the production database

1. https://neon.tech → New project in **AWS Asia Pacific (Singapore)** — `vercel.json` pins the app's functions to Vercel's Singapore region (`sin1`) so each query stays in one region. If you pick another Neon region, change `regions` in `vercel.json` to the matching Vercel region.
   Copy two connection strings: the **pooled** one (host contains `-pooler`) for Vercel, and the **direct** one (Connection pooling off) for running migrations below.
2. From your machine, apply the schema to it:
   ```bash
   DATABASE_URL="<neon direct url>" npx prisma migrate deploy
   # optional demo data (NOT for a real store):
   DATABASE_URL="<neon direct url>" npm run db:seed
   ```
   On Windows PowerShell: `$env:DATABASE_URL="<url>"; npx prisma migrate deploy`

### 3. Import into Vercel

1. https://vercel.com/new → import the GitHub repo. Framework preset **Next.js** is detected automatically.
2. **Environment Variables** — add everything from `.env.example`:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled URL |
| `AUTH_SECRET` | a new random value — `node -e "console.log(require('crypto').randomBytes(33).toString('base64'))"` (don't reuse the dev one) |
| `NEXT_PUBLIC_APP_URL` | `https://<project>.vercel.app` (or your domain) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | from Razorpay (test keys until you're live) |
| `RAZORPAY_WEBHOOK_SECRET` | the secret you set on the webhook |
| `CLOUDINARY_*` | from Cloudinary |
| `RESEND_API_KEY`, `EMAIL_FROM` | from Resend |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | optional |

3. **Deploy.** The build runs `prisma generate && next build`.

### 4. Post-deploy configuration

- **Razorpay webhook:** Dashboard → Settings → Webhooks → `https://<domain>/api/payments/razorpay/webhook`, events `payment.captured` and `payment.failed`, same secret as `RAZORPAY_WEBHOOK_SECRET`.
- **Google OAuth:** add `https://<domain>/api/auth/callback/google` to Authorized redirect URIs.
- **Custom domain:** Vercel → Project → Settings → Domains; then update `NEXT_PUBLIC_APP_URL`.
- **Change the demo passwords** or delete the seeded accounts if you seeded production.
- Check `https://<domain>/api/health` returns `{"status":"ok"}` and add it to an uptime monitor (e.g. UptimeRobot, Better Stack).

### 5. Future deployments

Every push to `main` deploys to production; every pull request gets a preview URL. When you change the schema, run `npm run db:deploy` against production **before** merging (or add it to your CI pipeline).

### Going live with real payments

Complete Razorpay KYC → switch to **Live Mode** → generate live keys → replace the Vercel env vars → create a live-mode webhook. Verify a domain in Resend so emails reach customers.

---

## Option B — Docker (any VPS / AWS / Render / Railway)

```bash
# build and run the app against any Postgres
docker build -t nexus-commerce .
docker run -p 3000:3000 --env-file .env nexus-commerce

# or: database + app together
docker compose up -d db
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/enterprise_ecommerce" npm run db:deploy   # from the host
docker compose --profile app up -d --build
```

On non-Vercel hosts also set `AUTH_TRUST_HOST=true`. Put the container behind HTTPS (Caddy, Nginx + Let's Encrypt, or the platform's load balancer). The image includes a `HEALTHCHECK` on `/api/health`.

---

## CI

`.github/workflows/ci.yml` runs on every push/PR: install → migrate a throwaway Postgres → lint → typecheck → build → seed smoke test.

## Production checklist

- [ ] New `AUTH_SECRET`, never committed
- [ ] `NEXT_PUBLIC_APP_URL` set to the real domain (used in email links)
- [ ] Migrations applied (`npm run db:deploy`)
- [ ] Razorpay webhook configured and a test payment confirmed via webhook logs
- [ ] Demo accounts removed or passwords changed; your own admin account created
- [ ] Resend domain verified
- [ ] Uptime monitor on `/api/health`
- [ ] Neon automated backups / point-in-time restore enabled
