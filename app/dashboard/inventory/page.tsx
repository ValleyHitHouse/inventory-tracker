"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const CAT_META: Record<string, { color: string; label: string; icon: string }> = {
  Supplies: { color: "#4ade80", label: "Supplies", icon: "📦" },
  Cards: { color: "#a78bfa", label: "Cards", icon: "🃏" },
  Branding: { color: "#fb923c", label: "Branding", icon: "🏷️" },
};
const CAT_ORDER = ["Supplies", "Cards", "Branding"];

function perPack(item: any): number {
  const n = Number(item.units_per_pack);
  return n > 0 ? n : 1;
}
function packsLabel(units: number, per: number): string {
  const p = units / (per > 0 ? per : 1);
  const r = Math.round(p * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
function statusInfo(units: number, per: number) {
  if (units <= 0) return { key: "out", label: "Out of stock", color: "#f87171" };
  const low = per > 1 ? per : 20; // under one pack (or 20 loose) = low
  if (units <= low) return { key: "low", label: "Low stock", color: "#fb923c" };
  return { key: "in", label: "In stock", color: "#4ade80" };
}

const stepBtn: React.CSSProperties = {
  width: 32, height: 32, border: "1px solid #2a2a2a", background: "#0f0f0f",
  borderRadius: 8, cursor: "pointer", fontSize: 18, color: "#aaa",
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
const qtyInput: React.CSSProperties = {
  width: 52, textAlign: "center", border: "1px solid #2a2a2a", borderRadius: 8,
  padding: "6px 2px", fontSize: 13, background: "#0f0f0f", color: "#e5e5e5", outline: "none",
};
const modalInput: React.CSSProperties = {
  width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 8,
  padding: "10px 12px", fontSize: 13, color: "#e5e5e5", outline: "none", boxSizing: "border-box",
};
const modalLabel: React.CSSProperties = { fontSize: 12, color: "#888", marginBottom: 6, display: "block" };

function ItemTile({ item, onQty, onEdit }: {
  item: any;
  onQty: (id: number, qty: number) => void;
  onEdit: (item: any) => void;
}) {
  const per = perPack(item);
  const isPack = per > 1;
  const [units, setUnits] = useState<number>(Number(item.quantity) || 0);
  useEffect(() => { setUnits(Number(item.quantity) || 0); }, [item.quantity]);
  const [hover, setHover] = useState(false);

  function save(u: number) {
    const q = Math.max(0, Math.round(u));
    setUnits(q);
    onQty(item.id, q);
  }

  const st = statusInfo(units, per);
  const isLink = item.reorder?.startsWith("http") || item.reorder?.startsWith("amazon") || item.reorder?.startsWith("cardshellz");
  const reorderHref = item.reorder?.startsWith("http") ? item.reorder : `https://${item.reorder}`;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "#111", border: "1px solid #1e1e1e", borderRadius: 14,
        padding: "16px 16px 14px", display: "flex", flexDirection: "column", gap: 12,
        position: "relative", overflow: "hidden",
        transform: hover ? "translateY(-2px)" : "none",
        boxShadow: hover ? "0 10px 30px rgba(0,0,0,0.5)" : "none",
        transition: "transform .15s ease, box-shadow .15s ease",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: st.color, opacity: 0.85 }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e5e5e5", lineHeight: 1.3, minWidth: 0 }}>{item.name}</div>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: st.color + "1f", color: st.color, whiteSpace: "nowrap", flexShrink: 0 }}>
          {st.label}
        </span>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: "#fff", lineHeight: 1, letterSpacing: "-0.5px" }}>
            {isPack ? packsLabel(units, per) : units}
          </span>
          <span style={{ fontSize: 13, color: "#666", fontWeight: 600 }}>{isPack ? "packs" : "units"}</span>
        </div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 5 }}>
          {isPack ? `${units} units · pack of ${per}` : "counted individually"}
          {item.cost ? ` · ${item.cost}` : ""}
        </div>
        {isLink && (
          <a href={reorderHref} target="_blank" style={{ fontSize: 11, color: "#38bdf8", textDecoration: "none", marginTop: 4, display: "inline-block" }}>Reorder ↗</a>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
        <button onClick={() => save(units - per)} title={isPack ? "Remove one pack" : "Remove one"} style={stepBtn}>−</button>
        <input value={units} onChange={e => save(Number(e.target.value))} type="number" min={0} title="Type the exact count on hand to audit" style={qtyInput} />
        <button onClick={() => save(units + per)} title={isPack ? "Add one pack" : "Add one"} style={stepBtn}>+</button>
        <button onClick={() => onEdit(item)} style={{ marginLeft: "auto", fontSize: 12, background: "none", border: "1px solid #2a2a2a", color: "#888", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>Edit</button>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // unified add/edit modal
  const [modal, setModal] = useState<null | "add" | "edit">(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [fName, setFName] = useState("");
  const [fCategory, setFCategory] = useState("Supplies");
  const [fPerPack, setFPerPack] = useState("1");
  const [fUnits, setFUnits] = useState("0");
  const [fCost, setFCost] = useState("");
  const [fReorder, setFReorder] = useState("");
  const [modalSaving, setModalSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.from("Inventory").select("*").order("id").then(({ data }) => {
      if (data) setItems(data);
      setLoading(false);
    });
  }, []);

  async function handleQty(id: number, qty: number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
    setSaving(true); setSaved(false);
    await supabase.from("Inventory").update({ quantity: qty }).eq("id", id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function openAdd() {
    setModal("add"); setEditId(null); setConfirmDelete(false);
    setFName(""); setFCategory(catFilter !== "All" ? catFilter : "Supplies");
    setFPerPack("1"); setFUnits("0"); setFCost(""); setFReorder("");
  }
  function openEdit(item: any) {
    setModal("edit"); setEditId(item.id); setConfirmDelete(false);
    setFName(item.name || "");
    setFCategory(item.category || "Supplies");
    setFPerPack(String(Number(item.units_per_pack) > 0 ? Number(item.units_per_pack) : 1));
    setFUnits(String(Number(item.quantity) || 0));
    setFCost(item.cost || "");
    setFReorder(item.reorder || "");
  }
  function closeModal() { setModal(null); setEditId(null); setConfirmDelete(false); }

  async function submitModal() {
    if (!fName.trim()) return;
    setModalSaving(true);
    const per = Math.max(1, Math.round(Number(fPerPack) || 1));
    const units = Math.max(0, Math.round(Number(fUnits) || 0));
    const payload = { name: fName.trim(), category: fCategory, units_per_pack: per, quantity: units, cost: fCost || null, reorder: fReorder || null };
    if (modal === "edit" && editId != null) {
      await supabase.from("Inventory").update(payload).eq("id", editId);
      setItems(prev => prev.map(i => i.id === editId ? { ...i, ...payload } : i));
    } else {
      const { data } = await supabase.from("Inventory").insert(payload).select();
      if (data && data[0]) setItems(prev => [...prev, data[0]]);
    }
    setModalSaving(false);
    closeModal();
  }

  async function deleteItem() {
    if (editId == null) return;
    setDeleting(true);
    await supabase.from("Inventory").delete().eq("id", editId);
    setItems(prev => prev.filter(i => i.id !== editId));
    setDeleting(false);
    closeModal();
  }

  // stats across everything
  const counts = { total: items.length, in: 0, low: 0, out: 0 };
  for (const i of items) {
    const st = statusInfo(Number(i.quantity) || 0, perPack(i));
    if (st.key === "in") counts.in++;
    else if (st.key === "low") counts.low++;
    else counts.out++;
  }

  const visible = items.filter(i => {
    if (catFilter !== "All" && i.category !== catFilter) return false;
    if (statusFilter) {
      const st = statusInfo(Number(i.quantity) || 0, perPack(i));
      if (st.key !== statusFilter) return false;
    }
    if (search && !i.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tiles = [
    { key: null, label: "All items", value: counts.total, color: "#a78bfa" },
    { key: "in", label: "In stock", value: counts.in, color: "#4ade80" },
    { key: "low", label: "Low stock", value: counts.low, color: "#fb923c" },
    { key: "out", label: "Out of stock", value: counts.out, color: "#f87171" },
  ];

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" }}>
      <style>{`
        .inv-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .inv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
        .inv-controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        @media (max-width: 640px) {
          .inv-tiles { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>Inventory</h1>
            <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>
              Tracked by the pack · −/+ moves a whole pack · type an exact count to audit
              {saving && <span style={{ color: "#666", marginLeft: 8 }}>Saving…</span>}
              {saved && <span style={{ color: "#4ade80", marginLeft: 8 }}>✓ Saved</span>}
            </p>
          </div>
          <button onClick={openAdd} style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 6px 20px rgba(124,58,237,0.35)" }}>
            + Add item
          </button>
        </div>

        {/* Overview tiles (also filters) */}
        <div className="inv-tiles" style={{ marginBottom: 18 }}>
          {tiles.map(t => {
            const isActive = statusFilter === t.key;
            return (
              <button
                key={String(t.key)}
                onClick={() => setStatusFilter(t.key)}
                style={{
                  textAlign: "left", cursor: "pointer",
                  background: isActive ? t.color + "18" : "#111",
                  border: `1px solid ${isActive ? t.color + "66" : "#1e1e1e"}`,
                  borderRadius: 12, padding: "13px 15px", transition: "all .15s",
                }}
              >
                <div style={{ fontSize: 26, fontWeight: 800, color: t.color, lineHeight: 1 }}>{t.value}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 5, fontWeight: 500 }}>{t.label}</div>
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="inv-controls" style={{ marginBottom: 22 }}>
          <input
            style={{ flex: 1, minWidth: 180, background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#e5e5e5", outline: "none", boxSizing: "border-box" }}
            placeholder="🔍 Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["All", ...CAT_ORDER].map(c => {
              const on = catFilter === c;
              const col = c === "All" ? "#a78bfa" : CAT_META[c].color;
              return (
                <button key={c} onClick={() => setCatFilter(c)} style={{
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  padding: "8px 14px", borderRadius: 10,
                  border: `1px solid ${on ? col + "66" : "#222"}`,
                  background: on ? col + "18" : "#0f0f0f",
                  color: on ? col : "#666",
                }}>
                  {c === "All" ? "All" : CAT_META[c].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grouped grids */}
        {loading ? (
          <p style={{ color: "#555" }}>Loading…</p>
        ) : visible.length === 0 ? (
          <div style={{ background: "#111", border: "1px dashed #222", borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>📦</div>
            <p style={{ color: "#666", fontSize: 14, margin: 0 }}>No items match — try clearing the search or filters.</p>
          </div>
        ) : (
          CAT_ORDER.filter(cat => visible.some(i => i.category === cat)).map(cat => {
            const meta = CAT_META[cat];
            const group = visible.filter(i => i.category === cat);
            return (
              <div key={cat} style={{ marginBottom: 30 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 16 }}>{meta.icon}</span>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#e5e5e5" }}>{meta.label}</h2>
                  <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: meta.color + "1f", color: meta.color }}>{group.length}</span>
                  <div style={{ flex: 1, height: 1, background: "#161616" }} />
                </div>
                <div className="inv-grid">
                  {group.map(item => (
                    <ItemTile key={item.id} item={item} onQty={handleQty} onEdit={openEdit} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <div
          onClick={closeModal}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(3px)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 460, background: "#111", border: "1px solid #262626", borderRadius: 16, padding: 22, boxShadow: "0 30px 80px rgba(0,0,0,0.7)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{modal === "add" ? "Add item" : "Edit item"}</h2>
              <button onClick={closeModal} style={{ background: "none", border: "1px solid #262626", color: "#777", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={modalLabel}>Item name</label>
                <input style={modalInput} placeholder="e.g. Team Bags" value={fName} onChange={e => setFName(e.target.value)} autoFocus />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={modalLabel}>Category</label>
                  <select style={modalInput} value={fCategory} onChange={e => setFCategory(e.target.value)}>
                    {CAT_ORDER.map(c => <option key={c} value={c}>{CAT_META[c].label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={modalLabel}>Units per pack</label>
                  <input style={modalInput} type="number" min={1} step={1} placeholder="e.g. 100" value={fPerPack} onChange={e => setFPerPack(e.target.value)} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={modalLabel}>On hand (units)</label>
                  <input style={modalInput} type="number" min={0} step={1} value={fUnits} onChange={e => setFUnits(e.target.value)} />
                  <p style={{ fontSize: 11, color: "#a78bfa", marginTop: 5 }}>
                    {Math.max(1, Math.round(Number(fPerPack) || 1)) > 1
                      ? `${packsLabel(Math.max(0, Math.round(Number(fUnits) || 0)), Math.max(1, Math.round(Number(fPerPack) || 1)))} packs`
                      : `${Math.max(0, Math.round(Number(fUnits) || 0))} units`}
                  </p>
                </div>
                <div>
                  <label style={modalLabel}>Cost (optional)</label>
                  <input style={modalInput} placeholder="e.g. $24 / pack" value={fCost} onChange={e => setFCost(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={modalLabel}>Reorder link or note (optional)</label>
                <input style={modalInput} placeholder="e.g. https://amazon.com/..." value={fReorder} onChange={e => setFReorder(e.target.value)} />
              </div>
            </div>

            <button
              onClick={submitModal}
              disabled={modalSaving || !fName.trim()}
              style={{ marginTop: 18, width: "100%", background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, color: "#fff", cursor: fName.trim() ? "pointer" : "not-allowed", opacity: fName.trim() ? 1 : 0.5 }}
            >
              {modalSaving ? "Saving…" : modal === "add" ? "Add item" : "Save changes"}
            </button>

            {modal === "edit" && (
              <div style={{ marginTop: 14, textAlign: "center" }}>
                {confirmDelete ? (
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "#f87171" }}>Delete this item?</span>
                    <button onClick={deleteItem} disabled={deleting} style={{ fontSize: 13, background: "#7f1d1d", border: "none", color: "#fca5a5", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontWeight: 600 }}>{deleting ? "Deleting…" : "Yes, delete"}</button>
                    <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 13, background: "none", border: "1px solid #333", color: "#666", borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} style={{ fontSize: 12, background: "none", border: "1px solid #7f1d1d", color: "#f87171", borderRadius: 8, padding: "7px 16px", cursor: "pointer" }}>Delete item</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
