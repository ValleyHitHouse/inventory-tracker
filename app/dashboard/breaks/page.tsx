"use client";
import { useState, useEffect } from "react";
import { parseCSV } from "@/lib/csv";
import { supabase } from "@/lib/supabase";

const WHATNOT_FEE = 0.112;
const IMC_SPLIT = 0.70;
const VALLEY_SPLIT = 0.30;

const IMC_SUPPLIES = ["Armalopes", "Toploaders", "Penny sleeves", "Team bags", "Bubble mailers", "Boxes (S)", "Boxes (M)", "Boxes (L)", "MagPros"];
const VALLEY_SUPPLIES = ["Stickers", "Giveaway cards", "Shipping labels", "Packing tape", "Packing paper"];

const DEFAULT_BOX_TYPES = [
  { key: "jumbo_hobby_count", label: "Griffey Jumbo", settingsKey: "jumbo_hobby_price" },
  { key: "hobby_count", label: "Griffey Hobby", settingsKey: "hobby_price" },
  { key: "double_mega_count", label: "Griffey Double Mega", settingsKey: "double_mega_price" },
  { key: "blaster_count", label: "Griffey Blaster", settingsKey: "blaster_price" },
];

const weaponColors: Record<string, string> = {
  Fire: "#fb923c", Ice: "#38bdf8", Steel: "#94a3b8",
  Gum: "#f472b6", Hex: "#a78bfa", Glow: "#4ade80", Brawl: "#f87171"
};

function calcSupplyEstimates(csvData: any[]) {
  const payingBuyers = new Set<string>();
  for (const row of csvData) {
    if (parseFloat(row.original_item_price || "0") > 0) payingBuyers.add(row.buyer_username);
  }
  const estimates: Record<string, number> = {
    "Armalopes": 0, "Toploaders": 0, "Penny sleeves": 0,
    "Giveaway cards": 0, "Team bags": 0, "Bubble mailers": 0,
    "Stickers": 0, "Boxes (S)": 0,
  };
  const buyerOrderCounts: Record<string, number> = {};
  for (const row of csvData) {
    const price = parseFloat(row.original_item_price || "0");
    const buyer = row.buyer_username;
    if (price === 0) {
      estimates["Toploaders"] += 1;
      estimates["Penny sleeves"] += 1;
      estimates["Giveaway cards"] += 1;
      estimates["Team bags"] += 1;
      if (!payingBuyers.has(buyer)) estimates["Armalopes"] += 1;
    } else {
      buyerOrderCounts[buyer] = (buyerOrderCounts[buyer] || 0) + 1;
      const orderNum = buyerOrderCounts[buyer];
      if (orderNum === 1) {
        estimates["Bubble mailers"] += 1;
        estimates["Stickers"] += 1;
        estimates["Team bags"] += 1;
        estimates["Toploaders"] += 2;
        estimates["Penny sleeves"] += 3;
      } else if (orderNum < 9) {
        estimates["Team bags"] += 1;
        estimates["Toploaders"] += 1;
        estimates["Penny sleeves"] += 2;
      } else {
        estimates["Boxes (S)"] += 1;
        estimates["Team bags"] += 1;
        estimates["Toploaders"] += 1;
        estimates["Penny sleeves"] += 2;
      }
    }
  }
  return estimates;
}

const DEFAULT_SLEEVES: Record<string, number> = {
  jumbo_hobby_count: 50, hobby_count: 17, double_mega_count: 12, blaster_count: 4,
};

// Levenshtein edit distance — used for fuzzy "juiced" matching.
function levDist(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0); row[0] = i; return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return dp[m][n];
}

// Detect a juiced giveaway from the line text, tolerant of misspellings
// (juiced / jucied / jiuced / juicd / juicde ... any close typo of "juiced").
function looksJuiced(name: string): boolean {
  const t = (name || "").toLowerCase();
  if (t.includes("juiced") || t.includes("jucied") || t.includes("jiuced") || t.includes("juicd")) return true;
  for (const w of t.split(/[^a-z]+/)) {
    if (w.length >= 4 && w.length <= 8 && levDist(w, "juiced") <= 2) return true;
  }
  return false;
}

// Per-break supply usage — drives the inventory deduction (kept separate from the
// financial supply-cost estimate above, which still feeds profit/commission).
function computeSupplyUsage(csvData: any[], boxSleeves: number, hitsMagd: number, skunkCards: number): Record<string, number> {
  const buyers: Record<string, { paid: number; juiced: number; givvy: number }> = {};
  for (const r of csvData) {
    const price = parseFloat(r.original_item_price || "0");
    const buyer = ((r.buyer_username || "unknown") + "").trim() || "unknown";
    if (!buyers[buyer]) buyers[buyer] = { paid: 0, juiced: 0, givvy: 0 };
    if (price > 0) buyers[buyer].paid++;
    else {
      if (looksJuiced(r.product_name)) buyers[buyer].juiced++;
      else buyers[buyer].givvy++;
    }
  }
  let bubbles = 0, armalopes = 0, clearBubbles = 0, shipments = 0, payShip = 0;
  let totalJuiced = 0, totalPaid = 0, totalGivvy = 0;
  for (const b of Object.values(buyers)) {
    if (b.paid > 0 || b.juiced > 0 || b.givvy > 0) shipments++;
    if (b.paid > 0) payShip++;
    if ((b.paid >= 1 && b.paid <= 4) || (b.paid === 0 && b.juiced >= 1)) bubbles++;
    if (b.paid === 0 && b.juiced === 0 && b.givvy >= 1) armalopes++;
    if (b.juiced >= 1) clearBubbles++;
    totalJuiced += b.juiced; totalPaid += b.paid; totalGivvy += b.givvy;
  }
  return {
    "Bubbles": bubbles,
    "Small Boxes": 0,
    "Medium Boxes": 0,
    "Large Boxes": 0,
    "Armalopes": armalopes,
    "Toploaders": boxSleeves,
    "Penny Sleeves": boxSleeves,
    "Team Bags": totalPaid + totalGivvy + totalJuiced + 10,
    "Labels": shipments + 5,
    "Valley Stickers": payShip,
    "Giveaway Cards": totalGivvy + skunkCards,
    "Mags": totalJuiced + hitsMagd,
    "Mag Stickers": totalJuiced,
    "Mag Labels": totalJuiced,
    "Clear Bubbles": clearBubbles,
    "Card Protectors": clearBubbles,
  };
}

type CommissionTier = { minPct: number; rate: number };

