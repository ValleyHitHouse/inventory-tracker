"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const SHIPPER_RATES: Record<string, { "1": number; "2": number; "3plus": number }> = {
  Caitlin: { "1": 70, "2": 90, "3plus": 110 },
  Abbi: { "1": 60, "2": 80, "3plus": 110 },
};

const CASE_OPTIONS = [
  { value: "1", label: "1 Case" },
  { value: "2", label: "2 Cases" },
  { value: "3plus", label: "3+ Cases" },
];

export default function BreakShipmentsPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [breaks, setBreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shipperName, setShipperName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isShipper, setIsShipper] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [selectedBreak, setSelectedBreak] = useState("");
  const [shipDate, setShipDate] = useState(new Date().toISOString().split("T")[0]);
  const [cases, setCases] = useState("1");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const cookies = document.cookie.split(";").reduce((acc, c) => {
      const [k, v] = c.trim().split("=");
      acc[k] = v;
      return acc;
    }, {} as Record<string, string>);
    const name = cookies["vhh-user"] || "";
    const role = cookies["vhh-role"] || "";
    setShipperName(name);
    setIsAdmin(role === "admin");
    setIsShipper(Object.keys(SHIPPER_RATES).includes(name));
    loadData(name, role);
  }, []);

  async function loadData(name: string, role: string) {
    setLoading(true);
    const [shipmentsRes, breaksRes] = await Promise.all([
      role === "admin"
        ? supabase.from("break_shipments").select("*").order("created_at", { ascending: false })
        : supabase.from("break_shipments").select("*").eq("shipper_name", name).order("created_at", { ascending: false }),
      supabase.from("Breaks").select("id, box_name, date").order("date", { ascending: false }).limit(50),
    ]);
    if (shipmentsRes.data) setShipments(shipmentsRes.data);
    if (breaksRes.data) setBreaks(breaksRes.data);
    setLoading(false);
  }

  function getPayAmount(name: string, caseValue: string): number {
    const rates = SHIPPER_RATES[name];
    if (!rates) return 0;
    return rates[caseValue as keyof typeof rates] || 0;
  }

  async function submitShipment() {
    if (!selectedBreak || !shipDate) return alert("Please select a break and date");
    setSubmitting(true);
    const payAmount = getPayAmount(shipperName, cases);
    const breakRecord = breaks.find(b => String(b.id) === selectedBreak);
    await supabase.from("break_shipments").insert({
      shipper_name: shipperName,
      shipper_username: shipperName.toLowerCase(),
      break_name: breakRecord ? `${breakRecord.box_name || "Break"} — ${breakRecord.date}` : selectedBreak,
      ship_date: shipDate,
      cases,
      pay_amount: payAmount,
      status: "pending",
      paid: false,
      notes: notes || null,
    });
    await loadData(shipperName, isAdmin ? "admin" : "employee");
    setSubmitting(false);
    setShowForm(false);
    setSelectedBreak(""); setCases("1"); setNotes("");
    setShipDate(new Date().toISOString().split("T")[0]);
  }

  const myShipments = isAdmin ? shipments : shipments.filter(s => s.shipper_name === shipperName);
  const totalEarned = myShipments.reduce((s, sh) => s + parseFloat(sh.pay_amount || "0"), 0);
  const totalUnpaid = myShipments.filter(sh => !sh.paid).reduce((s, sh) => s + parseFloat(sh.pay_amount || "0"), 0);
  const totalPaid = myShipments.filter(sh => sh.paid).reduce((s, sh) => s + parseFloat(sh.pay_amount || "0"), 0);

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", width: "100%", boxSizing: "border-box" as const },
    content: { padding: "24px 16px", maxWidth: 900, margin: "0 auto", width: "100%", boxSizing: "border-box" as const },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const },
    label: { fontSize: 12, color: "#666", marginBottom: 5, display: "block" },
    submitBtn: { background: "linear-gradient(135deg,#7c3aed,#db2877)", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" },
  };

  const mobileStyles = `
    .bs-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 16px; }
    .bs-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    @media (max-width: 768px) {
      .bs-stats { grid-template-columns: 1fr 1fr; }
      .bs-form-grid { grid-template-columns: 1fr; }
    }
  `;

  if (!isShipper && !isAdmin) {
    return (
      <div style={s.shell}>
        <div style={s.content}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Break Shipments</h1>
          <p style={{ color: "#555" }}>You don't have access to this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Break Shipments</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
              {isAdmin ? "All shipper submissions" : `Your shipments — ${shipperName}`}
            </p>
          </div>
          {(isShipper || isAdmin) && (
            <button onClick={() => setShowForm(!showForm)} style={s.submitBtn}>
              {showForm ? "Cancel" : "+ Log shipment"}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="bs-stats">
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total earned</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa" }}>${totalEarned.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{myShipments.length} shipment{myShipments.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ background: totalUnpaid > 0 ? "#1a0a00" : "#0f1a0f", border: `1px solid ${totalUnpaid > 0 ? "#f8717144" : "#4ade8044"}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Outstanding</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: totalUnpaid > 0 ? "#f87171" : "#4ade80" }}>${totalUnpaid.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{myShipments.filter(s => !s.paid).length} unpaid</div>
          </div>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total paid</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80" }}>${totalPaid.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{myShipments.filter(s => s.paid).length} paid</div>
          </div>
        </div>

        {/* Pay rate info for shippers */}
        {isShipper && !isAdmin && SHIPPER_RATES[shipperName] && (
          <div style={{ ...s.section, borderColor: "#a78bfa33" }}>
            <div style={s.sectionTitle}>💰 Your pay rates</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {CASE_OPTIONS.map(opt => (
                <div key={opt.value} style={{ background: "#0f0f0f", borderRadius: 8, padding: "10px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#a78bfa" }}>${SHIPPER_RATES[shipperName][opt.value as keyof typeof SHIPPER_RATES[string]]}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit form */}
        {showForm && (
          <div style={{ ...s.section, borderColor: "#7c3aed44" }}>
            <div style={s.sectionTitle}>Log shipment</div>
            <div style={{ marginBottom: 12 }}>
              <label style={s.label}>Break</label>
              <select style={s.input} value={selectedBreak} onChange={e => setSelectedBreak(e.target.value)}>
                <option value="">— Select break —</option>
                {breaks.map(b => (
                  <option key={b.id} value={String(b.id)}>
                    {b.box_name || "Break"} — {b.date}
                  </option>
                ))}
              </select>
            </div>
            <div className="bs-form-grid">
              <div>
                <label style={s.label}>Ship date</label>
                <input style={s.input} type="date" value={shipDate} onChange={e => setShipDate(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Cases</label>
                <select style={s.input} value={cases} onChange={e => setCases(e.target.value)}>
                  {CASE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {isAdmin && (
              <div style={{ marginBottom: 12 }}>
                <label style={s.label}>Shipper</label>
                <select style={s.input} value={shipperName} onChange={e => setShipperName(e.target.value)}>
                  {Object.keys(SHIPPER_RATES).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Notes (optional)</label>
              <input style={s.input} placeholder="Any additional details" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            {cases && (
              <div style={{ background: "#0f0a1a", border: "1px solid #a78bfa33", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: "#a78bfa" }}>
                  Pay for this shipment: <strong>${getPayAmount(shipperName, cases).toFixed(2)}</strong>
                </span>
              </div>
            )}
            <button style={{ ...s.submitBtn, width: "100%" }} onClick={submitShipment} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit shipment"}
            </button>
          </div>
        )}

        {/* Shipments list */}
        {loading ? <p style={{ color: "#555" }}>Loading...</p> : myShipments.length === 0 ? (
          <div style={{ ...s.section, textAlign: "center", padding: 48 }}>
            <p style={{ color: "#555", fontSize: 13 }}>No shipments logged yet</p>
          </div>
        ) : (
          <div style={s.section}>
            <div style={s.sectionTitle}>Shipment history</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {myShipments.map(sh => (
                <div key={sh.id} style={{ background: "#0f0f0f", borderRadius: 8, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, opacity: sh.paid ? 0.7 : 1 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5", marginBottom: 4 }}>{sh.break_name}</div>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      {sh.ship_date} · {sh.cases === "3plus" ? "3+ Cases" : `${sh.cases} Case${sh.cases === "1" ? "" : "s"}`}
                      {isAdmin && <span style={{ color: "#a78bfa", marginLeft: 8 }}>· {sh.shipper_name}</span>}
                    </div>
                    {sh.notes && <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{sh.notes}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: sh.paid ? "#4ade80" : "#a78bfa" }}>${parseFloat(sh.pay_amount).toFixed(2)}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: sh.paid ? "#4ade8022" : "#f8717122", color: sh.paid ? "#4ade80" : "#f87171" }}>
                      {sh.paid ? "Paid" : "Unpaid"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}