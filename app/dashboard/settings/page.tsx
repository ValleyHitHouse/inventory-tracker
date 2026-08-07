"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const PRICE_KEYS = [
  { key: "jumbo_hobby_price", label: "Jumbo Hobby", desc: "Market price per box" },
  { key: "hobby_price", label: "Hobby", desc: "Market price per box" },
  { key: "double_mega_price", label: "Double Mega", desc: "Market price per box" },
  { key: "blaster_price", label: "Blaster", desc: "Market price per box" },
];

interface ExtraBoxType {
  id: string;
  label: string;
  price: string;
}

// Editor rows keep values as strings so inputs behave; converted to numbers on save.
type TierRow = { minPct: string; rate: string };
type CommBreaker = { id: number; name: string };

const DEFAULT_TIER_ROWS: TierRow[] = [
  { minPct: "0", rate: "30" },
  { minPct: "120", rate: "35" },
  { minPct: "140", rate: "40" },
  { minPct: "160", rate: "50" },
  { minPct: "180", rate: "60" },
];

export default function SettingsPage() {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [extraBoxes, setExtraBoxes] = useState<ExtraBoxType[]>([]);
  const [newBoxLabel, setNewBoxLabel] = useState("");
  const [newBoxPrice, setNewBoxPrice] = useState("");
  const [showAddBox, setShowAddBox] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Per-breaker commission structures
  const [commBreakers, setCommBreakers] = useState<CommBreaker[]>([]);
  const [selectedBreaker, setSelectedBreaker] = useState("");
  const [tierEdits, setTierEdits] = useState<Record<string, TierRow[]>>({});
  const [savingComm, setSavingComm] = useState(false);
  const [savedComm, setSavedComm] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("settings").select("key, value");
      if (data) {
        const map: Record<string, string> = {};
        for (const row of data) map[row.key] = row.value || "0";
        setPrices(map);
        if (map.extra_box_types) {
          try { setExtraBoxes(JSON.parse(map.extra_box_types)); } catch {}
        }
      }
      const { data: emps } = await supabase
        .from("employees")
        .select("id, name, commission_tiers")
        .eq("commission_based", true)
        .eq("active", true)
        .order("name");
      if (emps) {
        setCommBreakers(emps.map((e: any) => ({ id: e.id, name: e.name })));
        const edits: Record<string, TierRow[]> = {};
        for (const e of emps as any[]) {
          const tiers = Array.isArray(e.commission_tiers) && e.commission_tiers.length > 0
            ? e.commission_tiers.map((t: any) => ({ minPct: String(t.minPct ?? 0), rate: String(t.rate ?? 0) }))
            : DEFAULT_TIER_ROWS.map(t => ({ ...t }));
          edits[e.name] = tiers;
        }
        setTierEdits(edits);
        if (emps.length > 0) setSelectedBreaker(emps[0].name);
      }
      setLoading(false);
    }
    load();
  }, []);

  function updateTier(name: string, idx: number, field: keyof TierRow, value: string) {
    setTierEdits(prev => ({
      ...prev,
      [name]: (prev[name] || []).map((t, i) => i === idx ? { ...t, [field]: value } : t),
    }));
  }

  function addTier(name: string) {
    setTierEdits(prev => ({ ...prev, [name]: [...(prev[name] || []), { minPct: "", rate: "" }] }));
  }

  function removeTier(name: string, idx: number) {
    setTierEdits(prev => ({ ...prev, [name]: (prev[name] || []).filter((_, i) => i !== idx) }));
  }

  function resetTiers(name: string) {
    setTierEdits(prev => ({ ...prev, [name]: DEFAULT_TIER_ROWS.map(t => ({ ...t })) }));
  }

  async function saveCommission() {
    setSavingComm(true);
    for (const b of commBreakers) {
      const tiers = (tierEdits[b.name] || [])
        .filter(t => t.rate !== "" || t.minPct !== "")
        .map(t => ({ minPct: parseFloat(t.minPct) || 0, rate: parseFloat(t.rate) || 0 }))
        .sort((a, b) => a.minPct - b.minPct);
      await supabase.from("employees").update({ commission_tiers: tiers }).eq("id", b.id);
    }
    setSavingComm(false); setSavedComm(true);
    setTimeout(() => setSavedComm(false), 2000);
  }

  function addExtraBox() {
    if (!newBoxLabel.trim()) return;
    const newBox: ExtraBoxType = {
      id: `extra_${Date.now()}`,
      label: newBoxLabel.trim(),
      price: newBoxPrice || "0",
    };
    setExtraBoxes(prev => [...prev, newBox]);
    setNewBoxLabel(""); setNewBoxPrice(""); setShowAddBox(false);
  }

  function removeExtraBox(id: string) {
    setExtraBoxes(prev => prev.filter(b => b.id !== id));
  }

  function updateExtraBoxPrice(id: string, price: string) {
    setExtraBoxes(prev => prev.map(b => b.id === id ? { ...b, price } : b));
  }

  function updateExtraBoxLabel(id: string, label: string) {
    setExtraBoxes(prev => prev.map(b => b.id === id ? { ...b, label } : b));
  }

  async function save() {
    setSaving(true);
    for (const { key } of PRICE_KEYS) {
      await supabase.from("settings").upsert(
        { key, value: prices[key] || "0", updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    }
    await supabase.from("settings").upsert(
      { key: "extra_box_types", value: JSON.stringify(extraBoxes), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    const deductionRaw = prices["breaker_supply_deduction_pct"];
    await supabase.from("settings").upsert(
      { key: "breaker_supply_deduction_pct", value: (deductionRaw === undefined || deductionRaw === "") ? "25" : deductionRaw, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    const whatnotRaw = prices["whatnot_fee_pct"];
    await supabase.from("settings").upsert(
      { key: "whatnot_fee_pct", value: (whatnotRaw === undefined || whatnotRaw === "") ? "11.2" : whatnotRaw, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" },
    content: { padding: "24px 16px", maxWidth: 700, margin: "0 auto" },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const },
    label: { fontSize: 12, color: "#666", marginBottom: 5, display: "block" },
    submitBtn: { background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" },
  };

  const mobileStyles = `
    .set-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .set-tier-grid { display: grid; grid-template-columns: 1fr 1fr 40px; gap: 8px; align-items: center; }
    @media (max-width: 640px) {
      .set-grid-2 { grid-template-columns: 1fr; }
      .set-content { padding: 20px 12px !important; }
    }
  `;

  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div className="set-content" style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Settings</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Manage market prices and app settings</p>
          </div>
          <button onClick={save} disabled={saving} style={{ ...s.submitBtn, background: saved ? "#166534" : "linear-gradient(135deg,#7c3aed,#db2777)" }}>
            {saving ? "Saving..." : saved ? "✓ Saved!" : "Save settings"}
          </button>
        </div>

        {/* Default box prices */}
        <div style={s.section}>
          <div style={s.sectionTitle}>📦 Box market prices</div>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>Set the current market price per box — used to calculate % to market on breaks</p>
          {loading ? <p style={{ color: "#555" }}>Loading...</p> : (
            <div className="set-grid-2">
              {PRICE_KEYS.map(({ key, label, desc }) => (
                <div key={key}>
                  <label style={s.label}>{label} <span style={{ color: "#444" }}>({desc})</span></label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#555", fontSize: 13 }}>$</span>
                    <input
                      style={s.input}
                      type="number" min={0} step="0.01" placeholder="0.00"
                      value={prices[key] || ""}
                      onChange={e => setPrices(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Whatnot fee */}
        <div style={s.section}>
          <div style={s.sectionTitle}>🎥 Whatnot fee</div>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
            The Whatnot platform fee taken off gross sales, used to calculate net revenue on every break. Default is 11.2%.
          </p>
          {loading ? <p style={{ color: "#555" }}>Loading...</p> : (
            <div style={{ maxWidth: 260 }}>
              <label style={s.label}>Whatnot fee <span style={{ color: "#444" }}>(% of gross sales)</span></label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  style={s.input}
                  type="number" min={0} max={100} step="0.1" placeholder="11.2"
                  value={prices["whatnot_fee_pct"] ?? ""}
                  onChange={e => setPrices(prev => ({ ...prev, whatnot_fee_pct: e.target.value }))}
                />
                <span style={{ color: "#555", fontSize: 13 }}>%</span>
              </div>
              <p style={{ fontSize: 11, color: "#444", marginTop: 8 }}>Applies to new breaks you calculate. Existing saved breaks keep the numbers they were saved with.</p>
            </div>
          )}
        </div>

        {/* Breaker commission */}
        <div style={s.section}>
          <div style={s.sectionTitle}>💼 Breaker commission</div>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
            When a commission breaker runs a break, this percentage of the break&apos;s total supply cost is deducted from their commission. Set to 0 to turn the deduction off.
          </p>
          {loading ? <p style={{ color: "#555" }}>Loading...</p> : (
            <div style={{ maxWidth: 260 }}>
              <label style={s.label}>Shipping-supply deduction <span style={{ color: "#444" }}>(% of total supply cost)</span></label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  style={s.input}
                  type="number" min={0} max={100} step="1" placeholder="25"
                  value={prices["breaker_supply_deduction_pct"] ?? ""}
                  onChange={e => setPrices(prev => ({ ...prev, breaker_supply_deduction_pct: e.target.value }))}
                />
                <span style={{ color: "#555", fontSize: 13 }}>%</span>
              </div>
              <p style={{ fontSize: 11, color: "#444", marginTop: 8 }}>Applies only to breakers marked commission-based. Existing saved breaks are not changed.</p>
            </div>
          )}
        </div>

        {/* Commission structures per breaker */}
        <div style={s.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <div style={{ ...s.sectionTitle, marginBottom: 0 }}>📊 Commission structures</div>
            <button onClick={saveCommission} disabled={savingComm || commBreakers.length === 0}
              style={{ background: savedComm ? "#166534" : "#a78bfa22", border: "1px solid #a78bfa44", color: savedComm ? "#4ade80" : "#a78bfa", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {savingComm ? "Saving..." : savedComm ? "✓ Saved!" : "Save commission structures"}
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
            Set each breaker&apos;s commission tiers. The rate is the % of Valley&apos;s take they earn, based on the break&apos;s % to market — the highest tier whose threshold is met applies.
          </p>

          {loading ? <p style={{ color: "#555" }}>Loading...</p> : commBreakers.length === 0 ? (
            <p style={{ fontSize: 13, color: "#444" }}>
              No commission-based breakers yet. Mark an employee as commission-based on the Employees page first.
            </p>
          ) : (
            <>
              <label style={s.label}>Breaker</label>
              <select
                style={{ ...s.input, marginBottom: 16, cursor: "pointer" }}
                value={selectedBreaker}
                onChange={e => setSelectedBreaker(e.target.value)}
              >
                {commBreakers.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>

              {selectedBreaker && (
                <div>
                  <div className="set-tier-grid" style={{ marginBottom: 6, fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: ".4px" }}>
                    <div>% to market (from)</div>
                    <div>Commission %</div>
                    <div></div>
                  </div>
                  {(tierEdits[selectedBreaker] || []).map((t, idx) => (
                    <div key={idx} className="set-tier-grid" style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#555", fontSize: 12 }}>≥</span>
                        <input style={s.input} type="number" min={0} step="1" placeholder="0"
                          value={t.minPct}
                          onChange={e => updateTier(selectedBreaker, idx, "minPct", e.target.value)} />
                        <span style={{ color: "#555", fontSize: 12 }}>%</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input style={s.input} type="number" min={0} max={100} step="1" placeholder="0"
                          value={t.rate}
                          onChange={e => updateTier(selectedBreaker, idx, "rate", e.target.value)} />
                        <span style={{ color: "#555", fontSize: 12 }}>%</span>
                      </div>
                      <button onClick={() => removeTier(selectedBreaker, idx)}
                        style={{ background: "#7f1d1d22", border: "1px solid #7f1d1d", color: "#f87171", borderRadius: 6, padding: "6px 0", cursor: "pointer", fontSize: 14 }}>×</button>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button onClick={() => addTier(selectedBreaker)}
                      style={{ background: "none", border: "1px dashed #333", color: "#777", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>+ Add tier</button>
                    <button onClick={() => resetTiers(selectedBreaker)}
                      style={{ background: "none", border: "1px solid #333", color: "#555", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>Reset to default</button>
                  </div>
                  <p style={{ fontSize: 11, color: "#444", marginTop: 12 }}>
                    Example: a tier of ≥140% at 40% means any break from 140% to market up to the next tier pays 40% of Valley&apos;s take. Remember to hit &quot;Save commission structures&quot; above. Existing saved breaks are not recalculated.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Extra box types */}
        <div style={s.section}>
          <div style={s.sectionTitle}>➕ Extra box types</div>
          <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
            Add extra box types here — they'll appear automatically in the break form alongside the default boxes
          </p>

          {extraBoxes.length === 0 && !showAddBox && (
            <p style={{ fontSize: 13, color: "#444", marginBottom: 12 }}>No extra box types yet</p>
          )}

          {extraBoxes.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {extraBoxes.map(box => (
                <div key={box.id} style={{ background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <input
                      style={{ ...s.input, fontSize: 14, fontWeight: 600, color: "#e5e5e5", background: "transparent", border: "1px solid #2a2a2a", padding: "6px 10px" }}
                      value={box.label}
                      onChange={e => updateExtraBoxLabel(box.id, e.target.value)}
                      placeholder="Box name"
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "#555" }}>Market $</span>
                    <input
                      type="number" min={0} step="0.01"
                      style={{ ...s.input, width: 90 }}
                      value={box.price}
                      onChange={e => updateExtraBoxPrice(box.id, e.target.value)}
                      placeholder="0.00"
                    />
                    <span style={{ fontSize: 11, color: "#555" }}>per box</span>
                  </div>
                  <button
                    onClick={() => removeExtraBox(box.id)}
                    style={{ fontSize: 12, background: "#7f1d1d22", border: "1px solid #7f1d1d", color: "#f87171", borderRadius: 6, padding: "5px 10px", cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAddBox ? (
            <div style={{ background: "#0f0f0f", border: "1px solid #a78bfa44", borderRadius: 8, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".4px" }}>New box type</div>
              <div className="set-grid-2" style={{ marginBottom: 12 }}>
                <div>
                  <label style={s.label}>Box type name</label>
                  <input
                    style={s.input}
                    placeholder="e.g. Mega Box, Hanger, Retail..."
                    value={newBoxLabel}
                    onChange={e => setNewBoxLabel(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addExtraBox()}
                    autoFocus
                  />
                </div>
                <div>
                  <label style={s.label}>Market value per box ($)</label>
                  <input
                    style={s.input}
                    type="number" min={0} step="0.01"
                    placeholder="e.g. 89.99"
                    value={newBoxPrice}
                    onChange={e => setNewBoxPrice(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addExtraBox()}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={addExtraBox}
                  style={{ background: "#a78bfa22", border: "1px solid #a78bfa", color: "#a78bfa", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  + Add box type
                </button>
                <button
                  onClick={() => { setShowAddBox(false); setNewBoxLabel(""); setNewBoxPrice(""); }}
                  style={{ background: "none", border: "1px solid #333", color: "#555", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddBox(true)}
              style={{ width: "100%", background: "none", border: "1px dashed #333", color: "#555", borderRadius: 8, padding: "10px 16px", fontSize: 13, cursor: "pointer" }}
            >
              + Add new box type
            </button>
          )}

          {extraBoxes.length > 0 && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#0d1a0d", border: "1px solid #4ade8033", borderRadius: 8, fontSize: 12, color: "#4ade80" }}>
              ✓ {extraBoxes.length} extra box type{extraBoxes.length > 1 ? "s" : ""} will appear in the break form — remember to hit Save Settings
            </div>
          )}
        </div>
      </div>
    </div>
  );
}