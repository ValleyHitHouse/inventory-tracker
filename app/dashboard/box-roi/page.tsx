"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const PERIODS = ["Last 30 days", "Last 90 days", "Last 180 days", "All time"];
const WHATNOT_FEE = 0.112;
const IMC_SPLIT = 0.70;
const VALLEY_SPLIT = 0.30;

// Structured per-break box counts (the four Griffey defaults).
const DEFAULT_BOX_TYPES = [
  { key: "jumbo_hobby_count", label: "Griffey Jumbo", priceKey: "jumbo_hobby_price" },
  { key: "hobby_count", label: "Griffey Hobby", priceKey: "hobby_price" },
  { key: "double_mega_count", label: "Griffey Double Mega", priceKey: "double_mega_price" },
  { key: "blaster_count", label: "Griffey Blaster", priceKey: "blaster_price" },
];
const OTHER_KEY = "__other__";

type Agg = {
  key: string; label: string;
  boxes: number; breaks: number;
  mv: number; rbf: number; rev: number; prof: number;
};

function verdict(pct: number) {
  if (pct >= 130) return { label: "Buy more", color: "#4ade80", bg: "#0f1a0f" };
  if (pct >= 100) return { label: "Solid", color: "#38bdf8", bg: "#0a1520" };
  if (pct > 0) return { label: "Reconsider", color: "#fb923c", bg: "#1a0f00" };
  return { label: "No data", color: "#555", bg: "#0f0f0f" };
}

