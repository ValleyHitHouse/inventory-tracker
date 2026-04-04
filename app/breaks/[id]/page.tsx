"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";

const weaponColors: Record<string, string> = {
  Fire: "#fb923c", Ice: "#38bdf8", Steel: "#94a3b8",
  Gum: "#f472b6", Hex: "#a78bfa", Glow: "#4ade80", Brawl: "#f87171"
};

const WHATNOT_FEE = 0.112;

export default function BreakDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [brk, setBrk] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [chasers, setChasers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [brkRes, ordersRes, chasersRes] = await Promise.all([
        supabase.from("Breaks").select("*").eq("id", id).single(),
        supabase.from("BreakOrders").select("*").eq("break_id", id).order("price", { ascending: false }),
        supabase.from("BreakChasers").select("*").eq("break_id", id),
      ]);
      if (brkRes.data) setBrk(brkRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
      if (chasersRes.data) setChasers(chasersRes.data);
      setLoading(false);
    }
    load();
  }, [id]);

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" },
    content: { padding: 32, maxWidth: 1200, margin: "0 auto" },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    th: { padding: "10px 14px", textAlign: "left" as const, color: "#444", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".4px", borderBottom: "1px solid #1e1e1e" },
    td: { padding: "11px 14px", fontSize: 13, borderBottom: "1px solid #161616" },
    statCard: { background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 18px" },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none" },
    expenseRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #161616", fontSize: 13 },
  };

  if (loading) return (
    <div style={{ ...s.shell, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#555" }}>Loading break details...</p>
    </div>
  );

  if (!brk) return (
    <div style={{ ...s.shell, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#555" }}>Break not found.</p>
    </div>
  );

  const revenue = parseFloat(brk.revenue || "0");
  const netProfit = parseFloat(brk.net_profit || "0");
  const imcTake = parseFloat(brk.imc_take || "0");
  const valleyTake = parseFloat(brk.valley_take || "0");
  const couponTotal = parseFloat(brk.coupon_total || "0");
  const promotionTotal = parseFloat(brk.promotion_total || "0");
  const totalSupplyCost = parseFloat(brk.total_supply_cost || "0");
  const chaserCost = parseFloat(brk.chaser_cost || "0");
  const revenueBeforeFees = parseFloat(brk.revenue_before_fees || "0") || revenue / (1 - WHATNOT_FEE);
  const whatnotFees = revenueBeforeFees * WHATNOT_FEE;
  const marketValue = parseFloat(brk.market_value || "0");
const percentToMarket = marketValue > 0 ? (revenueBeforeFees / marketValue) * 100 : 0;

  const payingOrders = orders.filter(o => parseFloat(o.price || "0") > 0 && !o.cancelled);
  const freeOrders = orders.filter(o => parseFloat(o.price || "0") === 0);
  const cancelledOrders = orders.filter(o => o.cancelled);

  const filteredOrders = orders.filter(o => {
    if (!orderSearch) return true;
    const q = orderSearch.toLowerCase();
    return o.buyer_username?.toLowerCase().includes(q) || o.product_name?.toLowerCase().includes(q) || o.tracking_code?.toLowerCase().includes(q);
  });

  // Aggregate buyers
  const buyerMap: Record<string, { total: number, orders: number }> = {};
  payingOrders.forEach(o => {
    const b = o.buyer_username || "Unknown";
    if (!buyerMap[b]) buyerMap[b] = { total: 0, orders: 0 };
    buyerMap[b].total += parseFloat(o.price || "0");
    buyerMap[b].orders += 1;
  });
  const topBuyers = Object.entries(buyerMap).sort((a, b) => b[1].total - a[1].total).slice(0, 5);

  return (
    <div style={s.shell}>
      <div style={s.content}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <button onClick={() => router.push("/breaks")} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer", marginBottom: 12 }}>← Back to breaks</button>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: "#e5e5e5" }}>{brk.box_name || "Break"}</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>{brk.date} · {brk.spots_sold} spots sold · {brk.free_giveaways} giveaways</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {brk.boba_submitted ? (
              <span style={{ fontSize: 12, padding: "6px 14px", borderRadius: 20, background: "#16653422", color: "#4ade80", fontWeight: 600 }}>✓ BOBA Submitted</span>
            ) : (
              <span style={{ fontSize: 12, padding: "6px 14px", borderRadius: 20, background: "#f8717122", color: "#f87171", fontWeight: 600 }}>✗ Not submitted to BOBA</span>
            )}
          </div>
        </div>

        {/* Key stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Revenue (after fees)</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80" }}>${revenue.toFixed(2)}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Net profit</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: netProfit >= 0 ? "#a78bfa" : "#f87171" }}>${netProfit.toFixed(2)}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>BOBA take (70%)</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fb923c" }}>${imcTake.toFixed(2)}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Valley take (30%)</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8" }}>${valleyTake.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Revenue before fees</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e5e5e5" }}>${revenueBeforeFees.toFixed(2)}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Whatnot fees (11.2%)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f87171" }}>-${whatnotFees.toFixed(2)}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>% to market</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: percentToMarket >= 100 ? "#4ade80" : percentToMarket > 0 ? "#fb923c" : "#555" }}>
              {marketValue > 0 ? `${percentToMarket.toFixed(1)}%` : "—"}
            </div>
            {marketValue > 0 && <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>of ${marketValue.toFixed(2)} market value</div>}
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Coupon spend</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f87171" }}>-${couponTotal.toFixed(2)}</div>
          </div>
        </div>

        {/* Box breakdown */}
        {(brk.jumbo_hobby_count > 0 || brk.hobby_count > 0 || brk.double_mega_count > 0 || brk.blaster_count > 0) && (
          <div style={s.section}>
            <div style={s.sectionTitle}>📦 Box breakdown</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {brk.jumbo_hobby_count > 0 && <div style={{ background: "#fb923c22", border: "1px solid #fb923c44", borderRadius: 8, padding: "10px 16px", textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#fb923c" }}>{brk.jumbo_hobby_count}</div><div style={{ fontSize: 11, color: "#fb923c" }}>Jumbo Hobby</div></div>}
              {brk.hobby_count > 0 && <div style={{ background: "#a78bfa22", border: "1px solid #a78bfa44", borderRadius: 8, padding: "10px 16px", textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#a78bfa" }}>{brk.hobby_count}</div><div style={{ fontSize: 11, color: "#a78bfa" }}>Hobby</div></div>}
              {brk.double_mega_count > 0 && <div style={{ background: "#38bdf822", border: "1px solid #38bdf844", borderRadius: 8, padding: "10px 16px", textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#38bdf8" }}>{brk.double_mega_count}</div><div style={{ fontSize: 11, color: "#38bdf8" }}>Double Mega</div></div>}
              {brk.blaster_count > 0 && <div style={{ background: "#4ade8022", border: "1px solid #4ade8044", borderRadius: 8, padding: "10px 16px", textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#4ade80" }}>{brk.blaster_count}</div><div style={{ fontSize: 11, color: "#4ade80" }}>Blaster</div></div>}
            </div>
          </div>
        )}

        {/* Financials recap */}
        <div style={s.section}>
          <div style={s.sectionTitle}>💰 Financials recap</div>
          <div style={s.expenseRow}><span style={{ color: "#777" }}>Revenue after fees</span><span style={{ color: "#4ade80" }}>${revenue.toFixed(2)}</span></div>
          <div style={s.expenseRow}><span style={{ color: "#777" }}>Coupon spend</span><span style={{ color: "#f87171" }}>-${couponTotal.toFixed(2)}</span></div>
          <div style={s.expenseRow}><span style={{ color: "#777" }}>Promotion total</span><span style={{ color: "#f87171" }}>-${promotionTotal.toFixed(2)}</span></div>
          <div style={s.expenseRow}><span style={{ color: "#777" }}>Supply costs</span><span style={{ color: "#f87171" }}>-${totalSupplyCost.toFixed(2)}</span></div>
          <div style={s.expenseRow}><span style={{ color: "#777" }}>Chaser card costs</span><span style={{ color: "#f87171" }}>-${chaserCost.toFixed(2)}</span></div>
          <div style={{ ...s.expenseRow, borderBottom: "none", marginTop: 8 }}>
            <span style={{ color: "#aaa", fontWeight: 700, fontSize: 14 }}>Net profit</span>
            <span style={{ color: netProfit >= 0 ? "#4ade80" : "#f87171", fontWeight: 800, fontSize: 20 }}>${netProfit.toFixed(2)}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
            <div style={{ background: "#0f0f0f", border: "1px solid #fb923c33", borderRadius: 10, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#fb923c", marginBottom: 4 }}>BOBA TAKE (70%)</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#fb923c" }}>${imcTake.toFixed(2)}</div>
            </div>
            <div style={{ background: "#0f0f0f", border: "1px solid #38bdf833", borderRadius: 10, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#38bdf8", marginBottom: 4 }}>VALLEY TAKE (30%)</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#38bdf8" }}>${valleyTake.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Chasers used */}
        {chasers.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>🃏 Cards used in this break</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#0f0f0f" }}>
                <th style={s.th}>Type</th>
                <th style={s.th}>Card</th>
                <th style={s.th}>Qty</th>
                <th style={s.th}>Value</th>
                <th style={s.th}>Total cost</th>
              </tr></thead>
              <tbody>
                {chasers.map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #161616" }}>
                    <td style={s.td}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#a78bfa22", color: "#a78bfa" }}>{c.type}</span></td>
                    <td style={{ ...s.td, color: "#e5e5e5", fontWeight: 600 }}>{c.name}</td>
                    <td style={{ ...s.td, color: "#aaa" }}>{c.quantity}</td>
                    <td style={{ ...s.td, color: "#fb923c" }}>${parseFloat(c.value || "0").toFixed(2)}</td>
                    <td style={{ ...s.td, color: "#4ade80", fontWeight: 600 }}>${(parseFloat(c.value || "0") * c.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Top buyers this break */}
        {topBuyers.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>🏆 Top buyers this break</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topBuyers.map(([username, { total, orders: orderCount }], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#0f0f0f", borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? "#fb923c" : i === 1 ? "#aaa" : i === 2 ? "#cd7f32" : "#555" }}>#{i + 1}</span>
                    <span style={{ color: "#a78bfa", fontWeight: 600 }}>{username}</span>
                    <span style={{ fontSize: 11, color: "#555" }}>{orderCount} order{orderCount > 1 ? "s" : ""}</span>
                  </div>
                  <span style={{ color: "#4ade80", fontWeight: 700 }}>${total.toFixed(2)}</span>
                </div>
              ))}
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
          <input style={{ ...s.input, marginBottom: 12 }} placeholder="🔍 Search by buyer, product, tracking..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
          {filteredOrders.length === 0 ? (
            <p style={{ color: "#555", fontSize: 13 }}>No orders found</p>
          ) : (
            <div style={{ maxHeight: 500, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0 }}><tr style={{ background: "#0f0f0f" }}>
                  <th style={s.th}>Buyer</th>
                  <th style={s.th}>Product</th>
                  <th style={s.th}>Price</th>
                  <th style={s.th}>Tracking</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Date</th>
                </tr></thead>
                <tbody>
                  {filteredOrders.map((o, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #161616", opacity: o.cancelled ? 0.4 : 1 }}>
                      <td style={{ ...s.td, color: "#a78bfa", fontWeight: 600 }}>{o.buyer_username || "—"}</td>
                      <td style={{ ...s.td, color: "#777", fontSize: 12 }}>{o.product_name || "—"}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}