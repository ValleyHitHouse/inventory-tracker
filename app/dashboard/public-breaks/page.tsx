"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function PublicBreaksPage() {
  const [breaks, setBreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [game, setGame] = useState("Bo Jackson Battle Arena");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [boxes, setBoxes] = useState("");
  const [spotsAvailable, setSpotsAvailable] = useState("");
  const [pricePerSpot, setPricePerSpot] = useState("");
  const [whatnotLink, setWhatnotLink] = useState("");
  const [status, setStatus] = useState("upcoming");

  useEffect(() => { loadBreaks(); }, []);

  async function loadBreaks() {
    setLoading(true);
    const { data } = await supabase.from("public_breaks").select("*").order("date");
    if (data) setBreaks(data);
    setLoading(false);
  }

  async function saveBreak() {
    if (!title || !date) return alert("Please fill in title and date");
    setSaving(true);
    await supabase.from("public_breaks").insert({
      title, game, date, time: time || null,
      boxes: boxes || null,
      spots_available: spotsAvailable ? parseInt(spotsAvailable) : null,
      price_per_spot: pricePerSpot ? parseFloat(pricePerSpot) : null,
      whatnot_link: whatnotLink || null,
      status,
    });
    await loadBreaks();
    setSaving(false);
    setShowForm(false);
    resetForm();
  }

  async function deleteBreak(id: number) {
    setDeletingId(id);
    await supabase.from("public_breaks").delete().eq("id", id);
    setDeletingId(null); setConfirmId(null);
    await loadBreaks();
  }

  async function updateStatus(id: number, newStatus: string) {
    await supabase.from("public_breaks").update({ status: newStatus }).eq("id", id);
    await loadBreaks();
  }

  function resetForm() {
    setTitle(""); setGame("Bo Jackson Battle Arena"); setDate(""); setTime("");
    setBoxes(""); setSpotsAvailable(""); setPricePerSpot(""); setWhatnotLink(""); setStatus("upcoming");
  }

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
    .pb-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .pb-form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    @media (max-width: 768px) {
      .pb-form-grid { grid-template-columns: 1fr; }
      .pb-form-grid-3 { grid-template-columns: 1fr 1fr; }
    }
  `;

  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Break Schedule</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Manage public-facing break schedule</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={s.submitBtn}>
            {showForm ? "Cancel" : "+ Add break"}
          </button>
        </div>

        {showForm && (
          <div style={{ ...s.section, borderColor: "#7c3aed44" }}>
            <div style={s.sectionTitle}>New break</div>
            <div className="pb-form-grid">
              <div>
                <label style={s.label}>Break title</label>
                <input style={s.input} placeholder="e.g. Griffey Break #12" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Game</label>
                <select style={s.input} value={game} onChange={e => setGame(e.target.value)}>
                  <option>Bo Jackson Battle Arena</option>
                  <option>Wonders of the First</option>
                </select>
              </div>
            </div>
            <div className="pb-form-grid">
              <div>
                <label style={s.label}>Date</label>
                <input style={s.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Time (optional)</label>
                <input style={s.input} placeholder="e.g. 7:00 PM PST" value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={s.label}>Box breakdown (optional)</label>
              <input style={s.input} placeholder="e.g. 3x Jumbo Hobby + 2x Hobby" value={boxes} onChange={e => setBoxes(e.target.value)} />
            </div>
            <div className="pb-form-grid-3">
              <div>
                <label style={s.label}>Spots available</label>
                <input style={s.input} type="number" min={0} placeholder="e.g. 30" value={spotsAvailable} onChange={e => setSpotsAvailable(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Price per spot ($)</label>
                <input style={s.input} type="number" min={0} step="0.01" placeholder="e.g. 75.00" value={pricePerSpot} onChange={e => setPricePerSpot(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Status</label>
                <select style={s.input} value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live Now</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Whatnot link (optional)</label>
              <input style={s.input} placeholder="https://www.whatnot.com/..." value={whatnotLink} onChange={e => setWhatnotLink(e.target.value)} />
            </div>
            <button style={{ ...s.submitBtn, width: "100%" }} onClick={saveBreak} disabled={saving}>
              {saving ? "Saving..." : "Save break"}
            </button>
          </div>
        )}

        {loading ? <p style={{ color: "#555" }}>Loading...</p> : breaks.length === 0 ? (
          <div style={{ ...s.section, textAlign: "center", padding: 48 }}>
            <p style={{ color: "#555", fontSize: 13 }}>No breaks added yet</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {breaks.map(brk => (
              <div key={brk.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#e5e5e5" }}>{brk.title}</div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                      {brk.game} · {brk.date}{brk.time ? ` · ${brk.time}` : ""}
                    </div>
                    {brk.boxes && <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{brk.boxes}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <select
                      value={brk.status}
                      onChange={e => updateStatus(brk.id, e.target.value)}
                      style={{ fontSize: 11, background: "#0f0f0f", border: "1px solid #333", color: brk.status === "upcoming" ? "#fb923c" : brk.status === "live" ? "#4ade80" : "#555", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live Now</option>
                      <option value="completed">Completed</option>
                    </select>
                    {confirmId === brk.id ? (
                      <>
                        <button onClick={() => deleteBreak(brk.id)} disabled={deletingId === brk.id} style={{ fontSize: 11, background: "#7f1d1d", border: "none", color: "#fca5a5", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                          {deletingId === brk.id ? "..." : "Confirm"}
                        </button>
                        <button onClick={() => setConfirmId(null)} style={{ fontSize: 11, background: "#1a1a1a", border: "none", color: "#555", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmId(brk.id)} style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#555", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Delete</button>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {brk.price_per_spot && <span style={{ fontSize: 12, color: "#4ade80" }}>${brk.price_per_spot}/spot</span>}
                  {brk.spots_available && <span style={{ fontSize: 12, color: "#555" }}>{brk.spots_available} spots</span>}
                  {brk.whatnot_link && <a href={brk.whatnot_link} target="_blank" style={{ fontSize: 12, color: "#38bdf8", textDecoration: "none" }}>Whatnot link ↗</a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}