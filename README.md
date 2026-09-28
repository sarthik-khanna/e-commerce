# Nexus Commerce — Enterprise E-Commerce & Analytics Platform

A full-stack, production-ready e-commerce platform built as a **single Next.js application**: customer storefront, secure checkout with Razorpay, role-based admin console, analytics dashboard, reports, image uploads and transactional email.

| | |
|---|---|
| **Framework** | Next.js 16 (App Router, Server Components, Server Actions, Route Handlers, Proxy) · React 19 · TypeScript |
| **UI** | Tailwind CSS v4 · shadcn/ui (Base UI) · Recharts · lucide icons · light/dark mode |
| **Database** | PostgreSQL (Neon) · Prisma 7 ORM with the `pg` driver adapter |
| **Auth** | Auth.js v5 — email/password (bcrypt) + Google OAuth · JWT sessions · RBAC (Admin / Manager / Customer) |
| **Payments** | Razorpay Orders API + Checkout · HMAC signature verification · webhooks · refunds |
| **Storage** | Cloudinary signed direct uploads · `next/image` optimization (AVIF/WebP) |
| **Email** | Resend + React Email templates |
| **Deploy** | Vercel + Neon (primary) · Docker / docker-compose (alternative) · GitHub Actions CI |

---

## Features

**Storefront** — home page with featured products and categories · catalog with search, category filter, sorting and pagination · product detail with gallery and related products · persistent cart · checkout with address validation · Razorpay payment · order history and order tracking.

**Authentication & security** — registration, login, Google sign-in, forgot/reset password by email · role-based access enforced in three layers (proxy → page → server action/API) · central permission map · deactivating users · audit log of every sensitive change · CSRF-protected server actions · security headers · CSV-injection-safe exports · open-redirect-safe login redirects.

**Admin console** — analytics dashboard (revenue trend, KPIs vs previous period, orders by status, sales by category, top products, low-stock alerts, recent orders) · products CRUD with multi-image upload · categories · orders with status workflow and Razorpay refunds · customers with lifetime value · users & roles management · sales reports with date range and CSV export · audit logs.

**Performance** — Server Components by default (minimal client JS) · parallel queries with `Promise.all` · SQL aggregations for analytics (no loading rows into JS) · database indexes on hot paths · URL-driven pagination everywhere · `next/image` with responsive sizes · React Compiler · deferred emails with `after()` · browser-direct image uploads · CDN caching on the public API · streaming loading skeletons.

---

## Quick start (local)

**Prerequisites:** Node.js ≥ 20.9 and a PostgreSQL database (free [Neon](https://neon.tech) project, `docker compose up -d db`, or `npx prisma dev`).

```bash
npm install                 # also generates the Prisma client
cp .env.example .env        # then set DATABASE_URL and AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(33).toString('base64'))"   # prints a value for AUTH_SECRET
npm run db:deploy           # creates the tables
npm run db:seed             # demo data: 27 products, 40 customers, ~6 months of orders
npm run dev                 # http://localhost:3000
```

Step-by-step instructions (including the database setup) are in [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md).

### Demo accounts (password `Password123`)

| Role | Email | Can access |
|---|---|---|
| Admin | `admin@nexus.test` | Everything, including users & roles, refunds, audit logs |
| Manager | `manager@nexus.test` | Dashboard, products, categories, orders, customers, reports |
| Customer | `customer@nexus.test` | Storefront, checkout, own orders |

> Change or delete these accounts before going live.

### What works without API keys

Only `DATABASE_URL` and `AUTH_SECRET` are required. Everything else degrades gracefully so you can demo immediately:

| Missing | Behaviour |
|---|---|
| Razorpay keys | Checkout shows **“Place order (simulated)”** (development only; disabled in production) |
| Resend key | Emails are printed to the terminal, including password-reset links |
| Cloudinary keys | Image upload is replaced by “paste an image URL” |
| Google keys | The Google button is hidden |

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm run db:migrate` | Create & apply a migration in development |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` · `npm run db:reset` | Seed demo data · reset DB and reseed |
| `npm run db:studio` | Browse data in Prisma Studio |

---

## Project structure

```
enterprise-ecommerce/
├── prisma/
│   ├── schema.prisma          # database schema (see docs/DATABASE.md)
│   ├── migrations/            # SQL migrations
│   └── seed.ts                # demo data
├── src/
│   ├── app/
│   │   ├── (shop)/            # storefront: home, products, cart, checkout, orders
│   │   ├── (auth)/            # login, register, forgot/reset password
│   │   ├── admin/             # admin console (dashboard, products, orders, …)
│   │   ├── api/               # REST route handlers (payments, uploads, reports, v1)
│   │   └── layout.tsx         # root layout + providers
│   ├── actions/               # server actions (mutations) — auth, products, orders, …
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── admin/             # sidebar, charts, forms, tables
│   │   ├── shop/              # header, product card, gallery
│   │   ├── cart/              # cart state, checkout form
│   │   └── auth/              # auth forms
│   ├── emails/                # React Email templates
│   ├── lib/                   # db, rbac, validation, analytics, payments, storage, email
│   ├── hooks/                 # client hooks
│   ├── types/                 # type augmentation (Auth.js session)
│   ├── auth.ts / auth.config.ts
│   └── proxy.ts               # route protection (Next.js 16 “proxy”, formerly middleware)
├── docs/                      # architecture, API, database, workflows, deployment
├── Dockerfile · docker-compose.yml · .github/workflows/ci.yml
└── .env.example
```

---

## Documentation

- [Getting started — step by step](docs/GETTING-STARTED.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database schema](docs/DATABASE.md)
- [API reference](docs/API.md)
- [Workflows (checkout, payments, orders, uploads, auth)](docs/WORKFLOWS.md)
- [Deployment](docs/DEPLOYMENT.md)
