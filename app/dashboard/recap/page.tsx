"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function fmt(d: Date) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function money(n: number) { return "$" + n.toFixed(2); }

function Delta({ cur, prev, invert }: { cur: number; prev: number; invert?: boolean }) {
  if (prev === 0 && cur === 0) return <span style={{ fontSize: 11, color: "#555" }}>—</span>;
  const diff = cur - prev;
  const pct = prev !== 0 ? (diff / Math.abs(prev)) * 100 : 100;
  const good = invert ? diff < 0 : diff >= 0;
  return <span style={{ fontSize: 11, color: diff === 0 ? "#555" : good ? "#4ade80" : "#f87171" }}>{diff >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}% vs last wk</span>;
}

export default function RecapPage() {
  const [breaks, setBreaks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const [b, o] = await Promise.all([
        supabase.from("Breaks").select("*").order("date", { ascending: false }),
        supabase.from("BreakOrders").select("buyer_username, price, break_id, cancelled").eq("cancelled", false),
      ]);
      if (b.data) setBreaks(b.data);
      if (o.data) setOrders(o.data);
      setLoading(false);
    }
    load();
  }, []);

  const now = new Date();
  const thisMon = startOfWeek(now);
  const lastMon = new Date(thisMon); lastMon.setDate(lastMon.getDate() - 7);
  const nextMon = new Date(thisMon); nextMon.setDate(nextMon.getDate() + 7);

  const inRange = (b: any, s: Date, e: Date) => {
    if (!b.date) return false;
    const t = new Date(b.date + "T12:00:00").getTime();
    return t >= s.getTime() && t < e.getTime();
  };
  const thisWeek = breaks.filter(b => inRange(b, thisMon, nextMon));
  const lastWeek = breaks.filter(b => inRange(b, lastMon, thisMon));

  const sum = (arr: any[], f: (b: any) => number) => arr.reduce((s, b) => s + f(b), 0);
  const rev = (arr: any[]) => sum(arr, b => parseFloat(b.revenue || "0"));
  const prof = (arr: any[]) => sum(arr, b => parseFloat(b.net_profit || "0"));
  const boba = (arr: any[]) => sum(arr, b => parseFloat(b.imc_take || "0"));
  const valley = (arr: any[]) => sum(arr, b => parseFloat(b.valley_take || "0"));

  // top buyers this week (orders tied to this week's breaks)
  const weekBreakIds = new Set(thisWeek.map(b => String(b.id)));
  const buyerMap: Record<string, number> = {};
  orders.forEach(o => {
    if (!weekBreakIds.has(String(o.break_id))) return;
    const p = parseFloat(o.price || "0");
    if (p > 0 && o.buyer_username) buyerMap[o.buyer_username] = (buyerMap[o.buyer_username] || 0) + p;
  });
  const topBuyers = Object.entries(buyerMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // commission owed by breaker (all-time unpaid)
  const owedByBreaker: Record<string, number> = {};
  breaks.forEach(b => {
    if (b.commission_paid) return;
    const c = parseFloat(b.commission_amount || "0");
    if (c > 0 && b.breaker) owedByBreaker[b.breaker] = (owedByBreaker[b.breaker] || 0) + c;
  });
  const owedList = Object.entries(owedByBreaker).sort((a, b) => b[1] - a[1]);
  const totalOwed = owedList.reduce((s, [, v]) => s + v, 0);

  const card = { background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "16px 18px" };
  const lbl = { fontSize: 11, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".5px", marginBottom: 6 };

  const metrics = [
    { label: "Breaks run", cur: thisWeek.length, prev: lastWeek.length, fmt: (n: number) => String(n), color: "#e5e5e5" },
    { label: "Revenue", cur: rev(thisWeek), prev: rev(lastWeek), fmt: money, color: "#4ade80" },
    { label: "Net profit", cur: prof(thisWeek), prev: prof(lastWeek), fmt: money, color: "#a78bfa" },
    { label: "BOBA (70%)", cur: boba(thisWeek), prev: boba(lastWeek), fmt: money, color: "#fb923c" },
    { label: "Valley (30%)", cur: valley(thisWeek), prev: valley(lastWeek), fmt: money, color: "#38bdf8" },
    { label: "Spots sold", cur: sum(thisWeek, b => parseInt(b.spots_sold) || 0), prev: sum(lastWeek, b => parseInt(b.spots_sold) || 0), fmt: (n: number) => String(n), color: "#e5e5e5" },
  ];

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" }}>
      <style>{`
        .rc-wrap { max-width: 1000px; margin: 0 auto; padding: 24px 16px 60px; }
        .rc-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 16px; }
        .rc-bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 768px) { .rc-grid { grid-template-columns: 1fr 1fr; } .rc-bottom { grid-template-columns: 1fr; } }
      `}</style>
      <div className="rc-wrap">
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Weekly recap</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Week of {fmt(thisMon)} – {fmt(new Date(nextMon.getTime() - 86400000))} · compared to the week before</p>
        </div>

        {loading ? <p style={{ color: "#555" }}>Loading…</p> : (
          <>
            <div className="rc-grid">
              {metrics.map(m => (
                <div key={m.label} style={card}>
                  <div style={lbl}>{m.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: m.color }}>{m.fmt(m.cur)}</div>
                  <div style={{ marginTop: 4 }}><Delta cur={m.cur} prev={m.prev} /></div>
                </div>
              ))}
            </div>

            <div className="rc-bottom">
              <div style={card}>
                <div style={lbl}>🔥 Top buyers this week</div>
                {topBuyers.length === 0 ? <p style={{ color: "#555", fontSize: 13, margin: "8px 0 0" }}>No orders this week yet.</p> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                    {topBuyers.map(([u, v], i) => (
                      <div key={u} onClick={() => router.push(`/customers/${encodeURIComponent(u)}`)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#0f0f0f", borderRadius: 8, cursor: "pointer" }}>
                        <span style={{ fontSize: 13 }}><span style={{ color: "#555", fontWeight: 700, marginRight: 8 }}>#{i + 1}</span><span style={{ color: "#a78bfa", fontWeight: 600 }}>{u}</span></span>
                        <span style={{ fontSize: 13, color: "#4ade80", fontWeight: 600 }}>{money(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={card}>
                <div style={lbl}>💰 Commission owed</div>
                {owedList.length === 0 ? <p style={{ color: "#4ade80", fontSize: 13, margin: "8px 0 0" }}>All breakers paid up ✓</p> : (
                  <>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#fb923c", margin: "2px 0 10px" }}>{money(totalOwed)} <span style={{ fontSize: 12, color: "#555", fontWeight: 400 }}>total owed</span></div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {owedList.map(([b, v]) => (
                        <div key={b} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#0f0f0f", borderRadius: 8 }}>
                          <span style={{ fontSize: 13, color: "#e5e5e5" }}>{b}</span>
                          <span style={{ fontSize: 13, color: "#fb923c", fontWeight: 600 }}>{money(v)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {thisWeek.length === 0 && (
              <div style={{ ...card, marginTop: 16, textAlign: "center", padding: "32px 20px" }}>
                <p style={{ color: "#666", fontSize: 14, margin: 0 }}>No breaks logged this week yet — numbers above are all zero until you run one.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
