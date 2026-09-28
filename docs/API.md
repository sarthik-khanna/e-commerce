# API reference

The app exposes two kinds of backend entry points:

1. **REST route handlers** (`src/app/api/**`) — plain HTTP, used by the browser for payments/uploads, by Razorpay for webhooks, and by external clients.
2. **Server Actions** (`src/actions/**`) — typed RPC functions called directly from React forms. Next.js exposes them as POST endpoints with built-in CSRF protection.

All responses are JSON unless noted. Errors use `{ "error": "message" }` with an appropriate status code.

---

## REST endpoints

### `GET /api/v1/products` — public catalog

Query params: `q` (search), `category` (slug), `sort` (`newest` · `price-asc` · `price-desc` · `name`), `page` (1-based).
Cached at the CDN for 60 s.

```json
{
  "data": [
    {
      "id": "cm…",
      "name": "Air Fryer 4.5L",
      "slug": "air-fryer-4-5l",
      "price": 5999,
      "compareAtPrice": 8999,
      "currency": "INR",
      "inStock": true,
      "category": "Home & Kitchen",
      "image": "https://…"
    }
  ],
  "pagination": { "page": 1, "pageSize": 12, "total": 27, "totalPages": 3 }
}
```

### `GET /api/health`

Liveness + DB check for uptime monitors. `200 {"status":"ok","database":"up","latencyMs":12}` or `503`.

### `POST /api/payments/razorpay/verify` — auth: signed-in customer

Called by the checkout page after Razorpay Checkout succeeds.

```json
{
  "orderId": "cm…",
  "razorpay_order_id": "order_…",
  "razorpay_payment_id": "pay_…",
  "razorpay_signature": "hex…"
}
```

Verifies `HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET)`. On success marks the order paid (idempotent), decrements stock and queues the confirmation email.
`200 {"ok":true}` · `400` bad signature (order marked `FAILED`) · `401` · `404` order not owned by caller.

### `POST /api/payments/razorpay/webhook` — auth: Razorpay signature

Header `X-Razorpay-Signature: HMAC_SHA256(rawBody, WEBHOOK_SECRET)`.
Handles `payment.captured` (→ paid) and `payment.failed` (→ failed). Unknown orders/events return `200 {"ignored":true}` so Razorpay doesn't retry.

### `POST /api/upload/sign` — permission: `products:write`

Returns a short-lived signature for a direct browser → Cloudinary upload:

```json
{ "timestamp": 1790000000, "folder": "enterprise-ecommerce/products", "signature": "…", "apiKey": "…", "cloudName": "…" }
```

`403` without permission · `503` if Cloudinary isn't configured.

### `GET /api/reports/export` — permission: `reports:view`

Query: `type=orders|products`, `from=YYYY-MM-DD`, `to=YYYY-MM-DD` (inclusive; default last 30 days).
Returns `text/csv` as an attachment (`orders-report-2026-09-01-to-2026-09-28.csv`).

### `GET|POST /api/auth/*`

Auth.js endpoints (session, CSRF, OAuth callbacks such as `/api/auth/callback/google`).

---

## Server Actions

Each action validates input with Zod, checks a permission from `lib/rbac.ts`, and returns `ActionState`:

```ts
type ActionState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string[]> };
```

| Module | Action | Permission | Effect |
|---|---|---|---|
| `actions/auth.ts` | `loginAction` | public | Credentials sign-in |
| | `googleSignInAction` | public | Starts Google OAuth |
| | `registerAction` | public | Creates customer, sends welcome email, signs in |
| | `forgotPasswordAction` | public | Emails a 1-hour reset link |
| | `resetPasswordAction` | token | Sets a new password |
| | `logoutAction` | signed in | Signs out |
| `actions/checkout.ts` | `createCheckoutAction` | signed in | Validates cart against DB, creates `PENDING` order + Razorpay order |
| | `simulatePaymentAction` | signed in, dev only | Marks own order paid when Razorpay isn't configured |
| `actions/products.ts` | `saveProductAction` | `products:write` | Create/update product + images |
| | `toggleProductActiveAction` | `products:write` | Archive / activate |
| | `deleteProductAction` | `products:delete` | Delete product and Cloudinary assets |
| `actions/categories.ts` | `saveCategoryAction` / `deleteCategoryAction` | `categories:write` | CRUD (delete blocked if products exist) |
| `actions/orders.ts` | `updateOrderStatusAction` | `orders:manage` | Enforces the status state machine, emails the customer |
| | `refundOrderAction` | `orders:refund` | Razorpay refund, cancel, restock, email |
| `actions/users.ts` | `updateUserRoleAction` / `toggleUserActiveAction` | `users:manage` | Change role / deactivate (not self, not last admin) |

Every mutating action writes an `AuditLog` entry.
