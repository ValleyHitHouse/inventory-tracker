"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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

const SETS = [
  { label: "Griffey", file: "/boba-checklist.csv" },
  { label: "Alpha", file: "/alpha-boba-checklist.csv" },
  { label: "Alpha Update", file: "/alpha-update-boba-checklist.csv" },
];

const SUBSETS = ["Chasers", "Insurance", "First Timers"];

const weaponColors: Record<string, string> = {
  Fire: "#fb923c", Ice: "#38bdf8", Steel: "#94a3b8",
  Gum: "#f472b6", Hex: "#a78bfa", Glow: "#4ade80", Brawl: "#f87171"
};

const subsetToInventoryId: Record<string, number> = {
  "Chasers": 4, "Insurance": 3, "First Timers": 2,
};

export default function CardInventoryPage() {
  const [view, setView] = useState<"inventory" | "add">("inventory");
  const [giveawayTotal, setGiveawayTotal] = useState(0);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [editQty, setEditQty] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");

  const [selectedSet, setSelectedSet] = useState(0);
  const [allCards, setAllCards] = useState<any[]>([]);
  const [cardSearch, setCardSearch] = useState("");
  const [activeSubset, setActiveSubset] = useState("Chasers");
  const [picked, setPicked] = useState<Record<string, { card: any; qty: number; subset: string; pricePaid: string }>>({});
  const [giveawayCount, setGiveawayCount] = useState(0);
  const [giveawayPriceEach, setGiveawayPriceEach] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  useEffect(() => { loadInventory(); }, []);

  useEffect(() => {
    fetch(SETS[selectedSet].file)
      .then(r => r.text())
      .then(text => setAllCards(parseCSV(text)));
  }, [selectedSet]);

  async function loadInventory() {
    setLoading(true);
    const { data: gt } = await supabase.from("giveawaytotal").select("total").single();
    if (gt) setGiveawayTotal(gt.total);
    const { data: inv } = await supabase.from("cardinventory").select("*").order("subset").order("created_at", { ascending: false });
    if (inv) setInventory(inv);
    setLoading(false);
  }

  async function deleteCard(item: any) {
    setDeletingId(item.id);
    await supabase.from("cardinventory").delete().eq("id", item.id);
    const invId = subsetToInventoryId[item.subset];
    if (invId) {
      const { data: inv } = await supabase.from("Inventory").select("id,quantity").eq("id", invId).single();
      if (inv) await supabase.from("Inventory").update({ quantity: Math.max(0, inv.quantity - item.quantity) }).eq("id", invId);
    }
    setDeletingId(null); setConfirmId(null);
    loadInventory();
  }

  async function saveEdit() {
    if (!editingCard) return;
    setSaving(true);
    const newQty = parseInt(editQty) || 0;
    const diff = newQty - editingCard.quantity;
    await supabase.from("cardinventory").update({ quantity: newQty, price_paid: parseFloat(editPrice || "0") }).eq("id", editingCard.id);
    const invId = subsetToInventoryId[editingCard.subset];
    if (invId && diff !== 0) {
      const { data: inv } = await supabase.from("Inventory").select("id,quantity").eq("id", invId).single();
      if (inv) await supabase.from("Inventory").update({ quantity: Math.max(0, inv.quantity + diff) }).eq("id", invId);
    }
    setSaving(false); setEditingCard(null);
    loadInventory();
  }

  const filteredCards = allCards.filter(c => {
    const q = cardSearch.toLowerCase().trim();
    const combined = [c["Card #"], c.Hero, c["Athlete Inspiration"], c.Treatment, c.Weapon, c.Power, c.Variation].join(" ").toLowerCase();
    return !q || q.split(" ").filter(Boolean).every((word: string) => combined.includes(word));
  }).slice(0, 50);

  function pickCard(card: any) {
    const key = `${card["Card #"]}-${card.Weapon}-${card.Treatment}-${activeSubset}`;
    setPicked(prev => ({
      ...prev,
      [key]: prev[key] ? { ...prev[key], qty: prev[key].qty + 1 } : { card, qty: 1, subset: activeSubset, pricePaid: "" }
    }));
  }

  function updateQty(key: string, qty: number) {
    if (qty <= 0) {
      setPicked(prev => { const n = { ...prev }; delete n[key]; return n; });
    } else {
      setPicked(prev => ({ ...prev, [key]: { ...prev[key], qty } }));
    }
  }

  function updatePrice(key: string, price: string) {
    setPicked(prev => ({ ...prev, [key]: { ...prev[key], pricePaid: price } }));
  }

  async function saveCards() {
    if (Object.keys(picked).length === 0 && giveawayCount === 0) return alert("Please add at least one card!");
    setAddSaving(true);
    if (giveawayCount > 0) {
      await supabase.from("giveawaytotal").update({ total: giveawayTotal + giveawayCount }).eq("id", 1);
      const { data: giv } = await supabase.from("Inventory").select("id,quantity").eq("id", 1).single();
      if (giv) await supabase.from("Inventory").update({ quantity: giv.quantity + giveawayCount }).eq("id", 1);
    }
    const rows = Object.values(picked).map(({ card, qty, subset, pricePaid }) => ({
      subset, card_number: card["Card #"], hero: card.Hero,
      athlete: card["Athlete Inspiration"], variation: card.Treatment,
      weapon: card.Weapon, set_name: SETS[selectedSet].label,
      quantity: qty, price_paid: parseFloat(pricePaid || "0"),
    }));
    if (rows.length > 0) await supabase.from("cardinventory").insert(rows);
    for (const subset of SUBSETS) {
      const total = Object.values(picked).filter(p => p.subset === subset).reduce((s, p) => s + p.qty, 0);
      if (total > 0) {
        const invId = subsetToInventoryId[subset];
        const { data: inv } = await supabase.from("Inventory").select("id,quantity").eq("id", invId).single();
        if (inv) await supabase.from("Inventory").update({ quantity: inv.quantity + total }).eq("id", invId);
      }
    }
    await loadInventory();
    setAddSaving(false); setView("inventory");
    setPicked({}); setCardSearch(""); setGiveawayCount(0); setGiveawayPriceEach("");
  }

  const groupedInventory = SUBSETS.reduce((acc, sub) => {
    acc[sub] = inventory.filter(i => {
      if (i.subset !== sub || i.quantity <= 0) return false;
      if (!inventorySearch) return true;
      const q = inventorySearch.toLowerCase().trim();
      const combined = [i.card_number, i.hero, i.athlete, i.variation, i.weapon, i.set_name].join(" ").toLowerCase();
      return q.split(" ").filter(Boolean).every((word: string) => combined.includes(word));
    });
    return acc;
  }, {} as Record<string, any[]>);

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const },
    smallInput: { background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "#e5e5e5", outline: "none", width: 90 },
    submitBtn: { background: "linear-gradient(135deg,#7c3aed,#db2877)", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" },
  };

  const mobileStyles = `
    .ci-stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 16px; }
    .ci-edit-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .ci-edit-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .ci-giveaway-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 768px) {
      .ci-stats-grid { grid-template-columns: repeat(2,1fr); }
      .ci-edit-grid { grid-template-columns: 1fr 1fr; }
      .ci-edit-fields { grid-template-columns: 1fr 1fr; }
      .ci-giveaway-grid { grid-template-columns: 1fr; }
    }
  `;

  // EDIT VIEW
  if (editingCard) return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Edit card</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>{editingCard.hero} · {editingCard.athlete} · {editingCard.subset}</p>
          </div>
          <button onClick={() => setEditingCard(null)} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>← Cancel</button>
        </div>
        <div style={s.section}>
          <div style={s.sectionTitle}>Card details</div>
          <div className="ci-edit-grid">
            <div style={{ background: "#0f0f0f", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Card #</div>
              <div style={{ fontSize: 14, color: "#e5e5e5" }}>{editingCard.card_number}</div>
            </div>
            <div style={{ background: "#0f0f0f", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Hero</div>
              <div style={{ fontSize: 14, color: "#e5e5e5", fontWeight: 600 }}>{editingCard.hero}</div>
            </div>
            <div style={{ background: "#0f0f0f", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Subset</div>
              <div style={{ fontSize: 14, color: "#a78bfa" }}>{editingCard.subset}</div>
            </div>
          </div>
          <div className="ci-edit-fields">
            <div>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Quantity</label>
              <input style={s.input} type="number" min={0} value={editQty} onChange={e => setEditQty(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Price paid ($)</label>
              <input style={s.input} type="number" min={0} step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
            </div>
          </div>
        </div>
        <button style={{ ...s.submitBtn, width: "100%" }} onClick={saveEdit} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );

  // ADD CARD VIEW
  if (view === "add") return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Add cards manually</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Search the database and add cards to your inventory</p>
          </div>
          <button onClick={() => setView("inventory")} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>← Back</button>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>🎁 Giveaway cards</div>
          <div className="ci-giveaway-grid">
            <div>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Number of giveaway cards</label>
              <input style={s.input} type="number" min={0} value={giveawayCount} onChange={e => setGiveawayCount(Number(e.target.value))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Price paid per card ($)</label>
              <input style={s.input} type="number" min={0} step="0.01" placeholder="e.g. 1.50" value={giveawayPriceEach} onChange={e => setGiveawayPriceEach(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>Search & add specific cards</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {SETS.map((set, i) => (
              <button key={i} onClick={() => setSelectedSet(i)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${selectedSet === i ? "#fb923c" : "#222"}`, background: selectedSet === i ? "#fb923c22" : "#0f0f0f", color: selectedSet === i ? "#fb923c" : "#555" }}>{set.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {SUBSETS.map(sub => (
              <button key={sub} onClick={() => setActiveSubset(sub)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${activeSubset === sub ? "#a78bfa" : "#222"}`, background: activeSubset === sub ? "#a78bfa22" : "#0f0f0f", color: activeSubset === sub ? "#a78bfa" : "#555" }}>{sub}</button>
            ))}
          </div>
          <input style={{ ...s.input, marginBottom: 12 }} placeholder="🔍 Search by hero, athlete, card #..." value={cardSearch} onChange={e => setCardSearch(e.target.value)} />
          <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid #1e1e1e", borderRadius: 8 }}>
            {filteredCards.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#555", fontSize: 13 }}>Type to search cards</div>
            ) : filteredCards.map((card: any, i: number) => {
              const key = `${card["Card #"]}-${card.Weapon}-${card.Treatment}-${activeSubset}`;
              const isPicked = !!picked[key];
              return (
                <div key={i} onClick={() => pickCard(card)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #161616", cursor: "pointer", background: isPicked ? "#a78bfa11" : "transparent" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                    <span style={{ color: "#555", fontSize: 11, fontFamily: "monospace", flexShrink: 0 }}>{card["Card #"]}</span>
                    <span style={{ color: "#e5e5e5", fontWeight: 600, fontSize: 13 }}>{card.Hero}</span>
                    <span style={{ color: "#a78bfa", fontSize: 12 }}>{card["Athlete Inspiration"]}</span>
                    {card.Weapon && <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 11, background: (weaponColors[card.Weapon] || "#333") + "22", color: weaponColors[card.Weapon] || "#aaa" }}>{card.Weapon}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: isPicked ? "#a78bfa" : "#333", whiteSpace: "nowrap", marginLeft: 8, flexShrink: 0 }}>{isPicked ? `✓ ${picked[key].qty}` : "+ Add"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {Object.keys(picked).length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Cards to add — enter price paid</div>
            {Object.entries(picked).map(([key, { card, qty, subset, pricePaid }]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #161616", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#a78bfa22", color: "#a78bfa" }}>{subset}</span>
                  <span style={{ color: "#e5e5e5", fontSize: 13, fontWeight: 600 }}>{card.Hero}</span>
                  <span style={{ color: "#a78bfa", fontSize: 12 }}>{card["Athlete Inspiration"]}</span>
                  {card.Weapon && <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 11, background: (weaponColors[card.Weapon] || "#333") + "22", color: weaponColors[card.Weapon] || "#aaa" }}>{card.Weapon}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "#555" }}>$</span>
                    <input type="number" min={0} step="0.01" placeholder="0.00" value={pricePaid}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); updatePrice(key, e.target.value); }}
                      style={{ ...s.smallInput, width: 70 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button onClick={e => { e.stopPropagation(); updateQty(key, qty - 1); }} style={{ width: 24, height: 24, border: "1px solid #333", background: "#0f0f0f", borderRadius: 4, cursor: "pointer", color: "#aaa" }}>−</button>
                    <span style={{ fontSize: 13, minWidth: 20, textAlign: "center" }}>{qty}</span>
                    <button onClick={e => { e.stopPropagation(); updateQty(key, qty + 1); }} style={{ width: 24, height: 24, border: "1px solid #333", background: "#0f0f0f", borderRadius: 4, cursor: "pointer", color: "#aaa" }}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button style={{ ...s.submitBtn, width: "100%" }} onClick={saveCards} disabled={addSaving}>
          {addSaving ? "Saving..." : "Add to inventory"}
        </button>
      </div>
    </div>
  );

  // INVENTORY VIEW
  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Card Inventory</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Cards received from lot comps + manual additions</p>
          </div>
          <button onClick={() => setView("add")} style={s.submitBtn}>+ Add cards</button>
        </div>

        {/* Stats */}
        <div className="ci-stats-grid">
          <div style={{ ...s.section, padding: "16px 20px", marginBottom: 0 }}>
            <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>🎁 Giveaway</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#4ade80" }}>{loading ? "—" : giveawayTotal.toLocaleString()}</div>
          </div>
          {SUBSETS.map(sub => (
            <div key={sub} style={{ ...s.section, padding: "16px 20px", marginBottom: 0 }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{sub}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#a78bfa" }}>
                {loading ? "—" : inventory.filter(i => i.subset === sub && i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 20, marginTop: 16 }}>
          <input style={s.input} placeholder="🔍 Search by hero, athlete, card #, treatment, weapon, set..." value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} />
        </div>

        {loading ? <p style={{ color: "#555" }}>Loading...</p> : SUBSETS.map(sub => (
          <div key={sub} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{sub}</h2>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#a78bfa22", color: "#a78bfa" }}>
                {groupedInventory[sub]?.reduce((s, i) => s + i.quantity, 0) || 0} cards
              </span>
            </div>
            {!groupedInventory[sub] || groupedInventory[sub].length === 0 ? (
              <div style={{ ...s.section, textAlign: "center", padding: 24 }}>
                <p style={{ color: "#555", fontSize: 13 }}>{inventorySearch ? `No ${sub} match your search` : `No ${sub} in inventory`}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groupedInventory[sub].map((item: any, i: number) => (
                  <div key={i} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#e5e5e5" }}>{item.hero}</div>
                        <div style={{ fontSize: 12, color: "#a78bfa", marginTop: 2 }}>{item.athlete}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#a78bfa" }}>{item.quantity}</div>
                        <div style={{ fontSize: 10, color: "#555" }}>in stock</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>{item.card_number}</span>
                      {item.weapon && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: (weaponColors[item.weapon] || "#333") + "22", color: weaponColors[item.weapon] || "#aaa" }}>{item.weapon}</span>}
                      {item.variation && <span style={{ fontSize: 11, color: "#777" }}>{item.variation}</span>}
                      {item.set_name && <span style={{ fontSize: 11, color: "#555" }}>{item.set_name}</span>}
                      {item.price_paid > 0 && <span style={{ fontSize: 11, color: "#fb923c" }}>${parseFloat(item.price_paid).toFixed(2)} paid</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        onClick={() => { setEditingCard(item); setEditQty(String(item.quantity)); setEditPrice(String(item.price_paid || "")); }}
                        style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#aaa", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}
                      >Edit</button>
                      {confirmId === item.id ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => deleteCard(item)} disabled={deletingId === item.id} style={{ fontSize: 11, background: "#7f1d1d", border: "none", color: "#fca5a5", borderRadius: 6, padding: "5px 8px", cursor: "pointer" }}>
                            {deletingId === item.id ? "..." : "Confirm"}
                          </button>
                          <button onClick={() => setConfirmId(null)} style={{ fontSize: 11, background: "#1a1a1a", border: "none", color: "#555", borderRadius: 6, padding: "5px 8px", cursor: "pointer" }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmId(item.id)} style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#555", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>Delete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}