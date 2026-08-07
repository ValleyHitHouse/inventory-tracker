"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PAGES, DEFAULT_EMPLOYEE_KEYS } from "@/lib/pages";

const GROUP_LABELS: Record<string, string> = { main: "Main", admin: "Admin / office", website: "Website management" };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"employees" | "hours" | "add" | "access">("employees");
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Permissions editor state
  const [permsMap, setPermsMap] = useState<Record<string, string[]>>({});
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [draft, setDraft] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [empRes, hoursRes, settingRes] = await Promise.all([
      supabase.from("employees").select("*").order("created_at"),
      supabase.from("employee_hours").select("*").order("date", { ascending: false }),
      supabase.from("settings").select("value").eq("key", "employee_permissions").single(),
    ]);
    if (empRes.data) setEmployees(empRes.data);
    if (hoursRes.data) setHours(hoursRes.data);
    if (settingRes.data?.value) {
      try {
        const v = settingRes.data.value;
        setPermsMap(typeof v === "string" ? JSON.parse(v) : v);
      } catch { setPermsMap({}); }
    }
    setLoading(false);
  }

  function permsFor(username: string): string[] {
    return permsMap[username] ?? DEFAULT_EMPLOYEE_KEYS;
  }

  function selectUser(username: string) {
    setSelectedUser(username);
    setDraft(permsFor(username));
    setSavedFlash(false);
  }

  function toggleKey(key: string) {
    setDraft(d => d.includes(key) ? d.filter(k => k !== key) : [...d, key]);
    setSavedFlash(false);
  }

  async function savePerms() {
    if (!selectedUser) return;
    setSavingPerms(true);
    const next = { ...permsMap, [selectedUser]: draft };
    await supabase.from("settings").upsert(
      { key: "employee_permissions", value: JSON.stringify(next), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    setPermsMap(next);
    setSavingPerms(false);
    setSavedFlash(true);
  }

  const draftDirty = selectedUser
    ? JSON.stringify([...draft].sort()) !== JSON.stringify([...permsFor(selectedUser)].sort())
    : false;

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
    .perm-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
    @media (max-width: 768px) {
      .emp-grid-3 { grid-template-columns: 1fr 1fr; }
      .emp-add-grid { grid-template-columns: 1fr; }
      .perm-grid { grid-template-columns: 1fr 1fr; }
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
            <button onClick={() => setView(view === "access" ? "employees" : "access")} style={{ fontSize: 13, background: view === "access" ? "#1a0f00" : "#1e1e1e", border: `1px solid ${view === "access" ? "#fb923c55" : "#333"}`, color: view === "access" ? "#fb923c" : "#aaa", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>
              🔐 Access
            </button>
            <button onClick={() => setView(view === "hours" ? "employees" : "hours")} style={{ fontSize: 13, background: view === "hours" ? "#1a0f00" : "#1e1e1e", border: `1px solid ${view === "hours" ? "#fb923c55" : "#333"}`, color: view === "hours" ? "#fb923c" : "#aaa", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>
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
        ) : view === "hours" ? (
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
        ) : (
          <>
            {/* ── Access / permissions editor ── */}
            <div style={s.section}>
              <div style={s.sectionTitle}>Page access</div>
              <p style={{ fontSize: 12, color: "#777", marginTop: -6, marginBottom: 14, lineHeight: 1.5 }}>
                Pick a person, then choose which pages they can open. Changes take effect the next time they log in.
                This controls what they see and where they can go, but is not hard security — treat it as tidying the workspace, not locking a vault.
              </p>

              {employees.filter(e => e.role === "employee").length === 0 ? (
                <p style={{ color: "#555", fontSize: 13 }}>No employees yet. Add someone first.</p>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  {employees.filter(e => e.role === "employee").map(emp => {
                    const active = selectedUser === emp.username;
                    const count = permsFor(emp.username).length;
                    return (
                      <button key={emp.id} onClick={() => selectUser(emp.username)} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                        background: active ? "#1a0f00" : "#0f0f0f",
                        border: `1px solid ${active ? "#fb923c" : "#222"}`,
                        color: active ? "#fb923c" : "#aaa", fontSize: 13, fontWeight: 600,
                        opacity: emp.active ? 1 : 0.5,
                      }}>
                        <span style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", flexShrink: 0 }}>{emp.name[0]}</span>
                        {emp.name}
                        <span style={{ fontSize: 11, color: active ? "#fb923c99" : "#555", fontWeight: 500 }}>{count} page{count === 1 ? "" : "s"}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedUser && (
              <div style={s.section}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                  <div style={s.sectionTitle}>
                    Pages for @{selectedUser} · <span style={{ color: "#fb923c" }}>{draft.length} selected</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button onClick={() => setDraft(DEFAULT_EMPLOYEE_KEYS)} style={{ fontSize: 12, background: "none", border: "1px solid #222", color: "#666", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
                      Reset to default
                    </button>
                    {savedFlash && !draftDirty && <span style={{ fontSize: 12, color: "#4ade80" }}>✓ Saved</span>}
                    <button onClick={savePerms} disabled={savingPerms || !draftDirty} style={{ ...s.submitBtn, padding: "9px 18px", fontSize: 13, opacity: (savingPerms || !draftDirty) ? 0.45 : 1, cursor: (savingPerms || !draftDirty) ? "default" : "pointer" }}>
                      {savingPerms ? "Saving…" : "Save access"}
                    </button>
                  </div>
                </div>

                {["main", "admin", "website"].map(group => {
                  const pages = PAGES.filter(p => p.group === group);
                  if (pages.length === 0) return null;
                  return (
                    <div key={group} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>
                        {GROUP_LABELS[group]}
                        {group !== "main" && <span style={{ color: "#7c3aed", marginLeft: 8, textTransform: "none", letterSpacing: 0 }}>admin-level pages</span>}
                      </div>
                      <div className="perm-grid">
                        {pages.map(p => {
                          const on = draft.includes(p.key);
                          return (
                            <button key={p.key} onClick={() => toggleKey(p.key)} style={{
                              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left" as const,
                              background: on ? "#0d1a0d" : "#0f0f0f",
                              border: `1px solid ${on ? "#4ade8055" : "#222"}`,
                            }}>
                              <span style={{
                                width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
                                background: on ? "#4ade80" : "transparent", border: `1px solid ${on ? "#4ade80" : "#333"}`, color: "#0a0a0a", fontWeight: 700,
                              }}>{on ? "✓" : ""}</span>
                              <span style={{ fontSize: 16 }}>{p.emoji}</span>
                              <span style={{ fontSize: 13, color: on ? "#e5e5e5" : "#888", fontWeight: 500 }}>{p.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}