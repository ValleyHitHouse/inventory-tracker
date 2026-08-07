"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/db";

export default function GiveawaysPage() {
  const [giveaways, setGiveaways] = useState<any[]>([]);
  const [breaks, setBreaks] = useState<any[]>([]);
  const [cardInventory, setCardInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [cardSearch, setCardSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [breakId, setBreakId] = useState("");
  const [selectedCard, setSelectedCard] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [costBasis, setCostBasis] = useState("");
  const [fmv, setFmv] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [givAll, brkRes, cardAll] = await Promise.all([
      fetchAll(() => supabase.from("juiced_giveaways").select("*").order("created_at", { ascending: false })),
      supabase.from("Breaks").select("id, box_name, date").order("date", { ascending: false }).limit(50),
      fetchAll(() => supabase.from("cardinventory").select("*").gt("quantity", 0).order("subset").order("hero")),
    ]);
    setGiveaways(givAll);
    if (brkRes.data) setBreaks(brkRes.data);
    setCardInventory(cardAll);
    setLoading(false);
  }

  const filteredCards = cardInventory.filter(c => {
    if (!cardSearch) return true;
    const q = cardSearch.toLowerCase();
    return [c.hero, c.athlete, c.card_number, c.subset, c.weapon, c.variation].join(" ").toLowerCase().includes(q);
  }).slice(0, 50);

  const selectedCardData = cardInventory.find(c => String(c.id) === selectedCard);

  useEffect(() => {
    if (selectedCardData?.price_paid) {
      setCostBasis(String((parseFloat(selectedCardData.price_paid) * (parseInt(quantity) || 1)).toFixed(2)));
    }
  }, [selectedCard, quantity]);

  async function saveGiveaway() {
    if (!selectedCard || !breakId) return alert("Please select a break and a card");
    setSaving(true);

    const card = cardInventory.find(c => String(c.id) === selectedCard);
    if (!card) { setSaving(false); return alert("Card not found"); }

    const qty = parseInt(quantity) || 1;
    const breakRecord = breaks.find(b => String(b.id) === breakId);

    await supabase.from("juiced_giveaways").insert({
      break_id: parseInt(breakId),
      break_name: breakRecord ? `${breakRecord.box_name || "Break"} — ${breakRecord.date}` : breakId,
      card_name: card.hero,
      set_name: card.set_name || card.subset || "",
      parallel: card.variation || null,
      weapon_type: card.weapon || null,
      quantity: qty,
      cost_basis: parseFloat(costBasis) || 0,
      fmv: parseFloat(fmv) || 0,
      notes: notes || null,
    });

    // Deduct from card inventory
    const newQty = Math.max(0, (card.quantity || 0) - qty);
    if (newQty === 0) {
      await supabase.from("cardinventory").delete().eq("id", card.id);
    } else {
      await supabase.from("cardinventory").update({ quantity: newQty }).eq("id", card.id);
    }

    await loadData();
    setSaving(false);
    setShowForm(false);
    setSelectedCard(""); setBreakId(""); setQuantity("1");
    setCostBasis(""); setFmv(""); setNotes(""); setCardSearch("");
  }

  async function deleteGiveaway(id: number) {
    setDeletingId(id);
    await supabase.from("juiced_giveaways").delete().eq("id", id);
    setDeletingId(null); setConfirmId(null);
    await loadData();
  }

  // Filter by year
  const yearGiveaways = giveaways.filter(g => {
    const gYear = new Date(g.created_at).getFullYear();
    return gYear === selectedYear;
  });

  // Group by break
  const grouped: Record<string, any[]> = {};
  for (const g of yearGiveaways) {
    const key = g.break_name || String(g.break_id);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(g);
  }

  const totalCostBasis = yearGiveaways.reduce((s, g) => s + parseFloat(g.cost_basis || "0"), 0);
  const totalFMV = yearGiveaways.reduce((s, g) => s + parseFloat(g.fmv || "0"), 0);
  const totalCount = yearGiveaways.reduce((s, g) => s + (g.quantity || 0), 0);

  const CURRENT_YEAR = new Date().getFullYear();
  const YEARS = Array.from({ length: 3 }, (_, i) => CURRENT_YEAR - i);

  const weaponColors: Record<string, string> = {
    Fire: "#fb923c", Ice: "#38bdf8", Steel: "#94a3b8",
    Gum: "#f472b6", Hex: "#a78bfa", Glow: "#4ade80", Brawl: "#f87171"
  };

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", width: "100%", boxSizing: "border-box" as const },
    content: { padding: "24px 16px", maxWidth: 1000, margin: "0 auto", width: "100%", boxSizing: "border-box" as const },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const },
    label: { fontSize: 12, color: "#666", marginBottom: 5, display: "block" },
    submitBtn: { background: "linear-gradient(135deg,#7c3aed,#db2877)", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" },
  };

  const mobileStyles = `
    .gv-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 16px; }
    .gv-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    @media (max-width: 768px) {
      .gv-stats { grid-template-columns: 1fr; }
      .gv-form-grid { grid-template-columns: 1fr; }
    }
  `;

  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Juiced Giveaways</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Track giveaway cards for tax purposes — cost basis & FMV</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8 }}>
              {YEARS.map(y => (
                <button key={y} onClick={() => setSelectedYear(y)} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${selectedYear === y ? "#fbbf24" : "#222"}`, background: selectedYear === y ? "#fbbf2422" : "#111", color: selectedYear === y ? "#fbbf24" : "#555" }}>{y}</button>
              ))}
            </div>
            <button onClick={() => setShowForm(!showForm)} style={s.submitBtn}>
              {showForm ? "Cancel" : "+ Log giveaway"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="gv-stats">
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total giveaways</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#e5e5e5" }}>{totalCount}</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{selectedYear}</div>
          </div>
          <div style={{ background: "#111", border: "1px solid #fb923c33", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#fb923c", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total cost basis</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fb923c" }}>${totalCostBasis.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>What you paid</div>
          </div>
          <div style={{ background: "#111", border: "1px solid #4ade8033", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#4ade80", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total FMV</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80" }}>${totalFMV.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>Fair market value</div>
          </div>
        </div>

        {/* Log form */}
        {showForm && (
          <div style={{ ...s.section, borderColor: "#7c3aed44" }}>
            <div style={s.sectionTitle}>Log juiced giveaway</div>

            <div style={{ marginBottom: 12 }}>
              <label style={s.label}>Break</label>
              <select style={s.input} value={breakId} onChange={e => setBreakId(e.target.value)}>
                <option value="">— Select break —</option>
                {breaks.map(b => (
                  <option key={b.id} value={String(b.id)}>{b.box_name || "Break"} — {b.date}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={s.label}>Search card inventory</label>
              <input style={s.input} placeholder="🔍 Search by hero, athlete, card #..." value={cardSearch} onChange={e => setCardSearch(e.target.value)} />
            </div>

            {/* Card picker */}
            <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid #1e1e1e", borderRadius: 8, marginBottom: 12 }}>
              {filteredCards.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#555", fontSize: 13 }}>No cards found</div>
              ) : filteredCards.map(card => (
                <div key={card.id} onClick={() => setSelectedCard(String(card.id))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #161616", cursor: "pointer", background: selectedCard === String(card.id) ? "#a78bfa11" : "transparent" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#a78bfa22", color: "#a78bfa", flexShrink: 0 }}>{card.subset}</span>
                    <span style={{ color: "#e5e5e5", fontWeight: 600, fontSize: 13 }}>{card.hero}</span>
                    <span style={{ color: "#a78bfa", fontSize: 12 }}>{card.athlete}</span>
                    {card.weapon && <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 11, background: (weaponColors[card.weapon] || "#333") + "22", color: weaponColors[card.weapon] || "#aaa" }}>{card.weapon}</span>}
                    {card.price_paid > 0 && <span style={{ color: "#fb923c", fontSize: 11 }}>${parseFloat(card.price_paid).toFixed(2)}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: "#555", whiteSpace: "nowrap", marginLeft: 8, flexShrink: 0 }}>{card.quantity} avail</span>
                </div>
              ))}
            </div>

            {selectedCardData && (
              <div style={{ background: "#0f0a1a", border: "1px solid #a78bfa33", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "#a78bfa" }}>Selected: <strong>{selectedCardData.hero}</strong> ({selectedCardData.athlete})</span>
              </div>
            )}

            <div className="gv-form-grid">
              <div>
                <label style={s.label}>Quantity</label>
                <input style={s.input} type="number" min={1} value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Cost basis ($) — auto-filled</label>
                <input style={s.input} type="number" min={0} step="0.01" value={costBasis} onChange={e => setCostBasis(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={s.label}>FMV ($) — fair market value</label>
              <input style={s.input} type="number" min={0} step="0.01" placeholder="e.g. 150.00" value={fmv} onChange={e => setFmv(e.target.value)} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Notes (optional)</label>
              <input style={s.input} placeholder="Any details about this giveaway" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div style={{ background: "#0f0f0f", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#555" }}>
              ⚠️ Logging this will deduct the card from your card inventory
            </div>

            <button style={{ ...s.submitBtn, width: "100%" }} onClick={saveGiveaway} disabled={saving}>
              {saving ? "Saving..." : "Log giveaway & deduct from inventory"}
            </button>
          </div>
        )}

        {/* Giveaways list grouped by break */}
        {loading ? <p style={{ color: "#555" }}>Loading...</p> : Object.keys(grouped).length === 0 ? (
          <div style={{ ...s.section, textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎁</div>
            <p style={{ color: "#555", fontSize: 13 }}>No juiced giveaways logged for {selectedYear}</p>
          </div>
        ) : (
          Object.entries(grouped).map(([breakName, items]) => {
            const breakCostBasis = items.reduce((sum, g) => sum + parseFloat(g.cost_basis || "0"), 0);
            const breakFMV = items.reduce((sum, g) => sum + parseFloat(g.fmv || "0"), 0);
            const breakCount = items.reduce((sum, g) => sum + (g.quantity || 0), 0);
            return (
              <div key={breakName} style={s.section}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#e5e5e5" }}>{breakName}</div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{breakCount} giveaway{breakCount !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#555" }}>Cost Basis</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#fb923c" }}>${breakCostBasis.toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#555" }}>FMV</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#4ade80" }}>${breakFMV.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {items.map(g => (
                    <div key={g.id} style={{ background: "#0f0f0f", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ color: "#e5e5e5", fontWeight: 600, fontSize: 13 }}>{g.card_name}</span>
                        <span style={{ fontSize: 11, color: "#555" }}>{g.set_name}{g.parallel ? ` · ${g.parallel}` : ""}</span>
                        {g.weapon_type && <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 11, background: (weaponColors[g.weapon_type] || "#333") + "22", color: weaponColors[g.weapon_type] || "#aaa" }}>{g.weapon_type}</span>}
                        <span style={{ fontSize: 11, color: "#a78bfa" }}>×{g.quantity}</span>
                        {g.notes && <span style={{ fontSize: 11, color: "#444" }}>{g.notes}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 10, color: "#555" }}>CB</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#fb923c" }}>${parseFloat(g.cost_basis || "0").toFixed(2)}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 10, color: "#555" }}>FMV</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>${parseFloat(g.fmv || "0").toFixed(2)}</div>
                        </div>
                        {confirmId === g.id ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => deleteGiveaway(g.id)} disabled={deletingId === g.id} style={{ fontSize: 11, background: "#7f1d1d", border: "none", color: "#fca5a5", borderRadius: 5, padding: "3px 8px", cursor: "pointer" }}>
                              {deletingId === g.id ? "..." : "Confirm"}
                            </button>
                            <button onClick={() => setConfirmId(null)} style={{ fontSize: 11, background: "#1a1a1a", border: "none", color: "#555", borderRadius: 5, padding: "3px 8px", cursor: "pointer" }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmId(g.id)} style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#555", borderRadius: 5, padding: "3px 8px", cursor: "pointer" }}>Delete</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}