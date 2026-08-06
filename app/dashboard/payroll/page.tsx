"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function PayrollPage() {
  const [breaks, setBreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState("All");
  const router = useRouter();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from("Breaks")
      .select("*")
      .not("commission_amount", "is", null)
      .gt("commission_amount", 0)
      .order("date", { ascending: false });
    if (data) setBreaks(data);
    setLoading(false);
  }

  async function markPaid(id: number) {
    setMarkingId(id);
    await supabase.from("Breaks").update({ commission_paid: true, commission_paid_at: new Date().toISOString() }).eq("id", id);
    await loadData();
    setMarkingId(null);
  }

  async function markUnpaid(id: number) {
    setMarkingId(id);
    await supabase.from("Breaks").update({ commission_paid: false, commission_paid_at: null }).eq("id", id);
    await loadData();
    setMarkingId(null);
  }

  const employees = ["All", ...Array.from(new Set(breaks.map(b => b.breaker).filter(Boolean)))];
  const filtered = selectedEmployee === "All" ? breaks : breaks.filter(b => b.breaker === selectedEmployee);

  const totalUnpaid = filtered.filter(b => !b.commission_paid).reduce((s, b) => s + parseFloat(b.commission_amount || "0"), 0);
  const totalPaid = filtered.filter(b => b.commission_paid).reduce((s, b) => s + parseFloat(b.commission_amount || "0"), 0);
  const unpaidBreaks = filtered.filter(b => !b.commission_paid);
  const paidBreaks = filtered.filter(b => b.commission_paid);

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", width: "100%", boxSizing: "border-box" as const },
    content: { padding: "24px 16px", maxWidth: 1000, margin: "0 auto", width: "100%", boxSizing: "border-box" as const },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
  };

  const mobileStyles = `
    .pay-grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 16px; }
    @media (max-width: 768px) { .pay-grid-3 { grid-template-columns: 1fr 1fr; } }
  `;

  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Payroll</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Commission tracking for breakers</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {employees.map(emp => (
              <button key={emp} onClick={() => setSelectedEmployee(emp)} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${selectedEmployee === emp ? "#a78bfa" : "#222"}`, background: selectedEmployee === emp ? "#a78bfa22" : "#111", color: selectedEmployee === emp ? "#a78bfa" : "#555" }}>
                {emp}
              </button>
            ))}
          </div>
        </div>

        {loading ? <p style={{ color: "#555" }}>Loading...</p> : <>

          {/* Summary stats */}
          <div className="pay-grid-3">
            <div style={{ background: totalUnpaid > 0 ? "#1a0a00" : "#0f1a0f", border: `1px solid ${totalUnpaid > 0 ? "#f8717144" : "#4ade8044"}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Outstanding</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: totalUnpaid > 0 ? "#f87171" : "#4ade80" }}>${totalUnpaid.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{unpaidBreaks.length} unpaid break{unpaidBreaks.length !== 1 ? "s" : ""}</div>
            </div>
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total paid out</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#4ade80" }}>${totalPaid.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{paidBreaks.length} paid break{paidBreaks.length !== 1 ? "s" : ""}</div>
            </div>
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total earned</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#a78bfa" }}>${(totalUnpaid + totalPaid).toFixed(2)}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{filtered.length} commission break{filtered.length !== 1 ? "s" : ""}</div>
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
                          {b.market_value > 0 && ` · ${((parseFloat(b.revenue_before_fees || "0") / parseFloat(b.market_value)) * 100).toFixed(1)}% to market`}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#f87171" }}>${parseFloat(b.commission_amount).toFixed(2)}</div>
                          <div style={{ fontSize: 11, color: "#555" }}>commission</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <button onClick={() => markPaid(b.id)} disabled={markingId === b.id} style={{ fontSize: 12, background: "#a78bfa22", border: "1px solid #a78bfa44", color: "#a78bfa", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {markingId === b.id ? "..." : "Mark paid"}
                          </button>
                          <button onClick={() => router.push(`/dashboard/breaks/${b.id}`)} style={{ fontSize: 11, background: "none", border: "1px solid #222", color: "#555", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                            View break
                          </button>
                        </div>
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
                      <button onClick={() => markUnpaid(b.id)} disabled={markingId === b.id} style={{ fontSize: 10, background: "none", border: "1px solid #333", color: "#555", borderRadius: 5, padding: "2px 8px", cursor: "pointer" }}>
                        Undo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </>}
      </div>
    </div>
  );
}