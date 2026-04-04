"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const PRICE_KEYS = [
  { key: "jumbo_hobby_price", label: "Jumbo Hobby", desc: "Market price per box" },
  { key: "hobby_price", label: "Hobby", desc: "Market price per box" },
  { key: "double_mega_price", label: "Double Mega", desc: "Market price per box" },
  { key: "blaster_price", label: "Blaster", desc: "Market price per box" },
];

export default function SettingsPage() {
  const [prices, setPrices] = useState<Record<string, string>>({});
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
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    for (const { key } of PRICE_KEYS) {
      await supabase.from("settings").upsert({ key, value: prices[key] || "0", updated_at: new Date().toISOString() }, { onConflict: "key" });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" },
    content: { padding: 32, maxWidth: 700, margin: "0 auto" },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none" },
    label: { fontSize: 12, color: "#666", marginBottom: 5, display: "block" },
    submitBtn: { background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" },
  };

  return (
    <div style={s.shell}>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Settings</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Manage market prices and app settings</p>
          </div>
          <button onClick={save} disabled={saving} style={{ ...s.submitBtn, background: saved ? "#166534" : "linear-gradient(135deg,#7c3aed,#db2777)" }}>
            {saving ? "Saving..." : saved ? "✓ Saved!" : "Save settings"}
          </button>
        </div>

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
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={prices[key] || ""}
                      onChange={e => setPrices(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}