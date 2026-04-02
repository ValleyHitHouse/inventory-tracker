"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const WHATNOT_FEE = 0.112;

function parseCSV(text: string) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  return lines.slice(1).map(line => {
    const vals: string[] = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    vals.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

const weaponColors: Record<string, string> = {
  Fire: "#fb923c", Ice: "#38bdf8", Steel: "#94a3b8",
  Gum: "#f472b6", Hex: "#a78bfa", Glow: "#4ade80", Brawl: "#f87171"
};

function calcSupplyEstimates(csvData: any[]) {
  // Group paying orders by buyer
  const buyerOrderCounts: Record<string, number> = {};
  const payingBuyers = new Set<string>();

  // First pass — identify paying buyers
  for (const row of csvData) {
    const price = parseFloat(row.original_item_price || "0");
    if (price > 0) payingBuyers.add(row.buyer_username);
  }

  const estimates: Record<string, number> = {
    "Armalopes": 0,
    "Toploaders": 0,
    "Penny sleeves": 0,
    "Giveaway cards": 0,
    "Team bags": 0,
    "Bubble mailers": 0,
    "Stickers": 0,
    "Boxes (S)": 0,
  };

  for (const row of csvData) {
    const price = parseFloat(row.original_item_price || "0");
    const buyer = row.buyer_username;
    const isPaying = price > 0;
    const isGiveaway = price === 0;

    if (isGiveaway) {
      // Free giveaway rules
      estimates["Toploaders"] += 1;
      estimates["Penny sleeves"] += 1;
      estimates["Giveaway cards"] += 1;
      estimates["Team bags"] += 1;
      // Only add armalope if buyer never paid
      if (!payingBuyers.has(buyer)) {
        estimates["Armalopes"] += 1;
      }
    } else {
      // Paying order
      buyerOrderCounts[buyer] = (buyerOrderCounts[buyer] || 0) + 1;
      const orderNum = buyerOrderCounts[buyer];

      if (orderNum === 1) {
        // First purchase in this break
        estimates["Bubble mailers"] += 1;
        estimates["Stickers"] += 1;
        estimates["Team bags"] += 1;
        estimates["Toploaders"] += 2;
        estimates["Penny sleeves"] += 3;
      } else if (orderNum < 9) {
        // 2nd-8th purchase
        estimates["Team bags"] += 1;
        estimates["Toploaders"] += 1;
        estimates["Penny sleeves"] += 2;
      } else {
        // 9th+ purchase — box instead of bubble mailer
        estimates["Boxes (S)"] += 1;
        estimates["Team bags"] += 1;
        estimates["Toploaders"] += 1;
        estimates["Penny sleeves"] += 2;
      }
    }
  }

  return estimates;
}

export default function Breaks() {
  const [breaks, setBreaks] = useState<any[]>([]);
  const [view, setView] = useState<"list"|"new">("list");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [boxName, setBoxName] = useState("");
  const [numBoxes, setNumBoxes] = useState(1);
  const [boxValue, setBoxValue] = useState("");
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvName, setCsvName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  // Card inventory picker
  const [cardInventory, setCardInventory] = useState<any[]>([]);
  const [cardSearch, setCardSearch] = useState("");
  const [pickedCards, setPickedCards] = useState<Record<string, {item: any, qty: number}>>({});

  // Supply estimates
  const [supplyEstimates, setSupplyEstimates] = useState<Record<string, number>>({});
  const [editedEstimates, setEditedEstimates] = useState<Record<string, number>>({});
  const [magPros, setMagPros] = useState("");
  const [deductingSupplies, setDeductingSupplies] = useState(false);
  const [suppliesDeducted, setSuppliesDeducted] = useState(false);

  useEffect(() => {
    loadBreaks();
    loadCardInventory();
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

  async function loadCardInventory() {
    const { data } = await supabase.from("cardinventory").select("*").order("subset").order("hero");
    if (data) setCardInventory(data);
  }

  async function deleteBreak(id: number) {
    setDeletingId(id);
    await supabase.from("BreakOrders").delete().eq("break_id", id);
    await supabase.from("BreakChasers").delete().eq("break_id", id);
    await supabase.from("BreakSupplies").delete().eq("break_id", id);
    await supabase.from("Breaks").delete().eq("id", id);
    setDeletingId(null);
    setConfirmId(null);
    loadBreaks();
  }

  // Revenue calculations
  const revenueBeforeCoupons = csvData.reduce((s, r) => {
    const price = parseFloat(r.original_item_price || "0");
    const coupon = parseFloat(r.coupon_price || "0");
    return s + price + coupon;
  }, 0);
  const couponTotal = csvData.reduce((s, r) => s + parseFloat(r.coupon_price || "0"), 0);
  const revenueAfterCoupons = csvData.reduce((s, r) => s + parseFloat(r.original_item_price || "0"), 0);
  const whatnotFees = revenueAfterCoupons * WHATNOT_FEE;
  const revenueAfterFees = revenueAfterCoupons - whatnotFees;
  const spotsSold = csvData.filter(r => parseFloat(r.original_item_price || "0") > 0).length;
  const freeGiveaways = csvData.filter(r => parseFloat(r.original_item_price || "0") === 0).length;
  const cardCost = Object.values(pickedCards).reduce((sum, { item, qty }) => sum + parseFloat(item.price_paid || "0") * qty, 0);
  const totalCost = parseFloat(boxValue || "0") + cardCost;
  const netProfit = revenueAfterFees - totalCost;

  const filteredCardInventory = cardInventory.filter(c => {
    if (c.quantity <= 0) return false;
    const q = cardSearch.toLowerCase();
    return !q || c.hero?.toLowerCase().includes(q) || c.athlete?.toLowerCase().includes(q) || c.card_number?.toLowerCase().includes(q) || c.subset?.toLowerCase().includes(q);
  }).slice(0, 50);

  function pickCard(item: any) {
    const key = `${item.id}`;
    const maxQty = item.quantity;
    setPickedCards(prev => {
      const current = prev[key]?.qty || 0;
      if (current >= maxQty) return prev;
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
    setSaving(true);
    const { data: brk } = await supabase.from("Breaks").insert({
      date, box_name: boxName, num_boxes: numBoxes,
      box_value: parseFloat(boxValue || "0"),
      revenue: Math.round(revenueAfterFees * 100) / 100,
      spots_sold: spotsSold, free_giveaways: freeGiveaways,
      net_profit: Math.round(netProfit * 100) / 100,
    }).select().single();

    if (brk) {
      if (Object.keys(pickedCards).length > 0) {
        await supabase.from("BreakChasers").insert(
          Object.values(pickedCards).map(({ item, qty }) => ({
            break_id: brk.id,
            name: `${item.hero} (${item.athlete})`,
            type: item.subset,
            quantity: qty,
            value: parseFloat(item.price_paid || "0"),
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
          break_id: brk.id,
          order_id: r.order_id || null,
          buyer_username: r.buyer_username || null,
          product_name: r.product_name || null,
          price: parseFloat(r.original_item_price || "0"),
          placed_at: r.placed_at ? r.placed_at.trim() : null,
          cancelled: r.cancelled_or_failed === "True",
          tracking_code: r.tracking_code || null,
          shipping_address: r.shipping_address || null,
          postal_code: r.postal_code || null,
        }));
        const { error: ordersError } = await supabase.from("BreakOrders").insert(orderRows);
        if (ordersError) console.error("BreakOrders insert error:", ordersError);
      }
    }

    await loadBreaks();
    await loadCardInventory();
    setSaving(false);
    setView("list");
    setCsvData([]); setCsvName(""); setBoxName(""); setBoxValue(""); setNumBoxes(1);
    setPickedCards({}); setCardSearch("");
    setSupplyEstimates({}); setEditedEstimates({});
    setMagPros(""); setSuppliesDeducted(false);
  }

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" },
    content: { padding: 24, maxWidth: 900, margin: "0 auto" },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    label: { fontSize: 12, color: "#666", marginBottom: 5, display: "block" },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none" },
    smallInput: { background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "6px 10px", fontSize: 13, color: "#e5e5e5", outline: "none", width: 70, textAlign: "center" as const },
    row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
    submitBtn: { width: "100%", background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", marginTop: 4 },
    stat: { background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px 14px" },
    statLabel: { fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".4px" },
    statValue: { fontSize: 20, fontWeight: 700 },
  };

  if (view === "list") return (
    <div style={s.shell}>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingTop: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Break results</h1>
            <p style={{ fontSize: 13, color: "#555" }}>{breaks.length} breaks logged</p>
          </div>
          <button onClick={() => setView("new")} style={{ ...s.submitBtn, width: "auto", padding: "10px 20px" }}>+ Log new break</button>
        </div>
        {breaks.length === 0 ? (
          <div style={{ ...s.section, textAlign: "center", padding: 48 }}>
            <p style={{ color: "#555", fontSize: 13 }}>No breaks logged yet.</p>
          </div>
        ) : (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#0f0f0f" }}>
                {["Date","Box","Boxes","Spots","Revenue (after fees)","Cost","Net profit",""].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#444", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", borderBottom: "1px solid #1e1e1e" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {breaks.map(b => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #161616" }}>
                    <td style={{ padding: "10px 14px", color: "#aaa" }}>{b.date}</td>
                    <td style={{ padding: "10px 14px", color: "#aaa" }}>{b.box_name || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#aaa" }}>{b.num_boxes}</td>
                    <td style={{ padding: "10px 14px", color: "#aaa" }}>{b.spots_sold}</td>
                    <td style={{ padding: "10px 14px", color: "#4ade80" }}>${b.revenue?.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", color: "#fb923c" }}>${b.box_value?.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", color: b.net_profit >= 0 ? "#a78bfa" : "#f87171", fontWeight: 600 }}>${b.net_profit?.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px" }}>
                      {confirmId === b.id ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => deleteBreak(b.id)} disabled={deletingId === b.id} style={{ fontSize: 11, background: "#7f1d1d", border: "none", color: "#fca5a5", borderRadius: 5, padding: "4px 8px", cursor: "pointer" }}>
                            {deletingId === b.id ? "Deleting..." : "Confirm"}
                          </button>
                          <button onClick={() => setConfirmId(null)} style={{ fontSize: 11, background: "#1a1a1a", border: "none", color: "#555", borderRadius: 5, padding: "4px 8px", cursor: "pointer" }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmId(b.id)} style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#555", borderRadius: 5, padding: "4px 8px", cursor: "pointer" }}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={s.shell}>
      <div style={s.content}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, paddingTop: 24 }}>Log new break</h1>

        {/* Break details */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Break details</div>
          <div style={s.row}>
            <div><label style={s.label}>Date of break</label><input style={s.input} type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div><label style={s.label}>Box product name</label><input style={s.input} type="text" placeholder="e.g. 2025 Topps Series 1" value={boxName} onChange={e => setBoxName(e.target.value)} /></div>
          </div>
          <div style={s.row}>
            <div><label style={s.label}>Number of boxes</label><input style={s.input} type="number" min={1} value={numBoxes} onChange={e => setNumBoxes(Number(e.target.value))} /></div>
            <div><label style={s.label}>Total box value ($)</label><input style={s.input} type="number" placeholder="e.g. 400.00" value={boxValue} onChange={e => setBoxValue(e.target.value)} /></div>
          </div>
        </div>

        {/* Card inventory picker */}
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
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#a78bfa22", color: "#a78bfa" }}>{item.subset}</span>
                    <span style={{ color: "#555", fontSize: 11, fontFamily: "monospace" }}>{item.card_number}</span>
                    <span style={{ color: "#e5e5e5", fontWeight: 600, fontSize: 13 }}>{item.hero}</span>
                    <span style={{ color: "#a78bfa", fontSize: 12 }}>{item.athlete}</span>
                    {item.weapon && <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 11, background: (weaponColors[item.weapon] || "#333") + "22", color: weaponColors[item.weapon] || "#aaa" }}>{item.weapon}</span>}
                    {item.variation && <span style={{ color: "#777", fontSize: 11 }}>{item.variation}</span>}
                    {item.price_paid > 0 && <span style={{ color: "#fb923c", fontSize: 11 }}>${parseFloat(item.price_paid).toFixed(2)}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: isPicked ? "#a78bfa" : "#555", whiteSpace: "nowrap", marginLeft: 8 }}>{availableQty > 0 ? `${availableQty} avail` : "Out of stock"}</span>
                </div>
              );
            })}
          </div>
          {Object.keys(pickedCards).length > 0 && (
            <div style={{ border: "1px solid #1e1e1e", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", background: "#0f0f0f", fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: ".4px" }}>Selected for this break</div>
              {Object.entries(pickedCards).map(([key, { item, qty }]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #161616" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#a78bfa22", color: "#a78bfa" }}>{item.subset}</span>
                    <span style={{ color: "#e5e5e5", fontSize: 13, fontWeight: 600 }}>{item.hero}</span>
                    <span style={{ color: "#a78bfa", fontSize: 12 }}>{item.athlete}</span>
                    {item.price_paid > 0 && <span style={{ color: "#fb923c", fontSize: 11 }}>${parseFloat(item.price_paid).toFixed(2)} ea</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => updateCardQty(key, qty - 1)} style={{ width: 24, height: 24, border: "1px solid #333", background: "#0f0f0f", borderRadius: 4, cursor: "pointer", color: "#aaa" }}>−</button>
                    <span style={{ fontSize: 13, minWidth: 20, textAlign: "center" }}>{qty}</span>
                    <button onClick={() => updateCardQty(key, qty + 1)} style={{ width: 24, height: 24, border: "1px solid #333", background: "#0f0f0f", borderRadius: 4, cursor: "pointer", color: "#aaa" }}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CSV Upload */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Upload Whatnot CSV</div>
          <label style={{ display: "block", border: "1px dashed #333", borderRadius: 8, padding: 28, textAlign: "center", cursor: "pointer", background: "#0f0f0f" }}>
            <input type="file" accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
            <div style={{ fontSize: 13, color: csvName ? "#4ade80" : "#888", marginBottom: 4 }}>{csvName || "Drop your Whatnot CSV here or click to browse"}</div>
            <div style={{ fontSize: 11, color: "#444" }}>{csvData.length > 0 ? `${csvData.length} orders detected` : "Exported from Whatnot → Sales → Download CSV"}</div>
          </label>

          {csvData.length > 0 && (
            <>
              {/* Revenue breakdown */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 10 }}>Revenue breakdown</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 10 }}>
                  <div style={s.stat}>
                    <div style={s.statLabel}>Before coupons</div>
                    <div style={{ ...s.statValue, color: "#e5e5e5" }}>${revenueBeforeCoupons.toFixed(2)}</div>
                  </div>
                  <div style={s.stat}>
                    <div style={s.statLabel}>Coupon spend</div>
                    <div style={{ ...s.statValue, color: "#f87171" }}>-${couponTotal.toFixed(2)}</div>
                  </div>
                  <div style={s.stat}>
                    <div style={s.statLabel}>Whatnot fees (11.2%)</div>
                    <div style={{ ...s.statValue, color: "#f87171" }}>-${whatnotFees.toFixed(2)}</div>
                  </div>
                  <div style={s.stat}>
                    <div style={s.statLabel}>After fees</div>
                    <div style={{ ...s.statValue, color: "#4ade80" }}>${revenueAfterFees.toFixed(2)}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <div style={s.stat}>
                    <div style={s.statLabel}>Spots sold</div>
                    <div style={{ ...s.statValue, color: "#e5e5e5" }}>{spotsSold}</div>
                  </div>
                  <div style={s.stat}>
                    <div style={s.statLabel}>Free giveaways</div>
                    <div style={{ ...s.statValue, color: "#fb923c" }}>{freeGiveaways}</div>
                  </div>
                  <div style={s.stat}>
                    <div style={s.statLabel}>Total orders</div>
                    <div style={{ ...s.statValue, color: "#e5e5e5" }}>{csvData.length}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Supply estimates */}
        {csvData.length > 0 && Object.keys(supplyEstimates).length > 0 && (
          <div style={s.section}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={s.sectionTitle}>📦 Estimated supplies used</div>
              {suppliesDeducted && <span style={{ fontSize: 12, color: "#4ade80" }}>✓ Deducted from inventory</span>}
            </div>
            <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>Auto-calculated from CSV — edit if needed, then click deduct</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {Object.entries(editedEstimates).map(([name, qty]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 8, padding: "10px 14px" }}>
                  <span style={{ fontSize: 13, color: "#aaa" }}>{name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => setEditedEstimates(prev => ({ ...prev, [name]: Math.max(0, prev[name] - 1) }))} style={{ width: 22, height: 22, border: "1px solid #333", background: "#111", borderRadius: 4, cursor: "pointer", color: "#aaa", fontSize: 12 }}>−</button>
                    <input
                      type="number"
                      min={0}
                      value={qty}
                      onChange={e => setEditedEstimates(prev => ({ ...prev, [name]: parseInt(e.target.value) || 0 }))}
                      style={{ ...s.smallInput, width: 55 }}
                    />
                    <button onClick={() => setEditedEstimates(prev => ({ ...prev, [name]: prev[name] + 1 }))} style={{ width: 22, height: 22, border: "1px solid #333", background: "#111", borderRadius: 4, cursor: "pointer", color: "#aaa", fontSize: 12 }}>+</button>
                  </div>
                </div>
              ))}

              {/* MagPros — manual required field */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0f0f0f", border: `1px solid ${!magPros ? "#7c3aed" : "#1e1e1e"}`, borderRadius: 8, padding: "10px 14px" }}>
                <div>
                  <span style={{ fontSize: 13, color: "#aaa" }}>MagPros</span>
                  <span style={{ fontSize: 10, color: "#7c3aed", marginLeft: 6 }}>required</span>
                </div>
                <input
                  type="number"
                  min={0}
                  placeholder="?"
                  value={magPros}
                  onChange={e => setMagPros(e.target.value)}
                  style={{ ...s.smallInput, border: !magPros ? "1px solid #7c3aed" : "1px solid #222" }}
                />
              </div>
            </div>
{/* Add extra supply */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>Add extra supply</div>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  id="extraSupplyName"
                  style={{ ...s.input, flex: 1 }}
                  defaultValue="">
                  <option value="" disabled>Select supply...</option>
                  {["Armalopes","Toploaders","Penny sleeves","Giveaway cards","Team bags","Bubble mailers","Stickers","Boxes (S)","Boxes (M)","Boxes (L)","MagPros","Shipping labels","Packing tape","Packing paper"].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <input id="extraSupplyQty" type="number" min={1} defaultValue={1} style={{ ...s.smallInput, width: 70 }} />
                <button
                  onClick={() => {
                    const nameEl = document.getElementById("extraSupplyName") as HTMLSelectElement;
                    const qtyEl = document.getElementById("extraSupplyQty") as HTMLInputElement;
                    const name = nameEl.value;
                    const qty = parseInt(qtyEl.value) || 1;
                    if (!name) return;
                    setEditedEstimates(prev => ({ ...prev, [name]: (prev[name] || 0) + qty }));
                    nameEl.value = "";
                    qtyEl.value = "1";
                  }}
                  style={{ background: "#a78bfa22", border: "1px solid #a78bfa", color: "#a78bfa", borderRadius: 8, padding: "0 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                  + Add
                </button>
              </div>
            </div>
            <button
              onClick={deductSuppliesFromInventory}
              disabled={deductingSupplies || suppliesDeducted || !magPros}
              style={{
                width: "100%", border: "none", borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, cursor: suppliesDeducted || !magPros ? "not-allowed" : "pointer", marginTop: 4,
                background: suppliesDeducted ? "#1a3a1a" : "linear-gradient(135deg,#166534,#15803d)",
                color: suppliesDeducted ? "#4ade80" : "#fff",
              }}>
              {deductingSupplies ? "Deducting..." : suppliesDeducted ? "✓ Supplies deducted from inventory" : "Deduct supplies from inventory"}
            </button>
          </div>
        )}

        {/* Profit summary */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Profit / loss summary</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={s.stat}><div style={s.statLabel}>Revenue (after fees)</div><div style={{ ...s.statValue, color: "#4ade80" }}>${revenueAfterFees.toFixed(2)}</div></div>
            <div style={s.stat}><div style={s.statLabel}>Total cost</div><div style={{ ...s.statValue, color: "#fb923c" }}>${totalCost.toFixed(2)}</div></div>
            <div style={s.stat}><div style={s.statLabel}>Net profit</div><div style={{ ...s.statValue, color: netProfit >= 0 ? "#a78bfa" : "#f87171" }}>${netProfit.toFixed(2)}</div></div>
          </div>
        </div>

        <button style={s.submitBtn} onClick={saveBreak} disabled={saving}>{saving ? "Saving..." : "Save break"}</button>
      </div>
    </div>
  );
}