"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function GiveawaysPage() {
  const [view, setView] = useState<"list" | "log">("list");
  const [giveaways, setGiveaways] = useState<any[]>([]);
  const [breaks, setBreaks] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeMonth, setActiveMonth] = useState<string>("all");

  // Form state
  const [selectedBreakId, setSelectedBreakId] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [cardSearch, setCardSearch] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [fmv, setFmv] = useState("");
  const [notes, setNotes] = useState("");

  const selectedCard = inventory.find(c => String(c.id) === selectedCardId);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: gData }, { data: bData }, { data: iData }] = await Promise.all([
      supabase.from("juiced_giveaways").select("*").order("created_at", { ascending: false }),
      supabase.from("Breaks").select("id, box_name, date").order("date", { ascending: false }).limit(100),
      supabase.from("cardinventory").select("*").order("hero", { ascending: true }),
    ]);
    if (gData) setGiveaways(gData);
    if (bData) setBreaks(bData);
    if (iData) setInventory(iData);
    setLoading(false);
  }

  const filteredInventory = inventory.filter(c => {
    if (!cardSearch) return false;
    const s = cardSearch.toLowerCase();
    return [c.hero, c.set_name, c.variation, c.weapon, c.card_number, c.athlete].join(" ").toLowerCase().includes(s);
  }).slice(0, 50);

  async function saveGiveaway() {
    if (!selectedBreakId) return alert("Please select a break.");
    if (!selectedCardId) return alert("Please select a card.");
    if (!fmv) return alert("Please enter FMV.");
    setSaving(true);
    const breakObj = breaks.find(b => String(b.id) === selectedBreakId);
    const card = inventory.find(c => String(c.id) === selectedCardId);
    await supabase.from("juiced_giveaways").insert({
      break_id: selectedBreakId,
      break_name: breakObj?.box_name || "",
      card_inventory_id: selectedCardId,
      card_name: card?.hero || "",
      set_name: card?.set_name || "",
      parallel: card?.variation || "",
      weapon_type: card?.weapon || "",
      card_number: card?.card_number || "",
      athlete: card?.athlete || "",
      quantity,
      cost_basis: parseFloat(card?.price_paid || "0") * quantity,
      fmv: parseFloat(fmv) * quantity,
      fmv_per_card: parseFloat(fmv),
      cost_basis_per_card: parseFloat(card?.price_paid || "0"),
      notes,
    });
    await loadAll();
    setSaving(false);
    resetForm();
    setView("list");
  }

  function resetForm() {
    setSelectedBreakId(""); setSelectedCardId(""); setCardSearch("");
    setQuantity(1); setFmv(""); setNotes("");
  }

  async function deleteGiveaway(id: string) {
    if (!confirm("Delete this giveaway entry?")) return;
    await supabase.from("juiced_giveaways").delete().eq("id", id);
    setGiveaways(prev => prev.filter(g => g.id !== id));
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const ytdGiveaways = giveaways.filter(g => new Date(g.created_at).getFullYear() === currentYear);
  const ytdCount = ytdGiveaways.reduce((s, g) => s + (g.quantity || 0), 0);
  const ytdCostBasis = ytdGiveaways.reduce((s, g) => s + parseFloat(g.cost_basis || "0"), 0);
  const ytdFMV = ytdGiveaways.reduce((s, g) => s + parseFloat(g.fmv || "0"), 0);

  const monthMap: Record<string, any[]> = {};
  for (const g of ytdGiveaways) {
    const month = new Date(g.created_at).toLocaleString("default", { month: "long", year: "numeric" });
    if (!monthMap[month]) monthMap[month] = [];
    monthMap[month].push(g);
  }

  const months = ["all", ...Object.keys(monthMap)];
  const displayGiveaways = activeMonth === "all" ? ytdGiveaways : monthMap[activeMonth] || [];

  function exportCSV() {
    const rows = [
      ["Date","Break","Card","Set","Parallel","Weapon","Card #","Qty","Cost Basis/card","Total Cost Basis","FMV/card","Total FMV","Notes"],
      ...ytdGiveaways.map(g => [
        new Date(g.created_at).toLocaleDateString(), g.break_name, g.card_name, g.set_name,
        g.parallel, g.weapon_type, g.card_number, g.quantity,
        parseFloat(g.cost_basis_per_card || "0").toFixed(2), parseFloat(g.cost_basis || "0").toFixed(2),
        parseFloat(g.fmv_per_card || "0").toFixed(2), parseFloat(g.fmv || "0").toFixed(2), g.notes || ""
      ])
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `juiced-giveaways-${currentYear}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const weaponColors: Record<string, string> = {
    Fire: "#fb923c", Ice: "#38bdf8", Steel: "#94a3b8",
    Gum: "#f472b6", Hex: "#a78bfa", Glow: "#4ade80", Brawl: "#f87171"
  };

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" },
    content: { padding: "24px 16px", maxWidth: 1100, margin: "0 auto", boxSizing: "border-box" as const },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    label: { fontSize: 12, color: "#666", marginBottom: 5, display: "block" },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const },
    submitBtn: { background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" },
  };

  // ── LOG FORM ──────────────────────────────────────────────────────────────
  if (view === "log") return (
    <div style={s.shell}>
      <style>{`
        .gv-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .gv-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        @media (max-width: 768px) {
          .gv-grid-2 { grid-template-columns: 1fr; }
          .gv-grid-3 { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🎁 Log Juiced Giveaway</h1>
          <button onClick={() => { setView("list"); resetForm(); }} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>← Back</button>
        </div>

        {/* Break selector */}
        <div style={s.section}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 14 }}>Select Break</div>
          <label style={s.label}>Break</label>
          <select style={s.input} value={selectedBreakId} onChange={e => setSelectedBreakId(e.target.value)}>
            <option value="">— Select a break —</option>
            {breaks.map(b => (
              <option key={b.id} value={b.id}>{b.box_name}{b.date ? ` · ${new Date(b.date).toLocaleDateString()}` : ""}</option>
            ))}
          </select>
        </div>

        {/* Card selector */}
        <div style={s.section}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 14 }}>Select Card from Inventory</div>
          <input style={{ ...s.input, marginBottom: 10 }} placeholder="🔍 Search hero, set, weapon, card #..." value={cardSearch}
            onChange={e => { setCardSearch(e.target.value); setSelectedCardId(""); }} />
          <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid #1e1e1e", borderRadius: 8, marginBottom: 12 }}>
            {!cardSearch ? (
              <div style={{ padding: 20, textAlign: "center", color: "#555", fontSize: 13 }}>Type to search your inventory</div>
            ) : filteredInventory.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#555", fontSize: 13 }}>No cards found</div>
            ) : filteredInventory.map((card, i) => (
              <div key={i}
                onClick={() => { setSelectedCardId(String(card.id)); setCardSearch(`${card.hero} · ${card.set_name} · ${card.variation || ""} · ${card.weapon || ""}`); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #161616", cursor: "pointer", background: selectedCardId === String(card.id) ? "#a78bfa11" : "transparent" }}
                onMouseEnter={e => { if (selectedCardId !== String(card.id)) (e.currentTarget as HTMLElement).style.background = "#ffffff08"; }}
                onMouseLeave={e => { if (selectedCardId !== String(card.id)) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{card.hero}</span>
                    <span style={{ fontSize: 12, color: "#a78bfa" }}>{card.athlete}</span>
                    {card.weapon && <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 11, background: (weaponColors[card.weapon] || "#333") + "22", color: weaponColors[card.weapon] || "#aaa" }}>{card.weapon}</span>}
                    <span style={{ fontSize: 11, color: "#555" }}>{card.set_name}</span>
                    {card.variation && <span style={{ fontSize: 11, color: "#555" }}>{card.variation}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Qty: {card.quantity} · Cost basis: ${parseFloat(card.price_paid || "0").toFixed(2)}/card</div>
                </div>
                {selectedCardId === String(card.id) && <span style={{ fontSize: 11, color: "#a78bfa" }}>✓ Selected</span>}
              </div>
            ))}
          </div>

          {selectedCard && (
            <div style={{ background: "#0f0f0f", border: "1px solid #a78bfa44", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, color: "#a78bfa", marginBottom: 6, fontWeight: 600 }}>Selected card</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedCard.hero} · {selectedCard.set_name}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{selectedCard.variation} · {selectedCard.weapon} · #{selectedCard.card_number}</div>
              <div style={{ fontSize: 12, color: "#fb923c", marginTop: 4 }}>Cost basis: ${parseFloat(selectedCard.price_paid || "0").toFixed(2)}/card · {selectedCard.quantity} in inventory</div>
            </div>
          )}
        </div>

        {/* Details */}
        <div style={s.section}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 14 }}>Giveaway Details</div>
          <div className="gv-grid-3" style={{ marginBottom: 12 }}>
            <div>
              <label style={s.label}>Quantity given away</label>
              <input style={s.input} type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
            </div>
            <div>
              <label style={s.label}>FMV per card ($) — what it's worth</label>
              <input style={s.input} type="number" min={0} step="0.01" placeholder="e.g. 25.00" value={fmv} onChange={e => setFmv(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Cost basis per card ($)</label>
              <input style={{ ...s.input, color: "#fb923c" }} readOnly value={selectedCard ? `$${parseFloat(selectedCard.price_paid || "0").toFixed(2)}` : "—"} />
            </div>
          </div>
          <div>
            <label style={s.label}>Notes (optional)</label>
            <input style={s.input} placeholder="e.g. Chat pick, subscriber reward..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Preview */}
        {selectedCard && fmv && (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 12 }}>Summary</div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div><div style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>Total Cost Basis</div><div style={{ fontSize: 22, fontWeight: 700, color: "#fb923c" }}>${(parseFloat(selectedCard.price_paid || "0") * quantity).toFixed(2)}</div></div>
              <div><div style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>Total FMV</div><div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80" }}>${(parseFloat(fmv) * quantity).toFixed(2)}</div></div>
              <div><div style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>Qty</div><div style={{ fontSize: 22, fontWeight: 700, color: "#a78bfa" }}>{quantity}</div></div>
            </div>
          </div>
        )}

        <button onClick={saveGiveaway} disabled={saving || !selectedBreakId || !selectedCardId || !fmv}
          style={{ ...s.submitBtn, width: "100%", opacity: (!selectedBreakId || !selectedCardId || !fmv) ? 0.5 : 1 }}>
          {saving ? "Saving..." : "💾 Log Juiced Giveaway"}
        </button>
      </div>
    </div>
  );

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div style={s.shell}>
      <style>{`
        .gv-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
        .gv-table { display: block; }
        .gv-cards-mobile { display: none; }
        @media (max-width: 768px) {
          .gv-stats { grid-template-columns: 1fr 1fr; }
          .gv-table { display: none; }
          .gv-cards-mobile { display: flex; flex-direction: column; gap: 8px; }
        }
      `}</style>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🎁 Juiced Giveaways</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 4, marginBottom: 0 }}>{currentYear} tax tracker</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={exportCSV} style={{ fontSize: 13, background: "#1e3a1e", color: "#4ade80", border: "1px solid #4ade80", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>⬇ Export CSV</button>
            <button onClick={() => setView("log")} style={s.submitBtn}>+ Log Giveaway</button>
          </div>
        </div>

        {loading ? <p style={{ color: "#555" }}>Loading...</p> : (
          <>
            {/* YTD Stats */}
            <div className="gv-stats">
              {[
                { label: `${currentYear} Cards Given`, val: String(ytdCount), color: "#a78bfa", prefix: "" },
                { label: `${currentYear} Total Cost Basis`, val: ytdCostBasis.toFixed(2), color: "#fb923c", prefix: "$" },
                { label: `${currentYear} Total FMV`, val: ytdFMV.toFixed(2), color: "#4ade80", prefix: "$" },
              ].map(({ label, val, color, prefix }) => (
                <div key={label} style={s.section}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color }}>{prefix}{val}</div>
                </div>
              ))}
            </div>

            {/* Month filter */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {months.map(m => (
                <button key={m} onClick={() => setActiveMonth(m)}
                  style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${activeMonth === m ? "#fb923c" : "#222"}`, background: activeMonth === m ? "#fb923c22" : "#0f0f0f", color: activeMonth === m ? "#fb923c" : "#555" }}>
                  {m === "all" ? "All YTD" : m}
                </button>
              ))}
            </div>

            {/* Month summary */}
            {activeMonth !== "all" && monthMap[activeMonth] && (
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div><span style={{ fontSize: 11, color: "#555" }}>Cards: </span><span style={{ fontWeight: 700, color: "#a78bfa" }}>{monthMap[activeMonth].reduce((s, g) => s + g.quantity, 0)}</span></div>
                <div><span style={{ fontSize: 11, color: "#555" }}>Cost Basis: </span><span style={{ fontWeight: 700, color: "#fb923c" }}>${monthMap[activeMonth].reduce((s, g) => s + parseFloat(g.cost_basis || "0"), 0).toFixed(2)}</span></div>
                <div><span style={{ fontSize: 11, color: "#555" }}>FMV: </span><span style={{ fontWeight: 700, color: "#4ade80" }}>${monthMap[activeMonth].reduce((s, g) => s + parseFloat(g.fmv || "0"), 0).toFixed(2)}</span></div>
              </div>
            )}

            {displayGiveaways.length === 0 ? (
              <div style={{ ...s.section, textAlign: "center", padding: 48 }}>
                <p style={{ color: "#555", fontSize: 13 }}>No juiced giveaways logged yet — click "+ Log Giveaway" to get started</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="gv-table" style={s.section}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr style={{ background: "#0f0f0f" }}>
                      {["Date","Break","Card","Set / Parallel","Weapon","Qty","Cost Basis","FMV","Notes",""].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left" as const, color: "#444", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".4px", borderBottom: "1px solid #1e1e1e" }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {displayGiveaways.map((g, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #161616" }}>
                          <td style={{ padding: "11px 14px", color: "#555", fontSize: 12 }}>{new Date(g.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: "11px 14px", color: "#e5e5e5", fontSize: 12 }}>{g.break_name}</td>
                          <td style={{ padding: "11px 14px", fontWeight: 600 }}>{g.card_name}</td>
                          <td style={{ padding: "11px 14px", color: "#777", fontSize: 12 }}>{g.set_name}{g.parallel ? ` · ${g.parallel}` : ""}</td>
                          <td style={{ padding: "11px 14px" }}>{g.weapon_type && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, background: (weaponColors[g.weapon_type] || "#333") + "22", color: weaponColors[g.weapon_type] || "#aaa" }}>{g.weapon_type}</span>}</td>
                          <td style={{ padding: "11px 14px", color: "#a78bfa" }}>{g.quantity}</td>
                          <td style={{ padding: "11px 14px", color: "#fb923c", fontWeight: 600 }}>${parseFloat(g.cost_basis || "0").toFixed(2)}</td>
                          <td style={{ padding: "11px 14px", color: "#4ade80", fontWeight: 600 }}>${parseFloat(g.fmv || "0").toFixed(2)}</td>
                          <td style={{ padding: "11px 14px", color: "#555", fontSize: 12 }}>{g.notes || "—"}</td>
                          <td style={{ padding: "11px 14px" }}>
                            <button onClick={() => deleteGiveaway(g.id)} style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#555", borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="gv-cards-mobile">
                  {displayGiveaways.map((g, i) => (
                    <div key={i} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{g.card_name}</div>
                          <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{g.break_name} · {new Date(g.created_at).toLocaleDateString()}</div>
                        </div>
                        <button onClick={() => deleteGiveaway(g.id)} style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#555", borderRadius: 4, padding: "3px 8px", cursor: "pointer", alignSelf: "flex-start" }}>✕</button>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {g.weapon_type && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, background: (weaponColors[g.weapon_type] || "#333") + "22", color: weaponColors[g.weapon_type] || "#aaa" }}>{g.weapon_type}</span>}
                        <span style={{ fontSize: 11, color: "#555" }}>{g.set_name}</span>
                        <span style={{ fontSize: 11, color: "#a78bfa" }}>Qty: {g.quantity}</span>
                      </div>
                      <div style={{ display: "flex", gap: 16 }}>
                        <div><div style={{ fontSize: 10, color: "#555" }}>Cost Basis</div><div style={{ fontSize: 15, fontWeight: 700, color: "#fb923c" }}>${parseFloat(g.cost_basis || "0").toFixed(2)}</div></div>
                        <div><div style={{ fontSize: 10, color: "#555" }}>FMV</div><div style={{ fontSize: 15, fontWeight: 700, color: "#4ade80" }}>${parseFloat(g.fmv || "0").toFixed(2)}</div></div>
                      </div>
                      {g.notes && <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>{g.notes}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Monthly breakdown */}
            {activeMonth === "all" && Object.keys(monthMap).length > 0 && (
              <div style={{ ...s.section, marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 14 }}>Monthly Breakdown</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr>
                    {["Month","Cards","Cost Basis","FMV"].map(h => (
                      <th key={h} style={{ padding: "8px 14px", textAlign: "left" as const, color: "#444", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, borderBottom: "1px solid #1e1e1e" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {Object.entries(monthMap).map(([month, items]) => (
                      <tr key={month} style={{ borderBottom: "1px solid #161616" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600 }}>{month}</td>
                        <td style={{ padding: "10px 14px", color: "#a78bfa" }}>{items.reduce((s, g) => s + g.quantity, 0)}</td>
                        <td style={{ padding: "10px 14px", color: "#fb923c", fontWeight: 600 }}>${items.reduce((s, g) => s + parseFloat(g.cost_basis || "0"), 0).toFixed(2)}</td>
                        <td style={{ padding: "10px 14px", color: "#4ade80", fontWeight: 600 }}>${items.reduce((s, g) => s + parseFloat(g.fmv || "0"), 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid #333" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700 }}>Total {currentYear}</td>
                      <td style={{ padding: "10px 14px", color: "#a78bfa", fontWeight: 700 }}>{ytdCount}</td>
                      <td style={{ padding: "10px 14px", color: "#fb923c", fontWeight: 700 }}>${ytdCostBasis.toFixed(2)}</td>
                      <td style={{ padding: "10px 14px", color: "#4ade80", fontWeight: 700 }}>${ytdFMV.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}