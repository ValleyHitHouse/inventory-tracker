import { supabase } from "@/lib/supabase";
import PublicNav from "../../components/PublicNav";
import Link from "next/link";

async function get1of1s() {
  const { data } = await supabase.from("one_of_one_tracker").select("*").order("pulled_date", { ascending: false });
  return data || [];
}

export default async function OneOfOneTracker() {
  const cards = await get1of1s();

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" }}>
      <PublicNav />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "100px 24px 60px" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 12 }}>Rarest of the Rare</div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, margin: 0, marginBottom: 12 }}>1/1 Tracker</h1>
          <p style={{ fontSize: 15, color: "#555" }}>Every 1-of-1 card ever pulled from a VHH break</p>
        </div>

        {cards.length === 0 ? (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <p style={{ color: "#555", fontSize: 15 }}>No 1/1s logged yet — but they're coming!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cards.map((card, i) => (
              <div key={card.id} style={{ background: "#111", border: "1px solid #fbbf2433", borderRadius: 12, padding: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#fbbf24,#fb923c)" }} />
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#fbbf24,#fb923c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#0a0a0a", flexShrink: 0 }}>
                  #{i + 1}
                </div>
                {card.image_url && (
                  <img src={card.image_url} alt={card.card_name} style={{ width: 60, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid #fbbf2433", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{card.game} · 1/1</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#e5e5e5" }}>{card.card_name}</div>
                  {card.athlete && <div style={{ fontSize: 13, color: "#fb923c" }}>{card.athlete}</div>}
                  {card.card_number && <div style={{ fontSize: 12, color: "#555", fontFamily: "monospace", marginTop: 2 }}>{card.card_number}</div>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {card.pulled_by && <div style={{ fontSize: 13, color: "#a78bfa", fontWeight: 600 }}>Pulled by {card.pulled_by}</div>}
                  {card.pulled_date && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{new Date(card.pulled_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>}
                  <div style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#fbbf2422", color: "#fbbf24", fontWeight: 700, marginTop: 6, display: "inline-block" }}>1 of 1</div>
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