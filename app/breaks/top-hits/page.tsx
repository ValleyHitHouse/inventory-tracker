import { supabase } from "@/lib/supabase";
import PublicNav from "../../components/PublicNav";
import Link from "next/link";

async function getTopHits() {
  const { data } = await supabase.from("top_hits").select("*").order("created_at", { ascending: false });
  return data || [];
}

export default async function TopHitsPage() {
  const hits = await getTopHits();

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" }}>
      <PublicNav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 24px 60px" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Recent Pulls</div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, margin: 0, marginBottom: 12 }}>Top Hits of the Week</h1>
          <p style={{ fontSize: 15, color: "#555" }}>The hottest cards pulled from recent VHH breaks</p>
        </div>

        {hits.length === 0 ? (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🃏</div>
            <p style={{ color: "#555", fontSize: 15 }}>No hits posted yet — check back after the next break!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {hits.map(hit => (
              <div key={hit.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s" }}>
                {hit.image_url && (
                  <div style={{ height: 220, background: "#0f0f0f", overflow: "hidden" }}>
                    <img src={hit.image_url} alt={hit.card_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                {hit.video_url && !hit.image_url && (
                  <div style={{ height: 220, background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <a href={hit.video_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 48 }}>▶️</a>
                  </div>
                )}
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 6 }}>{hit.game}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "#e5e5e5", margin: 0, marginBottom: 4 }}>{hit.card_name}</h3>
                  {hit.athlete && <div style={{ fontSize: 13, color: "#fb923c", marginBottom: 4 }}>{hit.athlete}</div>}
                  {hit.description && <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>{hit.description}</div>}
                  {hit.break_date && <div style={{ fontSize: 11, color: "#333", marginTop: 8 }}>{new Date(hit.break_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer style={{ borderTop: "1px solid #1e1e1e", padding: "40px 24px", marginTop: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/LOGO-BG.png" alt="VHH" style={{ width: 32, height: "auto" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fb923c" }}>ValleyHitHouse</span>
          </Link>
          <div style={{ fontSize: 12, color: "#333" }}>VHH © 2026</div>
        </div>
      </footer>
    </div>
  );
}