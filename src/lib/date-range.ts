const DAY = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toLabel(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Parses ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive) into a half-open UTC range
 * [from, to). Defaults to the last 30 days.
 */
export function parseDateRange(fromParam?: string | null, toParam?: string | null) {
  const today = new Date();
  const defaultTo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const toDay = toParam && ISO_DATE.test(toParam) ? new Date(`${toParam}T00:00:00Z`) : defaultTo;
  let fromDay =
    fromParam && ISO_DATE.test(fromParam) ? new Date(`${fromParam}T00:00:00Z`) : new Date(toDay.getTime() - 29 * DAY);
  if (fromDay > toDay) fromDay = toDay;

  return {
    from: fromDay,
    to: new Date(toDay.getTime() + DAY),
    fromLabel: toLabel(fromDay),
    toLabel: toLabel(toDay),
  };
}
