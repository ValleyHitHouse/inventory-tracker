"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [invItems, setInvItems] = useState<any[]>([]);
  const [breaks, setBreaks] = useState<any[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [lotComps, setLotComps] = useState<any[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      const [inv, brk, orders, lots, settings] = await Promise.all([
        supabase.from("Inventory").select("*"),
        supabase.from("Breaks").select("*").order("date", { ascending: false }),
        supabase.from("BreakOrders").select("buyer_username").eq("cancelled", false),
        supabase.from("lotcomps").select("*").order("created_at", { ascending: false }),
        supabase.from("settings").select("key,value"),
      ]);
      if (inv.data) setInvItems(inv.data);
      if (brk.data) setBreaks(brk.data);
      if (orders.data) {
        const unique = new Set(orders.data.map((r: any) => r.buyer_username).filter(Boolean));
        setCustomerCount(unique.size);
      }
      if (lots.data) setLotComps(lots.data);
      if (settings.data) {
        const p: Record<string, number> = {};
        for (const row of settings.data) p[row.key] = parseFloat(row.value || "0");
        setMarketPrices(p);
      }
      setLoading(false);
    }
    load();
  }, []);

  const lastBreak = breaks[0];
  const lowStockItems = invItems.filter(i => i.quantity <= 20 && i.quantity > 0);
  const outOfStockItems = invItems.filter(i => i.quantity === 0);
  const pendingLots = lotComps.filter(l => l.status === "pending");
  const acceptedLots = lotComps.filter(l => l.status === "accepted");
  const inTransitLots = lotComps.filter(l => l.status === "in_transit");
  const unsubmittedBreaks = breaks.filter(b => !b.boba_submitted);

  const totalRevenue = breaks.reduce((s, b) => s + parseFloat(b.revenue || "0"), 0);
  const totalProfit = breaks.reduce((s, b) => s + parseFloat(b.net_profit || "0"), 0);
  const totalValley = breaks.reduce((s, b) => s + parseFloat(b.valley_take || "0"), 0);
  const totalBOBA = breaks.reduce((s, b) => s + parseFloat(b.imc_take || "0"), 0);

  const marketValue = lastBreak ? (
    (lastBreak.jumbo_hobby_count || 0) * (marketPrices.jumbo_hobby_price || 0) +
    (lastBreak.hobby_count || 0) * (marketPrices.hobby_price || 0) +
    (lastBreak.double_mega_count || 0) * (marketPrices.double_mega_price || 0) +
    (lastBreak.blaster_count || 0) * (marketPrices.blaster_price || 0)
  ) : 0;

  const lastBreakRevenue = lastBreak ? parseFloat(lastBreak.revenue || "0") / (1 - 0.112) : 0;
  const percentToMarket = marketValue > 0 ? (lastBreakRevenue / marketValue) * 100 : 0;

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", padding: 32 },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    statCard: { background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 10, padding: "16px 20px" },
    label: { fontSize: 11, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".5px", marginBottom: 6 },
    alertItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #161616", fontSize: 13 },
  };

  if (loading) return (
    <div style={{ ...s.shell, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#555" }}>Loading...</p>
    </div>
  );

  return (
    <div style={s.shell}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fb923c", margin: 0 }}>ValleyHitHouse</h1>
        <p style={{ fontSize: 14, color: "#555", marginTop: 6 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Alerts row */}
      {(outOfStockItems.length > 0 || lowStockItems.length > 0 || unsubmittedBreaks.length > 0 || pendingLots.length > 0) && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          {outOfStockItems.length > 0 && (
            <Link href="/inventory" style={{ textDecoration: "none", flex: 1, minWidth: 200 }}>
              <div style={{ background: "#1a0000", border: "1px solid #f8717144", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>🚨</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f87171" }}>{outOfStockItems.length} item{outOfStockItems.length > 1 ? "s" : ""} out of stock</div>
                  <div style={{ fontSize: 11, color: "#555" }}>{outOfStockItems.map(i => i.name).join(", ")}</div>
                </div>
              </div>
            </Link>
          )}
          {lowStockItems.length > 0 && (
            <Link href="/inventory" style={{ textDecoration: "none", flex: 1, minWidth: 200 }}>
              <div style={{ background: "#1a0f00", border: "1px solid #fb923c44", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fb923c" }}>{lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} low stock</div>
                  <div style={{ fontSize: 11, color: "#555" }}>{lowStockItems.slice(0, 3).map(i => i.name).join(", ")}{lowStockItems.length > 3 ? ` +${lowStockItems.length - 3} more` : ""}</div>
                </div>
              </div>
            </Link>
          )}
          {unsubmittedBreaks.length > 0 && (
            <Link href="/breaks" style={{ textDecoration: "none", flex: 1, minWidth: 200 }}>
              <div style={{ background: "#0d0d1a", border: "1px solid #a78bfa44", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>📋</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa" }}>{unsubmittedBreaks.length} break{unsubmittedBreaks.length > 1 ? "s" : ""} not submitted to BOBA</div>
                  <div style={{ fontSize: 11, color: "#555" }}>Click to submit</div>
                </div>
              </div>
            </Link>
          )}
          {pendingLots.length > 0 && (
            <Link href="/lot-comp" style={{ textDecoration: "none", flex: 1, minWidth: 200 }}>
              <div style={{ background: "#0d1a0d", border: "1px solid #4ade8044", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>🏷️</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#4ade80" }}>{pendingLots.length} lot{pendingLots.length > 1 ? "s" : ""} awaiting seller response</div>
                  <div style={{ fontSize: 11, color: "#555" }}>Click to view</div>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* All time stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <div style={s.statCard}>
          <div style={s.label}>Total revenue</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80" }}>${totalRevenue.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>All {breaks.length} breaks</div>
        </div>
        <div style={s.statCard}>
          <div style={s.label}>Net profit</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: totalProfit >= 0 ? "#a78bfa" : "#f87171" }}>${totalProfit.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>After all expenses</div>
        </div>
        <div style={s.statCard}>
          <div style={s.label}>BOBA total</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fb923c" }}>${totalBOBA.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>70% of profit</div>
        </div>
        <div style={s.statCard}>
          <div style={s.label}>Valley total</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#38bdf8" }}>${totalValley.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>30% of profit</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <div style={s.statCard}>
          <div style={s.label}>Breaks logged</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#e5e5e5" }}>{breaks.length}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.label}>Total customers</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#e5e5e5" }}>{customerCount}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.label}>Inventory SKUs</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#e5e5e5" }}>{invItems.length}</div>
          {outOfStockItems.length > 0 && <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>{outOfStockItems.length} out of stock</div>}
        </div>
        <div style={s.statCard}>
          <div style={s.label}>Active lot comps</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#e5e5e5" }}>{lotComps.filter(l => l.status !== "received").length}</div>
          {inTransitLots.length > 0 && <div style={{ fontSize: 11, color: "#38bdf8", marginTop: 4 }}>{inTransitLots.length} in transit</div>}
        </div>
      </div>

      {/* Last break */}
      {lastBreak && (
        <div style={s.section}>
          <div style={s.sectionTitle}>🎴 Last break</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            <div>
              <div style={s.label}>Date</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#aaa" }}>{lastBreak.date}</div>
            </div>
            <div>
              <div style={s.label}>Box</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#e5e5e5" }}>{lastBreak.box_name || "—"}</div>
            </div>
            <div>
              <div style={s.label}>Revenue</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#4ade80" }}>${parseFloat(lastBreak.revenue || "0").toFixed(2)}</div>
            </div>
            <div>
              <div style={s.label}>Net profit</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: parseFloat(lastBreak.net_profit || "0") >= 0 ? "#a78bfa" : "#f87171" }}>
                ${parseFloat(lastBreak.net_profit || "0").toFixed(2)}
              </div>
            </div>
            <div>
              <div style={s.label}>% to market</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: percentToMarket >= 100 ? "#4ade80" : percentToMarket > 0 ? "#fb923c" : "#555" }}>
                {marketValue > 0 ? `${percentToMarket.toFixed(1)}%` : "—"}
              </div>
            </div>
          </div>
          {(lastBreak.jumbo_hobby_count > 0 || lastBreak.hobby_count > 0 || lastBreak.double_mega_count > 0 || lastBreak.blaster_count > 0) && (
            <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
              {lastBreak.jumbo_hobby_count > 0 && <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "#fb923c22", color: "#fb923c" }}>Jumbo Hobby ×{lastBreak.jumbo_hobby_count}</span>}
              {lastBreak.hobby_count > 0 && <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "#a78bfa22", color: "#a78bfa" }}>Hobby ×{lastBreak.hobby_count}</span>}
              {lastBreak.double_mega_count > 0 && <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "#38bdf822", color: "#38bdf8" }}>Double Mega ×{lastBreak.double_mega_count}</span>}
              {lastBreak.blaster_count > 0 && <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "#4ade8022", color: "#4ade80" }}>Blaster ×{lastBreak.blaster_count}</span>}
            </div>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "#555" }}>
              Spots sold: <span style={{ color: "#aaa" }}>{lastBreak.spots_sold}</span>
            </div>
            <div style={{ fontSize: 12, color: "#555" }}>
              BOBA: <span style={{ color: "#fb923c" }}>${parseFloat(lastBreak.imc_take || "0").toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 12, color: "#555" }}>
              Valley: <span style={{ color: "#4ade80" }}>${parseFloat(lastBreak.valley_take || "0").toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 12, color: "#555" }}>
              BOBA submitted: <span style={{ color: lastBreak.boba_submitted ? "#4ade80" : "#f87171" }}>{lastBreak.boba_submitted ? "✓ Yes" : "✗ No"}</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Lot comps status */}
        <div style={s.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={s.sectionTitle}>🏷️ Lot comps</div>
            <Link href="/lot-comp" style={{ fontSize: 12, color: "#555", textDecoration: "none" }}>View all →</Link>
          </div>
          {lotComps.length === 0 ? (
            <p style={{ color: "#555", fontSize: 13 }}>No lots yet</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Pending", count: pendingLots.length, color: "#fb923c" },
                  { label: "Accepted", count: acceptedLots.length, color: "#a78bfa" },
                  { label: "In transit", count: inTransitLots.length, color: "#38bdf8" },
                  { label: "Arrived", count: lotComps.filter(l => l.status === "arrived").length, color: "#4ade80" },
                ].map(({ label, count, color }) => (
                  <div key={label} style={{ background: "#0f0f0f", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color }}>{count}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{label}</div>
                  </div>
                ))}
              </div>
              {lotComps.filter(l => ["pending","accepted","in_transit","arrived"].includes(l.status)).slice(0, 4).map((lot, i) => (
                <div key={i} style={{ ...s.alertItem, fontSize: 12 }}>
                  <span style={{ color: "#aaa" }}>{lot.lot_name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#4ade80" }}>${parseFloat(lot.total_offer || "0").toFixed(2)}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: lot.status === "pending" ? "#fb923c22" : lot.status === "in_transit" ? "#38bdf822" : lot.status === "arrived" ? "#4ade8022" : "#a78bfa22", color: lot.status === "pending" ? "#fb923c" : lot.status === "in_transit" ? "#38bdf8" : lot.status === "arrived" ? "#4ade80" : "#a78bfa" }}>
                      {lot.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Low stock */}
        <div style={s.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={s.sectionTitle}>📦 Stock alerts</div>
            <Link href="/inventory" style={{ fontSize: 12, color: "#555", textDecoration: "none" }}>View inventory →</Link>
          </div>
          {outOfStockItems.length === 0 && lowStockItems.length === 0 ? (
            <p style={{ color: "#4ade80", fontSize: 13 }}>✓ All items well stocked</p>
          ) : (
            <>
              {outOfStockItems.map((item, i) => (
                <div key={i} style={s.alertItem}>
                  <span style={{ color: "#e5e5e5" }}>{item.name}</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f8717122", color: "#f87171" }}>Out of stock</span>
                </div>
              ))}
              {lowStockItems.map((item, i) => (
                <div key={i} style={s.alertItem}>
                  <div>
                    <span style={{ color: "#e5e5e5" }}>{item.name}</span>
                    <span style={{ color: "#555", fontSize: 11, marginLeft: 8 }}>{item.quantity} left</span>
                  </div>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#fb923c22", color: "#fb923c" }}>Low stock</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Quick nav */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        {[
          { href: "/breaks", label: "→ Log a break", color: "#f472b6" },
          { href: "/lot-comp", label: "→ New lot comp", color: "#a78bfa" },
          { href: "/card-inventory", label: "→ Card inventory", color: "#fb923c" },
          { href: "/analytics", label: "→ Analytics", color: "#38bdf8" },
          { href: "/settings", label: "→ Settings", color: "#4ade80" },
        ].map(({ href, label, color }) => (
          <Link key={href} href={href} style={{ fontSize: 13, color, textDecoration: "none", background: color + "11", border: `1px solid ${color}33`, borderRadius: 8, padding: "8px 16px", fontWeight: 600 }}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}