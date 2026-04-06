"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const PERIODS = ["Last 7 days", "Last 30 days", "Last 90 days", "All time"];

function StatBox({ label, value, color, sub }: { label: string; value: any; color: string; sub?: string }) {
  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".5px", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [breaks, setBreaks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [period, setPeriod] = useState("Last 30 days");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: breaksData } = await supabase.from("Breaks").select("*").order("date", { ascending: true });
      const { data: ordersData } = await supabase.from("BreakOrders").select("buyer_username, price, placed_at, break_id").eq("cancelled", false);
      if (breaksData) setBreaks(breaksData);
      if (ordersData) setOrders(ordersData);
      setLoading(false);
    }
    load();
  }, []);

  function getFilteredBreaks() {
    const now = new Date();
    return breaks.filter(b => {
      if (period === "All time") return true;
      const days = period === "Last 7 days" ? 7 : period === "Last 30 days" ? 30 : 90;
      const diff = (now.getTime() - new Date(b.date).getTime()) / (1000 * 60 * 60 * 24);
      return diff <= days;
    });
  }

  function getFilteredOrders() {
    const now = new Date();
    return orders.filter(o => {
      if (period === "All time") return true;
      if (!o.placed_at) return false;
      const days = period === "Last 7 days" ? 7 : period === "Last 30 days" ? 30 : 90;
      const diff = (now.getTime() - new Date(o.placed_at).getTime()) / (1000 * 60 * 60 * 24);
      return diff <= days;
    });
  }

  const filtered = getFilteredBreaks();
  const filteredOrders = getFilteredOrders();
  const lastBreak = breaks[breaks.length - 1];

  const totalRevenue = filtered.reduce((s, b) => s + parseFloat(b.revenue || "0"), 0);
  const totalProfit = filtered.reduce((s, b) => s + parseFloat(b.net_profit || "0"), 0);
  const totalIMC = filtered.reduce((s, b) => s + parseFloat(b.imc_take || "0"), 0);
  const totalValley = filtered.reduce((s, b) => s + parseFloat(b.valley_take || "0"), 0);
  const avgProfit = filtered.length > 0 ? totalProfit / filtered.length : 0;
  const totalSupplyCost = filtered.reduce((s, b) => s + parseFloat(b.total_supply_cost || "0"), 0);
  const totalCouponCost = filtered.reduce((s, b) => s + parseFloat(b.coupon_total || "0"), 0);
  const totalPromoCost = filtered.reduce((s, b) => s + parseFloat(b.promotion_total || "0"), 0);
  const totalChaserCost = filtered.reduce((s, b) => s + parseFloat(b.chaser_cost || "0"), 0);
  const totalExpenses = totalSupplyCost + totalPromoCost + totalChaserCost;

  const buyerMap: Record<string, number> = {};
  filteredOrders.forEach(o => {
    const price = parseFloat(o.price || "0");
    if (price > 0 && o.buyer_username) {
      buyerMap[o.buyer_username] = (buyerMap[o.buyer_username] || 0) + price;
    }
  });
  const topBuyers = Object.entries(buyerMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const bestBreaks = [...filtered].sort((a, b) => parseFloat(b.net_profit || "0") - parseFloat(a.net_profit || "0")).slice(0, 5);
  const chartBreaks = filtered.slice(-12);
  const maxRevenue = Math.max(...chartBreaks.map(b => parseFloat(b.revenue || "0")), 1);

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", width: "100%", boxSizing: "border-box" as const },
    content: { padding: "24px 16px", maxWidth: 1200, margin: "0 auto", width: "100%", boxSizing: "border-box" as const },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    expenseRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #161616", fontSize: 13 },
  };

  const mobileStyles = `
    .an-periods { display: flex; gap: 8px; flex-wrap: wrap; }
    .an-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 16px; }
    .an-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .an-last-break { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; }
    .an-expense-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .an-bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    @media (max-width: 768px) {
      .an-periods { gap: 6px; }
      .an-periods button { flex: 1; font-size: 11px !important; padding: 6px 8px !important; }
      .an-grid-4 { grid-template-columns: 1fr 1fr; }
      .an-grid-2 { grid-template-columns: 1fr 1fr; }
      .an-last-break { grid-template-columns: 1fr 1fr; }
      .an-expense-grid { grid-template-columns: 1fr; gap: 16px; }
      .an-bottom-grid { grid-template-columns: 1fr; }
    }
  `;

  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Analytics</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Break performance & business insights</p>
          </div>
          <div className="an-periods">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${period === p ? "#fb923c" : "#222"}`, background: period === p ? "#fb923c22" : "#111", color: period === p ? "#fb923c" : "#555" }}>{p}</button>
            ))}
          </div>
        </div>

        {loading ? <p style={{ color: "#555" }}>Loading...</p> : <>

          {/* Key stats */}
          <div className="an-grid-4">
            <StatBox label="Total revenue" value={`$${totalRevenue.toFixed(2)}`} color="#4ade80" sub={`${filtered.length} breaks`} />
            <StatBox label="Net profit" value={`$${totalProfit.toFixed(2)}`} color={totalProfit >= 0 ? "#a78bfa" : "#f87171"} />
            <StatBox label="Avg profit/break" value={`$${avgProfit.toFixed(2)}`} color="#38bdf8" />
            <StatBox label="Total expenses" value={`$${totalExpenses.toFixed(2)}`} color="#f87171" />
          </div>

          {/* BOBA / Valley split */}
          <div className="an-grid-2">
            <div style={{ ...s.section, borderColor: "#fb923c33", marginBottom: 0 }}>
              <div style={{ fontSize: 11, color: "#fb923c", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".4px" }}>🏆 BOBA total ({period})</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#fb923c" }}>${totalIMC.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>70% of net profit · {filtered.length} breaks</div>
            </div>
            <div style={{ ...s.section, borderColor: "#4ade8033", marginBottom: 0 }}>
              <div style={{ fontSize: 11, color: "#4ade80", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".4px" }}>🏠 Valley total ({period})</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#4ade80" }}>${totalValley.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>30% of net profit · {filtered.length} breaks</div>
            </div>
          </div>
          <div style={{ marginBottom: 16 }} />

          {/* Last break */}
          {lastBreak && (
            <div style={{ ...s.section, cursor: "pointer" }} onClick={() => router.push(`/breaks/${lastBreak.id}`)}>
              <div style={s.sectionTitle}>🎴 Last break — {lastBreak.box_name || "—"} <span style={{ color: "#333", fontSize: 10 }}>tap to view →</span></div>
              <div className="an-last-break">
                <div><div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>DATE</div><div style={{ fontSize: 14, fontWeight: 600, color: "#aaa" }}>{lastBreak.date}</div></div>
                <div><div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>REVENUE</div><div style={{ fontSize: 14, fontWeight: 600, color: "#4ade80" }}>${parseFloat(lastBreak.revenue || "0").toFixed(2)}</div></div>
                <div><div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>NET PROFIT</div><div style={{ fontSize: 14, fontWeight: 600, color: parseFloat(lastBreak.net_profit || "0") >= 0 ? "#a78bfa" : "#f87171" }}>${parseFloat(lastBreak.net_profit || "0").toFixed(2)}</div></div>
                <div><div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>SPOTS SOLD</div><div style={{ fontSize: 14, fontWeight: 600, color: "#fb923c" }}>{lastBreak.spots_sold}</div></div>
                <div><div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>BOBA</div><div style={{ fontSize: 14, fontWeight: 600, color: lastBreak.boba_submitted ? "#4ade80" : "#f87171" }}>{lastBreak.boba_submitted ? "✓ Yes" : "✗ No"}</div></div>
              </div>
            </div>
          )}

          {/* Revenue chart */}
          {chartBreaks.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>📈 Revenue over time ({period})</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160, padding: "0 4px", overflowX: "auto" }}>
                {chartBreaks.map((b, i) => {
                  const rev = parseFloat(b.revenue || "0");
                  const profit = parseFloat(b.net_profit || "0");
                  const height = Math.max((rev / maxRevenue) * 140, 4);
                  return (
                    <div key={i} onClick={() => router.push(`/breaks/${b.id}`)} style={{ flex: "0 0 auto", minWidth: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
                      <div style={{ fontSize: 9, color: "#555", textAlign: "center" }}>${(rev / 1000).toFixed(1)}k</div>
                      <div style={{ width: "100%", minWidth: 24, height, background: profit >= 0 ? "linear-gradient(180deg,#a78bfa,#7c3aed)" : "linear-gradient(180deg,#f87171,#dc2626)", borderRadius: "4px 4px 0 0", minHeight: 4 }} />
                      <div style={{ fontSize: 9, color: "#444", textAlign: "center", whiteSpace: "nowrap" }}>{b.date?.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: "#555", flexWrap: "wrap" }}>
                <span>🟣 Profitable</span>
                <span>🔴 Loss</span>
                <span style={{ marginLeft: "auto" }}>Tap a bar to view break</span>
              </div>
            </div>
          )}

          {/* Expense breakdown */}
          <div style={s.section}>
            <div style={s.sectionTitle}>💸 Expense breakdown ({period})</div>
            <div className="an-expense-grid">
              <div>
                <div style={s.expenseRow}><span style={{ color: "#777" }}>Shipping supplies</span><span style={{ color: "#f87171" }}>${totalSupplyCost.toFixed(2)}</span></div>
                <div style={s.expenseRow}><span style={{ color: "#777" }}>Coupon spend</span><span style={{ color: "#f87171" }}>${totalCouponCost.toFixed(2)}</span></div>
                <div style={s.expenseRow}><span style={{ color: "#777" }}>Promotion spend</span><span style={{ color: "#f87171" }}>${totalPromoCost.toFixed(2)}</span></div>
                <div style={{ ...s.expenseRow, borderBottom: "none" }}><span style={{ color: "#777" }}>Chaser card costs</span><span style={{ color: "#f87171" }}>${totalChaserCost.toFixed(2)}</span></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ background: "#0f0f0f", borderRadius: 10, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".4px" }}>Total expenses</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#f87171" }}>${totalExpenses.toFixed(2)}</div>
                  {totalRevenue > 0 && <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{((totalExpenses / totalRevenue) * 100).toFixed(1)}% of revenue</div>}
                </div>
                <div style={{ background: "#0f0f0f", borderRadius: 10, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#fb923c", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".4px" }}>Coupon total</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#fb923c" }}>${totalCouponCost.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>not included in expenses</div>
                </div>
              </div>
            </div>
          </div>

          {/* Top buyers + Best breaks */}
          <div className="an-bottom-grid">
            <div style={s.section}>
              <div style={s.sectionTitle}>👥 Top 10 buyers ({period})</div>
              {topBuyers.length === 0 ? (
                <p style={{ color: "#555", fontSize: 13 }}>No data for this period</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {topBuyers.map(([username, total], i) => (
                    <div key={i} onClick={() => router.push(`/customers/${encodeURIComponent(username)}`)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#0f0f0f", borderRadius: 8, cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: i === 0 ? "#fb923c" : i === 1 ? "#aaa" : i === 2 ? "#cd7f32" : "#555", minWidth: 24 }}>#{i + 1}</span>
                        <span style={{ fontSize: 13, color: "#a78bfa", fontWeight: 600 }}>{username}</span>
                      </div>
                      <span style={{ fontSize: 13, color: "#4ade80", fontWeight: 600 }}>${total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={s.section}>
              <div style={s.sectionTitle}>🏆 Best breaks by profit ({period})</div>
              {bestBreaks.length === 0 ? (
                <p style={{ color: "#555", fontSize: 13 }}>No data for this period</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {bestBreaks.map((b, i) => (
                    <div key={i} onClick={() => router.push(`/breaks/${b.id}`)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#0f0f0f", borderRadius: 8, cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: i === 0 ? "#fb923c" : i === 1 ? "#aaa" : i === 2 ? "#cd7f32" : "#555", flexShrink: 0 }}>#{i + 1}</span>
                        <span style={{ fontSize: 13, color: "#e5e5e5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.box_name || b.date}</span>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                        <div style={{ fontSize: 13, color: "#a78bfa", fontWeight: 600 }}>${parseFloat(b.net_profit || "0").toFixed(2)}</div>
                        <div style={{ fontSize: 11, color: "#555" }}>${parseFloat(b.revenue || "0").toFixed(2)} rev</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </>}
      </div>
    </div>
  );
}