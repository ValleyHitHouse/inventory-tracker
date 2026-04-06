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

export default function SettingsPage() {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [extraBoxes, setExtraBoxes] = useState<ExtraBoxType[]>([]);
  const [newBoxLabel, setNewBoxLabel] = useState("");
  const [newBoxPrice, setNewBoxPrice] = useState("");
  const [showAddBox, setShowAddBox] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    }
    load();
  }, []);

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

  return (
    <div style={s.shell}>
      <div style={s.content}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
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