// Shared by the cart UI (for display) and the server (authoritative totals).
// The server always recomputes totals from database prices — never trusts the client.

export const TAX_RATE = 0.18; // GST
export const FREE_SHIPPING_THRESHOLD = 99900; // ₹999 in paise
export const SHIPPING_FEE = 4900; // ₹49 in paise

export function calculateTotals(subtotal: number) {
  const tax = Math.round(subtotal * TAX_RATE);
  const shippingFee = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  return { subtotal, tax, shippingFee, total: subtotal + tax + shippingFee };
}
