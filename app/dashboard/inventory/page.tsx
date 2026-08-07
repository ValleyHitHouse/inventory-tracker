"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Number of units that make up one pack for this item (100 team bags to a pack, etc.).
function perPack(item: any): number {
  const n = Number(item.units_per_pack);
  return n > 0 ? n : 1;
}

function packsLabel(units: number, per: number): string {
  const packs = units / (per > 0 ? per : 1);
  // show up to 1 decimal, but drop a trailing .0
  const r = Math.round(packs * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function statusInfo(units: number, per: number) {
  if (units <= 0) return { label: "Out of stock", color: "#f87171", bg: "#f8717122" };
  // Low = under one full pack for pack items; under 20 loose units otherwise.
  const lowThreshold = per > 1 ? per : 20;
  if (units <= lowThreshold) return { label: "Low stock", color: "#fb923c", bg: "#fb923c22" };
  return { label: "In stock", color: "#4ade80", bg: "#4ade8022" };
}

function InventoryCard({ item, onUpdate, onEdit }: {
  item: any;
  onUpdate: (id: number, qty: number) => void;
  onEdit: (item: any) => void;
}) {
  const per = perPack(item);
  const isPack = per > 1;
  const [units, setUnits] = useState<number>(Number(item.quantity) || 0);
  useEffect(() => { setUnits(Number(item.quantity) || 0); }, [item.quantity]);

  function save(newUnits: number) {
    const q = Math.max(0, Math.round(newUnits));
    setUnits(q);
    onUpdate(item.id, q);
  }

  const st = statusInfo(units, per);
  const isLink = item.reorder?.startsWith("http") || item.reorder?.startsWith("amazon") || item.reorder?.startsWith("cardshellz");
  const reorderHref = item.reorder?.startsWith("http") ? item.reorder : `https://${item.reorder}`;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px", borderBottom: "1px solid #161616", gap: 12,
    }}>
      {/* Left: name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5", marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.name}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color }}>
            {st.label}
          </span>
          {isPack ? (
            <span style={{ fontSize: 11, color: "#a78bfa" }}>
              {packsLabel(units, per)} packs · {units} units
            </span>
          ) : (
            <span style={{ fontSize: 11, color: "#555" }}>{units} units</span>
          )}
          {isPack && <span style={{ fontSize: 11, color: "#444" }}>pack of {per}</span>}
          {item.cost && <span style={{ fontSize: 11, color: "#555" }}>{item.cost}</span>}
          {isLink && (
            <a href={reorderHref} target="_blank" style={{ fontSize: 11, color: "#38bdf8", textDecoration: "none" }}>
              Reorder ↗
            </a>
          )}
          {item.reorder && !isLink && (
            <span style={{ fontSize: 11, color: "#555" }}>{item.reorder}</span>
          )}
        </div>
      </div>

      {/* Right: qty controls + edit */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => save(units - per)}
          title={isPack ? "Remove one pack" : "Remove one"}
          style={{ width: 30, height: 30, border: "1px solid #333", background: "#1a1a1a", borderRadius: 6, cursor: "pointer", fontSize: 16, color: "#aaa", display: "flex", alignItems: "center", justifyContent: "center" }}
        >−</button>
        <input
          value={units}
          onChange={e => save(Number(e.target.value))}
          type="number"
          min={0}
          title="Exact units on hand (set this for an audit)"
          style={{ width: 56, textAlign: "center", border: "1px solid #333", borderRadius: 6, padding: "4px 2px", fontSize: 13, background: "#0f0f0f", color: "#e5e5e5", outline: "none" }}
        />
        <button
          onClick={() => save(units + per)}
          title={isPack ? "Add one pack" : "Add one"}
          style={{ width: 30, height: 30, border: "1px solid #333", background: "#1a1a1a", borderRadius: 6, cursor: "pointer", fontSize: 16, color: "#aaa", display: "flex", alignItems: "center", justifyContent: "center" }}
        >+</button>
        <button
          onClick={() => onEdit(item)}
          style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#aaa", borderRadius: 6, padding: "5px 10px", cursor: "pointer", whiteSpace: "nowrap" }}
        >Edit</button>
      </div>
    </div>
  );
}

