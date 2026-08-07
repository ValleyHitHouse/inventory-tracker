// Single source of truth for the BOBA card sets.
// Add a new set here and it appears in the dashboard Card Database,
// Card Inventory, and Lot Comps set pickers automatically.
export type CardSet = { label: string; file: string; color: string };

export const CARD_SETS: CardSet[] = [
  { label: "Griffey", file: "/boba-checklist.csv", color: "#fb923c" },
  { label: "Alpha", file: "/alpha-boba-checklist.csv", color: "#a78bfa" },
  { label: "Alpha Update", file: "/alpha-update-boba-checklist.csv", color: "#38bdf8" },
  { label: "Tecmo", file: "/tecmo-checklist.csv", color: "#4ade80" },
];
