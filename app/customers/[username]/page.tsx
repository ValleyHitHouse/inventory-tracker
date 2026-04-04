"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = decodeURIComponent(params?.username as string);

  const [orders, setOrders] = useState<any[]>([]);
  const [breaks, setBreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    async function load() {
      const [ordersRes, breaksRes] = await Promise.all([
        supabase.from("BreakOrders").select("*").eq("buyer_username", username).order("placed_at", { ascending: false }),
        supabase.from("Breaks").select("id, date, box_name, revenue, net_profit"),
      ]);
      if (ordersRes.data) setOrders(ordersRes.data);
      if (breaksRes.data) setBreaks(breaksRes.data);
      setLoading(false);
    }
    load();
  }, [username]);

  const breakMap: Record<number, any> = {};
  for (const b of breaks) breakMap[b.id] = b;

  const payingOrders = orders.filter(o => parseFloat(o.price || "0") > 0 && !o.cancelled);
  const freeOrders = orders.filter(o => parseFloat(o.price || "0") === 0 && !o.cancelled);
  const cancelledOrders = orders.filter(o => o.cancelled);
  const totalSpent = payingOrders.reduce((s, o) => s + parseFloat(o.price || "0"), 0);
  const avgOrderValue = payingOrders.length > 0 ? totalSpent / payingOrders.length : 0;
  const shippingAddress = orders.find(o => o.shipping_address)?.shipping_address || "—";
  const postalCode = orders.find(o => o.postal_code)?.postal_code || "—";

  // Unique breaks
  const breakIds = [...new Set(orders.map(o => o.break_id))];
  const customerBreaks = breakIds.map(id => breakMap[id]).filter(Boolean).sort((a, b) => b.date > a.date ? 1 : -1);

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" },
    content: { padding: 32, maxWidth: 1100, margin: "0 auto" },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    th: { padding: "10px 14px", textAlign: "left" as const, color: "#444", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".4px", borderBottom: "1px solid #1e1e1e" },
    td: { padding: "11px 14px", fontSize: 13, borderBottom: "1px solid #161616" },
    statCard: { background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 18px" },
  };

  if (loading) return (
    <div style={{ ...s.shell, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#555" }}>Loading profile...</p>
    </div>
  );

  return (
    <div style={s.shell}>
      <div style={s.content}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <button onClick={() => router.push("/customers")} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer", marginBottom: 12 }}>← Back to customers</button>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#db2777)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff" }}>
              {username[0]?.toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: "#a78bfa" }}>{username}</h1>
              <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>{shippingAddress}{postalCode !== "—" ? ` · ${postalCode}` : ""}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total spent</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80" }}>${totalSpent.toFixed(2)}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Paid orders</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa" }}>{payingOrders.length}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Breaks joined</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8" }}>{customerBreaks.length}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Avg order value</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fb923c" }}>${avgOrderValue.toFixed(2)}</div>
          </div>
        </div>

        {/* Breaks they've been in */}
        {customerBreaks.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>🎴 Breaks joined</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {customerBreaks.map((b, i) => {
                const ordersInBreak = orders.filter(o => o.break_id === b.id);
                const spentInBreak = ordersInBreak.filter(o => !o.cancelled).reduce((s, o) => s + parseFloat(o.price || "0"), 0);
                const itemCount = ordersInBreak.filter(o => !o.cancelled && parseFloat(o.price || "0") > 0).length;
                return (
                  <div key={i} onClick={() => router.push(`/breaks/${b.id}`)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#0f0f0f", borderRadius: 8, cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#1a1a1a")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#0f0f0f")}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5" }}>{b.box_name || "Break"}</div>
                      <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{b.date} · {itemCount} order{itemCount > 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#4ade80" }}>${spentInBreak.toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>spent this break</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All orders */}
        <div style={s.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={s.sectionTitle}>📋 All orders ({orders.length})</div>
            <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#555" }}>
              <span>✅ Paid: {payingOrders.length}</span>
              <span>🎁 Free: {freeOrders.length}</span>
              {cancelledOrders.length > 0 && <span>❌ Cancelled: {cancelledOrders.length}</span>}
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "#0f0f0f" }}>
              <th style={s.th}>Break</th>
              <th style={s.th}>Product</th>
              <th style={s.th}>Price</th>
              <th style={s.th}>Tracking</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Date</th>
            </tr></thead>
            <tbody>
              {orders.map((o, i) => {
                const brk = breakMap[o.break_id];
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #161616", opacity: o.cancelled ? 0.4 : 1 }}>
                    <td style={{ ...s.td, color: "#777", fontSize: 12 }}>{brk?.box_name || brk?.date || "—"}</td>
                    <td style={{ ...s.td, color: "#aaa", fontSize: 12 }}>{o.product_name || "—"}</td>
                    <td style={{ ...s.td, color: parseFloat(o.price || "0") === 0 ? "#555" : "#4ade80", fontWeight: 600 }}>
                      {parseFloat(o.price || "0") === 0 ? "Free" : `$${parseFloat(o.price).toFixed(2)}`}
                    </td>
                    <td style={{ ...s.td, color: "#555", fontFamily: "monospace", fontSize: 11 }}>{o.tracking_code || "—"}</td>
                    <td style={s.td}>
                      {o.cancelled ? (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f8717122", color: "#f87171" }}>Cancelled</span>
                      ) : parseFloat(o.price || "0") === 0 ? (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#fb923c22", color: "#fb923c" }}>Giveaway</span>
                      ) : (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#4ade8022", color: "#4ade80" }}>Paid</span>
                      )}
                    </td>
                    <td style={{ ...s.td, color: "#555", fontSize: 12 }}>{o.placed_at ? new Date(o.placed_at).toLocaleDateString() : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}