export default function BoxRoiPage() {
  const [breaks, setBreaks] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [feeRate, setFeeRate] = useState(WHATNOT_FEE);
  const [period, setPeriod] = useState("Last 90 days");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // breakeven calculator state
  const [calcBoxes, setCalcBoxes] = useState("1");
  const [calcCost, setCalcCost] = useState("");
  const [calcSpot, setCalcSpot] = useState("");
  const [calcSpots, setCalcSpots] = useState("");

  useEffect(() => {
    async function load() {
      const [breaksRes, settingsRes] = await Promise.all([
        supabase.from("Breaks").select("*").order("date", { ascending: true }),
        supabase.from("settings").select("key, value"),
      ]);
      if (breaksRes.data) setBreaks(breaksRes.data);
      if (settingsRes.data) {
        const map: Record<string, number> = {};
        settingsRes.data.forEach((r: any) => { map[r.key] = parseFloat(r.value); });
        setPrices(map);
        if (map["whatnot_fee_pct"] != null && !isNaN(map["whatnot_fee_pct"])) setFeeRate(map["whatnot_fee_pct"] / 100);
      }
      setLoading(false);
    }
    load();
  }, []);

  function filteredBreaks() {
    const now = new Date();
    return breaks.filter(b => {
      if (period === "All time") return true;
      if (!b.date) return false;
      const days = period === "Last 30 days" ? 30 : period === "Last 90 days" ? 90 : 180;
      const diff = (now.getTime() - new Date(b.date).getTime()) / (1000 * 60 * 60 * 24);
      return diff <= days;
    });
  }
  const filtered = filteredBreaks();

  // --- Value-weighted attribution of each break across its box products ---
  const acc: Record<string, Agg> = {};
  DEFAULT_BOX_TYPES.forEach(bt => { acc[bt.key] = { key: bt.key, label: bt.label, boxes: 0, breaks: 0, mv: 0, rbf: 0, rev: 0, prof: 0 }; });
  acc[OTHER_KEY] = { key: OTHER_KEY, label: "Other / custom boxes", boxes: 0, breaks: 0, mv: 0, rbf: 0, rev: 0, prof: 0 };

  filtered.forEach(b => {
    const numBoxes = parseInt(b.num_boxes) || 0;
    const mv = parseFloat(b.market_value || "0");
    const rev = parseFloat(b.revenue || "0");
    const rbf = parseFloat(b.revenue_before_fees || "0") || (rev / (1 - feeRate));
    const prof = parseFloat(b.net_profit || "0");

    let defaultValue = 0, defaultBoxes = 0;
    const parts: { key: string; count: number; value: number }[] = [];
    DEFAULT_BOX_TYPES.forEach(bt => {
      const count = parseInt(b[bt.key]) || 0;
      if (count <= 0) return;
      const price = prices[bt.priceKey] || 0;
      const value = count * price;
      defaultValue += value; defaultBoxes += count;
      parts.push({ key: bt.key, count, value });
    });
    const otherBoxes = Math.max(0, numBoxes - defaultBoxes);
    const otherValue = Math.max(0, mv - defaultValue);
    if (otherBoxes > 0 || (otherValue > 0 && defaultBoxes === 0)) {
      parts.push({ key: OTHER_KEY, count: otherBoxes || (defaultBoxes === 0 ? numBoxes : 0), value: otherValue });
    }
    if (parts.length === 0) return;

    const totalValue = parts.reduce((s, p) => s + p.value, 0);
    const totalCount = parts.reduce((s, p) => s + p.count, 0) || 1;
    parts.forEach(p => {
      const share = totalValue > 0 ? p.value / totalValue : p.count / totalCount;
      const a = acc[p.key];
      a.boxes += p.count;
      a.mv += p.value;
      a.rbf += rbf * share;
      a.rev += rev * share;
      a.prof += prof * share;
      a.breaks += 1;
    });
  });

  const rows = Object.values(acc)
    .filter(a => a.boxes > 0 || a.breaks > 0)
    .map(a => {
      const pct = a.mv > 0 ? (a.rbf / a.mv) * 100 : 0;
      return {
        ...a,
        pct,
        profPerBox: a.boxes > 0 ? a.prof / a.boxes : 0,
        revPerBox: a.boxes > 0 ? a.rev / a.boxes : 0,
        valPerBox: a.boxes > 0 ? a.mv / a.boxes : 0,
      };
    })
    .sort((x, y) => y.pct - x.pct);

  const maxProfPerBox = Math.max(...rows.map(r => Math.abs(r.profPerBox)), 1);

  // --- Breakeven calculator ---
  const cBoxes = Math.max(0, parseFloat(calcBoxes) || 0);
  const cCost = Math.max(0, parseFloat(calcCost) || 0);
  const cSpot = Math.max(0, parseFloat(calcSpot) || 0);
  const cSpots = Math.max(0, parseFloat(calcSpots) || 0);
  const boxMarketValue = cBoxes * cCost;
  // Spots needed for revenue (before fees) to reach 100% of box market value
  const breakevenSpots = cSpot > 0 ? Math.ceil(boxMarketValue / cSpot) : 0;
  const projRevBefore = cSpots * cSpot;
  const projRevAfter = projRevBefore * (1 - feeRate);
  const projPct = boxMarketValue > 0 ? (projRevBefore / boxMarketValue) * 100 : 0;
  const projProfitOverBox = projRevAfter - boxMarketValue;
  const projValley = projProfitOverBox * VALLEY_SPLIT;
  const projBoba = projProfitOverBox * IMC_SPLIT;
  const calcReady = cBoxes > 0 && cCost > 0 && cSpot > 0;

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", width: "100%", boxSizing: "border-box" as const },
    content: { padding: "24px 16px", maxWidth: 1200, margin: "0 auto", width: "100%", boxSizing: "border-box" as const },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    input: { width: "100%", background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: "10px 12px", color: "#e5e5e5", fontSize: 14, boxSizing: "border-box" as const },
    inLabel: { fontSize: 11, color: "#666", marginBottom: 5, display: "block", textTransform: "uppercase" as const, letterSpacing: ".4px" },
  };

  const css = `
    .roi-periods { display: flex; gap: 8px; flex-wrap: wrap; }
    .roi-head, .roi-row { display: grid; grid-template-columns: 1.6fr 0.8fr 1fr 1fr 1fr 0.9fr 1fr; gap: 10px; align-items: center; }
    .roi-head { padding: 8px 12px; border-bottom: 1px solid #1e1e1e; }
    .roi-row { padding: 14px 12px; border-bottom: 1px solid #161616; }
    .roi-num { text-align: right; }
    .calc-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
    .calc-out { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-top: 16px; }
    @media (max-width: 768px) {
      .roi-periods button { flex: 1; font-size: 11px !important; padding: 6px 8px !important; }
      .roi-head { display: none; }
      .roi-row { grid-template-columns: 1fr 1fr; gap: 6px 10px; padding: 14px 10px; }
      .roi-row .roi-cell-label { grid-column: 1 / -1; }
      .roi-num { text-align: left; }
      .roi-num::before { content: attr(data-l); display: block; font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: .4px; }
      .calc-grid { grid-template-columns: 1fr 1fr; }
      .calc-out { grid-template-columns: 1fr 1fr; }
    }
  `;

  return (
    <div style={s.shell}>
      <style>{css}</style>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Box ROI</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Which box products actually make money — ranked by % to market</p>
          </div>
          <div className="roi-periods">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${period === p ? "#fb923c" : "#222"}`, background: period === p ? "#fb923c22" : "#111", color: period === p ? "#fb923c" : "#555" }}>{p}</button>
            ))}
          </div>
        </div>

        {loading ? <p style={{ color: "#555" }}>Loading...</p> : <>

          {/* Scoreboard */}
          <div style={s.section}>
            <div style={s.sectionTitle}>🏆 Box product scoreboard ({period})</div>
            {rows.length === 0 ? (
              <p style={{ color: "#555", fontSize: 13 }}>No breaks in this period yet.</p>
            ) : (
              <>
                <div className="roi-head">
                  <div style={{ fontSize: 11, color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px" }}>Box product</div>
                  <div style={{ fontSize: 11, color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", textAlign: "right" }}>Breaks</div>
                  <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", textAlign: "right" }}>% to market</div>
                  <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", textAlign: "right" }}>Profit / box</div>
                  <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", textAlign: "right" }}>Revenue / box</div>
                  <div style={{ fontSize: 11, color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", textAlign: "right" }}>Boxes</div>
                  <div style={{ fontSize: 11, color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", textAlign: "right" }}>Verdict</div>
                </div>
                {rows.map(r => {
                  const v = verdict(r.pct);
                  return (
                    <div key={r.key} className="roi-row">
                      <div className="roi-cell-label" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5" }}>{r.label}</div>
                          <div style={{ fontSize: 11, color: "#555" }}>${r.valPerBox.toFixed(0)} value/box</div>
                        </div>
                      </div>
                      <div className="roi-num" data-l="Breaks" style={{ fontSize: 13, color: "#aaa" }}>{r.breaks}</div>
                      <div className="roi-num" data-l="% to market" style={{ fontSize: 15, fontWeight: 700, color: r.pct >= 100 ? "#38bdf8" : "#fb923c" }}>{r.pct.toFixed(0)}%</div>
                      <div className="roi-num" data-l="Profit / box">
                        <div style={{ fontSize: 14, fontWeight: 600, color: r.profPerBox >= 0 ? "#a78bfa" : "#f87171" }}>${r.profPerBox.toFixed(0)}</div>
                        <div style={{ height: 4, background: "#161616", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
                          <div style={{ width: `${Math.min(100, (Math.abs(r.profPerBox) / maxProfPerBox) * 100)}%`, height: "100%", background: r.profPerBox >= 0 ? "#a78bfa" : "#f87171" }} />
                        </div>
                      </div>
                      <div className="roi-num" data-l="Revenue / box" style={{ fontSize: 14, color: "#4ade80", fontWeight: 600 }}>${r.revPerBox.toFixed(0)}</div>
                      <div className="roi-num" data-l="Boxes" style={{ fontSize: 13, color: "#777" }}>{r.boxes}</div>
                      <div className="roi-num" data-l="Verdict">
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: v.bg, color: v.color, whiteSpace: "nowrap" }}>{v.label}</span>
                      </div>
                    </div>
                  );
                })}
                <div style={{ fontSize: 11, color: "#444", marginTop: 12, lineHeight: 1.5 }}>
                  Profit &amp; revenue are attributed to each product by its share of a break&apos;s box value, so mixed breaks split fairly. &ldquo;% to market&rdquo; is your true ROI signal — 100% means spots sold for exactly what the boxes are worth.
                </div>
              </>
            )}
          </div>

          {/* Breakeven calculator */}
          <div style={s.section}>
            <div style={s.sectionTitle}>🧮 Breakeven calculator — plan a break before you run it</div>
            <div className="calc-grid">
              <div>
                <label style={s.inLabel}>Boxes</label>
                <input style={s.input} type="number" min={0} value={calcBoxes} onChange={e => setCalcBoxes(e.target.value)} placeholder="1" />
              </div>
              <div>
                <label style={s.inLabel}>Cost / box ($)</label>
                <input style={s.input} type="number" min={0} value={calcCost} onChange={e => setCalcCost(e.target.value)} placeholder="e.g. 250" />
              </div>
              <div>
                <label style={s.inLabel}>Avg spot price ($)</label>
                <input style={s.input} type="number" min={0} value={calcSpot} onChange={e => setCalcSpot(e.target.value)} placeholder="e.g. 12" />
              </div>
              <div>
                <label style={s.inLabel}>Spots you'll sell</label>
                <input style={s.input} type="number" min={0} value={calcSpots} onChange={e => setCalcSpots(e.target.value)} placeholder="e.g. 60" />
              </div>
            </div>

            {!calcReady ? (
              <p style={{ color: "#555", fontSize: 13, marginTop: 16 }}>Enter boxes, cost/box, and avg spot price to see your breakeven.</p>
            ) : (
              <>
                <div className="calc-out">
                  <div style={{ background: "#0f0f0f", borderRadius: 10, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".4px" }}>Box value</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#fb923c" }}>${boxMarketValue.toFixed(0)}</div>
                  </div>
                  <div style={{ background: "#0f0f0f", borderRadius: 10, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".4px" }}>Breakeven spots</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#38bdf8" }}>{breakevenSpots}</div>
                    <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>to reach 100% to market</div>
                  </div>
                  {cSpots > 0 && (
                    <>
                      <div style={{ background: "#0f0f0f", borderRadius: 10, padding: 16, textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".4px" }}>Projected % to mkt</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: projPct >= 100 ? "#4ade80" : "#fb923c" }}>{projPct.toFixed(0)}%</div>
                        <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>at {cSpots} spots</div>
                      </div>
                      <div style={{ background: projProfitOverBox >= 0 ? "#0f1a0f" : "#1a0f0f", borderRadius: 10, padding: 16, textAlign: "center", border: `1px solid ${projProfitOverBox >= 0 ? "#4ade8033" : "#f8717133"}` }}>
                        <div style={{ fontSize: 11, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".4px" }}>Profit over box cost</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: projProfitOverBox >= 0 ? "#4ade80" : "#f87171" }}>${projProfitOverBox.toFixed(0)}</div>
                        <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>after {(feeRate * 100).toFixed(1)}% fees</div>
                      </div>
                    </>
                  )}
                </div>
                {cSpots > 0 && projProfitOverBox !== 0 && (
                  <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", fontSize: 12, color: "#666" }}>
                    <span>If this holds, the split is <span style={{ color: "#fb923c", fontWeight: 600 }}>BOBA ${projBoba.toFixed(0)}</span> · <span style={{ color: "#38bdf8", fontWeight: 600 }}>Valley ${projValley.toFixed(0)}</span></span>
                  </div>
                )}
              </>
            )}
          </div>

        </>}
      </div>
    </div>
  );
}
