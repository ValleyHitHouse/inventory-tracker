"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function TopHitsDashboard() {
  const [hits, setHits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const [cardName, setCardName] = useState("");
  const [athlete, setAthlete] = useState("");
  const [game, setGame] = useState("Bo Jackson Battle Arena");
  const [breakDate, setBreakDate] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadHits(); }, []);

  async function loadHits() {
    setLoading(true);
    const { data } = await supabase.from("top_hits").select("*").order("created_at", { ascending: false });
    if (data) setHits(data);
    setLoading(false);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function saveHit() {
    if (!cardName) return alert("Please enter a card name");
    setSaving(true);
    let imageUrl = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `top-hits/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("public-media").upload(path, imageFile);
      if (!error) {
        const { data } = supabase.storage.from("public-media").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
    }
    await supabase.from("top_hits").insert({
      card_name: cardName, athlete: athlete || null, game,
      break_date: breakDate || null, description: description || null,
      image_url: imageUrl, video_url: videoUrl || null,
    });
    await loadHits();
    setSaving(false); setShowForm(false);
    setCardName(""); setAthlete(""); setGame("Bo Jackson Battle Arena");
    setBreakDate(""); setDescription(""); setVideoUrl("");
    setImageFile(null); setImagePreview(null);
  }

  async function deleteHit(id: number, imageUrl: string | null) {
    setDeletingId(id);
    if (imageUrl) {
      const path = imageUrl.split("/public-media/")[1];
      if (path) await supabase.storage.from("public-media").remove([path]);
    }
    await supabase.from("top_hits").delete().eq("id", id);
    setDeletingId(null); setConfirmId(null);
    await loadHits();
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
    .th-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    @media (max-width: 768px) { .th-form-grid { grid-template-columns: 1fr; } }
  `;

  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Top Hits</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Manage top hits of the week shown on the public site</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={s.submitBtn}>
            {showForm ? "Cancel" : "+ Add hit"}
          </button>
        </div>

        {showForm && (
          <div style={{ ...s.section, borderColor: "#7c3aed44" }}>
            <div style={s.sectionTitle}>New top hit</div>

            {/* Image upload */}
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Photo or video</label>
              {!imagePreview ? (
                <label style={{ display: "block", border: "1px dashed #333", borderRadius: 8, padding: 24, textAlign: "center", cursor: "pointer", background: "#0f0f0f" }}>
                  <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleImageChange} style={{ display: "none" }} />
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📸</div>
                  <div style={{ fontSize: 13, color: "#888" }}>Tap to upload photo or video</div>
                </label>
              ) : (
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <img src={imagePreview} alt="Preview" style={{ width: 80, height: 100, objectFit: "cover", borderRadius: 6, border: "1px solid #1e1e1e" }} />
                  <button onClick={() => { setImageFile(null); setImagePreview(null); }} style={{ fontSize: 12, background: "none", border: "1px solid #333", color: "#555", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>Remove</button>
                </div>
              )}
            </div>

            <div className="th-form-grid">
              <div>
                <label style={s.label}>Card name</label>
                <input style={s.input} placeholder="e.g. Maverick" value={cardName} onChange={e => setCardName(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Athlete</label>
                <input style={s.input} placeholder="e.g. Ken Griffey Jr." value={athlete} onChange={e => setAthlete(e.target.value)} />
              </div>
            </div>
            <div className="th-form-grid">
              <div>
                <label style={s.label}>Game</label>
                <select style={s.input} value={game} onChange={e => setGame(e.target.value)}>
                  <option>Bo Jackson Battle Arena</option>
                  <option>Wonders of the First</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Break date</label>
                <input style={s.input} type="date" value={breakDate} onChange={e => setBreakDate(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Description (optional)</label>
              <input style={s.input} placeholder="e.g. Pulled during a live break — Fire weapon, Power 200" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Video URL (optional — TikTok, Instagram, etc.)</label>
              <input style={s.input} placeholder="https://..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
            </div>
            <button style={{ ...s.submitBtn, width: "100%" }} onClick={saveHit} disabled={saving}>
              {saving ? "Saving..." : "Save hit"}
            </button>
          </div>
        )}

        {loading ? <p style={{ color: "#555" }}>Loading...</p> : hits.length === 0 ? (
          <div style={{ ...s.section, textAlign: "center", padding: 48 }}>
            <p style={{ color: "#555", fontSize: 13 }}>No top hits yet — add your first one!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {hits.map(hit => (
              <div key={hit.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 16, display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                {hit.image_url && <img src={hit.image_url} alt={hit.card_name} style={{ width: 60, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid #1e1e1e", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e5e5e5" }}>{hit.card_name}</div>
                  {hit.athlete && <div style={{ fontSize: 12, color: "#fb923c" }}>{hit.athlete}</div>}
                  <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{hit.game}{hit.break_date ? ` · ${hit.break_date}` : ""}</div>
                  {hit.description && <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>{hit.description}</div>}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {confirmId === hit.id ? (
                    <>
                      <button onClick={() => deleteHit(hit.id, hit.image_url)} disabled={deletingId === hit.id} style={{ fontSize: 11, background: "#7f1d1d", border: "none", color: "#fca5a5", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                        {deletingId === hit.id ? "..." : "Confirm"}
                      </button>
                      <button onClick={() => setConfirmId(null)} style={{ fontSize: 11, background: "#1a1a1a", border: "none", color: "#555", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmId(hit.id)} style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#555", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}