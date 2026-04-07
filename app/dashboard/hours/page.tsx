"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function HoursPage() {
  const [myHours, setMyHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeId, setEmployeeId] = useState<number | null>(null);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const cookies = document.cookie.split(";").reduce((acc, c) => {
      const [k, v] = c.trim().split("=");
      acc[k] = v;
      return acc;
    }, {} as Record<string, string>);
    const name = cookies["vhh-user"] || "";
    setEmployeeName(name);
    if (name) loadMyHours(name);
  }, []);

  async function loadMyHours(name: string) {
    setLoading(true);
    const { data: emp } = await supabase.from("employees").select("id").eq("name", name).single();
    if (emp) {
      setEmployeeId(emp.id);
      const { data } = await supabase.from("employee_hours").select("*").eq("employee_id", emp.id).order("date", { ascending: false });
      if (data) setMyHours(data);
    }
    setLoading(false);
  }

  async function submitHours() {
    if (!hours || !date) return alert("Please enter date and hours");
    if (!employeeId) return alert("Could not identify employee — try logging out and back in");
    setSubmitting(true);
    await supabase.from("employee_hours").insert({
      employee_id: employeeId,
      employee_name: employeeName,
      date, hours: parseFloat(hours),
      description: description || null,
      status: "pending",
    });
    await loadMyHours(employeeName);
    setSubmitting(false);
    setShowForm(false);
    setHours(""); setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
  }

  const totalApproved = myHours.filter(h => h.status === "approved").reduce((s, h) => s + parseFloat(h.hours || "0"), 0);
  const totalPending = myHours.filter(h => h.status === "pending").reduce((s, h) => s + parseFloat(h.hours || "0"), 0);

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", width: "100%", boxSizing: "border-box" as const },
    content: { padding: "24px 16px", maxWidth: 700, margin: "0 auto", width: "100%", boxSizing: "border-box" as const },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const },
    label: { fontSize: 12, color: "#666", marginBottom: 5, display: "block" },
    submitBtn: { background: "linear-gradient(135deg,#7c3aed,#db2877)", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" },
  };

  const mobileStyles = `
    .hours-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .hours-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    @media (max-width: 768px) {
      .hours-stats { grid-template-columns: 1fr 1fr; }
      .hours-form-grid { grid-template-columns: 1fr; }
    }
  `;

  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>My Hours</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
              {employeeName ? `Logged in as ${employeeName}` : "Loading..."}
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={s.submitBtn}>
            {showForm ? "Cancel" : "+ Log hours"}
          </button>
        </div>

        {/* Stats */}
        <div className="hours-stats">
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total approved</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#4ade80" }}>{totalApproved.toFixed(1)}h</div>
          </div>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Pending review</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#fb923c" }}>{totalPending.toFixed(1)}h</div>
          </div>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Submissions</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#e5e5e5" }}>{myHours.length}</div>
          </div>
        </div>

        {/* Submit form */}
        {showForm && (
          <div style={{ ...s.section, borderColor: "#7c3aed44" }}>
            <div style={s.sectionTitle}>Log hours</div>
            <div className="hours-form-grid">
              <div>
                <label style={s.label}>Date</label>
                <input style={s.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Hours worked</label>
                <input style={s.input} type="number" min={0} step="0.5" placeholder="e.g. 4.5" value={hours} onChange={e => setHours(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Description (optional)</label>
              <input style={s.input} placeholder="e.g. Packing orders, inventory count" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <button style={{ ...s.submitBtn, width: "100%" }} onClick={submitHours} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit hours"}
            </button>
          </div>
        )}

        {/* Hours history */}
        <div style={s.section}>
          <div style={s.sectionTitle}>My submissions</div>
          {loading ? (
            <p style={{ color: "#555" }}>Loading...</p>
          ) : myHours.length === 0 ? (
            <p style={{ color: "#555", fontSize: 13 }}>No hours submitted yet — click "Log hours" to get started</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {myHours.map(h => (
                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#0f0f0f", borderRadius: 8, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e5e5" }}>{h.date}</div>
                    {h.description && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{h.description}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: h.status === "approved" ? "#4ade80" : h.status === "rejected" ? "#f87171" : "#fb923c" }}>
                      {h.hours}h
                    </span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: h.status === "approved" ? "#4ade8022" : h.status === "rejected" ? "#f8717122" : "#fb923c22", color: h.status === "approved" ? "#4ade80" : h.status === "rejected" ? "#f87171" : "#fb923c" }}>
                      {h.status === "approved" ? "✓ Approved" : h.status === "rejected" ? "✗ Rejected" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}