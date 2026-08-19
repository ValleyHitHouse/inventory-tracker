// ---------------------------------------------------------------------------
// Pay periods — the single source of truth.
//
// A pay period runs SATURDAY → FRIDAY.
// Payday is the Friday AFTER the period closes, i.e. period end + 7 days.
//
//   Period  Sat Aug 8  →  Fri Aug 14      pays  Fri Aug 21
//   Period  Sat Aug 15 →  Fri Aug 21      pays  Fri Aug 28
//
// Anything that displays pay — the payroll dashboard, the breaker statement —
// must import from here so the two never drift apart.
// ---------------------------------------------------------------------------

export const MS_DAY = 86400000;

/** DB date strings ("2026-08-14") parsed at local noon so timezone/DST can't
 *  bump them onto the wrong calendar day. */
export function parseDay(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00");
}

/** Midnight on the Saturday that opens the period containing `d`. */
export function periodStart(d: Date | string): Date {
  const x = typeof d === "string" ? parseDay(d) : new Date(d);
  const daysFromSat = (x.getDay() + 1) % 7; // Sun=0 → 1 … Sat=6 → 0
  x.setDate(x.getDate() - daysFromSat);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Last instant of the Friday that closes the period. */
export function periodEnd(start: Date): Date {
  const e = new Date(start);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

/** The Friday the period actually gets paid — period end + 7 days. */
export function payday(start: Date): Date {
  const p = new Date(start);
  p.setDate(p.getDate() + 13);
  p.setHours(0, 0, 0, 0);
  return p;
}

/** Stable "YYYY-MM-DD" key for the period, taken from its Saturday. */
export function periodKey(d: Date | string): string {
  const s = periodStart(d);
  const y = s.getFullYear();
  const m = String(s.getMonth() + 1).padStart(2, "0");
  const day = String(s.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const md = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const mdw = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

/** "Aug 8 – 14" — year appended only when it isn't the current one. */
export function periodLabel(start: Date): string {
  const end = periodEnd(start);
  const sameMonth = start.getMonth() === end.getMonth();
  const base = sameMonth ? `${md(start)} – ${end.getDate()}` : `${md(start)} – ${md(end)}`;
  return end.getFullYear() === new Date().getFullYear() ? base : `${base}, ${end.getFullYear()}`;
}

/** "Friday, Aug 21" */
export function paydayLabel(start: Date): string {
  return mdw(payday(start));
}

export type PeriodState =
  | "open"      // still running — money is still accumulating
  | "due"       // closed, payday hasn't arrived yet
  | "overdue"   // payday came and went, still unpaid
  | "paid";     // settled

/**
 * Where a period sits right now.
 * `fullyPaid` should be true only when every line item in the period is paid.
 */
export function periodState(start: Date, fullyPaid: boolean, now: Date = new Date()): PeriodState {
  if (fullyPaid) return "paid";
  if (now <= periodEnd(start)) return "open";
  return now < payday(start) ? "due" : "overdue";
}

/** Whole numbers of days from now until payday (negative once it's passed). */
export function daysUntilPayday(start: Date, now: Date = new Date()): number {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  return Math.round((payday(start).getTime() - today.getTime()) / MS_DAY);
}

export type PeriodCopy = {
  /** Big line — what's happening with this week's money. */
  headline: string;
  /** Small line under it — the dates and the detail. */
  sub: string;
  /** Short pill text. */
  badge: string;
  /** Semantic tone for colouring. */
  tone: "good" | "pending" | "warn" | "neutral";
};

/**
 * Plain-spoken copy for one pay period, written to be read by the person
 * getting paid rather than the person paying.
 *
 * `paidAt` is the real timestamp we recorded, when we have one; without it we
 * fall back to the scheduled payday.
 */
export function periodCopy(
  start: Date,
  state: PeriodState,
  opts: { paidAt?: string | null; now?: Date } = {}
): PeriodCopy {
  const now = opts.now ?? new Date();
  const range = periodLabel(start);
  const pay = paydayLabel(start);

  switch (state) {
    case "paid": {
      // Only claim a send date we can stand behind: a real recorded timestamp,
      // or the scheduled payday once it has actually arrived.
      const when = opts.paidAt ? new Date(opts.paidAt)
        : now >= payday(start) ? payday(start)
        : null;
      return {
        headline: "Paid",
        sub: when ? `Week of ${range} · sent ${mdw(when)}` : `Week of ${range} · marked paid`,
        badge: "✓ Paid",
        tone: "good",
      };
    }
    case "due": {
      const days = daysUntilPayday(start, now);
      const when =
        days === 0 ? `Paying today, ${pay}` :
        days === 1 ? `Paying tomorrow, ${pay}` :
        `Paying this ${pay}`;
      return {
        headline: when,
        sub: `Week of ${range} · closed and totalled`,
        badge: days === 0 ? "Paying today" : "Coming up",
        tone: "pending",
      };
    }
    case "overdue": {
      return {
        headline: "Still to be paid",
        sub: `Week of ${range} · was scheduled for ${pay}`,
        badge: "Not yet paid",
        tone: "warn",
      };
    }
    case "open":
    default: {
      const end = periodEnd(start);
      return {
        headline: "This week so far",
        sub: `${range} · still running, closes ${mdw(end)} and pays ${pay}`,
        badge: "In progress",
        tone: "neutral",
      };
    }
  }
}

/** Group rows into pay periods, newest first. */
export function groupByPeriod<T>(items: T[], dateOf: (item: T) => string | null | undefined) {
  const groups: Record<string, { key: string; start: Date; items: T[] }> = {};
  for (const item of items) {
    const raw = dateOf(item);
    if (!raw) continue;
    const start = periodStart(raw);
    const key = periodKey(start);
    if (!groups[key]) groups[key] = { key, start, items: [] };
    groups[key].items.push(item);
  }
  return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
}

/** The period we're in right now, as a key — handy for "is this the live week?". */
export function currentPeriodKey(now: Date = new Date()): string {
  return periodKey(periodStart(now));
}
