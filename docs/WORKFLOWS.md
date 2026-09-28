# Workflows

## 1. Checkout & payment

```mermaid
sequenceDiagram
  autonumber
  actor C as Customer
  participant B as Browser (checkout-form)
  participant S as Server Action
  participant DB as PostgreSQL
  participant R as Razorpay
  participant W as Webhook route

  C->>B: Fill address, click "Pay"
  B->>S: createCheckoutAction({address, items:[{productId, qty}]})
  S->>DB: Load products (active), check stock
  S->>S: Compute subtotal, 18% GST, shipping from DB prices
  S->>DB: INSERT Order (PENDING) + OrderItems (snapshots)
  S->>R: orders.create(amount, receipt)
  S->>DB: Save razorpayOrderId
  S-->>B: {keyId, razorpayOrderId, amount}
  B->>R: Open Checkout.js popup
  C->>R: Pay (UPI / card / netbanking)
  R-->>B: {payment_id, order_id, signature}
  B->>S: POST /api/payments/razorpay/verify
  S->>S: Verify HMAC signature
  S->>DB: TX: PENDING→PAID, PROCESSING, decrement stock (conditional)
  S-->>B: ok → redirect /orders/:id?success=1
  S--)C: Confirmation email (after response)
  R--)W: payment.captured (server-to-server)
  W->>DB: markOrderPaid() — no-op if already paid (idempotent)
```

**Why both the callback and the webhook?** The browser callback gives instant feedback; the webhook is the source of truth if the customer closes the tab, loses connection or pays via a delayed UPI flow.

**Development mode:** with no Razorpay keys (and `NODE_ENV !== production`), step 7 onwards is replaced by `simulatePaymentAction`, which calls the same `markOrderPaid` function.

## 2. Order lifecycle

```mermaid
stateDiagram-v2
  [*] --> PENDING: order created
  PENDING --> PROCESSING: payment captured
  PENDING --> CANCELLED: admin cancels unpaid order
  PROCESSING --> SHIPPED: admin
  SHIPPED --> DELIVERED: admin
  PROCESSING --> CANCELLED: refund (admin)
  SHIPPED --> CANCELLED: refund (admin)
  DELIVERED --> [*]
  CANCELLED --> [*]
```

- Transitions are enforced server-side in `actions/orders.ts` (`TRANSITIONS` map); the UI only offers valid next states.
- Only **paid** orders can be fulfilled; a **paid** order can only be cancelled through **Refund & cancel**, which calls the Razorpay Refunds API, sets `paymentStatus = REFUNDED`, restores stock and emails the customer.
- Each transition emails the customer and is written to the audit log (visible as the order's Activity timeline).

## 3. Product image upload

```mermaid
sequenceDiagram
  participant A as Admin browser
  participant S as /api/upload/sign
  participant C as Cloudinary
  participant SA as saveProductAction
  A->>A: Validate type (JPG/PNG/WebP/AVIF) & size (≤5 MB)
  A->>S: POST (session cookie)
  S->>S: assertPermission(products:write)
  S-->>A: {signature, timestamp, apiKey, cloudName, folder}
  A->>C: POST file + signature (direct upload)
  C-->>A: {secure_url, public_id}
  A->>SA: Save product with images[] (url, publicId, position)
  SA->>C: destroy(publicId) for images removed from the product
```

The first image is the cover; images can be reordered. Without Cloudinary, admins paste `https://` image URLs instead.

## 4. Authentication

- **Register** → Zod validation → bcrypt hash (cost 12) → create `CUSTOMER` → welcome email → auto sign-in.
- **Login** → Credentials provider checks hash and `isActive` → JWT cookie with `sub` + `role`.
- **Google** → OAuth → Prisma adapter creates/links the user (email verified by Google).
- **Session refresh** → every 5 min the JWT callback reloads role/active flag; a deactivated user is signed out.
- **Forgot password** → random 32-byte token, SHA-256 hash stored with 1-hour expiry → email link → reset form verifies hash + expiry → new bcrypt hash → all tokens for that email deleted.

## 5. Role-based access

```mermaid
flowchart TD
  R[Request /admin/users] --> P{proxy.ts<br/>JWT present?}
  P -- no --> L[/login?callbackUrl/]
  P -- yes --> S{role is staff?<br/>admin-only path?}
  S -- no --> U[/unauthorized/]
  S -- yes --> PG{page:<br/>requirePermission}
  PG -- denied --> U
  PG -- ok --> A[render] --> ACT{server action:<br/>assertPermission}
  ACT -- denied --> E[error message]
  ACT -- ok --> DB[(write + audit log)]
```

## 6. Analytics & reports

- **Dashboard** (`/admin?range=7d|30d|90d|12m`): KPIs (revenue, paid orders, AOV, new customers) compared with the previous equal-length period; revenue trend bucketed by day/week/month via `date_trunc`; orders by status; sales by category; top products; low stock; recent orders.
- **Reports** (`/admin/reports?from=&to=`): net sales, GST, shipping, refunds, cancellations, top 10 products, daily table, and CSV export of orders or product sales for the same range.
- Revenue counts only `paymentStatus = PAID`, keyed on `paidAt`.
