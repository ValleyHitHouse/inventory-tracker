"use client";
import { useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/db";

import {
  periodKey as ppKey, periodStart, periodLabel, periodState, periodCopy,
  type PeriodState,
} from "@/lib/payPeriods";

const SHIPPER_TABS = ["Caitlin", "Abbi"];

const TONE: Record<string, string> = {
  good: "#4ade80",
  pending: "#38bdf8",
  warn: "#f87171",
  neutral: "#a78bfa",
};

const eq = (a: any, b: any) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

/** Period key for a raw date string — delegates to the shared helper. */
function getPeriodKey(dateStr: string): string {
  return ppKey(dateStr);
}

/** Group rows into Sat–Fri pay periods, newest first. */
function groupByPeriod(items: any[], dateField: string) {
  const groups: Record<string, { key: string; start: Date; label: string; items: any[] }> = {};
  for (const item of items) {
    const raw = item[dateField];
    if (!raw) continue;
    const start = periodStart(raw);
    const key = ppKey(start);
    if (!groups[key]) groups[key] = { key, start, label: periodLabel(start), items: [] };
    groups[key].items.push(item);
  }
  return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
}

/** The headline an employee actually opens this page for: what lands Friday. */
function NextPayment({ periods }: { periods: { start: Date; state: PeriodState; due: number }[] }) {
  const next = periods.find(p => p.state === "due");
  const open = periods.find(p => p.state === "open");
  const overdueTotal = periods.filter(p => p.state === "overdue").reduce((s, p) => s + p.due, 0);
  return (
    <div style={{ background: next ? "#08131a" : "#111", border: `1px solid ${next ? "#38bdf844" : "#1e1e1e"}`, borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>Your next payment</div>
      {next ? (
        <>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#38bdf8", lineHeight: 1.1 }}>${next.due.toFixed(2)}</div>
          <div style={{ fontSize: 13, color: "#7fa8bd", marginTop: 6 }}>{periodCopy(next.start, "due").headline}</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>for the week of {periodLabel(next.start)}</div>
        </>
      ) : (
        <div style={{ fontSize: 15, fontWeight: 700, color: overdueTotal > 0 ? "#fb923c" : "#4ade80" }}>
          {overdueTotal > 0 ? "Nothing scheduled for this Friday" : "You're all caught up ✓"}
        </div>
      )}
      <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: 11, color: "#555" }}>This week so far </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa" }}>${(open?.due ?? 0).toFixed(2)}</span>
        </div>
        {overdueTotal > 0 && (
          <div>
            <span style={{ fontSize: 11, color: "#555" }}>Older, still unpaid </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>${overdueTotal.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Shared period header — the same three states everywhere pay is shown. */
function PeriodHeading({ start, state, paidAt, detail }: { start: Date; state: PeriodState; paidAt?: string | null; detail?: ReactNode }) {
  const copy = periodCopy(start, state, { paidAt });
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: TONE[copy.tone] }}>{copy.headline}</div>
      <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{copy.sub}</div>
      {detail && <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{detail}</div>}
    </div>
  );
}

export default function PayrollPage() {
  const [section, setSection] = useState<"breakers" | "shippers">("breakers");
  const [breakerTab, setBreakerTab] = useState("All Breakers");
  const [shipperTab, setShipperTab] = useState("Caitlin");
  const [breaks, setBreaks] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingPeriod, setMarkingPeriod] = useState<string | null>(null);
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [autoSectioned, setAutoSectioned] = useState(false);

  useEffect(() => {
    const cookies = document.cookie.split(";").reduce((acc, c) => {
      const [k, v] = c.trim().split("=");
      acc[k] = v;
      return acc;
    }, {} as Record<string, string>);
    const role = cookies["vhh-role"] || "";
    const name = decodeURIComponent(cookies["vhh-user"] || "");
    setUserRole(role);
    setUserName(name);
    if (SHIPPER_TABS.includes(name)) {
      setSection("shippers");
      setShipperTab(name);
    }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [breaksRes, shipmentsAll] = await Promise.all([
      supabase.from("Breaks").select("*").not("commission_amount", "is", null).gt("commission_amount", 0).order("date", { ascending: false }),
      fetchAll(() => supabase.from("break_shipments").select("*").order("ship_date", { ascending: false })),
    ]);
    if (breaksRes.data) setBreaks(breaksRes.data);
    setShipments(shipmentsAll);
    setLoading(false);
  }

  async function markShipperPeriodPaid(periodKey: string, shipper: string) {
    setMarkingPeriod(`${shipper}-${periodKey}`);
    const periodShipments = shipments.filter(s =>
      s.shipper_name === shipper && getPeriodKey(s.ship_date) === periodKey && !s.paid
    );
    for (const sh of periodShipments) {
      await supabase.from("break_shipments").update({ paid: true, paid_at: new Date().toISOString() }).eq("id", sh.id);
    }
    await loadData();
    setMarkingPeriod(null);
  }

  async function markShipperPeriodUnpaid(periodKey: string, shipper: string) {
    setMarkingPeriod(`${shipper}-${periodKey}`);
    const periodShipments = shipments.filter(s =>
      s.shipper_name === shipper && getPeriodKey(s.ship_date) === periodKey && s.paid
    );
    for (const sh of periodShipments) {
      await supabase.from("break_shipments").update({ paid: false, paid_at: null }).eq("id", sh.id);
    }
    await loadData();
    setMarkingPeriod(null);
  }

  async function markBreakerPeriodPaid(periodKey: string, breakerName: string) {
    setMarkingPeriod(`breaker-${breakerName}-${periodKey}`);
    const periodBreaks = breaks.filter(b =>
      b.breaker === breakerName && getPeriodKey(b.date) === periodKey && !b.commission_paid
    );
    for (const b of periodBreaks) {
      await supabase.from("Breaks").update({ commission_paid: true, commission_paid_at: new Date().toISOString() }).eq("id", b.id);
    }
    await loadData();
    setMarkingPeriod(null);
  }

  async function markBreakerPeriodUnpaid(periodKey: string, breakerName: string) {
    setMarkingPeriod(`breaker-${breakerName}-${periodKey}`);
    const periodBreaks = breaks.filter(b =>
      b.breaker === breakerName && getPeriodKey(b.date) === periodKey && b.commission_paid
    );
    for (const b of periodBreaks) {
      await supabase.from("Breaks").update({ commission_paid: false, commission_paid_at: null }).eq("id", b.id);
    }
    await loadData();
    setMarkingPeriod(null);
  }

  const isAdmin = userRole === "admin";

  // Who is this person in the data? Derived from the rows themselves rather
  // than a hardcoded name list, so a new breaker or shipper works with no
  // code change. Employees only ever see their own numbers.
  const myBreaks = breaks.filter(b => eq(b.breaker, userName));
  const myShipments = shipments.filter(s => eq(s.shipper_name, userName));
  const isBreakerUser = !isAdmin && myBreaks.length > 0;
  const isShipperUser = !isAdmin && (myShipments.length > 0 || SHIPPER_TABS.includes(userName));
  const isBoth = isBreakerUser && isShipperUser;

  // Land a non-admin on whichever section their pay actually lives in.
  useEffect(() => {
    if (loading || isAdmin || autoSectioned) return;
    setSection(isShipperUser ? "shippers" : "breakers");
    setAutoSectioned(true);
  }, [loading, isAdmin, isBreakerUser, isShipperUser, autoSectioned]);

  // Breaker data
  const allBreakers = Array.from(new Set(breaks.map(b => b.breaker).filter(Boolean)));
  const breakerTabs = ["All Breakers", ...allBreakers];
  const activeBreakerName = isAdmin ? breakerTab : userName;
  const filteredBreaks = isAdmin
    ? (breakerTab === "All Breakers" ? breaks : breaks.filter(b => b.breaker === breakerTab))
    : myBreaks;

  // Group breaker breaks by period and breaker
  function getBreakerPeriods(breakerName: string) {
    const breakerBreaks = !isAdmin ? myBreaks
      : breakerName === "All Breakers" ? breaks
      : breaks.filter(b => b.breaker === breakerName);
    const groups = groupByPeriod(breakerBreaks, "date");
    return groups.map(group => {
      const totalCommission = group.items.reduce((s, b) => s + parseFloat(b.commission_amount || "0"), 0);
      const allPaid = group.items.every(b => b.commission_paid);
      const somePaid = group.items.some(b => b.commission_paid);
      const breakersInPeriod = Array.from(new Set(group.items.map((b: any) => b.breaker)));
      const stamps = group.items.map((b: any) => b.commission_paid_at).filter(Boolean).sort();
      return {
        ...group, totalCommission, allPaid, somePaid, breakersInPeriod,
        state: periodState(group.start, allPaid) as PeriodState,
        paidAt: stamps[stamps.length - 1] || null,
      };
    });
  }

  // Shipper data
  const filteredShipments = isAdmin
    ? shipments.filter(s => s.shipper_name === shipperTab)
    : myShipments;

  const shipperPeriods = groupByPeriod(filteredShipments, "ship_date").map(group => {
    const totalPay = group.items.reduce((s, sh) => s + parseFloat(sh.pay_amount || "0"), 0);
    const allPaid = group.items.every(sh => sh.paid);
    const unpaidTotal = group.items.filter(sh => !sh.paid).reduce((s, sh) => s + parseFloat(sh.pay_amount || "0"), 0);
    const stamps = group.items.map((sh: any) => sh.paid_at).filter(Boolean).sort();
    return {
      ...group, totalPay, allPaid, unpaidTotal,
      state: periodState(group.start, allPaid) as PeriodState,
      paidAt: stamps[stamps.length - 1] || null,
    };
  });

  const totalShipperOutstanding = filteredShipments.filter(s => !s.paid).reduce((s, sh) => s + parseFloat(sh.pay_amount || "0"), 0);
  const totalShipperPaid = filteredShipments.filter(s => s.paid).reduce((s, sh) => s + parseFloat(sh.pay_amount || "0"), 0);

  const totalBreakerOutstanding = filteredBreaks.filter(b => !b.commission_paid).reduce((s, b) => s + parseFloat(b.commission_amount || "0"), 0);
  const totalBreakerPaid = filteredBreaks.filter(b => b.commission_paid).reduce((s, b) => s + parseFloat(b.commission_amount || "0"), 0);

  const activeShipperName = isAdmin ? shipperTab : userName;

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", width: "100%", boxSizing: "border-box" as const },
    content: { padding: "24px 16px", maxWidth: 1000, margin: "0 auto", width: "100%", boxSizing: "border-box" as const },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
  };

  const mobileStyles = `
    .pay-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 16px; }
    @media (max-width: 768px) { .pay-stats { grid-template-columns: 1fr 1fr; } }
  `;

  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{isAdmin ? "Payroll" : "Your pay"}</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
            Each week runs Saturday to Friday and is paid the Friday after it closes
          </p>
        </div>

        {/* Section toggle — admins pick; employees only see one unless they do both */}
        {(isAdmin || isBoth) && (
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <button onClick={() => setSection("breakers")} style={{ padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", border: `1px solid ${section === "breakers" ? "#a78bfa" : "#222"}`, background: section === "breakers" ? "#a78bfa22" : "#111", color: section === "breakers" ? "#a78bfa" : "#555" }}>
              💼 Breakers
            </button>
            <button onClick={() => setSection("shippers")} style={{ padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", border: `1px solid ${section === "shippers" ? "#38bdf8" : "#222"}`, background: section === "shippers" ? "#38bdf822" : "#111", color: section === "shippers" ? "#38bdf8" : "#555" }}>
              📦 Shippers
            </button>
          </div>
        )}

        {loading ? <p style={{ color: "#555" }}>Loading...</p> : <>

          {/* BREAKERS SECTION */}
          {section === "breakers" && (isAdmin || isBreakerUser) && (
            <>
              {/* Breaker tabs — admin only; employees are pinned to themselves */}
              {isAdmin ? (
                <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                  {breakerTabs.map(tab => (
                    <button key={tab} onClick={() => setBreakerTab(tab)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${breakerTab === tab ? "#a78bfa" : "#222"}`, background: breakerTab === tab ? "#a78bfa22" : "#111", color: breakerTab === tab ? "#a78bfa" : "#555" }}>
                      {tab}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#a78bfa" }}>🎙️ {userName}&apos;s breaking commission</div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>Broken out by week, newest first</div>
                </div>
              )}

              {!isAdmin && (
                <NextPayment periods={getBreakerPeriods(activeBreakerName).map((p: any) => ({
                  start: p.start,
                  state: p.state,
                  due: p.items.filter((b: any) => !b.commission_paid).reduce((s: number, b: any) => s + parseFloat(b.commission_amount || "0"), 0),
                }))} />
              )}

              {/* Summary stats */}
              <div className="pay-stats">
                <div style={{ background: totalBreakerOutstanding > 0 ? "#1a0a00" : "#0f1a0f", border: `1px solid ${totalBreakerOutstanding > 0 ? "#f8717144" : "#4ade8044"}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Outstanding</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: totalBreakerOutstanding > 0 ? "#f87171" : "#4ade80" }}>${totalBreakerOutstanding.toFixed(2)}</div>
                </div>
                <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total paid</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80" }}>${totalBreakerPaid.toFixed(2)}</div>
                </div>
                <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total earned</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa" }}>${(totalBreakerOutstanding + totalBreakerPaid).toFixed(2)}</div>
                </div>
              </div>

              {/* Weekly periods */}
              {getBreakerPeriods(breakerTab).length === 0 ? (
                <div style={{ ...s.section, textAlign: "center", padding: 48 }}>
                  <p style={{ color: "#555", fontSize: 13 }}>No commission breaks yet</p>
                </div>
              ) : getBreakerPeriods(breakerTab).map(period => {
                const periodKey = `breaker-${breakerTab}-${period.key}`;
                const isMarking = markingPeriod === periodKey;
                const unpaidTotal = period.items.filter((b: any) => !b.commission_paid).reduce((s: number, b: any) => s + parseFloat(b.commission_amount || "0"), 0);
                const paidTotal = period.items.filter((b: any) => b.commission_paid).reduce((s: number, b: any) => s + parseFloat(b.commission_amount || "0"), 0);

                return (
                  <div key={period.key} style={{ ...s.section, borderColor: period.allPaid ? "#4ade8022" : unpaidTotal > 0 ? "#f8717122" : "#1e1e1e", opacity: period.allPaid ? 0.75 : 1 }}>
                    {/* Period header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                      <PeriodHeading
                        start={period.start}
                        state={period.state}
                        paidAt={period.paidAt}
                        detail={<>
                          {period.items.length} break{period.items.length !== 1 ? "s" : ""}
                          {isAdmin && breakerTab === "All Breakers" && period.breakersInPeriod.length > 0 && (
                            <span style={{ color: "#a78bfa", marginLeft: 8 }}>{(period.breakersInPeriod as string[]).join(", ")}</span>
                          )}
                        </>}
                      />
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                          {unpaidTotal > 0 && (
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 11, color: TONE[periodCopy(period.start, period.state).tone] }}>{period.state === "open" ? "SO FAR" : "AMOUNT"}</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: TONE[periodCopy(period.start, period.state).tone] }}>${unpaidTotal.toFixed(2)}</div>
                            </div>
                          )}
                          {paidTotal > 0 && (
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 11, color: "#4ade80" }}>PAID</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: "#4ade80" }}>${paidTotal.toFixed(2)}</div>
                            </div>
                          )}
                        </div>
                        {!isAdmin && (
                          <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: TONE[periodCopy(period.start, period.state).tone] + "22", color: TONE[periodCopy(period.start, period.state).tone], fontWeight: 600 }}>
                            {periodCopy(period.start, period.state, { paidAt: period.paidAt }).badge}
                          </span>
                        )}
                        {isAdmin && breakerTab !== "All Breakers" && (
                          period.allPaid ? (
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "#4ade8022", color: "#4ade80", fontWeight: 600 }}>✓ Paid</span>
                              <button onClick={() => markBreakerPeriodUnpaid(period.key, breakerTab)} disabled={!!isMarking} style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#555", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Undo</button>
                            </div>
                          ) : (
                            <button onClick={() => markBreakerPeriodPaid(period.key, breakerTab)} disabled={!!isMarking} style={{ fontSize: 13, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>
                              {isMarking ? "Marking..." : "✓ Mark week paid"}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Breaks in this period */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {period.items.map((b: any) => (
                        <div key={b.id} style={{ background: "#0a0a0a", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e5e5" }}>{b.box_name || b.date}</div>
                            <div style={{ fontSize: 11, color: "#555" }}>
                              {b.date}
                              {b.breaker && <span style={{ color: "#a78bfa", marginLeft: 8 }}>· {b.breaker}</span>}
                              {b.market_value > 0 && b.revenue_before_fees > 0 && <span style={{ marginLeft: 8 }}>· {((parseFloat(b.revenue_before_fees) / parseFloat(b.market_value)) * 100).toFixed(1)}% to market</span>}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: b.commission_paid ? "#4ade80" : "#a78bfa" }}>${parseFloat(b.commission_amount).toFixed(2)}</span>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: b.commission_paid ? "#4ade8022" : "#f8717122", color: b.commission_paid ? "#4ade80" : "#f87171" }}>
                              {b.commission_paid ? "Paid" : "Unpaid"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* SHIPPERS SECTION */}
          {section === "shippers" && (isAdmin || isShipperUser) && (
            <>
              {/* Shipper tabs — admin only */}
              {isAdmin && (
                <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                  {SHIPPER_TABS.map(tab => (
                    <button key={tab} onClick={() => setShipperTab(tab)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${shipperTab === tab ? "#38bdf8" : "#222"}`, background: shipperTab === tab ? "#38bdf822" : "#111", color: shipperTab === tab ? "#38bdf8" : "#555" }}>
                      {tab}
                    </button>
                  ))}
                </div>
              )}

              {/* Who we're viewing */}
              {!isAdmin && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#38bdf8" }}>📦 {userName}&apos;s shipping pay</div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>Broken out by week, newest first</div>
                </div>
              )}

              {!isAdmin && (
                <NextPayment periods={shipperPeriods.map(p => ({ start: p.start, state: p.state, due: p.unpaidTotal }))} />
              )}

              {/* Summary stats */}
              <div className="pay-stats">
                <div style={{ background: totalShipperOutstanding > 0 ? "#1a0a00" : "#0f1a0f", border: `1px solid ${totalShipperOutstanding > 0 ? "#f8717144" : "#4ade8044"}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Outstanding</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: totalShipperOutstanding > 0 ? "#f87171" : "#4ade80" }}>${totalShipperOutstanding.toFixed(2)}</div>
                </div>
                <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total paid</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80" }}>${totalShipperPaid.toFixed(2)}</div>
                </div>
                <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total earned</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8" }}>${(totalShipperOutstanding + totalShipperPaid).toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{filteredShipments.length} shipments</div>
                </div>
              </div>

              {/* Weekly periods */}
              {shipperPeriods.length === 0 ? (
                <div style={{ ...s.section, textAlign: "center", padding: 48 }}>
                  <p style={{ color: "#555", fontSize: 13 }}>No shipments logged yet</p>
                </div>
              ) : shipperPeriods.map(period => {
                const markKey = `${activeShipperName}-${period.key}`;
                const isMarking = markingPeriod === markKey;

                return (
                  <div key={period.key} style={{ ...s.section, borderColor: period.allPaid ? "#4ade8022" : period.unpaidTotal > 0 ? "#f8717122" : "#1e1e1e", opacity: period.allPaid ? 0.75 : 1 }}>
                    {/* Period header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                      <PeriodHeading
                        start={period.start}
                        state={period.state}
                        paidAt={period.paidAt}
                        detail={<>{period.items.length} shipment{period.items.length !== 1 ? "s" : ""}</>}
                      />
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, color: TONE[periodCopy(period.start, period.state).tone] }}>
                            {period.state === "paid" ? "PAID" : period.state === "open" ? "SO FAR" : "AMOUNT"}
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: TONE[periodCopy(period.start, period.state).tone] }}>${period.totalPay.toFixed(2)}</div>
                        </div>
                        {isAdmin && (
                          period.allPaid ? (
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "#4ade8022", color: "#4ade80", fontWeight: 600 }}>✓ Paid</span>
                              <button onClick={() => markShipperPeriodUnpaid(period.key, activeShipperName)} disabled={!!isMarking} style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#555", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Undo</button>
                            </div>
                          ) : (
                            <button onClick={() => markShipperPeriodPaid(period.key, activeShipperName)} disabled={!!isMarking} style={{ fontSize: 13, background: "linear-gradient(135deg,#0369a1,#38bdf8)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>
                              {isMarking ? "Marking..." : "✓ Mark week paid"}
                            </button>
                          )
                        )}
                        {!isAdmin && (
                          <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: TONE[periodCopy(period.start, period.state).tone] + "22", color: TONE[periodCopy(period.start, period.state).tone], fontWeight: 600 }}>
                            {periodCopy(period.start, period.state, { paidAt: period.paidAt }).badge}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Shipments in this period */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {period.items.map((sh: any) => (
                        <div key={sh.id} style={{ background: "#0a0a0a", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e5e5" }}>{sh.break_name}</div>
                            <div style={{ fontSize: 11, color: "#555" }}>
                              {sh.ship_date} · {sh.cases === "3plus" ? "3+ Cases" : `${sh.cases} Case${sh.cases === "1" ? "" : "s"}`}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: sh.paid ? "#4ade80" : "#38bdf8" }}>${parseFloat(sh.pay_amount).toFixed(2)}</span>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: sh.paid ? "#4ade8022" : "#f8717122", color: sh.paid ? "#4ade80" : "#f87171" }}>
                              {sh.paid ? "Paid" : "Unpaid"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

        </>}
      </div>
    </div>
  );
}