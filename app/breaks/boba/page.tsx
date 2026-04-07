import { supabase } from "@/lib/supabase";
import PublicNav from "../../components/PublicNav";
import Link from "next/link";

async function getBreaks() {
  const { data } = await supabase.from("public_breaks").select("*").order("date");
  return data || [];
}

export default async function BOBABreakSchedule() {
  const breaks = await getBreaks();
  const upcoming = breaks.filter(b => b.status === "upcoming");
  const past = breaks.filter(b => b.status === "completed");

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" }}>
      <PublicNav />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "100px 24px 60px" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: "#fb923c", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Bo Jackson Battle Arena</div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, margin: 0, marginBottom: 12 }}>Break Schedule</h1>
          <p style={{ fontSize: 15, color: "#555", marginBottom: 24 }}>
            All VHH BOBA breaks — join live on Whatnot
          </p>
          <a href="https://www.whatnot.com/user/valleyhithouse" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg,#fb923c,#f472b6)", borderRadius: 8, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
            Follow ValleyHitHouse on Whatnot ↗
          </a>
        </div>

        {/* Upcoming breaks */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "#e5e5e5" }}>
            Upcoming Breaks <span style={{ fontSize: 13, color: "#555", fontWeight: 400 }}>({upcoming.length})</span>
          </h2>
          {upcoming.length === 0 ? (
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 40, textAlign: "center" }}>
              <p style={{ color: "#555", fontSize: 14 }}>No breaks scheduled yet — follow us on Whatnot to get notified!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {upcoming.map(brk => (
                <div key={brk.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "linear-gradient(180deg,#fb923c,#f472b6)" }} />
                  <div style={{ paddingLeft: 8 }}>
                    <div style={{ fontSize: 11, color: "#fb923c", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{brk.game}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#e5e5e5", marginBottom: 4 }}>{brk.title}</div>
                    <div style={{ fontSize: 13, color: "#555" }}>
                      {new Date(brk.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                      {brk.time && ` · ${brk.time}`}
                    </div>
                    {brk.boxes && <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>{brk.boxes}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    {brk.price_per_spot && <div style={{ textAlign: "right" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#4ade80" }}>${brk.price_per_spot}</div><div style={{ fontSize: 11, color: "#555" }}>per spot</div></div>}
                    {brk.whatnot_link && (
                      <a href={brk.whatnot_link} target="_blank" rel="noopener noreferrer"
                        style={{ padding: "10px 20px", background: "linear-gradient(135deg,#fb923c,#f472b6)", borderRadius: 8, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
                        Join ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past breaks */}
        {past.length > 0 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "#555" }}>
              Past Breaks <span style={{ fontSize: 13, fontWeight: 400 }}>({past.length})</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {past.map(brk => (
                <div key={brk.id} style={{ background: "#0f0f0f", border: "1px solid #161616", borderRadius: 10, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, opacity: 0.6 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#555" }}>{brk.title}</div>
                    <div style={{ fontSize: 12, color: "#333" }}>{new Date(brk.date).toLocaleDateString()}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#1a1a1a", color: "#444" }}>Completed</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1e1e1e", padding: "40px 24px", marginTop: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/LOGO-BG.png" alt="VHH" style={{ width: 32, height: "auto" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fb923c" }}>ValleyHitHouse</span>
          </Link>
          <div style={{ fontSize: 12, color: "#333" }}>VHH © 2026 · Bo Jackson Battle Arena</div>
        </div>
      </footer>
    </div>
  );
}