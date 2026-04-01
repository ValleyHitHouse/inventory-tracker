"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const SUPPLIES = ["Bubble mailers","Bubble holders","Team bags","Toploaders","Penny sleeves","MagPros","Shipping labels","Boxes (S)","Boxes (M)","Boxes (L)","Packing tape","Packing paper"];

function parseCSV(text: string) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  return lines.slice(1).map(line => {
    const vals: string[] = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    vals.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

export default function Breaks() {
  const [breaks, setBreaks] = useState<any[]>([]);
  const [view, setView] = useState<"list"|"new">("list");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [boxName, setBoxName] = useState("");
  const [numBoxes, setNumBoxes] = useState(1);
  const [boxValue, setBoxValue] = useState("");
  const [chasers, setChasers] = useState([{ type: "inventory", name: "", qty: 1, value: "" }]);
  const [supplies, setSupplies] = useState([{ name: "Bubble mailers", qty: 1 }]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvName, setCsvName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    loadBreaks();
  }, []);

  async function loadBreaks() {
    const { data } = await supabase.from("Breaks").select("*").order("date", { ascending: false });
    if (data) setBreaks(data);
  }

  async function deleteBreak(id: number) {
    setDeletingId(id);
    await supabase.from("BreakOrders").delete().eq("break_id", id);
    await supabase.from("BreakChasers").delete().eq("break_id", id);
    await supabase.from("BreakSupplies").delete().eq("break_id", id);
    await supabase.from("Breaks").delete().eq("id", id);
    setDeletingId(null);
    setConfirmId(null);
    loadBreaks();
  }

  const revenue = csvData.reduce((s, r) => s + parseFloat(r.original_item_price || "0"), 0);
  const spotsSold = csvData.filter(r => parseFloat(r.original_item_price || "0") > 0).length;
  const freeGiveaways = csvData.filter(r => parseFloat(r.original_item_price || "0") === 0).length;
  const totalCost = parseFloat(boxValue || "0") + chasers.reduce((s, c) => s + parseFloat(c.value || "0") * c.qty, 0);
  const netProfit = revenue - totalCost;

  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target?.result as string);
      setCsvData(rows);
      const d = rows[0]?.placed_at?.split(" ")[0];
      if (d) setDate(d);
    };
    reader.readAsText(file);
  }

  async function saveBreak() {
    setSaving(true);
    const { data: brk } = await supabase.from("Breaks").insert({
      date, box_name: boxName, num_boxes: numBoxes,
      box_value: parseFloat(boxValue || "0"),
      revenue: Math.round(revenue * 100) / 100,
      spots_sold: spotsSold, free_giveaways: freeGiveaways,
      net_profit: Math.round(netProfit * 100) / 100,
    }).select().single();

    if (brk) {
      if (chasers.length) {
        await supabase.from("BreakChasers").insert(
          chasers.map(c => ({ break_id: brk.id, name: c.name, type: c.type, quantity: c.qty, value: parseFloat(c.value || "0") }))
        );
      }
      if (supplies.length) {
        await supabase.from("BreakSupplies").insert(
          supplies.map(s => ({ break_id: brk.id, supply_name: s.name, quantity_used: s.qty }))
        );
      }
      if (csvData.length) {
        const orderRows = csvData.map(r => ({
          break_id: brk.id,
          order_id: r.order_id || null,
          buyer_username: r.buyer_username || null,
          product_name: r.product_name || null,
          price: parseFloat(r.original_item_price || "0"),
          placed_at: r.placed_at ? r.placed_at.trim() : null,
          cancelled: r.cancelled_or_failed === "True",
          tracking_code: r.tracking_code || null,
          shipping_address: r.shipping_address || null,
          postal_code: r.postal_code || null,
        }));
        const { error: ordersError } = await supabase.from("BreakOrders").insert(orderRows);
        if (ordersError) console.error("BreakOrders insert error:", ordersError);
      }
      for (const s of supplies) {
        const { data: inv } = await supabase.from("Inventory").select("id,quantity").eq("name", s.name).single();
        if (inv) await supabase.from("Inventory").update({ quantity: Math.max(0, inv.quantity - s.qty) }).eq("id", inv.id);
      }
    }
    await loadBreaks();
    setSaving(false);
    setView("list");
    setCsvData([]); setCsvName(""); setBoxName(""); setBoxValue(""); setNumBoxes(1);
    setChasers([{ type: "inventory", name: "", qty: 1, value: "" }]);
    setSupplies([{ name: "Bubble mailers", qty: 1 }]);
  }

  const s = { shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" }, content: { padding: 24, maxWidth: 800, margin: "0 auto" }, section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 }, sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 }, label: { fontSize: 12, color: "#666", marginBottom: 5, display: "block" }, input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none" }, row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }, addBtn: { fontSize: 12, color: "#a78bfa", background: "none", border: "1px dashed #333", borderRadius: 6, padding: "7px 12px", cursor: "pointer", width: "100%", marginTop: 4 }, removeBtn: { background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, padding: "0 4px" }, submitBtn: { width: "100%", background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", marginTop: 4 }, stat: { background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px 14px" }, statLabel: { fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".4px" }, statValue: { fontSize: 20, fontWeight: 700 } };

  if (view === "list") return (
    <div style={s.shell}>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingTop: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Break results</h1>
            <p style={{ fontSize: 13, color: "#555" }}>{breaks.length} breaks logged</p>
          </div>
          <button onClick={() => setView("new")} style={{ ...s.submitBtn, width: "auto", padding: "10px 20px" }}>+ Log new break</button>
        </div>
        {breaks.length === 0 ? (
          <div style={{ ...s.section, textAlign: "center", padding: 48 }}>
            <p style={{ color: "#555", fontSize: 13 }}>No breaks logged yet. Click "Log new break" to get started.</p>
          </div>
        ) : (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#0f0f0f" }}>
                {["Date","Box","Boxes","Spots","Revenue","Cost","Net profit",""].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#444", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", borderBottom: "1px solid #1e1e1e" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {breaks.map(b => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #161616" }}>
                    <td style={{ padding: "10px 14px", color: "#aaa" }}>{b.date}</td>
                    <td style={{ padding: "10px 14px", color: "#aaa" }}>{b.box_name || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#aaa" }}>{b.num_boxes}</td>
                    <td style={{ padding: "10px 14px", color: "#aaa" }}>{b.spots_sold}</td>
                    <td style={{ padding: "10px 14px", color: "#4ade80" }}>${b.revenue?.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", color: "#fb923c" }}>${b.box_value?.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", color: b.net_profit >= 0 ? "#a78bfa" : "#f87171", fontWeight: 600 }}>${b.net_profit?.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px" }}>
                      {confirmId === b.id ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => deleteBreak(b.id)}
                            disabled={deletingId === b.id}
                            style={{ fontSize: 11, background: "#7f1d1d", border: "none", color: "#fca5a5", borderRadius: 5, padding: "4px 8px", cursor: "pointer" }}>
                            {deletingId === b.id ? "Deleting..." : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            style={{ fontSize: 11, background: "#1a1a1a", border: "none", color: "#555", borderRadius: 5, padding: "4px 8px", cursor: "pointer" }}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(b.id)}
                          style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#555", borderRadius: 5, padding: "4px 8px", cursor: "pointer" }}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={s.shell}>
      <div style={s.content}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, paddingTop: 24 }}>Log new break</h1>

        <div style={s.section}>
          <div style={s.sectionTitle}>Break details</div>
          <div style={s.row}>
            <div><label style={s.label}>Date of break</label><input style={s.input} type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div><label style={s.label}>Box product name</label><input style={s.input} type="text" placeholder="e.g. 2025 Topps Series 1" value={boxName} onChange={e => setBoxName(e.target.value)} /></div>
          </div>
          <div style={s.row}>
            <div><label style={s.label}>Number of boxes</label><input style={s.input} type="number" min={1} value={numBoxes} onChange={e => setNumBoxes(Number(e.target.value))} /></div>
            <div><label style={s.label}>Total box value ($)</label><input style={s.input} type="number" placeholder="e.g. 400.00" value={boxValue} onChange={e => setBoxValue(e.target.value)} /></div>
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>Chasers included</div>
          {chasers.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <select style={{ ...s.input, flex: 1 }} value={c.type} onChange={e => setChasers(prev => prev.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}>
                <option value="inventory">From inventory</option>
                <option value="custom">Custom</option>
              </select>
              <input style={{ ...s.input, flex: 2 }} placeholder="Chaser name" value={c.name} onChange={e => setChasers(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <input style={{ ...s.input, width: 70, flex: "none" }} type="number" min={1} placeholder="Qty" value={c.qty} onChange={e => setChasers(prev => prev.map((x, j) => j === i ? { ...x, qty: Number(e.target.value) } : x))} />
              <input style={{ ...s.input, width: 90, flex: "none" }} type="number" placeholder="Value $" value={c.value} onChange={e => setChasers(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
              <button style={s.removeBtn} onClick={() => setChasers(prev => prev.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          <button style={s.addBtn} onClick={() => setChasers(prev => [...prev, { type: "inventory", name: "", qty: 1, value: "" }])}>+ Add chaser</button>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>Upload Whatnot CSV</div>
          <label style={{ display: "block", border: "1px dashed #333", borderRadius: 8, padding: 28, textAlign: "center", cursor: "pointer", background: "#0f0f0f" }}>
            <input type="file" accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
            <div style={{ fontSize: 13, color: csvName ? "#4ade80" : "#888", marginBottom: 4 }}>{csvName || "Drop your Whatnot CSV here or click to browse"}</div>
            <div style={{ fontSize: 11, color: "#444" }}>{csvData.length > 0 ? `${csvData.length} orders detected` : "Exported from Whatnot → Sales → Download CSV"}</div>
          </label>
          {csvData.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
              <div style={s.stat}><div style={s.statLabel}>Spots sold</div><div style={{ ...s.statValue, color: "#e5e5e5" }}>{spotsSold}</div></div>
              <div style={s.stat}><div style={s.statLabel}>Revenue</div><div style={{ ...s.statValue, color: "#4ade80" }}>${revenue.toFixed(2)}</div></div>
              <div style={s.stat}><div style={s.statLabel}>Free giveaways</div><div style={{ ...s.statValue, color: "#fb923c" }}>{freeGiveaways}</div></div>
            </div>
          )}
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>Supplies used this break</div>
          {supplies.map((s2, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <select style={{ ...s.input, flex: 1 }} value={s2.name} onChange={e => setSupplies(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}>
                {SUPPLIES.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              <input style={{ ...s.input, width: 90, flex: "none" }} type="number" min={1} placeholder="Qty" value={s2.qty} onChange={e => setSupplies(prev => prev.map((x, j) => j === i ? { ...x, qty: Number(e.target.value) } : x))} />
              <button style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, padding: "0 4px" }} onClick={() => setSupplies(prev => prev.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          <button style={s.addBtn} onClick={() => setSupplies(prev => [...prev, { name: "Bubble mailers", qty: 1 }])}>+ Add supply</button>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>Profit / loss summary</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={s.stat}><div style={s.statLabel}>Revenue</div><div style={{ ...s.statValue, color: "#4ade80" }}>${revenue.toFixed(2)}</div></div>
            <div style={s.stat}><div style={s.statLabel}>Total cost</div><div style={{ ...s.statValue, color: "#fb923c" }}>${totalCost.toFixed(2)}</div></div>
            <div style={s.stat}><div style={s.statLabel}>Net profit</div><div style={{ ...s.statValue, color: netProfit >= 0 ? "#a78bfa" : "#f87171" }}>${netProfit.toFixed(2)}</div></div>
          </div>
        </div>

        <button style={s.submitBtn} onClick={saveBreak} disabled={saving}>{saving ? "Saving..." : "Save break"}</button>
      </div>
    </div>
  );
}