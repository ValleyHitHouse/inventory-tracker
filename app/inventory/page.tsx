"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const LOW = 20;

function statusInfo(qty: number) {
  if (qty === 0) return { label: "Out of stock", color: "#c62828", bg: "#fdecea" };
  if (qty <= LOW) return { label: "Low stock", color: "#f57f17", bg: "#fff8e1" };
  return { label: "In stock", color: "#2e7d32", bg: "#e6f4ea" };
}

const btnStyle = { width: 24, height: 24, border: "1px solid #ddd", background: "#f5f5f5", borderRadius: 4, cursor: "pointer", fontSize: 14 };
const inputStyle = { width: 52, textAlign: "center" as const, border: "1px solid #ddd", borderRadius: 4, padding: "2px 4px", fontSize: 13 };
const thStyle = { padding: "10px 12px", background: "#f5f5f5", borderBottom: "2px solid #e0e0e0", fontSize: 12, textAlign: "left" as const, color: "#666" };

function Row({ item, onUpdate }: { item: any; onUpdate: (id: number, qty: number) => void }) {
  const [qty, setQty] = useState(item.quantity);
  const s = statusInfo(qty);

  function change(newQty: number) {
    const q = Math.max(0, newQty);
    setQty(q);
    onUpdate(item.id, q);
  }

  const isLink = item.reorder?.startsWith("http") || item.reorder?.startsWith("amazon") || item.reorder?.startsWith("cardshellz");
  const reorderEl = isLink
    ? <a href={item.reorder.startsWith("http") ? item.reorder : `https://${item.reorder}`} target="_blank" style={{ color: "#1a73e8", fontSize: 12, textDecoration: "none" }}>Order now</a>
    : <span style={{ color: "#888", fontSize: 12, fontStyle: "italic" }}>{item.reorder}</span>;

  return (
    <tr style={{ borderBottom: "1px solid #eee" }}>
      <td style={{ padding: "10px 12px" }}>{item.name}</td>
      <td style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => change(qty - 1)} style={btnStyle}>−</button>
          <input value={qty} onChange={e => change(Number(e.target.value))} style={inputStyle} type="number" />
          <button onClick={() => change(qty + 1)} style={btnStyle}>+</button>
        </div>
      </td>
      <td style={{ padding: "10px 12px", color: "#888" }}>{item.cost}</td>
      <td style={{ padding: "10px 12px" }}>
        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: s.bg, color: s.color }}>{s.label}</span>
      </td>
      <td style={{ padding: "10px 12px" }}>{reorderEl}</td>
    </tr>
  );
}

function Section({ title, color, items, onUpdate }: { title: string; color: string; items: any[]; onUpdate: (id: number, qty: number) => void }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h2>
        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: color, color: "#333" }}>{items.length} items</span>
      </div>
      <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead><tr>
            <th style={{ ...thStyle, width: "26%" }}>Item</th>
            <th style={{ ...thStyle, width: "20%" }}>Quantity</th>
            <th style={{ ...thStyle, width: "14%" }}>Cost</th>
            <th style={{ ...thStyle, width: "14%" }}>Status</th>
            <th style={{ ...thStyle, width: "26%" }}>Reorder</th>
          </tr></thead>
          <tbody>{items.map(item => <Row key={item.id} item={item} onUpdate={onUpdate} />)}</tbody>
        </table>
      </div>
    </div>
  );
}

export default function Home() {
  const [items, setItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("Inventory").select("*").order("id").then(({ data }) => {
      if (data) setItems(data);
    });
  }, []);

  async function handleUpdate(id: number, qty: number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
    setSaving(true);
    setSaved(false);
    await supabase.from("Inventory").update({ quantity: qty }).eq("id", id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const cards = items.filter(i => i.category === "Cards");
  const supplies = items.filter(i => i.category === "Supplies");
  const branding = items.filter(i => i.category === "Branding");

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 960, margin: "40px auto", padding: "0 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>ValleyHitHouse inventory</h1>
          <p style={{ color: "#888", fontSize: 13 }}>Changes save automatically</p>
        </div>
        {saving && <span style={{ fontSize: 13, color: "#888" }}>Saving...</span>}
        {saved && <span style={{ fontSize: 13, color: "#2e7d32" }}>Saved!</span>}
      </div>
      {items.length === 0 ? <p style={{ color: "#888" }}>Loading...</p> : <>
        <Section title="Card inventory" color="#e3f2fd" items={cards} onUpdate={handleUpdate} />
        <Section title="Supplies inventory" color="#e8f5e9" items={supplies} onUpdate={handleUpdate} />
        <Section title="Branding inventory" color="#f3e5f5" items={branding} onUpdate={handleUpdate} />
      </>}
    </main>
  );
}