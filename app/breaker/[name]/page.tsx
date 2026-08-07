"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";

function pctToMarket(b: any) {
  const mv = parseFloat(b.market_value || "0");
  const rbf = parseFloat(b.revenue_before_fees || "0") || parseFloat(b.revenue || "0");
  return mv > 0 ? (rbf / mv) * 100 : 0;
}

export default function BreakerStatementPage() {
  const params = useParams();
  const rawName = params?.name as string;
  const name = rawName ? decodeURIComponent(rawName) : "";
  const [breaks, setBreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  const revenue = breaks.reduce((s, b) => s + parseFloat(b.revenue || "0"), 0);
  const commEarned = breaks.reduce((s, b) => s + parseFloat(b.commission_amount || "0"), 0);
  const commPaid = breaks.filter(b => b.commission_paid).reduce((s, b) => s + parseFloat(b.commission_amount || "0"), 0);
  const commOwed = commEarned - commPaid;
  const boxes = breaks.reduce((s, b) => s + (parseInt(b.num_boxes) || 0), 0);
  const spots = breaks.reduce((s, b) => s + (parseInt(b.spots_sold) || 0), 0);
  const avgPct = count > 0 ? breaks.reduce((s, b) => s + pctToMarket(b), 0) / count : 0;

  const card = { background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "16px 18px" };
  const lbl = { fontSize: 11, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".5px", marginBottom: 6 };

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" }}>
      <style>{`
        .bs-wrap { max-width: 760px; margin: 0 auto; padding: 28px 16px 60px; }
        .bs-top { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .bs-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 20px; }
        .bs-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; align-items: center; padding: 12px 14px; border-bottom: 1px solid #161616; }
        .bs-head { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; padding: 8px 14px; border-bottom: 1px solid #1e1e1e; }
        @media (max-width: 640px) {
          .bs-stats { grid-template-columns: 1fr 1fr; }
          .bs-head { display: none; }
          .bs-row { grid-template-columns: 1fr 1fr; gap: 6px 10px; }
          .bs-row .bs-cell-box { grid-column: 1 / -1; }
          .bs-num::before { content: attr(data-l); display: block; font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: .4px; }
        }
      `}</style>
      <div className="bs-wrap">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <img src="/LOGO-BG.png" alt="ValleyHitHouse" style={{ height: 40, width: "auto" }} />
          <div style={{ fontSize: 12, color: "#444" }}>Breaker statement</div>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 2px" }}>{displayName}</h1>
        <p style={{ fontSize: 13, color: "#555", marginTop: 0, marginBottom: 22 }}>{count} break{count === 1 ? "" : "s"} run · read-only summary</p>

        {count === 0 ? (
          <div style={{ ...card, textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🎙️</div>
            <p style={{ color: "#666", fontSize: 14, margin: 0 }}>No breaks found for &ldquo;{name}&rdquo; yet.</p>
          </div>
        ) : (
          <>
            {/* Owed / paid headline */}
            <div className="bs-top">
              <div style={{ ...card, borderColor: commOwed > 0 ? "#fb923c44" : "#4ade8044", background: commOwed > 0 ? "#160d00" : "#0b1a0b" }}>
                <div style={lbl}>You're owed</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: commOwed > 0 ? "#fb923c" : "#4ade80" }}>${commOwed.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{commOwed > 0 ? "Unpaid commission" : "All caught up ✓"}</div>
              </div>
              <div style={card}>
                <div style={lbl}>Paid to date</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: "#38bdf8" }}>${commPaid.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>${commEarned.toFixed(2)} earned all-time</div>
              </div>
            </div>

            {/* Performance stats */}
            <div className="bs-stats">
              <div style={card}><div style={lbl}>Breaks</div><div style={{ fontSize: 20, fontWeight: 700 }}>{count}</div></div>
              <div style={card}><div style={lbl}>Boxes · spots</div><div style={{ fontSize: 20, fontWeight: 700 }}>{boxes} · {spots}</div></div>
              <div style={card}><div style={lbl}>Revenue</div><div style={{ fontSize: 20, fontWeight: 700, color: "#4ade80" }}>${revenue.toFixed(0)}</div></div>
              <div style={card}><div style={lbl}>Avg % to mkt</div><div style={{ fontSize: 20, fontWeight: 700, color: avgPct >= 100 ? "#4ade80" : "#fb923c" }}>{avgPct.toFixed(0)}%</div></div>
            </div>

            {/* Break list */}
            <div style={{ ...card, padding: "6px 0" }}>
              <div className="bs-head">
                <div style={{ fontSize: 11, color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px" }}>Break</div>
                <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", textAlign: "right" }}>% to mkt</div>
                <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", textAlign: "right" }}>Commission</div>
                <div style={{ fontSize: 11, color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", textAlign: "right" }}>Status</div>
              </div>
              {breaks.map(b => {
                const pct = pctToMarket(b);
                const comm = parseFloat(b.commission_amount || "0");
                return (
                  <div key={b.id} className="bs-row">
                    <div className="bs-cell-box" style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: "#e5e5e5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.box_name || "—"}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>{b.date}</div>
                    </div>
                    <div className="bs-num" data-l="% to mkt" style={{ textAlign: "right", fontSize: 14, fontWeight: 600, color: pct >= 100 ? "#38bdf8" : "#fb923c" }}>{pct.toFixed(0)}%</div>
                    <div className="bs-num" data-l="Commission" style={{ textAlign: "right", fontSize: 14, fontWeight: 600, color: "#a78bfa" }}>${comm.toFixed(2)}</div>
                    <div className="bs-num" data-l="Status" style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: b.commission_paid ? "#4ade8022" : "#fb923c22", color: b.commission_paid ? "#4ade80" : "#fb923c", whiteSpace: "nowrap" }}>{b.commission_paid ? "Paid" : "Owed"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: "#444", marginTop: 14, textAlign: "center" }}>Commission is a % of Valley&apos;s share, scaled by each break&apos;s % to market. Updated live from the ValleyHitHouse tracker.</p>
          </>
        )}
      </div>
    </div>
  );
}
