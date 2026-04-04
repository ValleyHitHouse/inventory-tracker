"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const LOW = 20;

function statusInfo(qty: number) {
  if (qty === 0) return { label: "Out of stock", color: "#f87171", bg: "#f8717122" };
  if (qty <= LOW) return { label: "Low stock", color: "#fb923c", bg: "#fb923c22" };
  return { label: "In stock", color: "#4ade80", bg: "#4ade8022" };
}

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editCost, setEditCost] = useState("");
  const [editReorder, setEditReorder] = useState("");
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    supabase.from("Inventory").select("*").order("id").then(({ data }) => {
      if (data) setItems(data);
    });
  }, []);

  async function handleUpdate(id: number, qty: number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
    setSaving(true); setSaved(false);
    await supabase.from("Inventory").update({ quantity: qty }).eq("id", id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function saveEdit() {
    if (!editingItem) return;
    setSavingEdit(true);
    await supabase.from("Inventory").update({
      name: editName,
      cost: editCost,
      reorder: editReorder,
    }).eq("id", editingItem.id);
    setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, name: editName, cost: editCost, reorder: editReorder } : i));
    setSavingEdit(false);
    setEditingItem(null);
  }

  const cards = items.filter(i => i.category === "Cards");
  const supplies = items.filter(i => i.category === "Supplies");
  const branding = items.filter(i => i.category === "Branding");

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" },
    content: { maxWidth: 1000, margin: "0 auto", padding: 32 },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden", marginBottom: 24 },
    th: { padding: "10px 14px", textAlign: "left" as const, color: "#444", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".4px", borderBottom: "1px solid #1e1e1e", background: "#0f0f0f" },
    td: { padding: "11px 14px", fontSize: 13, borderBottom: "1px solid #161616" },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none" },
    submitBtn: { background: "linear-gradient(135deg,#7c3aed,#db2877)", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" },
    qtyBtn: { width: 26, height: 26, border: "1px solid #333", background: "#1a1a1a", borderRadius: 4, cursor: "pointer", fontSize: 14, color: "#aaa" },
    qtyInput: { width: 56, textAlign: "center" as const, border: "1px solid #333", borderRadius: 4, padding: "3px 4px", fontSize: 13, background: "#0f0f0f", color: "#e5e5e5", outline: "none" },
  };

  // EDIT VIEW
  if (editingItem) return (
    <div style={s.shell}>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Edit item</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>{editingItem.category}</p>
          </div>
          <button onClick={() => setEditingItem(null)} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>← Cancel</button>
        </div>
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Item name</label>
              <input style={s.input} value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Cost per unit (e.g. $0.24)</label>
              <input style={s.input} placeholder="e.g. $0.24 or $1-3" value={editCost} onChange={e => setEditCost(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Reorder link or note</label>
              <input style={s.input} placeholder="e.g. https://amazon.com/... or email supplier" value={editReorder} onChange={e => setEditReorder(e.target.value)} />
              {editReorder?.startsWith("http") && (
                <a href={editReorder} target="_blank" style={{ fontSize: 12, color: "#38bdf8", marginTop: 6, display: "inline-block" }}>Test link ↗</a>
              )}
            </div>
          </div>
        </div>
        <button style={{ ...s.submitBtn, width: "100%" }} onClick={saveEdit} disabled={savingEdit}>
          {savingEdit ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );

  function SectionTable({ title, color, items }: { title: string; color: string; items: any[] }) {
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#e5e5e5" }}>{title}</h2>
          <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: color + "22", color }}>{items.length} items</span>
        </div>
        <div style={s.section}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr>
              <th style={s.th}>Item</th>
              <th style={s.th}>Quantity</th>
              <th style={s.th}>Cost</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Reorder</th>
              <th style={s.th}></th>
            </tr></thead>
            <tbody>
              {items.map(item => {
                const [localQty, setLocalQty] = useState(item.quantity);
                const st = statusInfo(localQty);
                function change(newQty: number) {
                  const q = Math.max(0, newQty);
                  setLocalQty(q);
                  handleUpdate(item.id, q);
                }
                const isLink = item.reorder?.startsWith("http") || item.reorder?.startsWith("amazon") || item.reorder?.startsWith("cardshellz");
                const reorderEl = isLink
                  ? <a href={item.reorder.startsWith("http") ? item.reorder : `https://${item.reorder}`} target="_blank" style={{ color: "#38bdf8", fontSize: 12, textDecoration: "none" }}>Order now ↗</a>
                  : <span style={{ color: "#555", fontSize: 12 }}>{item.reorder || "—"}</span>;

                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #161616" }}>
                    <td style={{ ...s.td, color: "#e5e5e5", fontWeight: 500 }}>{item.name}</td>
                    <td style={s.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => change(localQty - 1)} style={s.qtyBtn}>−</button>
                        <input value={localQty} onChange={e => change(Number(e.target.value))} style={s.qtyInput} type="number" min={0} />
                        <button onClick={() => change(localQty + 1)} style={s.qtyBtn}>+</button>
                      </div>
                    </td>
                    <td style={{ ...s.td, color: "#aaa" }}>{item.cost || "—"}</td>
                    <td style={s.td}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td style={s.td}>{reorderEl}</td>
                    <td style={s.td}>
                      <button
                        onClick={() => { setEditingItem(item); setEditName(item.name); setEditCost(item.cost || ""); setEditReorder(item.reorder || ""); }}
                        style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#aaa", borderRadius: 5, padding: "4px 10px", cursor: "pointer" }}>
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div style={s.shell}>
      <div style={s.content}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Inventory</h1>
            <p style={{ color: "#555", fontSize: 13 }}>Quantities save automatically · click Edit to update cost or reorder info</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {saving && <span style={{ fontSize: 13, color: "#555" }}>Saving...</span>}
            {saved && <span style={{ fontSize: 13, color: "#4ade80" }}>✓ Saved</span>}
          </div>
        </div>
        {items.length === 0 ? <p style={{ color: "#555" }}>Loading...</p> : <>
          <SectionTable title="Card inventory" color="#a78bfa" items={cards} />
          <SectionTable title="Supplies inventory" color="#4ade80" items={supplies} />
          <SectionTable title="Branding inventory" color="#fb923c" items={branding} />
        </>}
      </div>
    </div>
  );
}