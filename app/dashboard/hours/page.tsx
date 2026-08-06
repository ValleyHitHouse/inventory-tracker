"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const SHIPPER_TABS = ["Caitlin", "Abbi"];

function getPayPeriod(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const day = date.getDay(); // 0=Sun, 6=Sat
  // Find the most recent Saturday (start of period)
  const daysFromSat = (day + 1) % 7; // days since last Saturday
  const periodStart = new Date(date);
  periodStart.setDate(date.getDate() - daysFromSat);
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodStart.getDate() + 6); // Friday
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(periodStart)} – ${fmt(periodEnd)}, ${periodEnd.getFullYear()}`;
}

function getPeriodKey(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const day = date.getDay();
  const daysFromSat = (day + 1) % 7;
  const periodStart = new Date(date);
  periodStart.setDate(date.getDate() - daysFromSat);
  return periodStart.toISOString().split("T")[0];
}

function groupByPeriod(items: any[], dateField: string) {
  const groups: Record<string, { key: string; label: string; items: any[] }> = {};
  for (const item of items) {
    const key = getPeriodKey(item[dateField]);
    const label = getPayPeriod(item[dateField]);
    if (!groups[key]) groups[key] = { key, label, items: [] };
    groups[key].items.push(item);
  }
  return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
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
    const [breaksRes, shipmentsRes] = await Promise.all([
      supabase.from("Breaks").select("*").not("commission_amount", "is", null).gt("commission_amount", 0).order("date", { ascending: false }),
      supabase.from("break_shipments").select("*").order("ship_date", { ascending: false }),
    ]);
    if (breaksRes.data) setBreaks(breaksRes.data);
    if (shipmentsRes.data) setShipments(shipmentsRes.data);
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
  const isShipper = SHIPPER_TABS.includes(userName);

  // Breaker data
  const allBreakers = Array.from(new Set(breaks.map(b => b.breaker).filter(Boolean)));
  const breakerTabs = ["All Breakers", ...allBreakers];
  const filteredBreaks = breakerTab === "All Breakers"
    ? breaks : breaks.filter(b => b.breaker === breakerTab);

  // Group breaker breaks by period and breaker
  function getBreakerPeriods(breakerName: string) {
    const breakerBreaks = breakerName === "All Breakers"
      ? breaks : breaks.filter(b => b.breaker === breakerName);
    const groups = groupByPeriod(breakerBreaks, "date");
    return groups.map(group => {
      const totalCommission = group.items.reduce((s, b) => s + parseFloat(b.commission_amount || "0"), 0);
      const allPaid = group.items.every(b => b.commission_paid);
      const somePaid = group.items.some(b => b.commission_paid);
      const breakersInPeriod = Array.from(new Set(group.items.map((b: any) => b.breaker)));
      return { ...group, totalCommission, allPaid, somePaid, breakersInPeriod };
    });
  }

  // Shipper data
  const filteredShipments = isAdmin
    ? shipments.filter(s => s.shipper_name === shipperTab)
    : shipments.filter(s => s.shipper_name === userName);

  const shipperPeriods = groupByPeriod(filteredShipments, "ship_date").map(group => {
    const totalPay = group.items.reduce((s, sh) => s + parseFloat(sh.pay_amount || "0"), 0);
    const allPaid = group.items.every(sh => sh.paid);
    const unpaidTotal = group.items.filter(sh => !sh.paid).reduce((s, sh) => s + parseFloat(sh.pay_amount || "0"), 0);
    return { ...group, totalPay, allPaid, unpaidTotal };
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
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Payroll</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Weekly pay periods — Saturday to Friday · Payday every Friday</p>
        </div>

        {/* Section toggle — only show if admin or show relevant section */}
        {isAdmin && (
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
          {section === "breakers" && isAdmin && (
            <>
              {/* Breaker tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {breakerTabs.map(tab => (
                  <button key={tab} onClick={() => setBreakerTab(tab)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${breakerTab === tab ? "#a78bfa" : "#222"}`, background: breakerTab === tab ? "#a78bfa22" : "#111", color: breakerTab === tab ? "#a78bfa" : "#555" }}>
                    {tab}
                  </button>
                ))}
              </div>

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
                      <div>
                        <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Pay period</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#e5e5e5" }}>{period.label}</div>
                        <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                          {period.items.length} break{period.items.length !== 1 ? "s" : ""}
                          {breakerTab === "All Breakers" && period.breakersInPeriod.length > 0 && (
                            <span style={{ color: "#a78bfa", marginLeft: 8 }}>{(period.breakersInPeriod as string[]).join(", ")}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                          {unpaidTotal > 0 && (
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 11, color: "#f87171" }}>UNPAID</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: "#f87171" }}>${unpaidTotal.toFixed(2)}</div>
                            </div>
                          )}
                          {paidTotal > 0 && (
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 11, color: "#4ade80" }}>PAID</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: "#4ade80" }}>${paidTotal.toFixed(2)}</div>
                            </div>
                          )}
                        </div>
                        {breakerTab !== "All Breakers" && (
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
          {section === "shippers" && (
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
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#38bdf8" }}>📦 {userName}'s pay summary</div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>Payday is every Friday for the previous week (Sat–Fri)</div>
                </div>
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
                      <div>
                        <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Pay period · Paid on Friday</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#e5e5e5" }}>{period.label}</div>
                        <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{period.items.length} shipment{period.items.length !== 1 ? "s" : ""}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, color: period.allPaid ? "#4ade80" : "#f87171" }}>{period.allPaid ? "PAID" : "TOTAL DUE"}</div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: period.allPaid ? "#4ade80" : "#f87171" }}>${period.totalPay.toFixed(2)}</div>
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
                          <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: period.allPaid ? "#4ade8022" : "#f8717122", color: period.allPaid ? "#4ade80" : "#f87171", fontWeight: 600 }}>
                            {period.allPaid ? "✓ Paid" : "Pending payment"}
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