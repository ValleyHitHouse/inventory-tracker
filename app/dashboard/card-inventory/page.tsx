"use client";
import { useState, useEffect } from "react";
import { parseCSV } from "@/lib/csv";
import { CARD_SETS as SETS } from "@/lib/cardSets";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/db";

// Carded categories: each stored on the cardinventory row (in the `subset` column)
// with full card attributes. "Giveaway Card" is NOT here — it's a plain tally kept
// in the giveawaytotal counter (shared with lot-comp and breaks).
const CATEGORIES = ["In a DECK", "Juiced Givvy", "Personal Collection", "NUKES"];
const GIVEAWAY = "Giveaway Card";
// Insurance: plain tally like Giveaway Card (no card attributes), fixed $3/card valuation.
// Stored in settings under key `insurance_total`.
const INSURANCE = "Insurance";
const INSURANCE_VALUE = 3;

const catColors: Record<string, string> = {
  "In a DECK": "#38bdf8",
  "Juiced Givvy": "#4ade80",
  "Personal Collection": "#a78bfa",
  "NUKES": "#f87171",
  "Giveaway Card": "#fbbf24",
  "Insurance": "#2dd4bf",
};

const weaponColors: Record<string, string> = {
  Fire: "#fb923c", Ice: "#38bdf8", Steel: "#94a3b8",
  Gum: "#f472b6", Hex: "#a78bfa", Glow: "#4ade80", Brawl: "#f87171"
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

  // Filters
  const [fltCategory, setFltCategory] = useState("All");
  const [fltHero, setFltHero] = useState("");
  const [fltWeapon, setFltWeapon] = useState("");
  const [fltInsert, setFltInsert] = useState("");
  const [fltPower, setFltPower] = useState("");
  const [fltSet, setFltSet] = useState("");

  // Giveaway counter quick-adjust
  const [givEdit, setGivEdit] = useState("");
  const [givSaving, setGivSaving] = useState(false);

  // Insurance tally (settings-backed) quick-adjust
  const [insuranceTotal, setInsuranceTotal] = useState(0);
  const [insEdit, setInsEdit] = useState("");
  const [insSaving, setInsSaving] = useState(false);

  // Add flow
  const [selectedSet, setSelectedSet] = useState(0);
  const [allCards, setAllCards] = useState<any[]>([]);
  const [cardSearch, setCardSearch] = useState("");
  const [activeCat, setActiveCat] = useState(CATEGORIES[0]);
  const [picked, setPicked] = useState<Record<string, { card: any; qty: number; category: string; pricePaid: string }>>({});
  const [giveawayCount, setGiveawayCount] = useState(0);
  const [giveawayPriceEach, setGiveawayPriceEach] = useState("");
  const [insuranceCount, setInsuranceCount] = useState(0);
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
    const { data: insSetting } = await supabase.from("settings").select("value").eq("key", "insurance_total").single();
    setInsuranceTotal(insSetting?.value ? (parseInt(String(insSetting.value)) || 0) : 0);
    const inv = await fetchAll(() => supabase.from("cardinventory").select("*").order("subset").order("created_at", { ascending: false }));
    setInventory(inv);
    setLoading(false);
  }

  async function deleteCard(item: any) {
    setDeletingId(item.id);
    await supabase.from("cardinventory").delete().eq("id", item.id);
    setDeletingId(null); setConfirmId(null);
    loadInventory();
  }

  async function saveEdit() {
    if (!editingCard) return;
    setSaving(true);
    const newQty = parseInt(editQty) || 0;
    await supabase.from("cardinventory").update({ quantity: newQty, price_paid: parseFloat(editPrice || "0") }).eq("id", editingCard.id);
    setSaving(false); setEditingCard(null);
    loadInventory();
  }

  // Set the Giveaway Card tally to an exact number (keeps giveawaytotal + Inventory id 1 in step)
  async function saveGiveawayTotal() {
    const next = Math.max(0, parseInt(givEdit));
    if (isNaN(next)) return;
    setGivSaving(true);
    const diff = next - giveawayTotal;
    await supabase.from("giveawaytotal").update({ total: next }).eq("id", 1);
    if (diff !== 0) {
      const { data: giv } = await supabase.from("Inventory").select("id,quantity").eq("id", 1).single();
      if (giv) await supabase.from("Inventory").update({ quantity: Math.max(0, giv.quantity + diff) }).eq("id", 1);
    }
    setGivSaving(false); setGivEdit("");
    loadInventory();
  }

  // Set the Insurance tally to an exact number (settings-backed)
  async function saveInsuranceTotal() {
    const next = Math.max(0, parseInt(insEdit));
    if (isNaN(next)) return;
    setInsSaving(true);
    await supabase.from("settings").upsert(
      { key: "insurance_total", value: String(next), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    setInsSaving(false); setInsEdit("");
    loadInventory();
  }

  const filteredCards = allCards.filter(c => {
    const q = cardSearch.toLowerCase().trim();
    const combined = [c["Card #"], c.Hero, c["Athlete Inspiration"], c.Treatment, c.Weapon, c.Power, c.Variation].join(" ").toLowerCase();
    return !q || q.split(" ").filter(Boolean).every((word: string) => combined.includes(word));
  }).slice(0, 50);

  function pickCard(card: any) {
    const key = `${card["Card #"]}-${card.Weapon}-${card.Treatment}-${activeCat}`;
    setPicked(prev => ({
      ...prev,
      [key]: prev[key] ? { ...prev[key], qty: prev[key].qty + 1 } : { card, qty: 1, category: activeCat, pricePaid: "" }
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
    if (Object.keys(picked).length === 0 && giveawayCount === 0 && insuranceCount === 0) return alert("Please add at least one card!");
    setAddSaving(true);
    if (giveawayCount > 0) {
      await supabase.from("giveawaytotal").update({ total: giveawayTotal + giveawayCount }).eq("id", 1);
      const { data: giv } = await supabase.from("Inventory").select("id,quantity").eq("id", 1).single();
      if (giv) await supabase.from("Inventory").update({ quantity: giv.quantity + giveawayCount }).eq("id", 1);
    }
    if (insuranceCount > 0) {
      await supabase.from("settings").upsert(
        { key: "insurance_total", value: String(insuranceTotal + insuranceCount), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    }
    const rows = Object.values(picked).map(({ card, qty, category, pricePaid }) => ({
      subset: category, card_number: card["Card #"], hero: card.Hero,
      athlete: card["Athlete Inspiration"], variation: card.Treatment,
      weapon: card.Weapon, power: card.Power, set_name: SETS[selectedSet].label,
      quantity: qty, price_paid: parseFloat(pricePaid || "0"),
    }));
    if (rows.length > 0) await supabase.from("cardinventory").insert(rows);
    await loadInventory();
    setAddSaving(false); setView("inventory");
    setPicked({}); setCardSearch(""); setGiveawayCount(0); setGiveawayPriceEach(""); setInsuranceCount(0);
  }

  // ── Carded inventory + filter options ──
  const carded = inventory.filter(i => i.quantity > 0 && CATEGORIES.includes(i.subset));
  const uniq = (arr: any[]) => [...new Set(arr.filter(v => v !== null && v !== undefined && String(v).trim() !== ""))].map(String).sort();
  const weaponOpts = uniq(carded.map(i => i.weapon));
  const insertOpts = uniq(carded.map(i => i.variation));
  const powerOpts = uniq(carded.map(i => i.power));
  const setOpts = uniq(carded.map(i => i.set_name));

  const filtered = carded.filter(i => {
    if (fltCategory !== "All" && fltCategory !== GIVEAWAY && i.subset !== fltCategory) return false;
    if (fltHero && !(i.hero || "").toLowerCase().includes(fltHero.toLowerCase().trim())) return false;
    if (fltWeapon && String(i.weapon) !== fltWeapon) return false;
    if (fltInsert && String(i.variation) !== fltInsert) return false;
    if (fltPower && String(i.power) !== fltPower) return false;
    if (fltSet && String(i.set_name) !== fltSet) return false;
    return true;
  });

  const filtersActive = !!(fltHero || fltWeapon || fltInsert || fltPower || fltSet);
  function clearFilters() { setFltHero(""); setFltWeapon(""); setFltInsert(""); setFltPower(""); setFltSet(""); }

  const catCount = (cat: string) => inventory.filter(i => i.subset === cat && i.quantity > 0).reduce((s, i) => s + i.quantity, 0);

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", width: "100%", boxSizing: "border-box" as const },
    content: { maxWidth: 1100, margin: "0 auto", padding: "24px 16px", width: "100%", boxSizing: "border-box" as const },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const },
    select: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 10px", fontSize: 13, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const, cursor: "pointer" },
    smallInput: { background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "#e5e5e5", outline: "none", width: 70 as const },
    submitBtn: { background: "linear-gradient(135deg,#7c3aed,#db2877)", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" },
  };

  const mobileStyles = `
    .ci-stats-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 10px; margin-bottom: 16px; width: 100%; }
    .ci-filter-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr; gap: 8px; }
    .ci-edit-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .ci-edit-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .ci-giveaway-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 768px) {
      .ci-stats-grid { grid-template-columns: repeat(3,1fr); gap: 6px; }
      .ci-stats-grid > div { padding: 10px 8px !important; }
      .ci-stats-grid .stat-number { font-size: 18px !important; }
      .ci-stats-grid .stat-label { font-size: 9px !important; }
      .ci-filter-grid { grid-template-columns: 1fr 1fr; }
      .ci-edit-grid { grid-template-columns: 1fr 1fr; }
      .ci-edit-fields { grid-template-columns: 1fr 1fr; }
      .ci-giveaway-grid { grid-template-columns: 1fr; }
    }
  `;

  // EDIT VIEW
  if (editingCard) return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>
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
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Category</div>
              <div style={{ fontSize: 14, color: catColors[editingCard.subset] || "#a78bfa" }}>{editingCard.subset}</div>
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
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Add cards manually</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Search the database and add cards to your inventory</p>
          </div>
          <button onClick={() => setView("inventory")} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>← Back</button>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>🎁 Giveaway Card (small inserts — no card details)</div>
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
          <div style={s.sectionTitle}>🛡️ Insurance (small inserts — no card details · ${INSURANCE_VALUE.toFixed(2)} each)</div>
          <div className="ci-giveaway-grid">
            <div>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Number of insurance cards</label>
              <input style={s.input} type="number" min={0} value={insuranceCount} onChange={e => setInsuranceCount(Number(e.target.value))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Valuation (fixed)</label>
              <div style={{ ...s.input, display: "flex", alignItems: "center", color: "#4ade80", fontWeight: 600 }}>
                ${(insuranceCount * INSURANCE_VALUE).toLocaleString()} <span style={{ color: "#555", fontWeight: 400, marginLeft: 6 }}>({insuranceCount} × ${INSURANCE_VALUE})</span>
              </div>
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
          <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>Category for these cards</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCat(cat)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${activeCat === cat ? catColors[cat] : "#222"}`, background: activeCat === cat ? catColors[cat] + "22" : "#0f0f0f", color: activeCat === cat ? catColors[cat] : "#555" }}>{cat}</button>
            ))}
          </div>
          <input style={{ ...s.input, marginBottom: 12 }} placeholder="🔍 Search by hero, athlete, card #..." value={cardSearch} onChange={e => setCardSearch(e.target.value)} />
          <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid #1e1e1e", borderRadius: 8 }}>
            {filteredCards.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#555", fontSize: 13 }}>Type to search cards</div>
            ) : filteredCards.map((card: any, i: number) => {
              const key = `${card["Card #"]}-${card.Weapon}-${card.Treatment}-${activeCat}`;
              const isPicked = !!picked[key];
              return (
                <div key={i} onClick={() => pickCard(card)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #161616", cursor: "pointer", background: isPicked ? "#a78bfa11" : "transparent" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                    <span style={{ color: "#555", fontSize: 11, fontFamily: "monospace", flexShrink: 0 }}>{card["Card #"]}</span>
                    <span style={{ color: "#e5e5e5", fontWeight: 600, fontSize: 13 }}>{card.Hero}</span>
                    <span style={{ color: "#a78bfa", fontSize: 12 }}>{card["Athlete Inspiration"]}</span>
                    {card.Weapon && <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 11, background: (weaponColors[card.Weapon] || "#333") + "22", color: weaponColors[card.Weapon] || "#aaa" }}>{card.Weapon}</span>}
                    {card.Treatment && <span style={{ fontSize: 11, color: "#c084fc" }}>{card.Treatment}</span>}
                    {card.Power && <span style={{ fontSize: 11, color: "#777" }}>⚡{card.Power}</span>}
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
            {Object.entries(picked).map(([key, { card, qty, category, pricePaid }]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #161616", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: (catColors[category] || "#a78bfa") + "22", color: catColors[category] || "#a78bfa" }}>{category}</span>
                  <span style={{ color: "#e5e5e5", fontSize: 13, fontWeight: 600 }}>{card.Hero}</span>
                  <span style={{ color: "#a78bfa", fontSize: 12 }}>{card["Athlete Inspiration"]}</span>
                  {card.Weapon && <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 11, background: (weaponColors[card.Weapon] || "#333") + "22", color: weaponColors[card.Weapon] || "#aaa" }}>{card.Weapon}</span>}
                  {card.Treatment && <span style={{ fontSize: 11, color: "#c084fc" }}>{card.Treatment}</span>}
                  {card.Power && <span style={{ fontSize: 11, color: "#777" }}>⚡{card.Power}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "#555" }}>$</span>
                    <input type="number" min={0} step="0.01" placeholder="0.00" value={pricePaid}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); updatePrice(key, e.target.value); }}
                      style={s.smallInput} />
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
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Card Inventory</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Filter by category and card attributes</p>
          </div>
          <button onClick={() => setView("add")} style={s.submitBtn}>+ Add cards</button>
        </div>

        {/* Category stat tiles */}
        <div className="ci-stats-grid">
          {CATEGORIES.map(cat => (
            <div key={cat} onClick={() => setFltCategory(fltCategory === cat ? "All" : cat)}
              style={{ background: fltCategory === cat ? catColors[cat] + "14" : "#111", border: `1px solid ${fltCategory === cat ? catColors[cat] + "66" : "#1e1e1e"}`, borderRadius: 10, padding: "16px 18px", cursor: "pointer" }}>
              <div className="stat-label" style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>{cat}</div>
              <div className="stat-number" style={{ fontSize: 26, fontWeight: 800, color: catColors[cat] }}>{loading ? "—" : catCount(cat)}</div>
            </div>
          ))}
          <div onClick={() => setFltCategory(fltCategory === GIVEAWAY ? "All" : GIVEAWAY)}
            style={{ background: fltCategory === GIVEAWAY ? catColors[GIVEAWAY] + "14" : "#111", border: `1px solid ${fltCategory === GIVEAWAY ? catColors[GIVEAWAY] + "66" : "#1e1e1e"}`, borderRadius: 10, padding: "16px 18px", cursor: "pointer" }}>
            <div className="stat-label" style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>{GIVEAWAY}</div>
            <div className="stat-number" style={{ fontSize: 26, fontWeight: 800, color: catColors[GIVEAWAY] }}>{loading ? "—" : giveawayTotal.toLocaleString()}</div>
          </div>
          <div onClick={() => setFltCategory(fltCategory === INSURANCE ? "All" : INSURANCE)}
            style={{ background: fltCategory === INSURANCE ? catColors[INSURANCE] + "14" : "#111", border: `1px solid ${fltCategory === INSURANCE ? catColors[INSURANCE] + "66" : "#1e1e1e"}`, borderRadius: 10, padding: "16px 18px", cursor: "pointer" }}>
            <div className="stat-label" style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>{INSURANCE}</div>
            <div className="stat-number" style={{ fontSize: 26, fontWeight: 800, color: catColors[INSURANCE] }}>{loading ? "—" : insuranceTotal.toLocaleString()}</div>
          </div>
        </div>

        {/* Category tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {["All", ...CATEGORIES, GIVEAWAY, INSURANCE].map(cat => {
            const active = fltCategory === cat;
            const color = cat === "All" ? "#e5e5e5" : catColors[cat];
            return (
              <button key={cat} onClick={() => setFltCategory(cat)} style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${active ? color : "#222"}`,
                background: active ? color + "22" : "#0f0f0f",
                color: active ? color : "#666",
              }}>{cat}</button>
            );
          })}
        </div>

        {loading ? (
          <p style={{ color: "#555" }}>Loading...</p>
        ) : fltCategory === GIVEAWAY ? (
          /* Giveaway Card — plain tally, no attributes */
          <div style={s.section}>
            <div style={s.sectionTitle}>Giveaway Card total</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: catColors[GIVEAWAY] }}>{giveawayTotal.toLocaleString()}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Set total to</label>
                  <input style={{ ...s.input, width: 140 }} type="number" min={0} placeholder={String(giveawayTotal)} value={givEdit} onChange={e => setGivEdit(e.target.value)} />
                </div>
                <button onClick={saveGiveawayTotal} disabled={givSaving || givEdit === ""} style={{ ...s.submitBtn, padding: "10px 18px", fontSize: 13, opacity: (givSaving || givEdit === "") ? 0.45 : 1 }}>
                  {givSaving ? "Saving…" : "Update"}
                </button>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#555", marginTop: 14, marginBottom: 0 }}>
              Small inserts, tracked as a single count with no hero/weapon/set. Adding cards through “+ Add cards” or lot comps increases this; breaks that give cards away decrease it.
            </p>
          </div>
        ) : fltCategory === INSURANCE ? (
          /* Insurance — plain tally, no attributes, fixed $3/card valuation */
          <div style={s.section}>
            <div style={s.sectionTitle}>Insurance total</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: catColors[INSURANCE] }}>{insuranceTotal.toLocaleString()}</div>
              <div>
                <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: ".4px" }}>Valuation</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#4ade80" }}>${(insuranceTotal * INSURANCE_VALUE).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "#555" }}>${INSURANCE_VALUE.toFixed(2)} / card</div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Set total to</label>
                  <input style={{ ...s.input, width: 140 }} type="number" min={0} placeholder={String(insuranceTotal)} value={insEdit} onChange={e => setInsEdit(e.target.value)} />
                </div>
                <button onClick={saveInsuranceTotal} disabled={insSaving || insEdit === ""} style={{ ...s.submitBtn, padding: "10px 18px", fontSize: 13, opacity: (insSaving || insEdit === "") ? 0.45 : 1 }}>
                  {insSaving ? "Saving…" : "Update"}
                </button>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#555", marginTop: 14, marginBottom: 0 }}>
              Tracked as a single count with no hero/weapon/set, valued at ${INSURANCE_VALUE.toFixed(2)} each. Add through “+ Add cards.”
            </p>
          </div>
        ) : (
          <>
            {/* Filter bar */}
            <div style={{ ...s.section, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={s.sectionTitle as any}>Filters</div>
                {filtersActive && <button onClick={clearFilters} style={{ fontSize: 12, background: "none", border: "1px solid #222", color: "#888", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>Clear</button>}
              </div>
              <div className="ci-filter-grid">
                <input style={s.input} placeholder="🔍 Hero name" value={fltHero} onChange={e => setFltHero(e.target.value)} />
                <select style={s.select} value={fltWeapon} onChange={e => setFltWeapon(e.target.value)}>
                  <option value="">All weapons</option>
                  {weaponOpts.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
                <select style={s.select} value={fltInsert} onChange={e => setFltInsert(e.target.value)}>
                  <option value="">All insert types</option>
                  {insertOpts.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select style={s.select} value={fltPower} onChange={e => setFltPower(e.target.value)}>
                  <option value="">All powers</option>
                  {powerOpts.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select style={s.select} value={fltSet} onChange={e => setFltSet(e.target.value)}>
                  <option value="">All sets</option>
                  {setOpts.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
            </div>

            {/* Result count */}
            <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
              {filtered.length} card{filtered.length === 1 ? "" : "s"}
              {" · "}{filtered.reduce((s2, i) => s2 + i.quantity, 0)} in stock
            </div>

            {/* Flat card list */}
            {filtered.length === 0 ? (
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 24, textAlign: "center" }}>
                <p style={{ color: "#555", fontSize: 13 }}>{carded.length === 0 ? "No cards in inventory yet" : "No cards match your filters"}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.map((item: any, i: number) => (
                  <div key={item.id ?? i} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "12px 14px", width: "100%", boxSizing: "border-box" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#e5e5e5" }}>{item.hero}</span>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: (catColors[item.subset] || "#a78bfa") + "22", color: catColors[item.subset] || "#a78bfa", fontWeight: 600 }}>{item.subset}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#a78bfa", marginTop: 2 }}>{item.athlete}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: catColors[item.subset] || "#a78bfa" }}>{item.quantity}</div>
                        <div style={{ fontSize: 10, color: "#555" }}>in stock</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>{item.card_number}</span>
                      {item.weapon && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: (weaponColors[item.weapon] || "#333") + "22", color: weaponColors[item.weapon] || "#aaa" }}>{item.weapon}</span>}
                      {item.variation && <span style={{ fontSize: 11, color: "#777" }}>{item.variation}</span>}
                      {(item.power !== null && item.power !== undefined && String(item.power).trim() !== "") && <span style={{ fontSize: 11, color: "#888" }}>⚡{item.power}</span>}
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
          </>
        )}
      </div>
    </div>
  );
}
