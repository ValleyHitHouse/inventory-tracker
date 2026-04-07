"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function SlidesDashboard() {
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [slideOrder, setSlideOrder] = useState("0");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSlides(); }, []);

  async function loadSlides() {
    setLoading(true);
    const { data } = await supabase.from("hero_slides").select("*").order("slide_order");
    if (data) setSlides(data);
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

  async function saveSlide() {
    if (!title) return alert("Please enter a title");
    setSaving(true);
    let imageUrl = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `slides/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("public-media").upload(path, imageFile);
      if (!error) {
        const { data } = supabase.storage.from("public-media").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
    }
    await supabase.from("hero_slides").insert({
      title, subtitle: subtitle || null,
      cta_text: ctaText || null, cta_link: ctaLink || null,
      slide_order: parseInt(slideOrder) || 0,
      image_url: imageUrl, active: true,
    });
    await loadSlides();
    setSaving(false); setShowForm(false);
    setTitle(""); setSubtitle(""); setCtaText(""); setCtaLink("");
    setSlideOrder("0"); setImageFile(null); setImagePreview(null);
  }

  async function toggleActive(id: number, active: boolean) {
    await supabase.from("hero_slides").update({ active: !active }).eq("id", id);
    await loadSlides();
  }

  async function deleteSlide(id: number, imageUrl: string | null) {
    setDeletingId(id);
    if (imageUrl) {
      const path = imageUrl.split("/public-media/")[1];
      if (path) await supabase.storage.from("public-media").remove([path]);
    }
    await supabase.from("hero_slides").delete().eq("id", id);
    setDeletingId(null); setConfirmId(null);
    await loadSlides();
  }

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
    .sl-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    @media (max-width: 768px) { .sl-form-grid { grid-template-columns: 1fr; } }
  `;

  return (
    <div style={s.shell}>
      <style>{mobileStyles}</style>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Hero Slides</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Manage the home page hero slider</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={s.submitBtn}>
            {showForm ? "Cancel" : "+ Add slide"}
          </button>
        </div>

        <div style={{ ...s.section, borderColor: "#fb923c22" }}>
          <div style={s.sectionTitle}>ℹ️ How slides work</div>
          <p style={{ fontSize: 13, color: "#555", margin: 0, lineHeight: 1.6 }}>
            Slides added here will appear on the public home page hero slider. The 3 default slides are always shown if no slides are saved here. Add slides here to override the defaults. Use <strong style={{ color: "#aaa" }}>slide order</strong> (0, 1, 2...) to control the sequence.
          </p>
        </div>

        {showForm && (
          <div style={{ ...s.section, borderColor: "#7c3aed44" }}>
            <div style={s.sectionTitle}>New slide</div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Background image (optional)</label>
              {!imagePreview ? (
                <label style={{ display: "block", border: "1px dashed #333", borderRadius: 8, padding: 24, textAlign: "center", cursor: "pointer", background: "#0f0f0f" }}>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🖼️</div>
                  <div style={{ fontSize: 13, color: "#888" }}>Tap to upload background image</div>
                </label>
              ) : (
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <img src={imagePreview} alt="Preview" style={{ width: 120, height: 70, objectFit: "cover", borderRadius: 6, border: "1px solid #1e1e1e" }} />
                  <button onClick={() => { setImageFile(null); setImagePreview(null); }} style={{ fontSize: 12, background: "none", border: "1px solid #333", color: "#555", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>Remove</button>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={s.label}>Title</label>
              <input style={s.input} placeholder="e.g. WELCOME TO THE VALLEY OF HEAT" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={s.label}>Subtitle</label>
              <input style={s.input} placeholder="e.g. Home of Bo Jackson Battle Arena breaks" value={subtitle} onChange={e => setSubtitle(e.target.value)} />
            </div>
            <div className="sl-form-grid">
              <div>
                <label style={s.label}>Button text</label>
                <input style={s.input} placeholder="e.g. Join a Break" value={ctaText} onChange={e => setCtaText(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Button link</label>
                <input style={s.input} placeholder="e.g. /breaks/boba or https://whatnot.com/..." value={ctaLink} onChange={e => setCtaLink(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Slide order (0 = first)</label>
              <input style={{ ...s.input, maxWidth: 100 }} type="number" min={0} value={slideOrder} onChange={e => setSlideOrder(e.target.value)} />
            </div>
            <button style={{ ...s.submitBtn, width: "100%" }} onClick={saveSlide} disabled={saving}>
              {saving ? "Saving..." : "Save slide"}
            </button>
          </div>
        )}

        {loading ? <p style={{ color: "#555" }}>Loading...</p> : slides.length === 0 ? (
          <div style={{ ...s.section, textAlign: "center", padding: 48 }}>
            <p style={{ color: "#555", fontSize: 13 }}>No custom slides yet — default slides are showing on the home page</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {slides.map(slide => (
              <div key={slide.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 16, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                {slide.image_url && <img src={slide.image_url} alt={slide.title} style={{ width: 80, height: 50, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e5e5e5" }}>{slide.title}</div>
                  {slide.subtitle && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{slide.subtitle}</div>}
                  <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Order: {slide.slide_order}{slide.cta_text ? ` · Button: "${slide.cta_text}"` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
                  <button onClick={() => toggleActive(slide.id, slide.active)} style={{ fontSize: 11, background: "none", border: `1px solid ${slide.active ? "#4ade8044" : "#333"}`, color: slide.active ? "#4ade80" : "#555", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                    {slide.active ? "Active" : "Hidden"}
                  </button>
                  {confirmId === slide.id ? (
                    <>
                      <button onClick={() => deleteSlide(slide.id, slide.image_url)} disabled={deletingId === slide.id} style={{ fontSize: 11, background: "#7f1d1d", border: "none", color: "#fca5a5", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                        {deletingId === slide.id ? "..." : "Confirm"}
                      </button>
                      <button onClick={() => setConfirmId(null)} style={{ fontSize: 11, background: "#1a1a1a", border: "none", color: "#555", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmId(slide.id)} style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#555", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Delete</button>
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