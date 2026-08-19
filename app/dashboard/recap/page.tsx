"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/db";
import { useRouter } from "next/navigation";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function fmt(d: Date) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function fmtY(d: Date) {
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}
function money(n: number) { return "$" + n.toFixed(2); }
const MS_DAY = 86400000;
const MS_WEEK = 7 * MS_DAY;

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
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = the week before, ...
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const [b, o] = await Promise.all([
        supabase.from("Breaks").select("*").order("date", { ascending: false }),
        fetchAll(() => supabase.from("BreakOrders").select("buyer_username, price, break_id, cancelled").eq("cancelled", false)),
      ]);
      if (b.data) setBreaks(b.data);
      setOrders(o);
      setLoading(false);
    }
    load();
  }, []);

  const now = new Date();
  const curMon = startOfWeek(now);
  // the week currently being viewed
  const thisMon = new Date(curMon); thisMon.setDate(thisMon.getDate() - weekOffset * 7);
  const lastMon = new Date(thisMon); lastMon.setDate(lastMon.getDate() - 7);
  const nextMon = new Date(thisMon); nextMon.setDate(nextMon.getDate() + 7);
  const weekEnd = new Date(nextMon.getTime() - MS_DAY);

  const inRange = (b: any, s: Date, e: Date) => {
    if (!b.date) return false;
    const t = new Date(b.date + "T12:00:00").getTime();
    return t >= s.getTime() && t < e.getTime();
  };
  const thisWeek = breaks.filter(b => inRange(b, thisMon, nextMon));
  const lastWeek = breaks.filter(b => inRange(b, lastMon, thisMon));

  // how far back we can scroll — the week of the oldest break on record
  const earliestTs = breaks.reduce<number | null>((m, b) => {
    if (!b.date) return m;
    const t = new Date(b.date + "T12:00:00").getTime();
    return m === null || t < m ? t : m;
  }, null);
  const maxOffset = earliestTs === null ? 0
    : Math.max(0, Math.round((curMon.getTime() - startOfWeek(new Date(earliestTs)).getTime()) / MS_WEEK));

  const weekOptions = Array.from({ length: maxOffset + 1 }, (_, i) => {
    const s = new Date(curMon); s.setDate(s.getDate() - i * 7);
    const e = new Date(s); e.setDate(e.getDate() + 7);
    return { offset: i, start: s, end: new Date(e.getTime() - MS_DAY), count: breaks.filter(b => inRange(b, s, e)).length };
  });

  const goBack = () => setWeekOffset(o => Math.min(maxOffset, o + 1));
  const goFwd = () => setWeekOffset(o => Math.max(0, o - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
      if (e.key === "ArrowLeft") goBack();
      else if (e.key === "ArrowRight") goFwd();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maxOffset]);

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
        .rc-nav { display: flex; align-items: center; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        .rc-nav button, .rc-nav select {
          background: #111; border: 1px solid #1e1e1e; color: #e5e5e5;
          border-radius: 8px; padding: 7px 12px; font-size: 13px; font-family: inherit; cursor: pointer;
        }
        .rc-nav button:hover:not(:disabled), .rc-nav select:hover { border-color: #333; background: #161616; }
        .rc-nav button:disabled { color: #3a3a3a; cursor: default; }
        .rc-nav select { max-width: 300px; }
        .rc-today { color: #a78bfa; border-color: #2a2140 !important; }
      `}</style>
      <div className="rc-wrap">
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Weekly recap</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
            Week of {fmtY(thisMon)} – {fmtY(weekEnd)} · compared to the week before
            {weekOffset === 0 ? <span style={{ color: "#4ade80", marginLeft: 8 }}>· this week</span>
              : <span style={{ color: "#666", marginLeft: 8 }}>· {weekOffset} week{weekOffset === 1 ? "" : "s"} ago</span>}
          </p>

          <div className="rc-nav">
            <button onClick={goBack} disabled={weekOffset >= maxOffset} title="Earlier week (←)">← Earlier</button>
            <select value={weekOffset} onChange={e => setWeekOffset(Number(e.target.value))} aria-label="Pick a week">
              {weekOptions.map(w => (
                <option key={w.offset} value={w.offset}>
                  {fmtY(w.start)} – {fmtY(w.end)}{w.offset === 0 ? " (this week)" : ""} · {w.count} break{w.count === 1 ? "" : "s"}
                </option>
              ))}
            </select>
            <button onClick={goFwd} disabled={weekOffset === 0} title="Later week (→)">Later →</button>
            {weekOffset !== 0 && <button className="rc-today" onClick={() => setWeekOffset(0)}>Jump to this week</button>}
          </div>
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
                <div style={lbl}>🔥 Top buyers · {weekOffset === 0 ? "this week" : `wk of ${fmt(thisMon)}`}</div>
                {topBuyers.length === 0 ? <p style={{ color: "#555", fontSize: 13, margin: "8px 0 0" }}>{weekOffset === 0 ? "No orders this week yet." : "No orders that week."}</p> : (
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
                <div style={lbl}>💰 Commission owed · all-time</div>
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
                <p style={{ color: "#666", fontSize: 14, margin: 0 }}>{weekOffset === 0
                  ? "No breaks logged this week yet — numbers above are all zero until you run one."
                  : `No breaks logged the week of ${fmtY(thisMon)} – ${fmtY(weekEnd)}.`}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
