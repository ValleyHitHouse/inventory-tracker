"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"employees" | "hours" | "add">("employees");
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [empRes, hoursRes] = await Promise.all([
      supabase.from("employees").select("*").order("created_at"),
      supabase.from("employee_hours").select("*").order("date", { ascending: false }),
    ]);
    if (empRes.data) setEmployees(empRes.data);
    if (hoursRes.data) setHours(hoursRes.data);
    setLoading(false);
  }

  async function addEmployee() {
    if (!newName || !newUsername || !newPassword) return alert("Please fill in all fields");
    setSaving(true);
    await supabase.from("employees").insert({
      name: newName,
      username: newUsername.toLowerCase().trim(),
      password_hash: newPassword,
      role: "employee",
      active: true,
    });
    await loadData();
    setSaving(false);
    setNewName(""); setNewUsername(""); setNewPassword("");
    setView("employees");
  }

  async function toggleActive(id: number, active: boolean) {
    setUpdatingId(id);
    await supabase.from("employees").update({ active: !active }).eq("id", id);
    await loadData();
    setUpdatingId(null);
  }

  async function approveHours(id: number) {
    setUpdatingId(id);
    await supabase.from("employee_hours").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
    await loadData();
    setUpdatingId(null);
  }

  async function rejectHours(id: number) {
    setUpdatingId(id);
    await supabase.from("employee_hours").update({ status: "rejected" }).eq("id", id);
    await loadData();
    setUpdatingId(null);
  }

  const pendingHours = hours.filter(h => h.status === "pending");
  const approvedHours = hours.filter(h => h.status === "approved");

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", width: "100%", boxSizing: "border-box" as const },
    content: { padding: "24px 16px", maxWidth: 1000, margin: "0 auto", width: "100%", boxSizing: "border-box" as const },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const },
    label: { fontSize: 12, color: "#666", marginBottom: 5, display: "block" },
    submitBtn: { background: "linear-gradient(135deg,#7c3aed,#db2877)", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" },
  };

  const mobileStyles = `
    .emp-grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 16px; }
    .emp-add-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    @media (max-width: 768px) {
      .emp-grid-3 { grid-template-columns: 1fr 1fr; }
      .emp-add-grid { grid-template-columns: 1fr; }
    }
  `;

  if (view === "add") return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Add employee</h1>
          <button onClick={() => setView("employees")} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>← Back</button>
        </div>
        <div style={s.section}>
          <div className="emp-add-grid">
            <div>
              <label style={s.label}>Full name</label>
              <input style={s.input} placeholder="e.g. Jake Smith" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Username</label>
              <input style={s.input} placeholder="e.g. jake" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Password</label>
              <input style={s.input} placeholder="Their login password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
          </div>
          <button style={{ ...s.submitBtn, width: "100%" }} onClick={addEmployee} disabled={saving}>
            {saving ? "Adding..." : "Add employee"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Employees</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Manage team access and review submitted hours</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setView(view === "hours" ? "employees" : "hours")} style={{ fontSize: 13, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>
              {view === "hours" ? "👤 Employees" : `⏱️ Hours ${pendingHours.length > 0 ? `(${pendingHours.length} pending)` : ""}`}
            </button>
            <button onClick={() => setView("add")} style={s.submitBtn}>+ Add employee</button>
          </div>
        </div>

        {loading ? <p style={{ color: "#555" }}>Loading...</p> : view === "employees" ? (
          <>
            {/* Stats */}
            <div className="emp-grid-3">
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total employees</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#e5e5e5" }}>{employees.filter(e => e.role === "employee").length}</div>
              </div>
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Active</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#4ade80" }}>{employees.filter(e => e.active && e.role === "employee").length}</div>
              </div>
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Hours pending</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: pendingHours.length > 0 ? "#fb923c" : "#555" }}>{pendingHours.length}</div>
              </div>
            </div>

            {/* Employee list */}
            <div style={s.section}>
              <div style={s.sectionTitle}>Team members</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {employees.map(emp => (
                  <div key={emp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#0f0f0f", borderRadius: 8, opacity: emp.active ? 1 : 0.5, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: emp.role === "admin" ? "linear-gradient(135deg,#fb923c,#f472b6)" : "linear-gradient(135deg,#7c3aed,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                        {emp.name[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5" }}>{emp.name}</div>
                        <div style={{ fontSize: 12, color: "#555" }}>@{emp.username} · <span style={{ color: emp.role === "admin" ? "#fb923c" : "#a78bfa" }}>{emp.role}</span></div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: emp.active ? "#4ade8022" : "#f8717122", color: emp.active ? "#4ade80" : "#f87171" }}>
                        {emp.active ? "Active" : "Inactive"}
                      </span>
                      {emp.role !== "admin" && (
                        <button
                          onClick={() => toggleActive(emp.id, emp.active)}
                          disabled={updatingId === emp.id}
                          style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#555", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                        >
                          {updatingId === emp.id ? "..." : emp.active ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Pending hours */}
            <div style={s.section}>
              <div style={s.sectionTitle}>⏳ Pending approval ({pendingHours.length})</div>
              {pendingHours.length === 0 ? (
                <p style={{ color: "#555", fontSize: 13 }}>No pending hours submissions</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pendingHours.map(h => (
                    <div key={h.id} style={{ background: "#0f0f0f", border: "1px solid #fb923c33", borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5" }}>{h.employee_name}</div>
                          <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{h.date} · {h.hours} hours</div>
                          {h.description && <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>{h.description}</div>}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#fb923c" }}>{h.hours}h</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => approveHours(h.id)} disabled={updatingId === h.id} style={{ fontSize: 12, background: "#166534", border: "none", color: "#4ade80", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontWeight: 600 }}>
                          {updatingId === h.id ? "..." : "✓ Approve"}
                        </button>
                        <button onClick={() => rejectHours(h.id)} disabled={updatingId === h.id} style={{ fontSize: 12, background: "#7f1d1d", border: "none", color: "#fca5a5", borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Approved hours */}
            <div style={s.section}>
              <div style={s.sectionTitle}>✅ Approved hours</div>
              {approvedHours.length === 0 ? (
                <p style={{ color: "#555", fontSize: 13 }}>No approved hours yet</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {approvedHours.map(h => (
                    <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#0f0f0f", borderRadius: 8, flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e5e5" }}>{h.employee_name}</div>
                        <div style={{ fontSize: 12, color: "#555" }}>{h.date} {h.description ? `· ${h.description}` : ""}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#4ade80" }}>{h.hours}h</span>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#4ade8022", color: "#4ade80" }}>Approved</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}