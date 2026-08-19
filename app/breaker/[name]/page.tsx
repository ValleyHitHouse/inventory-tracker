"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import {
  groupByPeriod, periodState, periodCopy, periodLabel, currentPeriodKey,
  type PeriodState,
} from "@/lib/payPeriods";

function pctToMarket(b: any) {
  const mv = parseFloat(b.market_value || "0");
  const rbf = parseFloat(b.revenue_before_fees || "0") || parseFloat(b.revenue || "0");
  return mv > 0 ? (rbf / mv) * 100 : 0;
}
const money = (n: number) => "$" + n.toFixed(2);

const TONE: Record<string, string> = {
  good: "#4ade80",
  pending: "#38bdf8",
  warn: "#fb923c",
  neutral: "#a78bfa",
};

export default function BreakerStatementPage() {
  const params = useParams();
  const rawName = params?.name as string;
  const name = rawName ? decodeURIComponent(rawName) : "";
  const [breaks, setBreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEarlier, setShowEarlier] = useState(false);

  useEffect(() => {
    if (!name) return;
    async function load() {
      const { data } = await supabase.from("Breaks").select("*").ilike("breaker", name).order("date", { ascending: false });
      if (data) setBreaks(data);
      setLoading(false);
    }
    load();
  }, [name]);

  if (loading) return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#555" }}>Loading…</p>
    </div>
  );

  const displayName = breaks[0]?.breaker || name;
  const count = breaks.length;

  // ---- all-time performance (kept, but clearly labelled as all-time) -------
  const revenue = breaks.reduce((s, b) => s + parseFloat(b.revenue || "0"), 0);
  const boxes = breaks.reduce((s, b) => s + (parseInt(b.num_boxes) || 0), 0);
  const spots = breaks.reduce((s, b) => s + (parseInt(b.spots_sold) || 0), 0);
  const avgPct = count > 0 ? breaks.reduce((s, b) => s + pctToMarket(b), 0) / count : 0;
  const commEarned = breaks.reduce((s, b) => s + parseFloat(b.commission_amount || "0"), 0);
  const commPaid = breaks.filter(b => b.commission_paid).reduce((s, b) => s + parseFloat(b.commission_amount || "0"), 0);
  const commOwed = commEarned - commPaid;

  // ---- weeks ---------------------------------------------------------------
  const nowKey = currentPeriodKey();
  const weeks = groupByPeriod(breaks, (b: any) => b.date).map(g => {
    const total = g.items.reduce((s: number, b: any) => s + parseFloat(b.commission_amount || "0"), 0);
    const paid = g.items.filter((b: any) => b.commission_paid).reduce((s: number, b: any) => s + parseFloat(b.commission_amount || "0"), 0);
    const unpaid = total - paid;
    const fullyPaid = g.items.length > 0 && g.items.every((b: any) => b.commission_paid);
    const partly = !fullyPaid && paid > 0;
    const stamps = g.items.map((b: any) => b.commission_paid_at).filter(Boolean).sort();
    const state: PeriodState = periodState(g.start, fullyPaid);
    return { ...g, total, paid, unpaid, fullyPaid, partly, state, paidAt: stamps[stamps.length - 1] || null, isCurrent: g.key === nowKey };
  });

  const openWeek = weeks.find(w => w.state === "open");
  const dueWeek = weeks.find(w => w.state === "due");
  const liveWeeks = weeks.filter(w => w.state !== "paid");
  const paidWeeks = weeks.filter(w => w.state === "paid");
  const visiblePaid = showEarlier ? paidWeeks : paidWeeks.slice(0, 3);
  const hiddenCount = paidWeeks.length - visiblePaid.length;

  const card = { background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "16px 18px" };
  const lbl = { fontSize: 11, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".5px", marginBottom: 6 };

  function WeekCard({ w }: { w: typeof weeks[number] }) {
    const copy = periodCopy(w.start, w.state, { paidAt: w.paidAt });
    const c = TONE[copy.tone];
    const dim = w.state === "paid";
    return (
      <div style={{
        ...card, marginBottom: 12, opacity: dim ? 0.78 : 1,
        borderColor: dim ? "#1e1e1e" : c + "44",
        background: w.state === "due" ? "#08131a" : w.state === "overdue" ? "#160d00" : "#111",
      }}>
        <div className="bs-wkhead">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{copy.headline}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{copy.sub}</div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>
              {w.items.length} break{w.items.length === 1 ? "" : "s"}
              {w.partly && <span style={{ color: "#fb923c" }}> · {money(w.paid)} of it already paid</span>}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: c }}>
              {money(w.state === "paid" ? w.total : w.unpaid)}
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: c + "22", color: c, whiteSpace: "nowrap", display: "inline-block", marginTop: 4 }}>
              {copy.badge}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
          {w.items.map((b: any) => {
            const pct = pctToMarket(b);
            return (
              <div key={b.id} className="bs-line">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#e5e5e5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.box_name || "—"}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>{b.date} · {pct.toFixed(0)}% to market</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: b.commission_paid ? "#4ade80" : "#a78bfa" }}>{money(parseFloat(b.commission_amount || "0"))}</span>
                  {!w.fullyPaid && (
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: b.commission_paid ? "#4ade8022" : "#33333344", color: b.commission_paid ? "#4ade80" : "#666" }}>
                      {b.commission_paid ? "Paid" : "Pending"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" }}>
      <style>{`
        .bs-wrap { max-width: 760px; margin: 0 auto; padding: 28px 16px 60px; }
        .bs-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 12px; }
        .bs-mini { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 22px; }
        .bs-wkhead { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .bs-line { background: #0a0a0a; border-radius: 8px; padding: 9px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        @media (max-width: 640px) {
          .bs-stats { grid-template-columns: 1fr 1fr; }
          .bs-mini { grid-template-columns: 1fr; }
        }
      `}</style>
      <div className="bs-wrap">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <img src="/LOGO-BG.png" alt="ValleyHitHouse" style={{ height: 40, width: "auto" }} />
          <div style={{ fontSize: 12, color: "#444" }}>Pay statement</div>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 2px" }}>{displayName}</h1>
        <p style={{ fontSize: 13, color: "#555", marginTop: 0, marginBottom: 22 }}>
          Paid weekly · each week runs Saturday to Friday and is paid the Friday after it closes
        </p>

        {count === 0 ? (
          <div style={{ ...card, textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🎙️</div>
            <p style={{ color: "#666", fontSize: 14, margin: 0 }}>No breaks found for &ldquo;{name}&rdquo; yet.</p>
          </div>
        ) : (
          <>
            {/* ---- What's next -------------------------------------------- */}
            {dueWeek ? (
              <div style={{ ...card, background: "#08131a", borderColor: "#38bdf844", marginBottom: 12 }}>
                <div style={lbl}>Your next payment</div>
                <div style={{ fontSize: 34, fontWeight: 800, color: "#38bdf8", lineHeight: 1.1 }}>{money(dueWeek.unpaid)}</div>
                <div style={{ fontSize: 13, color: "#8bb", marginTop: 6 }}>{periodCopy(dueWeek.start, "due").headline}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>for the week of {periodLabel(dueWeek.start)}</div>
              </div>
            ) : (
              <div style={{ ...card, marginBottom: 12 }}>
                <div style={lbl}>Your next payment</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: commOwed > 0 ? "#fb923c" : "#4ade80", marginTop: 2 }}>
                  {commOwed > 0 ? "Nothing scheduled for this Friday" : "You're all caught up ✓"}
                </div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 5 }}>
                  {commOwed > 0
                    ? "No closed week is waiting on payday — see the weeks below."
                    : "Every week you've run has been paid out."}
                </div>
              </div>
            )}

            <div className="bs-mini">
              <div style={card}>
                <div style={lbl}>This week so far</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#a78bfa" }}>{money(openWeek?.unpaid ?? 0)}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>{openWeek ? `${openWeek.items.length} break${openWeek.items.length === 1 ? "" : "s"} · still adding up` : "No breaks yet this week"}</div>
              </div>
              <div style={card}>
                <div style={lbl}>Total owed to you</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: commOwed > 0 ? "#fb923c" : "#4ade80" }}>{money(commOwed)}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>across every unpaid week</div>
              </div>
              <div style={card}>
                <div style={lbl}>Paid to date</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#4ade80" }}>{money(commPaid)}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>{money(commEarned)} earned all-time</div>
              </div>
            </div>

            {/* ---- Week by week -------------------------------------------- */}
            <div style={{ ...lbl, marginBottom: 10 }}>Week by week</div>
            {liveWeeks.map(w => <WeekCard key={w.key} w={w} />)}
            {visiblePaid.map(w => <WeekCard key={w.key} w={w} />)}

            {hiddenCount > 0 && (
              <button
                onClick={() => setShowEarlier(true)}
                style={{ width: "100%", background: "#111", border: "1px solid #1e1e1e", color: "#666", borderRadius: 10, padding: "12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                Show {hiddenCount} earlier paid week{hiddenCount === 1 ? "" : "s"}
              </button>
            )}
            {showEarlier && paidWeeks.length > 3 && (
              <button
                onClick={() => setShowEarlier(false)}
                style={{ width: "100%", background: "none", border: "none", color: "#444", padding: "10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
              >
                Collapse earlier weeks
              </button>
            )}

            {/* ---- All-time performance ------------------------------------ */}
            <div style={{ ...lbl, margin: "26px 0 10px" }}>All-time performance</div>
            <div className="bs-stats">
              <div style={card}><div style={lbl}>Breaks</div><div style={{ fontSize: 20, fontWeight: 700 }}>{count}</div></div>
              <div style={card}><div style={lbl}>Boxes · spots</div><div style={{ fontSize: 20, fontWeight: 700 }}>{boxes} · {spots}</div></div>
              <div style={card}><div style={lbl}>Revenue</div><div style={{ fontSize: 20, fontWeight: 700, color: "#4ade80" }}>${revenue.toFixed(0)}</div></div>
              <div style={card}><div style={lbl}>Avg % to mkt</div><div style={{ fontSize: 20, fontWeight: 700, color: avgPct >= 100 ? "#4ade80" : "#fb923c" }}>{avgPct.toFixed(0)}%</div></div>
            </div>

            <p style={{ fontSize: 11, color: "#444", marginTop: 14, textAlign: "center", lineHeight: 1.6 }}>
              Commission is a % of Valley&apos;s share, scaled by each break&apos;s % to market.<br />
              Updated live from the ValleyHitHouse tracker. Questions on a week? Message Mitch.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
