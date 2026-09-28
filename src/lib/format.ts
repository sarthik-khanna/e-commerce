const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Format an amount stored in paise, e.g. 49900 → "₹499.00". */
export function formatPrice(paise: number) {
  return inr.format(paise / 100);
}

export function formatPriceCompact(paise: number) {
  return inrCompact.format(paise / 100);
}

/** Convert a rupee amount typed by a user ("499.5") into paise (49950). */
export function rupeesToPaise(rupees: number) {
  return Math.round(rupees * 100);
}

export function formatDate(date: Date | string, withTime = false) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(date));
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email || "?";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