const DEFAULT_COMMISSION_TIERS: CommissionTier[] = [
  { minPct: 0, rate: 30 },
  { minPct: 120, rate: 35 },
  { minPct: 140, rate: 40 },
  { minPct: 160, rate: 50 },
  { minPct: 180, rate: 60 },
];

// Returns the commission rate (as a percent, e.g. 40) for a given % to market,
// picking the highest tier whose threshold is met.
function rateForPct(tiers: CommissionTier[] | null, percentToMarket: number): number {
  if (!tiers || tiers.length === 0 || percentToMarket <= 0) return 0;
  const sorted = [...tiers]
    .filter(t => !isNaN(Number(t.minPct)) && !isNaN(Number(t.rate)))
    .sort((a, b) => Number(a.minPct) - Number(b.minPct));
  let rate = 0;
  for (const t of sorted) { if (percentToMarket >= Number(t.minPct)) rate = Number(t.rate); }
  return rate;
}

function calcCommission(percentToMarket: number, valleyTake: number, tiers: CommissionTier[] | null): number {
  return valleyTake * (rateForPct(tiers, percentToMarket) / 100);
}

interface ExtraBoxType {
  id: string;
  label: string;
  price: string;
}

export default function Breaks() {
  const [breaks, setBreaks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [commissionEmployees, setCommissionEmployees] = useState<string[]>([]);
  const [commissionTiers, setCommissionTiers] = useState<Record<string, CommissionTier[]>>({});
  const [view, setView] = useState<"list" | "new">("list");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [boxName, setBoxName] = useState("");
  const [breaker, setBreaker] = useState("");
  const [boxCounts, setBoxCounts] = useState<Record<string, number>>({ jumbo_hobby_count: 0, hobby_count: 0, double_mega_count: 0, blaster_count: 0 });
  const [extraBoxTypes, setExtraBoxTypes] = useState<ExtraBoxType[]>([]);
  const [extraBoxCounts, setExtraBoxCounts] = useState<Record<string, number>>({});
  const [selectedBoxIds, setSelectedBoxIds] = useState<string[]>([]);
  const [promotionTotal, setPromotionTotal] = useState("");
  const [manualRevenueBefore, setManualRevenueBefore] = useState("");
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvName, setCsvName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [bobaFormBreak, setBobaFormBreak] = useState<any>(null);
  const [markingSubmitted, setMarkingSubmitted] = useState<number | null>(null);
  const [bobaFormTips, setBobaFormTips] = useState("0.00");
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [cardInventory, setCardInventory] = useState<any[]>([]);
  const [cardSearch, setCardSearch] = useState("");
  const [pickedCards, setPickedCards] = useState<Record<string, { item: any; qty: number }>>({});
  const [supplyEstimates, setSupplyEstimates] = useState<Record<string, number>>({});
  const [editedEstimates, setEditedEstimates] = useState<Record<string, number>>({});
  const [magPros, setMagPros] = useState("");
  const [deductingSupplies, setDeductingSupplies] = useState(false);
  const [suppliesDeducted, setSuppliesDeducted] = useState(false);
  const [hitsMagd, setHitsMagd] = useState("");
  const [skunkCards, setSkunkCards] = useState("");
  const [usageEdits, setUsageEdits] = useState<Record<string, number>>({});
  const [deductingInv, setDeductingInv] = useState(false);
  const [deductedInv, setDeductedInv] = useState(false);
  const [inventoryPrices, setInventoryPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    loadBreaks(); loadCardInventory(); loadInventoryPrices(); loadMarketPrices(); loadEmployees();
  }, []);

  useEffect(() => {
    if (csvData.length > 0) {
      const estimates = calcSupplyEstimates(csvData);
      setSupplyEstimates(estimates);
      setEditedEstimates(estimates);
      setSuppliesDeducted(false);
    }
  }, [csvData]);

  async function loadBreaks() {
    const { data } = await supabase.from("Breaks").select("*").order("date", { ascending: false });
    if (data) setBreaks(data);
  }

  async function loadEmployees() {
    const { data } = await supabase.from("employees").select("name, commission_based, commission_tiers").eq("active", true).order("name");
    if (data) {
      setEmployees(data);
      setCommissionEmployees(data.filter((e: any) => e.commission_based).map((e: any) => e.name));
      const tiersMap: Record<string, CommissionTier[]> = {};
      for (const e of data as any[]) {
        if (e.commission_based) {
          tiersMap[e.name] = Array.isArray(e.commission_tiers) && e.commission_tiers.length > 0
            ? e.commission_tiers
            : DEFAULT_COMMISSION_TIERS;
        }
      }
      setCommissionTiers(tiersMap);
    }
  }

  async function loadCardInventory() {
    const { data } = await supabase.from("cardinventory").select("*").order("subset").order("hero");
    if (data) setCardInventory(data);
  }

  async function loadInventoryPrices() {
    const { data } = await supabase.from("Inventory").select("name, cost");
    if (data) {
      const prices: Record<string, number> = {};
      for (const item of data) {
        const num = parseFloat((item.cost || "0").replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) prices[item.name] = num;
      }
      setInventoryPrices(prices);
    }
  }

  async function loadMarketPrices() {
    const { data } = await supabase.from("settings").select("key, value");
    if (data) {
      const prices: Record<string, number> = {};
      for (const row of data) prices[row.key] = parseFloat(row.value || "0");
      setMarketPrices(prices);
      const extraRow = data.find(r => r.key === "extra_box_types");
      if (extraRow?.value) {
        try { setExtraBoxTypes(JSON.parse(extraRow.value)); } catch {}
      }
    }
  }

  async function deleteBreak(id: number) {
    setDeletingId(id);
    await supabase.from("BreakOrders").delete().eq("break_id", id);
    await supabase.from("BreakChasers").delete().eq("break_id", id);
    await supabase.from("BreakSupplies").delete().eq("break_id", id);
    await supabase.from("Breaks").delete().eq("id", id);
    setDeletingId(null); setConfirmId(null);
    loadBreaks();
  }

  async function markBobaSubmitted(id: number) {
    setMarkingSubmitted(id);
    await supabase.from("Breaks").update({ boba_submitted: true }).eq("id", id);
    setBreaks(prev => prev.map(b => b.id === id ? { ...b, boba_submitted: true } : b));
    setMarkingSubmitted(null);
    setBobaFormBreak(null);
  }

  const totalBoxes = Object.values(boxCounts).reduce((s, v) => s + v, 0)
    + Object.values(extraBoxCounts).reduce((s, v) => s + v, 0);

  const defaultMarketValue = DEFAULT_BOX_TYPES.reduce((sum, bt) =>
    sum + (boxCounts[bt.key] || 0) * (marketPrices[bt.settingsKey] || 0), 0);
  const extraMarketValue = extraBoxTypes.reduce((sum, bt) =>
    sum + (extraBoxCounts[bt.id] || 0) * parseFloat(bt.price || "0"), 0);
  const marketValue = defaultMarketValue + extraMarketValue;

  // Unified box list for the "add box type" picker (defaults + custom).
  const allBoxTypes = [
    ...DEFAULT_BOX_TYPES.map(bt => ({ id: bt.key, label: bt.label, kind: "default" as const, price: marketPrices[bt.settingsKey] || 0 })),
    ...extraBoxTypes.map(bt => ({ id: bt.id, label: bt.label, kind: "extra" as const, price: parseFloat(bt.price || "0") || 0 })),
  ];
  const boxCountOf = (b: { id: string; kind: string }) => ((b.kind === "default" ? boxCounts[b.id] : extraBoxCounts[b.id]) || 0);
  function setBoxQty(b: { id: string; kind: string }, n: number) {
    const v = Math.max(0, Math.floor(n) || 0);
    if (b.kind === "default") setBoxCounts(prev => ({ ...prev, [b.id]: v }));
    else setExtraBoxCounts(prev => ({ ...prev, [b.id]: v }));
  }
  const shownBoxes = allBoxTypes.filter(b => selectedBoxIds.includes(b.id) || boxCountOf(b) > 0);
  const unusedBoxes = allBoxTypes.filter(b => !shownBoxes.some(sb => sb.id === b.id));

  const revenueBeforeCoupons = manualRevenueBefore
    ? parseFloat(manualRevenueBefore)
    : csvData.reduce((s, r) => s + parseFloat(r.original_item_price || "0"), 0);

  const couponTotal = csvData.reduce((s, r) => s + parseFloat(r.coupon_price || "0"), 0);
  const whatnotFeeRate = (marketPrices["whatnot_fee_pct"] ?? (WHATNOT_FEE * 100)) / 100;
  const whatnotFees = revenueBeforeCoupons * whatnotFeeRate;
  const revenueAfterFees = revenueBeforeCoupons - whatnotFees;
  const spotsSold = csvData.filter(r => parseFloat(r.original_item_price || "0") > 0).length;
  const freeGiveaways = csvData.filter(r => parseFloat(r.original_item_price || "0") === 0).length;
  const percentToMarket = marketValue > 0 ? (revenueBeforeCoupons / marketValue) * 100 : 0;

  const chaserCost = Object.values(pickedCards).filter(({ item }) => item.subset === "Chasers").reduce((sum, { item, qty }) => sum + parseFloat(item.price_paid || "0") * qty, 0);
  const insuranceCost = Object.values(pickedCards).filter(({ item }) => item.subset === "Insurance").reduce((sum, { item, qty }) => sum + parseFloat(item.price_paid || "0") * qty, 0);
  const firstTimerCost = Object.values(pickedCards).filter(({ item }) => item.subset === "First Timers").reduce((sum, { item, qty }) => sum + parseFloat(item.price_paid || "0") * qty, 0);
  const allEstimates: Record<string, number> = { ...editedEstimates, ...(magPros ? { "MagPros": parseInt(magPros) } : {}) };

  function getSupplyCost(name: string, qty: number): number {
    return (inventoryPrices[name] || 0) * qty;
  }

  // --- New inventory deduction model (box-count + CSV driven) ---
  const boxSleeves =
    DEFAULT_BOX_TYPES.reduce((sum, bt) => {
      const rate = marketPrices[bt.settingsKey.replace("_price", "_sleeves")] ?? DEFAULT_SLEEVES[bt.key] ?? 0;
      return sum + (boxCounts[bt.key] || 0) * rate;
    }, 0)
    + extraBoxTypes.reduce((sum, bt) => sum + (extraBoxCounts[bt.id] || 0) * (parseFloat((bt as any).sleeveRate || "0") || 0), 0);
  const autoUsage = computeSupplyUsage(csvData, Math.round(boxSleeves), parseInt(hitsMagd || "0") || 0, parseInt(skunkCards || "0") || 0);
  const usageValue = (name: string) => (usageEdits[name] ?? autoUsage[name] ?? 0);

  async function deductSupplies() {
    setDeductingInv(true);
    for (const name of Object.keys(autoUsage)) {
      const qty = usageValue(name);
      if (qty <= 0) continue;
      const { data } = await supabase.from("Inventory").select("id,quantity").ilike("name", name).limit(1);
      const row = data && data[0];
      if (row) await supabase.from("Inventory").update({ quantity: Math.max(0, (Number(row.quantity) || 0) - qty) }).eq("id", row.id);
    }
    setDeductingInv(false); setDeductedInv(true);
  }

  const imcSupplyCost = Object.entries(allEstimates).filter(([name]) => IMC_SUPPLIES.includes(name)).reduce((sum, [name, qty]) => sum + getSupplyCost(name, qty), 0);
  const valleySupplyCost = Object.entries(allEstimates).filter(([name]) => VALLEY_SUPPLIES.includes(name)).reduce((sum, [name, qty]) => sum + getSupplyCost(name, qty), 0);
  const giveawayCardCost = getSupplyCost("Giveaway cards", allEstimates["Giveaway cards"] || 0);
  const sharedExpenses = imcSupplyCost + chaserCost + couponTotal + parseFloat(promotionTotal || "0");
  const imcShareOfExpenses = sharedExpenses * IMC_SPLIT;
  const valleyShareOfExpenses = sharedExpenses * VALLEY_SPLIT;
  const valleyOnlyExpenses = valleySupplyCost + insuranceCost + firstTimerCost + giveawayCardCost;
  const profitAfterExpenses = revenueAfterFees - sharedExpenses - valleyOnlyExpenses;
  const imcTake = profitAfterExpenses * IMC_SPLIT;
  const valleyTake = profitAfterExpenses * VALLEY_SPLIT;
  const totalSupplyCost = imcSupplyCost + valleySupplyCost;
  const supplyDeductionPct = marketPrices["breaker_supply_deduction_pct"] ?? 25;
  const breakerTiers = commissionEmployees.includes(breaker) ? (commissionTiers[breaker] || DEFAULT_COMMISSION_TIERS) : null;
  const grossCommission = calcCommission(percentToMarket, valleyTake, breakerTiers);
  const commissionSupplyDeduction = grossCommission > 0 ? totalSupplyCost * (supplyDeductionPct / 100) : 0;
  const commissionAmount = Math.max(0, grossCommission - commissionSupplyDeduction);

  const filteredCardInventory = cardInventory.filter(c => {
    if (c.quantity <= 0) return false;
    const q = cardSearch.toLowerCase().trim();
    const combined = [c.hero, c.athlete, c.card_number, c.subset, c.weapon, c.variation].join(" ").toLowerCase();
    return !q || q.split(" ").filter(Boolean).every((word: string) => combined.includes(word));
  }).slice(0, 50);

  function pickCard(item: any) {
    const key = `${item.id}`;
    setPickedCards(prev => {
      const current = prev[key]?.qty || 0;
      if (current >= item.quantity) return prev;
      return { ...prev, [key]: { item, qty: current + 1 } };
    });
  }

  function updateCardQty(key: string, qty: number) {
    if (qty <= 0) {
      setPickedCards(prev => { const n = { ...prev }; delete n[key]; return n; });
    } else {
      const maxQty = pickedCards[key]?.item?.quantity || 999;
      setPickedCards(prev => ({ ...prev, [key]: { ...prev[key], qty: Math.min(qty, maxQty) } }));
    }
  }

  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target?.result as string);
      setCsvData(rows);
      const d = rows[0]?.placed_at?.split(" ")[0];
      if (d) setDate(d);
    };
    reader.readAsText(file);
  }

  async function deductSuppliesFromInventory() {
    if (!magPros) return alert("Please enter the number of MagPros used!");
    setDeductingSupplies(true);
    const allSupplies = { ...editedEstimates, "MagPros": parseInt(magPros || "0") };
    for (const [name, qty] of Object.entries(allSupplies)) {
      if (qty <= 0) continue;
      const { data: inv } = await supabase.from("Inventory").select("id,quantity").eq("name", name).single();
      if (inv) await supabase.from("Inventory").update({ quantity: Math.max(0, inv.quantity - qty) }).eq("id", inv.id);
    }
    setDeductingSupplies(false);
    setSuppliesDeducted(true);
  }

  async function saveBreak() {
    if (!breaker) return alert("Please select who ran this break.");
    setSaving(true);
    const extraBoxSummary = extraBoxTypes
      .filter(bt => (extraBoxCounts[bt.id] || 0) > 0)
      .map(bt => `${bt.label} x${extraBoxCounts[bt.id]}`)
      .join(", ");
    const fullBoxName = extraBoxSummary
      ? `${boxName}${boxName ? " + " : ""}${extraBoxSummary}`
      : boxName;

    const { data: brk } = await supabase.from("Breaks").insert({
      date, box_name: fullBoxName, num_boxes: totalBoxes,
      jumbo_hobby_count: boxCounts.jumbo_hobby_count,
      hobby_count: boxCounts.hobby_count,
      double_mega_count: boxCounts.double_mega_count,
      blaster_count: boxCounts.blaster_count,
      market_value: Math.round(marketValue * 100) / 100,
      box_value: 0,
      revenue: Math.round(revenueAfterFees * 100) / 100,
      spots_sold: spotsSold,
      free_giveaways: freeGiveaways,
      net_profit: Math.round(profitAfterExpenses * 100) / 100,
      imc_take: Math.round(imcTake * 100) / 100,
      valley_take: Math.round(valleyTake * 100) / 100,
      boba_submitted: false,
      coupon_total: Math.round(couponTotal * 100) / 100,
      promotion_total: Math.round(parseFloat(promotionTotal || "0") * 100) / 100,
      total_supply_cost: Math.round((imcSupplyCost + valleySupplyCost) * 100) / 100,
      chaser_cost: Math.round(chaserCost * 100) / 100,
      revenue_before_fees: Math.round(revenueBeforeCoupons * 100) / 100,
      breaker,
      commission_amount: Math.round(commissionAmount * 100) / 100,
      commission_supply_deduction: Math.round(commissionSupplyDeduction * 100) / 100,
      commission_paid: false,
    }).select().single();

    if (brk) {
      if (Object.keys(pickedCards).length > 0) {
        await supabase.from("BreakChasers").insert(
          Object.values(pickedCards).map(({ item, qty }) => ({
            break_id: brk.id, name: `${item.hero} (${item.athlete})`,
            type: item.subset, quantity: qty, value: parseFloat(item.price_paid || "0"),
          }))
        );
        for (const { item, qty } of Object.values(pickedCards)) {
          const newQty = Math.max(0, item.quantity - qty);
          if (newQty === 0) {
            await supabase.from("cardinventory").delete().eq("id", item.id);
          } else {
            await supabase.from("cardinventory").update({ quantity: newQty }).eq("id", item.id);
          }
          const subsetToId: Record<string, number> = { Chasers: 4, Insurance: 3, "First Timers": 2 };
          const invId = subsetToId[item.subset];
          if (invId) {
            const { data: inv } = await supabase.from("Inventory").select("id,quantity").eq("id", invId).single();
            if (inv) await supabase.from("Inventory").update({ quantity: Math.max(0, inv.quantity - qty) }).eq("id", invId);
          }
        }
      }
      if (freeGiveaways > 0) {
        const { data: gt } = await supabase.from("giveawaytotal").select("total").single();
        if (gt) await supabase.from("giveawaytotal").update({ total: Math.max(0, gt.total - freeGiveaways) }).eq("id", 1);
        const { data: givInv } = await supabase.from("Inventory").select("id,quantity").eq("id", 1).single();
        if (givInv) await supabase.from("Inventory").update({ quantity: Math.max(0, givInv.quantity - freeGiveaways) }).eq("id", 1);
      }
      if (csvData.length) {
        const orderRows = csvData.map(r => ({
          break_id: brk.id, order_id: r.order_id || null,
          buyer_username: r.buyer_username || null, product_name: r.product_name || null,
          price: parseFloat(r.original_item_price || "0"),
          placed_at: r.placed_at ? r.placed_at.trim() : null,
          cancelled: r.cancelled_or_failed === "True",
          tracking_code: r.tracking_code || null,
          shipping_address: r.shipping_address || null, postal_code: r.postal_code || null,
        }));
        await supabase.from("BreakOrders").insert(orderRows);
      }
    }

    await loadBreaks(); await loadCardInventory();
    setSaving(false); setView("list");
    setCsvData([]); setCsvName(""); setBoxName(""); setBreaker("");
    setBoxCounts({ jumbo_hobby_count: 0, hobby_count: 0, double_mega_count: 0, blaster_count: 0 });
    setExtraBoxCounts({}); setSelectedBoxIds([]);
    setPickedCards({}); setCardSearch("");
    setSupplyEstimates({}); setEditedEstimates({});
    setMagPros(""); setSuppliesDeducted(false);
    setPromotionTotal(""); setManualRevenueBefore("");
  }

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" },
    content: { padding: "24px 16px", maxWidth: 900, margin: "0 auto" },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    label: { fontSize: 12, color: "#666", marginBottom: 5, display: "block" },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const },
    smallInput: { background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "6px 10px", fontSize: 13, color: "#e5e5e5", outline: "none", width: 70, textAlign: "center" as const },
    submitBtn: { width: "100%", background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", marginTop: 4 },
    stat: { background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px 14px" },
    statLabel: { fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".4px" },
    statValue: { fontSize: 20, fontWeight: 700 },
    expenseRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #161616", fontSize: 13 },
  };

  const mobileStyles = `
    .breaks-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .breaks-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .breaks-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
    .breaks-grid-4b { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .breaks-stat-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .breaks-extra-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 768px) {
      .breaks-grid-2 { grid-template-columns: 1fr; }
      .breaks-grid-3 { grid-template-columns: 1fr 1fr; }
      .breaks-grid-4 { grid-template-columns: 1fr 1fr; }
      .breaks-grid-4b { grid-template-columns: 1fr 1fr; }
      .breaks-stat-2 { grid-template-columns: 1fr 1fr; }
      .breaks-extra-boxes { grid-template-columns: 1fr 1fr; }
    }
  `;

  // BOBA FORM VIEW
  if (bobaFormBreak) {
    const b = bobaFormBreak;
    const revBeforeAll = parseFloat(b.revenue_before_fees || "0") > 0
      ? parseFloat(b.revenue_before_fees)
      : parseFloat(b.revenue || "0") / (1 - WHATNOT_FEE);
    const whatnotFeesForBreak = revBeforeAll - parseFloat(b.revenue || "0");
    const totalSupplyCost = parseFloat(b.total_supply_cost || "0");
    const streamExpensesText =
      `Coupon Total: $${parseFloat(b.coupon_total || "0").toFixed(2)}\n` +
      `Promotion Total: $${parseFloat(b.promotion_total || "0").toFixed(2)}\n` +
      `Tips Received: $${parseFloat(bobaFormTips || "0").toFixed(2)}\n` +
      `Shipping Spend: $${totalSupplyCost.toFixed(2)}\n` +
      `Chasers: $${parseFloat(b.chaser_cost || "0").toFixed(2)}\n` +
      `Other: `;

    const fields = [
      { label: "Break name", value: "ValleyHitHouse" },
      { label: "Date of stream", value: b.date },
      { label: "How many Hobby boxes", value: String(b.hobby_count || 0) },
      { label: "How many Jumbo boxes", value: String(b.jumbo_hobby_count || 0) },
      { label: "How many D-Mega boxes", value: String(b.double_mega_count || 0) },
      { label: "Wonders product", value: "None" },
      { label: "Other product", value: "None" },
      { label: "Total revenue generated (before fees & coupons)", value: revBeforeAll.toFixed(2) },
      { label: "Total Whatnot fees", value: whatnotFeesForBreak.toFixed(2) },
      { label: "Stream expenses", value: streamExpensesText },
      { label: "Sign off name", value: "Mitch Woodhurst" },
    ];

    return (
      <div style={s.shell}>
        <div style={s.content}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>BOBA Form — {b.box_name || b.date}</h1>
              <p style={{ fontSize: 13, color: "#555" }}>Copy each field into the Google Form</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setBobaFormBreak(null)} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>← Back</button>
              <a href="https://forms.gle/rictfCC5LUxrChqP7" target="_blank" style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                Open BOBA Form ↗
              </a>
            </div>
          </div>

          <div style={{ ...s.section, borderColor: "#fb923c44" }}>
            <div style={s.sectionTitle}>💰 Tips received</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "#555", fontSize: 13 }}>$</span>
              <input style={{ ...s.input, maxWidth: 200 }} type="number" min={0} step="0.01" placeholder="0.00" value={bobaFormTips} onChange={e => setBobaFormTips(e.target.value)} />
            </div>
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}>Form fields — tap Copy on each</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {fields.map((field, i) => (
                <div key={i} style={{ background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".4px" }}>{field.label}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ fontSize: 14, color: "#e5e5e5", fontWeight: 500, whiteSpace: "pre-wrap", flex: 1 }}>{field.value}</div>
                    <button onClick={() => navigator.clipboard.writeText(field.value)} style={{ fontSize: 11, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", borderRadius: 6, padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>Copy</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="https://forms.gle/rictfCC5LUxrChqP7" target="_blank" style={{ ...s.submitBtn, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", flex: 1, marginTop: 0 }}>
              Open BOBA Form ↗
            </a>
            <button onClick={() => markBobaSubmitted(b.id)} disabled={markingSubmitted === b.id} style={{ ...s.submitBtn, flex: 1, background: "linear-gradient(135deg,#166534,#15803d)" }}>
              {markingSubmitted === b.id ? "Saving..." : "✓ Mark as submitted"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LIST VIEW
  if (view === "list") return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Break results</h1>
            <p style={{ fontSize: 13, color: "#555" }}>{breaks.length} breaks logged</p>
          </div>
          <button onClick={() => setView("new")} style={{ ...s.submitBtn, width: "auto", padding: "10px 20px", marginTop: 0 }}>+ Log new break</button>
        </div>

        {breaks.length === 0 ? (
          <div style={{ ...s.section, textAlign: "center", padding: 48 }}>
            <p style={{ color: "#555", fontSize: 13 }}>No breaks logged yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {breaks.map(b => (
              <div key={b.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#e5e5e5" }}>{b.box_name || "—"}</div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                      {b.date} · {b.num_boxes || 0} boxes · {b.spots_sold} spots
                      {b.breaker && <span style={{ color: "#a78bfa", marginLeft: 8 }}>· 🎙️ {b.breaker}</span>}
                    </div>
                  </div>
                  {b.boba_submitted ? (
                    <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>✓ BOBA</span>
                  ) : (
                    <button onClick={() => setBobaFormBreak(b)} style={{ fontSize: 11, background: "#fb923c22", border: "1px solid #fb923c", color: "#fb923c", borderRadius: 5, padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}>
                      Submit BOBA
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                  <div style={{ background: "#0f0f0f", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>Revenue</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#4ade80" }}>${parseFloat(b.revenue || "0").toFixed(2)}</div>
                  </div>
                  <div style={{ background: "#0f0f0f", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>Profit</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: parseFloat(b.net_profit || "0") >= 0 ? "#a78bfa" : "#f87171" }}>${parseFloat(b.net_profit || "0").toFixed(2)}</div>
                  </div>
                  <div style={{ background: "#0f0f0f", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>BOBA</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fb923c" }}>{b.imc_take ? `$${parseFloat(b.imc_take).toFixed(2)}` : "—"}</div>
                  </div>
                  <div style={{ background: "#0f0f0f", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>Valley</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#4ade80" }}>{b.valley_take ? `$${parseFloat(b.valley_take).toFixed(2)}` : "—"}</div>
                  </div>
                </div>
                {b.commission_amount > 0 && (
                  <div style={{ background: "#0f0a1a", border: "1px solid #a78bfa33", borderRadius: 8, padding: "8px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#a78bfa" }}>💼 {b.breaker} commission</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa" }}>${parseFloat(b.commission_amount).toFixed(2)}</span>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: b.commission_paid ? "#4ade8022" : "#f8717122", color: b.commission_paid ? "#4ade80" : "#f87171" }}>
                        {b.commission_paid ? "Paid" : "Unpaid"}
                      </span>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <a href={`/dashboard/breaks/${b.id}`} style={{ fontSize: 12, background: "none", border: "1px solid #333", color: "#aaa", borderRadius: 6, padding: "5px 12px", textDecoration: "none" }}>View</a>
                  {confirmId === b.id ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => deleteBreak(b.id)} disabled={deletingId === b.id} style={{ fontSize: 12, background: "#7f1d1d", border: "none", color: "#fca5a5", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
                        {deletingId === b.id ? "Deleting..." : "Confirm"}
                      </button>
                      <button onClick={() => setConfirmId(null)} style={{ fontSize: 12, background: "#1a1a1a", border: "none", color: "#555", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(b.id)} style={{ fontSize: 12, background: "none", border: "1px solid #333", color: "#555", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // NEW BREAK FORM
  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Log new break</h1>
          <button onClick={() => setView("list")} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>← Back</button>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>Break details</div>
          <div className="breaks-grid-3">
            <div>
              <label style={s.label}>Date of break</label>
              <input style={s.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Box product name</label>
              <input style={s.input} type="text" placeholder="e.g. Griffey Break" value={boxName} onChange={e => setBoxName(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Breaker <span style={{ color: "#f87171" }}>*</span></label>
              <select style={s.input} value={breaker} onChange={e => setBreaker(e.target.value)}>
                <option value="">— Select breaker —</option>
                {employees.map(emp => (
                  <option key={emp.name} value={emp.name}>{emp.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>Promotion total ($)</label>
            <input style={s.input} type="number" min={0} step="0.01" placeholder="e.g. 25.00" value={promotionTotal} onChange={e => setPromotionTotal(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Whatnot post-show total sales ($) <span style={{ color: "#fb923c", marginLeft: 6 }}>— from your post-show email</span></label>
            <input style={s.input} type="number" min={0} step="0.01" placeholder="e.g. 25399.00 (leave blank to auto-calculate from CSV)" value={manualRevenueBefore} onChange={e => setManualRevenueBefore(e.target.value)} />
            <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>Enter the "Total Sales" figure from your Whatnot post-show email for accurate BOBA reporting</div>
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>Box breakdown</div>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>Add the box types opened in this break, then set how many of each.</p>

          {shownBoxes.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {shownBoxes.map(b => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e5e5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.label}</div>
                    {b.price > 0 && <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>Mkt: ${(b.price * boxCountOf(b)).toFixed(2)}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setBoxQty(b, boxCountOf(b) - 1)} style={{ width: 30, height: 30, border: "1px solid #333", background: "#111", borderRadius: 6, cursor: "pointer", color: "#aaa", fontSize: 16 }}>−</button>
                    <input type="number" min={0} value={boxCountOf(b)} onChange={e => setBoxQty(b, parseInt(e.target.value) || 0)} style={{ ...s.input, width: 62, textAlign: "center" as const }} />
                    <button onClick={() => setBoxQty(b, boxCountOf(b) + 1)} style={{ width: 30, height: 30, border: "1px solid #333", background: "#111", borderRadius: 6, cursor: "pointer", color: "#aaa", fontSize: 16 }}>+</button>
                  </div>
                  <button onClick={() => { setBoxQty(b, 0); setSelectedBoxIds(prev => prev.filter(id => id !== b.id)); }} title="Remove" style={{ background: "none", border: "1px solid #2a2a2a", color: "#777", borderRadius: 6, width: 30, height: 30, cursor: "pointer", flexShrink: 0, fontSize: 16 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {unusedBoxes.length > 0 && (
            <select
              value=""
              onChange={e => {
                const id = e.target.value;
                if (!id) return;
                setSelectedBoxIds(prev => prev.includes(id) ? prev : [...prev, id]);
                const b = allBoxTypes.find(x => x.id === id);
                if (b && boxCountOf(b) === 0) setBoxQty(b, 1);
              }}
              style={{ ...s.input, cursor: "pointer", marginBottom: 14, color: "#aaa" }}
            >
              <option value="">+ Add a box type…</option>
              {unusedBoxes.map(b => <option key={b.id} value={b.id} style={{ color: "#e5e5e5" }}>{b.label}</option>)}
            </select>
          )}

          <div className="breaks-stat-2">
            <div style={s.stat}><div style={s.statLabel}>Total boxes</div><div style={{ ...s.statValue, color: "#e5e5e5" }}>{totalBoxes}</div></div>
            <div style={s.stat}><div style={s.statLabel}>Market value</div><div style={{ ...s.statValue, color: "#fb923c" }}>${marketValue.toFixed(2)}</div></div>
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>Cards used in this break</div>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>Search your card inventory — selected cards will be deducted when break is saved</p>
          <input style={{ ...s.input, marginBottom: 12 }} placeholder="🔍 Search by hero, athlete, card #, subset..." value={cardSearch} onChange={e => setCardSearch(e.target.value)} />
          <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid #1e1e1e", borderRadius: 8, marginBottom: 12 }}>
            {cardInventory.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#555", fontSize: 13 }}>No cards in inventory yet</div>
            ) : filteredCardInventory.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#555", fontSize: 13 }}>No cards match your search</div>
            ) : filteredCardInventory.map((item, i) => {
              const key = `${item.id}`;
              const isPicked = !!pickedCards[key];
              const availableQty = item.quantity - (pickedCards[key]?.qty || 0);
              return (
                <div key={i} onClick={() => pickCard(item)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #161616", cursor: availableQty > 0 ? "pointer" : "not-allowed", background: isPicked ? "#a78bfa11" : "transparent", opacity: availableQty <= 0 ? 0.4 : 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                    <span style={{ color: "#e5e5e5", fontWeight: 600, fontSize: 13 }}>{item.hero}</span>
                    {item.weapon && <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 11, background: (weaponColors[item.weapon] || "#333") + "22", color: weaponColors[item.weapon] || "#aaa" }}>{item.weapon}</span>}
                    {item.variation && <span style={{ color: "#777", fontSize: 12 }}>{item.variation}</span>}
                    {item.power && <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 600 }}>⚡{item.power}</span>}
                    {item.price_paid > 0 && <span style={{ color: "#fb923c", fontSize: 11 }}>${parseFloat(item.price_paid).toFixed(2)}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: isPicked ? "#a78bfa" : "#555", whiteSpace: "nowrap", marginLeft: 8, flexShrink: 0 }}>{availableQty > 0 ? `${availableQty} avail` : "Out"}</span>
                </div>
              );
            })}
          </div>
          {Object.keys(pickedCards).length > 0 && (
            <div style={{ border: "1px solid #1e1e1e", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", background: "#0f0f0f", fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: ".4px" }}>Selected for this break</div>
              {Object.entries(pickedCards).map(([key, { item, qty }]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #161616" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 0, flexWrap: "wrap" }}>
                    <span style={{ color: "#e5e5e5", fontSize: 13, fontWeight: 600 }}>{item.hero}</span>
                    {item.weapon && <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 11, background: (weaponColors[item.weapon] || "#333") + "22", color: weaponColors[item.weapon] || "#aaa" }}>{item.weapon}</span>}
                    {item.variation && <span style={{ color: "#777", fontSize: 11 }}>{item.variation}</span>}
                    {item.power && <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 600 }}>⚡{item.power}</span>}
                    {item.price_paid > 0 && <span style={{ color: "#fb923c", fontSize: 11 }}>${parseFloat(item.price_paid).toFixed(2)} ea</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => updateCardQty(key, qty - 1)} style={{ width: 24, height: 24, border: "1px solid #333", background: "#0f0f0f", borderRadius: 4, cursor: "pointer", color: "#aaa" }}>−</button>
                    <span style={{ fontSize: 13, minWidth: 20, textAlign: "center" }}>{qty}</span>
                    <button onClick={() => updateCardQty(key, qty + 1)} style={{ width: 24, height: 24, border: "1px solid #333", background: "#0f0f0f", borderRadius: 4, cursor: "pointer", color: "#aaa" }}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>Upload Whatnot CSV</div>
          <label style={{ display: "block", border: "1px dashed #333", borderRadius: 8, padding: 24, textAlign: "center", cursor: "pointer", background: "#0f0f0f" }}>
            <input type="file" accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
            <div style={{ fontSize: 13, color: csvName ? "#4ade80" : "#888", marginBottom: 4 }}>{csvName || "Tap to upload Whatnot CSV"}</div>
            <div style={{ fontSize: 11, color: "#444" }}>{csvData.length > 0 ? `${csvData.length} orders detected` : "Whatnot → Sales → Download CSV"}</div>
          </label>
          {csvData.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 10 }}>Revenue breakdown</div>
              {manualRevenueBefore && (
                <div style={{ background: "#fb923c11", border: "1px solid #fb923c33", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 12, color: "#fb923c" }}>
                  ✓ Using manual figure: ${parseFloat(manualRevenueBefore).toFixed(2)} from post-show email
                </div>
              )}
              <div className="breaks-grid-4" style={{ marginBottom: 10 }}>
                <div style={s.stat}><div style={s.statLabel}>Before coupons</div><div style={{ ...s.statValue, color: "#e5e5e5", fontSize: 16 }}>${revenueBeforeCoupons.toFixed(2)}</div></div>
                <div style={s.stat}><div style={s.statLabel}>Coupon spend</div><div style={{ ...s.statValue, color: "#f87171", fontSize: 16 }}>-${couponTotal.toFixed(2)}</div></div>
                <div style={s.stat}><div style={s.statLabel}>Fees (11.2%)</div><div style={{ ...s.statValue, color: "#f87171", fontSize: 16 }}>-${whatnotFees.toFixed(2)}</div></div>
                <div style={s.stat}><div style={s.statLabel}>After fees</div><div style={{ ...s.statValue, color: "#4ade80", fontSize: 16 }}>${revenueAfterFees.toFixed(2)}</div></div>
              </div>
              <div className="breaks-grid-4b">
                <div style={s.stat}><div style={s.statLabel}>Spots sold</div><div style={{ ...s.statValue, color: "#e5e5e5", fontSize: 16 }}>{spotsSold}</div></div>
                <div style={s.stat}><div style={s.statLabel}>Giveaways</div><div style={{ ...s.statValue, color: "#fb923c", fontSize: 16 }}>{freeGiveaways}</div></div>
                <div style={s.stat}><div style={s.statLabel}>Total orders</div><div style={{ ...s.statValue, color: "#e5e5e5", fontSize: 16 }}>{csvData.length}</div></div>
                <div style={s.stat}><div style={s.statLabel}>% to market</div><div style={{ ...s.statValue, color: percentToMarket >= 100 ? "#4ade80" : "#fb923c", fontSize: 16 }}>{marketValue > 0 ? `${percentToMarket.toFixed(1)}%` : "—"}</div></div>
              </div>
            </div>
          )}
        </div>

        {csvData.length > 0 && (
          <div style={s.section}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={s.sectionTitle}>📦 Supplies to deduct</div>
              {deductedInv && <span style={{ fontSize: 12, color: "#4ade80" }}>✓ Deducted from inventory</span>}
            </div>
            <p style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>Auto-calculated from the CSV + box counts (juiced givvies detected from the line text). Edit any line before deducting — boxes start at 0, so bump the sizes you actually shipped.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 8, padding: "10px 12px" }}>
                <div><div style={{ fontSize: 12, color: "#aaa" }}>Hits mag&apos;d</div><div style={{ fontSize: 10, color: "#555" }}>adds to Mags</div></div>
                <input type="number" min={0} placeholder="0" value={hitsMagd} onChange={e => setHitsMagd(e.target.value)} style={{ ...s.smallInput, width: 55 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 8, padding: "10px 12px" }}>
                <div><div style={{ fontSize: 12, color: "#aaa" }}>Skunk cards</div><div style={{ fontSize: 10, color: "#555" }}>adds to Giveaway Cards</div></div>
                <input type="number" min={0} placeholder="0" value={skunkCards} onChange={e => setSkunkCards(e.target.value)} style={{ ...s.smallInput, width: 55 }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {Object.keys(autoUsage).map(name => {
                const val = usageValue(name);
                return (
                  <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 12, color: "#aaa", minWidth: 0, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                      <button onClick={() => setUsageEdits(prev => ({ ...prev, [name]: Math.max(0, val - 1) }))} style={{ width: 22, height: 22, border: "1px solid #333", background: "#111", borderRadius: 4, cursor: "pointer", color: "#aaa", fontSize: 12 }}>−</button>
                      <input type="number" min={0} value={val} onChange={e => setUsageEdits(prev => ({ ...prev, [name]: parseInt(e.target.value) || 0 }))} style={{ ...s.smallInput, width: 48 }} />
                      <button onClick={() => setUsageEdits(prev => ({ ...prev, [name]: val + 1 }))} style={{ width: 22, height: 22, border: "1px solid #333", background: "#111", borderRadius: 4, cursor: "pointer", color: "#aaa", fontSize: 12 }}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setUsageEdits({}); setDeductedInv(false); }} style={{ background: "none", border: "1px solid #333", color: "#777", borderRadius: 8, padding: "0 16px", fontSize: 13, cursor: "pointer" }}>Reset to auto</button>
              <button onClick={deductSupplies} disabled={deductingInv || deductedInv} style={{ flex: 1, border: "none", borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, cursor: deductedInv ? "not-allowed" : "pointer", background: deductedInv ? "#1a3a1a" : "linear-gradient(135deg,#166534,#15803d)", color: deductedInv ? "#4ade80" : "#fff" }}>
              {deductingInv ? "Deducting..." : deductedInv ? "✓ Deducted from inventory" : "Deduct from inventory"}
            </button>
            </div>
          </div>
        )}

        {csvData.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>💰 Break financials & IMC split</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".4px" }}>Revenue</div>
              <div style={s.expenseRow}><span style={{ color: "#777" }}>After Whatnot fees</span><span style={{ color: "#4ade80", fontWeight: 600 }}>${revenueAfterFees.toFixed(2)}</span></div>
              {marketValue > 0 && <div style={s.expenseRow}><span style={{ color: "#777" }}>% to market</span><span style={{ color: percentToMarket >= 100 ? "#4ade80" : "#fb923c", fontWeight: 600 }}>{percentToMarket.toFixed(1)}%</span></div>}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".4px" }}>Shared expenses (70/30)</div>
              <div style={s.expenseRow}><span style={{ color: "#777" }}>Shipping supplies</span><span style={{ color: "#f87171" }}>-${imcSupplyCost.toFixed(2)}</span></div>
              <div style={s.expenseRow}><span style={{ color: "#777" }}>Chaser costs</span><span style={{ color: "#f87171" }}>-${chaserCost.toFixed(2)}</span></div>
              <div style={s.expenseRow}><span style={{ color: "#777" }}>Coupon spend</span><span style={{ color: "#f87171" }}>-${couponTotal.toFixed(2)}</span></div>
              <div style={s.expenseRow}><span style={{ color: "#777" }}>Promotion total</span><span style={{ color: "#f87171" }}>-${parseFloat(promotionTotal || "0").toFixed(2)}</span></div>
              <div style={{ ...s.expenseRow, marginTop: 4 }}><span style={{ color: "#aaa", fontWeight: 600 }}>Total shared</span><span style={{ color: "#fb923c", fontWeight: 600 }}>${sharedExpenses.toFixed(2)}</span></div>
              <div style={s.expenseRow}><span style={{ color: "#555", fontSize: 12 }}>↳ BOBA pays (70%)</span><span style={{ color: "#fb923c", fontSize: 12 }}>-${imcShareOfExpenses.toFixed(2)}</span></div>
              <div style={{ ...s.expenseRow, borderBottom: "none" }}><span style={{ color: "#555", fontSize: 12 }}>↳ Valley pays (30%)</span><span style={{ color: "#f87171", fontSize: 12 }}>-${valleyShareOfExpenses.toFixed(2)}</span></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".4px" }}>Valley only expenses</div>
              <div style={s.expenseRow}><span style={{ color: "#777" }}>Valley supplies</span><span style={{ color: "#f87171" }}>-${valleySupplyCost.toFixed(2)}</span></div>
              <div style={s.expenseRow}><span style={{ color: "#777" }}>Insurance cards</span><span style={{ color: "#f87171" }}>-${insuranceCost.toFixed(2)}</span></div>
              <div style={s.expenseRow}><span style={{ color: "#777" }}>First Timer cards</span><span style={{ color: "#f87171" }}>-${firstTimerCost.toFixed(2)}</span></div>
              <div style={{ ...s.expenseRow, borderBottom: "none" }}><span style={{ color: "#777" }}>Giveaway cards</span><span style={{ color: "#f87171" }}>-${giveawayCardCost.toFixed(2)}</span></div>
            </div>
            <div style={{ background: "#0f0f0f", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#aaa", fontWeight: 600, fontSize: 14 }}>Profit after all expenses</span>
                <span style={{ color: profitAfterExpenses >= 0 ? "#4ade80" : "#f87171", fontWeight: 700, fontSize: 18 }}>${profitAfterExpenses.toFixed(2)}</span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".4px" }}>IMC split (70/30)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: commissionAmount > 0 ? 12 : 0 }}>
              <div style={{ background: "#0f0f0f", border: "1px solid #fb923c33", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, color: "#fb923c", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>🏆 BOBA (70%)</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#fb923c" }}>${imcTake.toFixed(2)}</div>
              </div>
              <div style={{ background: "#0f0f0f", border: "1px solid #4ade8033", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, color: "#4ade80", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>🏠 Valley (30%)</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80" }}>${valleyTake.toFixed(2)}</div>
              </div>
            </div>
            {commissionAmount > 0 && (
              <div style={{ background: "#0f0a1a", border: "1px solid #a78bfa44", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".4px" }}>💼 {breaker} commission ({percentToMarket.toFixed(1)}% to market)</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa" }}>${commissionAmount.toFixed(2)}</div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                      {rateForPct(breakerTiers, percentToMarket)}% of Valley's ${valleyTake.toFixed(2)}
                      {commissionSupplyDeduction > 0 && ` = $${grossCommission.toFixed(2)}`}
                    </div>
                    {commissionSupplyDeduction > 0 && (
                      <div style={{ fontSize: 12, color: "#f87171", marginTop: 2 }}>
                        − ${commissionSupplyDeduction.toFixed(2)} supply deduction ({supplyDeductionPct}% of ${totalSupplyCost.toFixed(2)})
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, color: "#38bdf8", fontWeight: 600 }}>Valley net after commission</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#38bdf8" }}>${(valleyTake - commissionAmount).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <button style={s.submitBtn} onClick={saveBreak} disabled={saving}>{saving ? "Saving..." : "Save break"}</button>
      </div>
    </div>
  );
}