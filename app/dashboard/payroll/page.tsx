"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const BREAKER_TABS = ["All Breakers", "Alec"];
const SHIPPER_TABS = ["Caitlin", "Abbi"];

export default function PayrollPage() {
  const [section, setSection] = useState<"breakers" | "shippers">("breakers");
  const [breakerTab, setBreakerTab] = useState("All Breakers");
  const [shipperTab, setShipperTab] = useState("Caitlin");
  const [breaks, setBreaks] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markingShipId, setMarkingShipId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const cookies = document.cookie.split(";").reduce((acc, c) => {
      const [k, v] = c.trim().split("=");
      acc[k] = v;
      return acc;
    }, {} as Record<string, string>);
    setUserRole(cookies["vhh-role"] || "");
    setUserName(cookies["vhh-user"] || "");
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [breaksRes, shipmentsRes] = await Promise.all([
      supabase.from("Breaks").select("*").not("commission_amount", "is", null).gt("commission_amount", 0).order("date", { ascending: false }),
      supabase.from("break_shipments").select("*").order("created_at", { ascending: false }),
    ]);
    if (breaksRes.data) setBreaks(breaksRes.data);
    if (shipmentsRes.data) setShipments(shipmentsRes.data);
    setLoading(false);
  }

  async function markCommissionPaid(id: number) {
    setMarkingId(id);
    await supabase.from("Breaks").update({ commission_paid: true, commission_paid_at: new Date().toISOString() }).eq("id", id);
    await loadData();
    setMarkingId(null);
  }

  async function markCommissionUnpaid(id: number) {
    setMarkingId(id);
    await supabase.from("Breaks").update({ commission_paid: false, commission_paid_at: null }).eq("id", id);
    await loadData();
    setMarkingId(null);
  }

  async function markShipmentPaid(id: number) {
    setMarkingShipId(id);
    await supabase.from("break_shipments").update({ paid: true, paid_at: new Date().toISOString() }).eq("id", id);
    await loadData();
    setMarkingShipId(null);
  }

  async function markShipmentUnpaid(id: number) {
    setMarkingShipId(id);
    await supabase.from("break_shipments").update({ paid: false, paid_at: null }).eq("id", id);
    await loadData();
    setMarkingShipId(null);
  }

  // Filter breaks by breaker tab
  const filteredBreaks = breakerTab === "All Breakers"
    ? breaks
    : breaks.filter(b => b.breaker === breakerTab);

  const unpaidBreaks = filteredBreaks.filter(b => !b.commission_paid);
  const paidBreaks = filteredBreaks.filter(b => b.commission_paid);
  const totalUnpaidCommission = unpaidBreaks.reduce((s, b) => s + parseFloat(b.commission_amount || "0"), 0);
  const totalPaidCommission = paidBreaks.reduce((s, b) => s + parseFloat(b.commission_amount || "0"), 0);

  // Filter shipments by shipper tab
  const filteredShipments = shipments.filter(s => s.shipper_name === shipperTab);
  const unpaidShipments = filteredShipments.filter(s => !s.paid);
  const paidShipments = filteredShipments.filter(s => s.paid);
  const totalUnpaidShipping = unpaidShipments.reduce((s, sh) => s + parseFloat(sh.pay_amount || "0"), 0);
  const totalPaidShipping = paidShipments.reduce((s, sh) => s + parseFloat(sh.pay_amount || "0"), 0);

  // Get all unique breakers for tabs
  const allBreakers = Array.from(new Set(breaks.map(b => b.breaker).filter(Boolean)));
  const breakerTabs = ["All Breakers", ...allBreakers];

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

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Payroll</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Commission & shipper pay tracking</p>
        </div>

        {/* Section toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button onClick={() => setSection("breakers")} style={{ padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", border: `1px solid ${section === "breakers" ? "#a78bfa" : "#222"}`, background: section === "breakers" ? "#a78bfa22" : "#111", color: section === "breakers" ? "#a78bfa" : "#555" }}>
            💼 Breakers
          </button>
          <button onClick={() => setSection("shippers")} style={{ padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", border: `1px solid ${section === "shippers" ? "#38bdf8" : "#222"}`, background: section === "shippers" ? "#38bdf822" : "#111", color: section === "shippers" ? "#38bdf8" : "#555" }}>
            📦 Shippers
          </button>
        </div>

        {loading ? <p style={{ color: "#555" }}>Loading...</p> : <>

          {/* BREAKERS SECTION */}
          {section === "breakers" && (
            <>
              {/* Breaker tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {breakerTabs.map(tab => (
                  <button key={tab} onClick={() => setBreakerTab(tab)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${breakerTab === tab ? "#a78bfa" : "#222"}`, background: breakerTab === tab ? "#a78bfa22" : "#111", color: breakerTab === tab ? "#a78bfa" : "#555" }}>
                    {tab}
                  </button>
                ))}
              </div>

              {/* Stats */}
              <div className="pay-stats">
                <div style={{ background: totalUnpaidCommission > 0 ? "#1a0a00" : "#0f1a0f", border: `1px solid ${totalUnpaidCommission > 0 ? "#f8717144" : "#4ade8044"}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Outstanding</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: totalUnpaidCommission > 0 ? "#f87171" : "#4ade80" }}>${totalUnpaidCommission.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{unpaidBreaks.length} unpaid</div>
                </div>
                <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total paid</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80" }}>${totalPaidCommission.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{paidBreaks.length} paid</div>
                </div>
                <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total earned</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa" }}>${(totalUnpaidCommission + totalPaidCommission).toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{filteredBreaks.length} breaks</div>
                </div>
              </div>

              {/* Unpaid */}
              <div style={s.section}>
                <div style={s.sectionTitle}>⏳ Unpaid ({unpaidBreaks.length})</div>
                {unpaidBreaks.length === 0 ? (
                  <p style={{ color: "#4ade80", fontSize: 13 }}>✓ All commissions paid up!</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {unpaidBreaks.map(b => (
                      <div key={b.id} style={{ background: "#0f0f0f", border: "1px solid #f8717122", borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#e5e5e5" }}>{b.box_name || b.date}</span>
                              <span style={{ fontSize: 12, color: "#a78bfa" }}>🎙️ {b.breaker}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#555" }}>
                              {b.date} · Valley: ${parseFloat(b.valley_take || "0").toFixed(2)}
                              {b.market_value > 0 && b.revenue_before_fees > 0 && ` · ${((parseFloat(b.revenue_before_fees) / parseFloat(b.market_value)) * 100).toFixed(1)}% to market`}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 18, fontWeight: 800, color: "#f87171" }}>${parseFloat(b.commission_amount).toFixed(2)}</div>
                              <div style={{ fontSize: 11, color: "#555" }}>commission</div>
                            </div>
                            <button onClick={() => markCommissionPaid(b.id)} disabled={markingId === b.id} style={{ fontSize: 12, background: "#a78bfa22", border: "1px solid #a78bfa44", color: "#a78bfa", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}>
                              {markingId === b.id ? "..." : "Mark paid"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Paid */}
              {paidBreaks.length > 0 && (
                <div style={s.section}>
                  <div style={s.sectionTitle}>✅ Paid ({paidBreaks.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {paidBreaks.map(b => (
                      <div key={b.id} style={{ background: "#0f0f0f", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, opacity: 0.7 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#aaa" }}>{b.box_name || b.date}</div>
                          <div style={{ fontSize: 11, color: "#555" }}>
                            {b.date} · {b.breaker}
                            {b.commission_paid_at && ` · Paid ${new Date(b.commission_paid_at).toLocaleDateString()}`}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#4ade80" }}>${parseFloat(b.commission_amount).toFixed(2)}</span>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#4ade8022", color: "#4ade80" }}>Paid</span>
                          <button onClick={() => markCommissionUnpaid(b.id)} disabled={markingId === b.id} style={{ fontSize: 10, background: "none", border: "1px solid #333", color: "#555", borderRadius: 5, padding: "2px 8px", cursor: "pointer" }}>Undo</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* SHIPPERS SECTION */}
          {section === "shippers" && (
            <>
              {/* Shipper tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {SHIPPER_TABS.map(tab => (
                  <button key={tab} onClick={() => setShipperTab(tab)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${shipperTab === tab ? "#38bdf8" : "#222"}`, background: shipperTab === tab ? "#38bdf822" : "#111", color: shipperTab === tab ? "#38bdf8" : "#555" }}>
                    {tab}
                  </button>
                ))}
              </div>

              {/* Stats */}
              <div className="pay-stats">
                <div style={{ background: totalUnpaidShipping > 0 ? "#1a0a00" : "#0f1a0f", border: `1px solid ${totalUnpaidShipping > 0 ? "#f8717144" : "#4ade8044"}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Outstanding</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: totalUnpaidShipping > 0 ? "#f87171" : "#4ade80" }}>${totalUnpaidShipping.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{unpaidShipments.length} unpaid</div>
                </div>
                <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total paid</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80" }}>${totalPaidShipping.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{paidShipments.length} paid</div>
                </div>
                <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total earned</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8" }}>${(totalUnpaidShipping + totalPaidShipping).toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{filteredShipments.length} shipments</div>
                </div>
              </div>

              {/* Unpaid shipments */}
              <div style={s.section}>
                <div style={s.sectionTitle}>⏳ Unpaid ({unpaidShipments.length})</div>
                {unpaidShipments.length === 0 ? (
                  <p style={{ color: "#4ade80", fontSize: 13 }}>✓ All shipments paid up!</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {unpaidShipments.map(sh => (
                      <div key={sh.id} style={{ background: "#0f0f0f", border: "1px solid #f8717122", borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#e5e5e5", marginBottom: 4 }}>{sh.break_name}</div>
                            <div style={{ fontSize: 12, color: "#555" }}>
                              {sh.ship_date} · {sh.cases === "3plus" ? "3+ Cases" : `${sh.cases} Case${sh.cases === "1" ? "" : "s"}`}
                            </div>
                            {sh.notes && <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{sh.notes}</div>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 18, fontWeight: 800, color: "#f87171" }}>${parseFloat(sh.pay_amount).toFixed(2)}</div>
                              <div style={{ fontSize: 11, color: "#555" }}>pay</div>
                            </div>
                            <button onClick={() => markShipmentPaid(sh.id)} disabled={markingShipId === sh.id} style={{ fontSize: 12, background: "#38bdf822", border: "1px solid #38bdf844", color: "#38bdf8", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}>
                              {markingShipId === sh.id ? "..." : "Mark paid"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Paid shipments */}
              {paidShipments.length > 0 && (
                <div style={s.section}>
                  <div style={s.sectionTitle}>✅ Paid ({paidShipments.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {paidShipments.map(sh => (
                      <div key={sh.id} style={{ background: "#0f0f0f", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, opacity: 0.7 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#aaa" }}>{sh.break_name}</div>
                          <div style={{ fontSize: 11, color: "#555" }}>
                            {sh.ship_date} · {sh.cases === "3plus" ? "3+ Cases" : `${sh.cases} Case${sh.cases === "1" ? "" : "s"}`}
                            {sh.paid_at && ` · Paid ${new Date(sh.paid_at).toLocaleDateString()}`}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#4ade80" }}>${parseFloat(sh.pay_amount).toFixed(2)}</span>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#4ade8022", color: "#4ade80" }}>Paid</span>
                          <button onClick={() => markShipmentUnpaid(sh.id)} disabled={markingShipId === sh.id} style={{ fontSize: 10, background: "none", border: "1px solid #333", color: "#555", borderRadius: 5, padding: "2px 8px", cursor: "pointer" }}>Undo</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </>}
      </div>
    </div>
  );
}