function SectionList({ title, color, items, onUpdate, onEdit, search }: {
  title: string; color: string; items: any[];
  onUpdate: (id: number, qty: number) => void;
  onEdit: (item: any) => void;
  search: string;
}) {
  const filtered = items.filter(i => !search || i.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#e5e5e5" }}>{title}</h2>
        <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: color + "22", color }}>
          {filtered.length} items
        </span>
      </div>
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden" }}>
        <div className="inv-header" style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "8px 16px", borderBottom: "1px solid #1e1e1e", background: "#0f0f0f" }}>
          <span style={{ fontSize: 11, color: "#444", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".4px" }}>Item</span>
          <span style={{ fontSize: 11, color: "#444", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".4px" }}>On hand</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: "16px", fontSize: 13, color: "#555" }}>No items match</div>
        ) : (
          filtered.map(item => (
            <InventoryCard key={item.id} item={item} onUpdate={onUpdate} onEdit={onEdit} />
          ))
        )}
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editCost, setEditCost] = useState("");
  const [editReorder, setEditReorder] = useState("");
  const [editName, setEditName] = useState("");
  const [editPerPack, setEditPerPack] = useState("1");
  const [editUnits, setEditUnits] = useState("0");
  const [savingEdit, setSavingEdit] = useState(false);
  const [search, setSearch] = useState("");

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
    const perPackNum = Math.max(1, Math.round(Number(editPerPack) || 1));
    const unitsNum = Math.max(0, Math.round(Number(editUnits) || 0));
    await supabase.from("Inventory").update({
      name: editName, cost: editCost, reorder: editReorder,
      units_per_pack: perPackNum, quantity: unitsNum,
    }).eq("id", editingItem.id);
    setItems(prev => prev.map(i => i.id === editingItem.id
      ? { ...i, name: editName, cost: editCost, reorder: editReorder, units_per_pack: perPackNum, quantity: unitsNum }
      : i));
    setSavingEdit(false);
    setEditingItem(null);
  }

  function handleEdit(item: any) {
    setEditingItem(item);
    setEditName(item.name);
    setEditCost(item.cost || "");
    setEditReorder(item.reorder || "");
    setEditPerPack(String(Number(item.units_per_pack) > 0 ? Number(item.units_per_pack) : 1));
    setEditUnits(String(Number(item.quantity) || 0));
  }

  const cards = items.filter(i => i.category === "Cards");
  const supplies = items.filter(i => i.category === "Supplies");
  const branding = items.filter(i => i.category === "Branding");

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6,
    padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none", boxSizing: "border-box",
  };

  if (editingItem) {
    const per = Math.max(1, Math.round(Number(editPerPack) || 1));
    const unitsNum = Math.max(0, Math.round(Number(editUnits) || 0));
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Edit item</h1>
              <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>{editingItem.category}</p>
            </div>
            <button onClick={() => setEditingItem(null)} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>
              ← Cancel
            </button>
          </div>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Item name</label>
                <input style={inputStyle} value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Units per pack</label>
                  <input style={inputStyle} type="number" min={1} step={1} placeholder="e.g. 100" value={editPerPack} onChange={e => setEditPerPack(e.target.value)} />
                  <p style={{ fontSize: 11, color: "#444", marginTop: 5 }}>Set to 1 for items you count individually (like boxes).</p>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>On hand (exact units) — audit</label>
                  <input style={inputStyle} type="number" min={0} step={1} value={editUnits} onChange={e => setEditUnits(e.target.value)} />
                  <p style={{ fontSize: 11, color: "#a78bfa", marginTop: 5 }}>{per > 1 ? `${packsLabel(unitsNum, per)} packs` : `${unitsNum} units`}</p>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Cost per pack (or per unit)</label>
                <input style={inputStyle} placeholder="e.g. $24 / pack or $0.24" value={editCost} onChange={e => setEditCost(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Reorder link or note</label>
                <input style={inputStyle} placeholder="e.g. https://amazon.com/..." value={editReorder} onChange={e => setEditReorder(e.target.value)} />
                {editReorder?.startsWith("http") && (
                  <a href={editReorder} target="_blank" style={{ fontSize: 12, color: "#38bdf8", marginTop: 6, display: "inline-block" }}>Test link ↗</a>
                )}
              </div>
            </div>
          </div>
          <button
            style={{ background: "linear-gradient(135deg,#7c3aed,#db2877)", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", width: "100%" }}
            onClick={saveEdit}
            disabled={savingEdit}
          >
            {savingEdit ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" }}>
      <style>{`
        @media (max-width: 768px) { .inv-header { display: none !important; } }
      `}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Inventory</h1>
            <p style={{ color: "#555", fontSize: 13 }}>Tracked by the pack · − / + adds or removes a whole pack · type an exact count to audit</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {saving && <span style={{ fontSize: 13, color: "#555" }}>Saving...</span>}
            {saved && <span style={{ fontSize: 13, color: "#4ade80" }}>✓ Saved</span>}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <input style={inputStyle} placeholder="🔍 Search items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {items.length === 0 ? <p style={{ color: "#555" }}>Loading...</p> : <>
          <SectionList title="Card inventory" color="#a78bfa" items={cards} onUpdate={handleUpdate} onEdit={handleEdit} search={search} />
          <SectionList title="Supplies inventory" color="#4ade80" items={supplies} onUpdate={handleUpdate} onEdit={handleEdit} search={search} />
          <SectionList title="Branding inventory" color="#fb923c" items={branding} onUpdate={handleUpdate} onEdit={handleEdit} search={search} />
        </>}
      </div>
    </div>
  );
}
