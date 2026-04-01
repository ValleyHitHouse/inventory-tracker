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

export default function CardInventoryPage() {
  const [view, setView] = useState<"inventory"|"intake">("inventory");
  const [giveawayTotal, setGiveawayTotal] = useState(0);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Intake form state
  const [lotName, setLotName] = useState("");
  const [giveawayCount, setGiveawayCount] = useState(0);
  const [selectedSet, setSelectedSet] = useState(0);
  const [allCards, setAllCards] = useState<any[]>([]);
  const [cardSearch, setCardSearch] = useState("");
  const [activeSubset, setActiveSubset] = useState("Chasers");
  const [picked, setPicked] = useState<Record<string, {card: any, qty: number, subset: string}>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadInventory(); }, []);

  useEffect(() => {
    fetch(SETS[selectedSet].file)
      .then(r => r.text())
      .then(text => setAllCards(parseCSV(text)));
  }, [selectedSet]);

  async function loadInventory() {
    setLoading(true);
    const { data: gt } = await supabase.from("GiveawayTotal").select("total").single();
    if (gt) setGiveawayTotal(gt.total);
    const { data: inv } = await supabase.from("CardInventory").select("*").order("subset").order("created_at", { ascending: false });
    if (inv) setInventory(inv);
    setLoading(false);
  }

  const filteredCards = allCards.filter(c => {
    const q = cardSearch.toLowerCase();
    return !q || c.Hero?.toLowerCase().includes(q) || c["Athlete Inspiration"]?.toLowerCase().includes(q) || c["Card #"]?.toLowerCase().includes(q);
  }).slice(0, 50);

  function pickCard(card: any) {
    const key = `${card["Card #"]}-${activeSubset}`;
    setPicked(prev => ({
      ...prev,
      [key]: prev[key] ? { ...prev[key], qty: prev[key].qty + 1 } : { card, qty: 1, subset: activeSubset }
    }));
  }

  function updateQty(key: string, qty: number) {
    if (qty <= 0) {
      setPicked(prev => { const n = { ...prev }; delete n[key]; return n; });
    } else {
      setPicked(prev => ({ ...prev, [key]: { ...prev[key], qty } }));
    }
  }

  async function saveIntake() {
    if (!lotName) return alert("Please enter a lot name!");
    setSaving(true);

    // Save lot
    await supabase.from("CardLots").insert({ lot_name: lotName, giveaway_count: giveawayCount });

    // Update giveaway total
    if (giveawayCount > 0) {
      await supabase.from("GiveawayTotal").update({ total: giveawayTotal + giveawayCount }).eq("id", 1);
    }

    // Save picked cards to CardInventory
    const rows = Object.values(picked).map(({ card, qty, subset }) => ({
      subset,
      card_number: card["Card #"],
      hero: card.Hero,
      athlete: card["Athlete Inspiration"],
      variation: card.Variation,
      weapon: card.Weapon,
      set_name: SETS[selectedSet].label,
      quantity: qty,
    }));
    if (rows.length > 0) await supabase.from("CardInventory").insert(rows);

    await loadInventory();
    setSaving(false);
    setView("inventory");
    setLotName(""); setGiveawayCount(0); setPicked({}); setCardSearch("");
  }

  const weaponColors: Record<string, string> = {
    Fire: "#fb923c", Ice: "#38bdf8", Steel: "#94a3b8",
    Gum: "#f472b6", Hex: "#a78bfa", Glow: "#4ade80", Brawl: "#f87171"
  };

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" },
    content: { padding: 32, maxWidth: 1100, margin: "0 auto" },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none" },
    submitBtn: { background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" },
    th: { padding: "10px 14px", textAlign: "left" as const, color: "#444", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".4px", borderBottom: "1px solid #1e1e1e" },
    td: { padding: "11px 14px", fontSize: 13, borderBottom: "1px solid #161616" },
  };

  const groupedInventory = SUBSETS.reduce((acc, sub) => {
    acc[sub] = inventory.filter(i => i.subset === sub);
    return acc;
  }, {} as Record<string, any[]>);

  if (view === "intake") return (
    <div style={s.shell}>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Log Card Lot</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Add cards from a new lot to your inventory</p>
          </div>
          <button onClick={() => setView("inventory")} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>← Back</button>
        </div>

        {/* Lot details */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Lot details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Lot name</label>
              <input style={s.input} placeholder="e.g. Griffey Lot - April 1" value={lotName} onChange={e => setLotName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Giveaway cards in this lot</label>
              <input style={s.input} type="number" min={0} value={giveawayCount} onChange={e => setGiveawayCount(Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Card picker */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Add specific cards</div>

          {/* Set selector */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {SETS.map((set, i) => (
              <button key={i} onClick={() => setSelectedSet(i)} style={{
                padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${selectedSet === i ? "#fb923c" : "#222"}`,
                background: selectedSet === i ? "#fb923c22" : "#0f0f0f",
                color: selectedSet === i ? "#fb923c" : "#555",
              }}>{set.label}</button>
            ))}
          </div>

          {/* Subset selector */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {SUBSETS.map(sub => (
              <button key={sub} onClick={() => setActiveSubset(sub)} style={{
                padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${activeSubset === sub ? "#a78bfa" : "#222"}`,
                background: activeSubset === sub ? "#a78bfa22" : "#0f0f0f",
                color: activeSubset === sub ? "#a78bfa" : "#555",
              }}>{sub}</button>
            ))}
          </div>

          {/* Search */}
          <input style={{ ...s.input, marginBottom: 12 }} placeholder="🔍 Search cards by hero, athlete, card #..." value={cardSearch} onChange={e => setCardSearch(e.target.value)} />

          {/* Card results */}
          <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid #1e1e1e", borderRadius: 8 }}>
            {filteredCards.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#555", fontSize: 13 }}>Type to search cards</div>
            ) : filteredCards.map((card, i) => {
              const key = `${card["Card #"]}-${activeSubset}`;
              const isPicked = !!picked[key];
              return (
                <div key={i} onClick={() => pickCard(card)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", borderBottom: "1px solid #161616", cursor: "pointer",
                  background: isPicked ? "#a78bfa11" : "transparent",
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ color: "#555", fontSize: 11, fontFamily: "monospace" }}>{card["Card #"]}</span>
                    <span style={{ color: "#e5e5e5", fontWeight: 600, fontSize: 13 }}>{card.Hero}</span>
                    <span style={{ color: "#a78bfa", fontSize: 12 }}>{card["Athlete Inspiration"]}</span>
                    {card.Weapon && <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 11, background: (weaponColors[card.Weapon] || "#333") + "22", color: weaponColors[card.Weapon] || "#aaa" }}>{card.Weapon}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: isPicked ? "#a78bfa" : "#333" }}>{isPicked ? `✓ ${picked[key].qty} added` : "+ Add"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Picked cards summary */}
        {Object.keys(picked).length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Cards in this lot ({Object.keys(picked).length})</div>
            {Object.entries(picked).map(([key, { card, qty, subset }]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #161616" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#a78bfa22", color: "#a78bfa" }}>{subset}</span>
                  <span style={{ color: "#555", fontSize: 11, fontFamily: "monospace" }}>{card["Card #"]}</span>
                  <span style={{ color: "#e5e5e5", fontSize: 13 }}>{card.Hero}</span>
                  <span style={{ color: "#777", fontSize: 12 }}>{card["Athlete Inspiration"]}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => updateQty(key, qty - 1)} style={{ width: 24, height: 24, border: "1px solid #333", background: "#0f0f0f", borderRadius: 4, cursor: "pointer", color: "#aaa" }}>−</button>
                  <span style={{ fontSize: 13, minWidth: 20, textAlign: "center" }}>{qty}</span>
                  <button onClick={() => updateQty(key, qty + 1)} style={{ width: 24, height: 24, border: "1px solid #333", background: "#0f0f0f", borderRadius: 4, cursor: "pointer", color: "#aaa" }}>+</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button style={s.submitBtn} onClick={saveIntake} disabled={saving}>
          {saving ? "Saving..." : "Save lot to inventory"}
        </button>
      </div>
    </div>
  );

  // Inventory view
  return (
    <div style={s.shell}>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Card Inventory</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Track your BOBA card stock</p>
          </div>
          <button onClick={() => setView("intake")} style={s.submitBtn}>+ Log card lot</button>
        </div>

        {/* Giveaway total */}
        <div style={{ ...s.section, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>🎁 Total giveaway cards</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#4ade80" }}>{loading ? "—" : giveawayTotal.toLocaleString()}</div>
          </div>
          <div style={{ fontSize: 12, color: "#333" }}>Running total across all lots</div>
        </div>

        {/* Subsets */}
        {loading ? <p style={{ color: "#555" }}>Loading...</p> : SUBSETS.map(sub => (
          <div key={sub} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{sub}</h2>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#a78bfa22", color: "#a78bfa" }}>
                {groupedInventory[sub]?.reduce((s, i) => s + i.quantity, 0) || 0} cards
              </span>
            </div>
            {groupedInventory[sub]?.length === 0 ? (
              <div style={{ ...s.section, textAlign: "center", padding: 24 }}>
                <p style={{ color: "#555", fontSize: 13 }}>No {sub} logged yet</p>
              </div>
            ) : (
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#0f0f0f" }}>
                      <th style={s.th}>#</th>
                      <th style={s.th}>Hero</th>
                      <th style={s.th}>Athlete</th>
                      <th style={s.th}>Variation</th>
                      <th style={s.th}>Set</th>
                      <th style={s.th}>Weapon</th>
                      <th style={s.th}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedInventory[sub].map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #161616" }}>
                        <td style={{ ...s.td, color: "#555", fontFamily: "monospace" }}>{item.card_number}</td>
                        <td style={{ ...s.td, color: "#e5e5e5", fontWeight: 600 }}>{item.hero}</td>
                        <td style={{ ...s.td, color: "#a78bfa" }}>{item.athlete}</td>
                        <td style={{ ...s.td, color: "#777" }}>{item.variation}</td>
                        <td style={{ ...s.td, color: "#555", fontSize: 12 }}>{item.set_name}</td>
                        <td style={{ ...s.td }}>
                          {item.weapon && (
                            <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: (weaponColors[item.weapon] || "#333") + "22", color: weaponColors[item.weapon] || "#aaa" }}>
                              {item.weapon}
                            </span>
                          )}
                        </td>
                        <td style={{ ...s.td, color: "#4ade80", fontWeight: 600 }}>{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}