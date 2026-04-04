"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const PERIODS = ["Last 7 days", "Last 30 days", "Last 90 days", "All time"];

function StatBox({ label, value, color, sub }: { label: string; value: any; color: string; sub?: string }) {
  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".5px", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
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

  // Stats
  const totalRevenue = filtered.reduce((s, b) => s + parseFloat(b.revenue || "0"), 0);
  const totalProfit = filtered.reduce((s, b) => s + parseFloat(b.net_profit || "0"), 0);
  const totalIMC = filtered.reduce((s, b) => s + parseFloat(b.imc_take || "0"), 0);
  const totalValley = filtered.reduce((s, b) => s + parseFloat(b.valley_take || "0"), 0);
  const avgProfit = filtered.length > 0 ? totalProfit / filtered.length : 0;

  // Supply spend breakdown — from filtered breaks
  const totalSupplyCost = filtered.reduce((s, b) => s + parseFloat(b.total_supply_cost || "0"), 0);
  const totalCouponCost = filtered.reduce((s, b) => s + parseFloat(b.coupon_total || "0"), 0);
  const totalPromoCost = filtered.reduce((s, b) => s + parseFloat(b.promotion_total || "0"), 0);
  const totalChaserCost = filtered.reduce((s, b) => s + parseFloat(b.chaser_cost || "0"), 0);
  const totalExpenses = totalSupplyCost + totalCouponCost + totalPromoCost + totalChaserCost;

  // Top buyers — filtered by period
  const buyerMap: Record<string, number> = {};
  filteredOrders.forEach(o => {
    const price = parseFloat(o.price || "0");
    if (price > 0 && o.buyer_username) {
      buyerMap[o.buyer_username] = (buyerMap[o.buyer_username] || 0) + price;
    }
  });
  const topBuyers = Object.entries(buyerMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Best breaks — filtered by period
  const bestBreaks = [...filtered].sort((a, b) => parseFloat(b.net_profit || "0") - parseFloat(a.net_profit || "0")).slice(0, 5);

  // Revenue chart
  const chartBreaks = filtered.slice(-12);
  const maxRevenue = Math.max(...chartBreaks.map(b => parseFloat(b.revenue || "0")), 1);

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" },
    content: { padding: 32, maxWidth: 1200, margin: "0 auto" },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    th: { padding: "10px 14px", textAlign: "left" as const, color: "#444", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".4px", borderBottom: "1px solid #1e1e1e" },
    td: { padding: "11px 14px", fontSize: 13, borderBottom: "1px solid #161616" },
    expenseRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #161616", fontSize: 13 },
  };

  return (
    <div style={s.shell}>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Analytics</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Break performance & business insights</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${period === p ? "#fb923c" : "#222"}`, background: period === p ? "#fb923c22" : "#111", color: period === p ? "#fb923c" : "#555" }}>{p}</button>
            ))}
          </div>
        </div>

        {loading ? <p style={{ color: "#555" }}>Loading...</p> : <>

          {/* Key stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            <StatBox label="Total revenue" value={`$${totalRevenue.toFixed(2)}`} color="#4ade80" sub={`${filtered.length} breaks`} />
            <StatBox label="Net profit" value={`$${totalProfit.toFixed(2)}`} color={totalProfit >= 0 ? "#a78bfa" : "#f87171"} />
            <StatBox label="Avg profit/break" value={`$${avgProfit.toFixed(2)}`} color="#38bdf8" />
            <StatBox label="Total expenses" value={`$${totalExpenses.toFixed(2)}`} color="#f87171" />
          </div>

          {/* IMC Split totals */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ ...s.section, borderColor: "#fb923c33" }}>
              <div style={{ fontSize: 11, color: "#fb923c", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".4px" }}>🏆 BOBA total ({period})</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#fb923c" }}>${totalIMC.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>70% of net profit across {filtered.length} breaks</div>
            </div>
            <div style={{ ...s.section, borderColor: "#4ade8033" }}>
              <div style={{ fontSize: 11, color: "#4ade80", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".4px" }}>🏠 Valley total ({period})</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#4ade80" }}>${totalValley.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>30% of net profit across {filtered.length} breaks</div>
            </div>
          </div>

          {/* Last break */}
          {lastBreak && (
            <div style={{ ...s.section, cursor: "pointer" }} onClick={() => router.push(`/breaks/${lastBreak.id}`)}>
              <div style={s.sectionTitle}>🎴 Last break — {lastBreak.box_name || "—"} <span style={{ color: "#333", fontSize: 10 }}>click to view →</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                <div><div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>DATE</div><div style={{ fontSize: 15, fontWeight: 600, color: "#aaa" }}>{lastBreak.date}</div></div>
                <div><div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>REVENUE</div><div style={{ fontSize: 15, fontWeight: 600, color: "#4ade80" }}>${parseFloat(lastBreak.revenue || "0").toFixed(2)}</div></div>
                <div><div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>NET PROFIT</div><div style={{ fontSize: 15, fontWeight: 600, color: parseFloat(lastBreak.net_profit || "0") >= 0 ? "#a78bfa" : "#f87171" }}>${parseFloat(lastBreak.net_profit || "0").toFixed(2)}</div></div>
                <div><div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>SPOTS SOLD</div><div style={{ fontSize: 15, fontWeight: 600, color: "#fb923c" }}>{lastBreak.spots_sold}</div></div>
                <div><div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>BOBA SUBMITTED</div><div style={{ fontSize: 15, fontWeight: 600, color: lastBreak.boba_submitted ? "#4ade80" : "#f87171" }}>{lastBreak.boba_submitted ? "✓ Yes" : "✗ No"}</div></div>
              </div>
            </div>
          )}

          {/* Revenue chart */}
          {chartBreaks.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>📈 Revenue over time ({period})</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, padding: "0 8px" }}>
                {chartBreaks.map((b, i) => {
                  const rev = parseFloat(b.revenue || "0");
                  const profit = parseFloat(b.net_profit || "0");
                  const height = Math.max((rev / maxRevenue) * 140, 4);
                  return (
                    <div key={i} onClick={() => router.push(`/breaks/${b.id}`)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
                      <div style={{ fontSize: 9, color: "#555", textAlign: "center" }}>${(rev / 1000).toFixed(1)}k</div>
                      <div style={{ width: "100%", height, background: profit >= 0 ? "linear-gradient(180deg,#a78bfa,#7c3aed)" : "linear-gradient(180deg,#f87171,#dc2626)", borderRadius: "4px 4px 0 0", minHeight: 4 }} title={`${b.box_name}: $${rev.toFixed(2)}`} />
                      <div style={{ fontSize: 9, color: "#444", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", maxWidth: "100%" }}>{b.date?.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: "#555" }}>
                <span>🟣 Profitable</span>
                <span>🔴 Loss</span>
                <span style={{ marginLeft: "auto" }}>Click a bar to view break details</span>
              </div>
            </div>
          )}

          {/* Supply spend breakdown */}
          <div style={s.section}>
            <div style={s.sectionTitle}>💸 Expense breakdown ({period})</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <div style={s.expenseRow}><span style={{ color: "#777" }}>Shipping supplies</span><span style={{ color: "#f87171" }}>${totalSupplyCost.toFixed(2)}</span></div>
                <div style={s.expenseRow}><span style={{ color: "#777" }}>Coupon spend</span><span style={{ color: "#f87171" }}>${totalCouponCost.toFixed(2)}</span></div>
                <div style={s.expenseRow}><span style={{ color: "#777" }}>Promotion spend</span><span style={{ color: "#f87171" }}>${totalPromoCost.toFixed(2)}</span></div>
                <div style={{ ...s.expenseRow, borderBottom: "none" }}><span style={{ color: "#777" }}>Chaser card costs</span><span style={{ color: "#f87171" }}>${totalChaserCost.toFixed(2)}</span></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#0f0f0f", borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".4px" }}>Total expenses</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#f87171" }}>${totalExpenses.toFixed(2)}</div>
                {totalRevenue > 0 && <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>{((totalExpenses / totalRevenue) * 100).toFixed(1)}% of revenue</div>}
                <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>across {filtered.length} break{filtered.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
          </div>

          {/* Top buyers + Best breaks */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={s.section}>
              <div style={s.sectionTitle}>👥 Top 10 buyers ({period})</div>
              {topBuyers.length === 0 ? <p style={{ color: "#555", fontSize: 13 }}>No data for this period</p> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ background: "#0f0f0f" }}>
                    <th style={s.th}>#</th>
                    <th style={s.th}>Buyer</th>
                    <th style={s.th}>Total spent</th>
                  </tr></thead>
                  <tbody>
                    {topBuyers.map(([username, total], i) => (
                      <tr key={i} onClick={() => router.push(`/customers/${encodeURIComponent(username)}`)}
                        style={{ borderBottom: "1px solid #161616", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#1a1a1a")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ ...s.td, color: i === 0 ? "#fb923c" : i === 1 ? "#aaa" : i === 2 ? "#cd7f32" : "#555", fontWeight: 700 }}>#{i + 1}</td>
                        <td style={{ ...s.td, color: "#a78bfa" }}>{username}</td>
                        <td style={{ ...s.td, color: "#4ade80", fontWeight: 600 }}>${total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={s.section}>
              <div style={s.sectionTitle}>🏆 Best breaks by profit ({period})</div>
              {bestBreaks.length === 0 ? <p style={{ color: "#555", fontSize: 13 }}>No data for this period</p> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ background: "#0f0f0f" }}>
                    <th style={s.th}>#</th>
                    <th style={s.th}>Break</th>
                    <th style={s.th}>Revenue</th>
                    <th style={s.th}>Profit</th>
                  </tr></thead>
                  <tbody>
                    {bestBreaks.map((b, i) => (
                      <tr key={i} onClick={() => router.push(`/breaks/${b.id}`)}
                        style={{ borderBottom: "1px solid #161616", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#1a1a1a")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ ...s.td, color: i === 0 ? "#fb923c" : i === 1 ? "#aaa" : i === 2 ? "#cd7f32" : "#555", fontWeight: 700 }}>#{i + 1}</td>
                        <td style={{ ...s.td, color: "#e5e5e5" }}>{b.box_name || b.date}</td>
                        <td style={{ ...s.td, color: "#4ade80" }}>${parseFloat(b.revenue || "0").toFixed(2)}</td>
                        <td style={{ ...s.td, color: "#a78bfa", fontWeight: 600 }}>${parseFloat(b.net_profit || "0").toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </>}
      </div>
    </div>
  );
}