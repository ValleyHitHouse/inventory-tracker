// Single catalog of dashboard pages, used by the sidebar (what to show),
// the middleware (what to allow), and the permissions editor (what to toggle).
export type PageDef = { key: string; route: string; label: string; emoji: string; group: "main" | "admin" | "website" };

export const PAGES: PageDef[] = [
  { key: "home", route: "/dashboard/home", label: "Home", emoji: "🏠", group: "main" },
  { key: "inventory", route: "/dashboard/inventory", label: "Inventory", emoji: "📦", group: "main" },
  { key: "breaks", route: "/dashboard/breaks", label: "Breaks", emoji: "🎴", group: "main" },
  { key: "customers", route: "/dashboard/customers", label: "Customers", emoji: "👥", group: "main" },
  { key: "cards", route: "/dashboard/cards", label: "Card Database", emoji: "🃏", group: "main" },
  { key: "card-inventory", route: "/dashboard/card-inventory", label: "Card Inventory", emoji: "📋", group: "main" },
  { key: "lot-comp", route: "/dashboard/lot-comp", label: "Lot Comps", emoji: "🏷️", group: "main" },
  { key: "hours", route: "/dashboard/hours", label: "Break Shipments", emoji: "📦", group: "main" },
  { key: "analytics", route: "/dashboard/analytics", label: "Analytics", emoji: "📊", group: "admin" },
  { key: "cash", route: "/dashboard/cash", label: "Cash Position", emoji: "💵", group: "admin" },
  { key: "recap", route: "/dashboard/recap", label: "Weekly Recap", emoji: "🗓️", group: "admin" },
  { key: "box-roi", route: "/dashboard/box-roi", label: "Box ROI", emoji: "🏆", group: "admin" },
  { key: "payroll", route: "/dashboard/payroll", label: "Payroll", emoji: "💼", group: "admin" },
  { key: "financials", route: "/dashboard/financials", label: "Financials", emoji: "🧾", group: "admin" },
  { key: "giveaways", route: "/dashboard/giveaways", label: "Giveaways", emoji: "🎁", group: "admin" },
  { key: "employees", route: "/dashboard/employees", label: "Employees", emoji: "👤", group: "admin" },
  { key: "settings", route: "/dashboard/settings", label: "Settings", emoji: "⚙️", group: "admin" },
  { key: "public-breaks", route: "/dashboard/public-breaks", label: "Break Schedule", emoji: "📅", group: "website" },
  { key: "top-hits", route: "/dashboard/top-hits", label: "Top Hits", emoji: "🔥", group: "website" },
  { key: "1of1", route: "/dashboard/1of1", label: "1/1 Tracker", emoji: "✨", group: "website" },
  { key: "slides", route: "/dashboard/slides", label: "Hero Slides", emoji: "🎠", group: "website" },
];

export const ALL_KEYS = PAGES.map(p => p.key);

// What a brand-new employee can see until an admin customizes them.
// Matches the operational pages employees had access to before permissions existed.
export const DEFAULT_EMPLOYEE_KEYS = ["home", "inventory", "breaks", "customers", "cards", "card-inventory", "lot-comp", "hours"];

// Map a pathname to its page key (handles nested routes like /dashboard/breaks/123).
export function routeToKey(pathname: string): string | null {
  // longest route first so /dashboard/card-inventory doesn't match /dashboard/cards
  const sorted = [...PAGES].sort((a, b) => b.route.length - a.route.length);
  const m = sorted.find(p => pathname === p.route || pathname.startsWith(p.route + "/"));
  return m ? m.key : null;
}
