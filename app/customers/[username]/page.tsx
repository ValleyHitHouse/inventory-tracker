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

  const breakIds = [...new Set(orders.map(o => o.break_id))];
  const customerBreaks = breakIds.map(id => breakMap[id]).filter(Boolean).sort((a, b) => b.date > a.date ? 1 : -1);

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    statCard: { background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 18px" },
  };

  const mobileStyles = `
    .profile-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 16px; }
    @media (max-width: 768px) {
      .profile-grid-4 { grid-template-columns: repeat(2,1fr); }
    }
  `;

  if (loading) return (
    <div style={{ ...s.shell, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#555" }}>Loading profile...</p>
    </div>
  );

  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => router.push("/customers")} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer", marginBottom: 12 }}>
            ← Back to customers
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#db2877)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
              {username[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#a78bfa" }}>{username}</h1>
              <p style={{ fontSize: 12, color: "#555", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {shippingAddress}{postalCode !== "—" ? ` · ${postalCode}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Stats — 4 col desktop, 2 col mobile */}
        <div className="profile-grid-4">
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total spent</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#4ade80" }}>${totalSpent.toFixed(2)}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Paid orders</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa" }}>{payingOrders.length}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Breaks joined</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#38bdf8" }}>{customerBreaks.length}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Avg order</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fb923c" }}>${avgOrderValue.toFixed(2)}</div>
          </div>
        </div>

        {/* Breaks joined */}
        {customerBreaks.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>🎴 Breaks joined</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {customerBreaks.map((b, i) => {
                const ordersInBreak = orders.filter(o => o.break_id === b.id);
                const spentInBreak = ordersInBreak.filter(o => !o.cancelled).reduce((s, o) => s + parseFloat(o.price || "0"), 0);
                const itemCount = ordersInBreak.filter(o => !o.cancelled && parseFloat(o.price || "0") > 0).length;
                return (
                  <div key={i} onClick={() => router.push(`/breaks/${b.id}`)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#0f0f0f", borderRadius: 8, cursor: "pointer" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.box_name || "Break"}</div>
                      <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{b.date} · {itemCount} order{itemCount > 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#4ade80" }}>${spentInBreak.toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>spent</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All orders — card layout on mobile */}
        <div style={s.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div style={s.sectionTitle}>📋 All orders ({orders.length})</div>
            <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#555", flexWrap: "wrap" }}>
              <span>✅ {payingOrders.length} paid</span>
              <span>🎁 {freeOrders.length} free</span>
              {cancelledOrders.length > 0 && <span>❌ {cancelledOrders.length} cancelled</span>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {orders.map((o, i) => {
              const brk = breakMap[o.break_id];
              const price = parseFloat(o.price || "0");
              return (
                <div key={i} style={{ background: "#0f0f0f", borderRadius: 8, padding: "10px 14px", opacity: o.cancelled ? 0.4 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#777", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {brk?.box_name || brk?.date || "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "#aaa", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {o.product_name || "—"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, marginLeft: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: price === 0 ? "#555" : "#4ade80" }}>
                        {price === 0 ? "Free" : `$${price.toFixed(2)}`}
                      </span>
                      {o.cancelled ? (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f8717122", color: "#f87171" }}>Cancelled</span>
                      ) : price === 0 ? (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#fb923c22", color: "#fb923c" }}>Giveaway</span>
                      ) : (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#4ade8022", color: "#4ade80" }}>Paid</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {o.tracking_code && <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>{o.tracking_code}</span>}
                    {o.placed_at && <span style={{ fontSize: 11, color: "#555" }}>{new Date(o.placed_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}