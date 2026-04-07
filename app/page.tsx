import PublicNav from "./components/PublicNav";
import HeroSlider from "./components/HeroSlider";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

async function getTopHits() {
  const { data } = await supabase.from("top_hits").select("*").order("created_at", { ascending: false }).limit(3);
  return data || [];
}

async function getUpcomingBreaks() {
  const { data } = await supabase.from("public_breaks").select("*").eq("status", "upcoming").order("date").limit(3);
  return data || [];
}

export default async function PublicHome() {
  const [topHits, upcomingBreaks] = await Promise.all([getTopHits(), getUpcomingBreaks()]);

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" }}>
      <PublicNav />
      <HeroSlider />

      {/* Upcoming breaks section */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "#fb923c", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Live & Upcoming</div>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, margin: 0, color: "#e5e5e5" }}>Break Schedule</h2>
          </div>
          <Link href="/breaks/boba" style={{ fontSize: 13, color: "#fb923c", textDecoration: "none", fontWeight: 600 }}>View full schedule →</Link>
        </div>

        {upcomingBreaks.length === 0 ? (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎴</div>
            <p style={{ color: "#555", fontSize: 15 }}>No breaks scheduled yet — check back soon!</p>
            <a href="https://www.whatnot.com/user/valleyhithouse" target="_blank" style={{ display: "inline-block", marginTop: 16, padding: "10px 24px", background: "linear-gradient(135deg,#fb923c,#f472b6)", borderRadius: 8, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Follow us on Whatnot ↗</a>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {upcomingBreaks.map(brk => (
              <div key={brk.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 24, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#fb923c,#f472b6)" }} />
                <div style={{ fontSize: 11, color: "#fb923c", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 8 }}>{brk.game}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#e5e5e5", margin: 0, marginBottom: 8 }}>{brk.title}</h3>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 16 }}>
                  {new Date(brk.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  {brk.time && ` · ${brk.time}`}
                </div>
                {brk.boxes && <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>{brk.boxes}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  {brk.price_per_spot && <span style={{ fontSize: 15, fontWeight: 700, color: "#4ade80" }}>${brk.price_per_spot}/spot</span>}
                  {brk.whatnot_link && (
                    <a href={brk.whatnot_link} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 16px", background: "linear-gradient(135deg,#fb923c,#f472b6)", borderRadius: 8, color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                      Join Break ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Top hits section */}
      {topHits.length > 0 && (
        <section style={{ background: "#0d0d0d", padding: "80px 0", borderTop: "1px solid #1e1e1e", borderBottom: "1px solid #1e1e1e" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Recent Pulls</div>
                <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, margin: 0, color: "#e5e5e5" }}>Top Hits of the Week</h2>
              </div>
              <Link href="/breaks/top-hits" style={{ fontSize: 13, color: "#a78bfa", textDecoration: "none", fontWeight: 600 }}>View all hits →</Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {topHits.map(hit => (
                <div key={hit.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, overflow: "hidden" }}>
                  {hit.image_url && (
                    <div style={{ height: 200, background: "#0f0f0f", overflow: "hidden" }}>
                      <img src={hit.image_url} alt={hit.card_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <div style={{ padding: 20 }}>
                    <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 6 }}>{hit.game}</div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: "#e5e5e5", margin: 0, marginBottom: 4 }}>{hit.card_name}</h3>
                    {hit.athlete && <div style={{ fontSize: 13, color: "#fb923c" }}>{hit.athlete}</div>}
                    {hit.description && <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>{hit.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA section */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#fb923c", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 16 }}>Ready to Play?</div>
        <h2 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, margin: 0, marginBottom: 16, color: "#e5e5e5" }}>
          Join the Valley.<br />
          <span style={{ color: "#fb923c" }}>Pull a Legend.</span>
        </h2>
        <p style={{ fontSize: 16, color: "#555", marginBottom: 40, lineHeight: 1.6 }}>
          Create your free account to track your orders, view your break history, and stay up to date on upcoming breaks.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/auth/signup" style={{ padding: "14px 32px", borderRadius: 10, fontSize: 15, fontWeight: 700, color: "#fff", textDecoration: "none", background: "linear-gradient(135deg,#fb923c,#f472b6)", boxShadow: "0 8px 32px rgba(251,146,60,0.3)" }}>
            Create Account
          </Link>
          <a href="https://www.whatnot.com/user/valleyhithouse" target="_blank" rel="noopener noreferrer" style={{ padding: "14px 32px", borderRadius: 10, fontSize: 15, fontWeight: 700, color: "#fb923c", textDecoration: "none", border: "1px solid rgba(251,146,60,0.3)", background: "rgba(251,146,60,0.05)" }}>
            Follow on Whatnot ↗
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1e1e1e", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/LOGO-BG.png" alt="VHH" style={{ width: 32, height: "auto" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fb923c" }}>ValleyHitHouse</span>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <a href="https://www.whatnot.com/user/valleyhithouse" target="_blank" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Whatnot</a>
            <a href="https://www.instagram.com/valleyhithouse/" target="_blank" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Instagram</a>
            <a href="https://www.tiktok.com/@valley.hit.house" target="_blank" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>TikTok</a>
          </div>
          <div style={{ fontSize: 12, color: "#333" }}>VHH © 2026 · Bo Jackson Battle Arena</div>
        </div>
      </footer>
    </div>
  );
}