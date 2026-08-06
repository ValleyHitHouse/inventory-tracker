"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const WHATNOT_FEE = 0.112;

export default function BreakDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [brk, setBrk] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [chasers, setChasers] = useState<any[]>([]);
  const [juicedGiveaways, setJuicedGiveaways] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const [markingPaid, setMarkingPaid] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [brkRes, ordersRes, chasersRes, juicedRes] = await Promise.all([
        supabase.from("Breaks").select("*").eq("id", id).single(),
        supabase.from("BreakOrders").select("*").eq("break_id", id).order("price", { ascending: false }),
        supabase.from("BreakChasers").select("*").eq("break_id", id),
        supabase.from("juiced_giveaways").select("*").eq("break_id", id),
      ]);
      if (brkRes.data) setBrk(brkRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
      if (chasersRes.data) setChasers(chasersRes.data);
      if (juicedRes.data) setJuicedGiveaways(juicedRes.data);
      setLoading(false);
    }
    load();
  }, [id]);

  async function markCommissionPaid() {
    setMarkingPaid(true);
    await supabase.from("Breaks").update({ commission_paid: true, commission_paid_at: new Date().toISOString() }).eq("id", id);
    setBrk((prev: any) => ({ ...prev, commission_paid: true, commission_paid_at: new Date().toISOString() }));
    setMarkingPaid(false);
  }

  async function unmarkCommissionPaid() {
    setMarkingPaid(true);
    await supabase.from("Breaks").update({ commission_paid: false, commission_paid_at: null }).eq("id", id);
    setBrk((prev: any) => ({ ...prev, commission_paid: false, commission_paid_at: null }));
    setMarkingPaid(false);
  }

  const mobileStyles = `
    .detail-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 16px; }
    .detail-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
    @media (max-width: 768px) {
      .detail-grid-4 { grid-template-columns: 1fr 1fr; }
      .detail-grid-2 { grid-template-columns: 1fr 1fr; }
    }
  `;

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" },
    content: { padding: "24px 16px", maxWidth: 1200, margin: "0 auto" },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    statCard: { background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 18px" },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const },
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
  const commissionAmount = parseFloat(brk.commission_amount || "0");

  const payingOrders = orders.filter(o => parseFloat(o.price || "0") > 0 && !o.cancelled);
  const freeOrders = orders.filter(o => parseFloat(o.price || "0") === 0);
  const cancelledOrders = orders.filter(o => o.cancelled);

  const filteredOrders = orders.filter(o => {
    if (!orderSearch) return true;
    const q = orderSearch.toLowerCase();
    return o.buyer_username?.toLowerCase().includes(q) || o.product_name?.toLowerCase().includes(q) || o.tracking_code?.toLowerCase().includes(q);
  });

  const buyerMap: Record<string, { total: number; orders: number }> = {};
  payingOrders.forEach(o => {
    const b = o.buyer_username || "Unknown";
    if (!buyerMap[b]) buyerMap[b] = { total: 0, orders: 0 };
    buyerMap[b].total += parseFloat(o.price || "0");
    buyerMap[b].orders += 1;
  });
  const topBuyers = Object.entries(buyerMap).sort((a, b) => b[1].total - a[1].total).slice(0, 5);

  const juicedCount = juicedGiveaways.reduce((s, g) => s + (g.quantity || 0), 0);
  const juicedCostBasis = juicedGiveaways.reduce((s, g) => s + parseFloat(g.cost_basis || "0"), 0);
  const juicedFMV = juicedGiveaways.reduce((s, g) => s + parseFloat(g.fmv || "0"), 0);

  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => router.push("/dashboard/breaks")} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer", marginBottom: 12 }}>← Back to breaks</button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#e5e5e5" }}>{brk.box_name || "Break"}</h1>
              <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
                {brk.date} · {brk.spots_sold} spots · {brk.free_giveaways} giveaways
                {brk.breaker && <span style={{ color: "#a78bfa", marginLeft: 8 }}>· 🎙️ {brk.breaker}</span>}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {brk.boba_submitted ? (
                <span style={{ fontSize: 12, padding: "6px 14px", borderRadius: 20, background: "#16653422", color: "#4ade80", fontWeight: 600 }}>✓ BOBA Submitted</span>
              ) : (
                <a href="https://forms.gle/rictfCC5LUxrChqP7" target="_blank" style={{ fontSize: 12, padding: "6px 14px", borderRadius: 20, background: "#fb923c22", color: "#fb923c", fontWeight: 600, textDecoration: "none", border: "1px solid #fb923c44" }}>
                  📋 Submit BOBA ↗
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Commission banner */}
        {commissionAmount > 0 && (
          <div style={{ background: "#0f0a1a", border: "1px solid #a78bfa44", borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>
                  💼 {brk.breaker} commission · {percentToMarket.toFixed(1)}% to market
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa" }}>${commissionAmount.toFixed(2)}</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                  Valley take: ${valleyTake.toFixed(2)} · Valley net after commission: ${(valleyTake - commissionAmount).toFixed(2)}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: brk.commission_paid ? "#4ade8022" : "#f8717122", color: brk.commission_paid ? "#4ade80" : "#f87171", fontWeight: 600 }}>
                  {brk.commission_paid ? "✓ Paid" : "Unpaid"}
                </span>
                {brk.commission_paid ? (
                  <button onClick={unmarkCommissionPaid} disabled={markingPaid} style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#555", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                    Undo
                  </button>
                ) : (
                  <button onClick={markCommissionPaid} disabled={markingPaid} style={{ fontSize: 12, background: "#a78bfa22", border: "1px solid #a78bfa44", color: "#a78bfa", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 600 }}>
                    {markingPaid ? "..." : "Mark as paid"}
                  </button>
                )}
                {brk.commission_paid_at && (
                  <div style={{ fontSize: 11, color: "#555" }}>Paid {new Date(brk.commission_paid_at).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Juiced giveaways banner */}
        {juicedCount > 0 ? (
          <div style={{ background: "#1a1500", border: "1px solid #fbbf2444", borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>🎁 {juicedCount} juiced giveaway{juicedCount !== 1 ? "s" : ""} this break</span>
              <span style={{ fontSize: 12, color: "#fb923c" }}>Cost basis: <strong>${juicedCostBasis.toFixed(2)}</strong></span>
              <span style={{ fontSize: 12, color: "#4ade80" }}>FMV: <strong>${juicedFMV.toFixed(2)}</strong></span>
            </div>
            <Link href="/dashboard/giveaways" style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, background: "#fbbf2422", color: "#fbbf24", border: "1px solid #fbbf2444", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
              View in Giveaways ↗
            </Link>
          </div>
        ) : (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "12px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#555" }}>🎁 No juiced giveaways logged for this break</span>
            <Link href="/dashboard/giveaways" style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, background: "#a78bfa22", color: "#a78bfa", border: "1px solid #a78bfa44", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
              + Log Juiced Giveaway
            </Link>
          </div>
        )}

        {/* Key stats */}
        <div className="detail-grid-4">
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Revenue</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#4ade80" }}>${revenue.toFixed(2)}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Net profit</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: netProfit >= 0 ? "#a78bfa" : "#f87171" }}>${netProfit.toFixed(2)}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>BOBA (70%)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fb923c" }}>${imcTake.toFixed(2)}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Valley (30%)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#38bdf8" }}>${valleyTake.toFixed(2)}</div>
          </div>
        </div>

        <div className="detail-grid-4">
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Before fees</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e5e5e5" }}>${revenueBeforeFees.toFixed(2)}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Fees (11.2%)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f87171" }}>-${whatnotFees.toFixed(2)}</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>% to market</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: percentToMarket >= 100 ? "#4ade80" : percentToMarket > 0 ? "#fb923c" : "#555" }}>
              {marketValue > 0 ? `${percentToMarket.toFixed(1)}%` : "—"}
            </div>
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
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
          <div className="detail-grid-2">
            <div style={{ background: "#0f0f0f", border: "1px solid #fb923c33", borderRadius: 10, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#fb923c", marginBottom: 4 }}>BOBA TAKE (70%)</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#fb923c" }}>${imcTake.toFixed(2)}</div>
            </div>
            <div style={{ background: "#0f0f0f", border: "1px solid #38bdf833", borderRadius: 10, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#38bdf8", marginBottom: 4 }}>VALLEY TAKE (30%)</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#38bdf8" }}>${valleyTake.toFixed(2)}</div>
              {commissionAmount > 0 && (
                <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 6 }}>
                  Commission: -${commissionAmount.toFixed(2)}<br />
                  <span style={{ color: "#38bdf8", fontWeight: 700 }}>Net: ${(valleyTake - commissionAmount).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Juiced giveaways detail */}
        {juicedGiveaways.length > 0 && (
          <div style={s.section}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={s.sectionTitle}>🎁 Juiced giveaways</div>
              <Link href="/dashboard/giveaways" style={{ fontSize: 12, color: "#a78bfa", textDecoration: "none" }}>View all ↗</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {juicedGiveaways.map((g, i) => (
                <div key={i} style={{ background: "#0f0f0f", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: "#e5e5e5", fontWeight: 600, fontSize: 13 }}>{g.card_name}</span>
                    <span style={{ fontSize: 11, color: "#555" }}>{g.set_name}{g.parallel ? ` · ${g.parallel}` : ""}</span>
                    <span style={{ fontSize: 11, color: "#a78bfa" }}>×{g.quantity}</span>
                    {g.notes && <span style={{ fontSize: 11, color: "#444" }}>{g.notes}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#555" }}>Cost Basis</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fb923c" }}>${parseFloat(g.cost_basis || "0").toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#555" }}>FMV</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>${parseFloat(g.fmv || "0").toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chasers */}
        {chasers.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>🃏 Cards used in this break</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {chasers.map((c, i) => (
                <div key={i} style={{ background: "#0f0f0f", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#a78bfa22", color: "#a78bfa" }}>{c.type}</span>
                    <span style={{ color: "#e5e5e5", fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                    <span style={{ fontSize: 12, color: "#555" }}>×{c.quantity}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#fb923c" }}>${parseFloat(c.value || "0").toFixed(2)} ea</span>
                    <span style={{ fontSize: 13, color: "#4ade80", fontWeight: 600 }}>${(parseFloat(c.value || "0") * c.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top buyers */}
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div style={s.sectionTitle}>📋 All orders ({orders.length})</div>
            <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#555", flexWrap: "wrap" }}>
              <span>✅ {payingOrders.length} paid</span>
              <span>🎁 {freeOrders.length} free</span>
              {cancelledOrders.length > 0 && <span>❌ {cancelledOrders.length} cancelled</span>}
            </div>
          </div>
          <input style={{ ...s.input, marginBottom: 12 }} placeholder="🔍 Search buyer, product, tracking..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
          {filteredOrders.length === 0 ? (
            <p style={{ color: "#555", fontSize: 13 }}>No orders found</p>
          ) : (
            <div style={{ maxHeight: 500, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredOrders.map((o, i) => (
                <div key={i} style={{ background: "#0f0f0f", borderRadius: 8, padding: "10px 14px", opacity: o.cancelled ? 0.4 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <span style={{ color: "#a78bfa", fontWeight: 600, fontSize: 13 }}>{o.buyer_username || "—"}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: parseFloat(o.price || "0") === 0 ? "#555" : "#4ade80", fontWeight: 600, fontSize: 13 }}>
                        {parseFloat(o.price || "0") === 0 ? "Free" : `$${parseFloat(o.price).toFixed(2)}`}
                      </span>
                      {o.cancelled ? (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f8717122", color: "#f87171" }}>Cancelled</span>
                      ) : parseFloat(o.price || "0") === 0 ? (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#fb923c22", color: "#fb923c" }}>Giveaway</span>
                      ) : (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#4ade8022", color: "#4ade80" }}>Paid</span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#777", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.product_name || "—"}</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {o.tracking_code && <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>{o.tracking_code}</span>}
                    {o.placed_at && <span style={{ fontSize: 11, color: "#555" }}>{new Date(o.placed_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}