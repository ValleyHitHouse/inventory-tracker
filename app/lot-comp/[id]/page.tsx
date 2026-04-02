"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";

const weaponColors: Record<string, string> = {
  Fire: "#fb923c", Ice: "#38bdf8", Steel: "#94a3b8",
  Gum: "#f472b6", Hex: "#a78bfa", Glow: "#4ade80", Brawl: "#f87171"
};

export default function SellerLotPage() {
  const params = useParams();
  const id = params?.id;
  const [lot, setLot] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("PayPal");

  useEffect(() => {
    if (!id) return;
    async function load() {
      const { data: lotData } = await supabase.from("LotComps").select("*").eq("id", id).single();
      if (lotData) setLot(lotData);
      const { data: cardData } = await supabase.from("LotCompCards").select("*").eq("lot_id", id);
      if (cardData) setCards(cardData);
      setLoading(false);
    }
    load();
  }, [id]);

  async function acceptLot() {
    setAccepting(true);
    await supabase.from("LotComps").update({
      status: "accepted",
      payment_method: paymentMethod,
    }).eq("id", id);
    setAccepted(true);
    setAccepting(false);
  }

  if (loading) return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#555" }}>Loading...</p>
    </div>
  );

  if (!lot) return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#555" }}>Lot not found.</p>
    </div>
  );

  const isAlreadyAccepted = lot.status !== "pending";

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fb923c" }}>ValleyHitHouse</div>
        <div style={{ fontSize: 12, color: "#555" }}>Lot offer</div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: 32 }}>
        {/* Title */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, marginBottom: 8 }}>{lot.lot_name}</h1>
          {lot.seller_name && <p style={{ color: "#555", fontSize: 14, margin: 0 }}>Prepared for {lot.seller_name}</p>}
        </div>

        {/* Offer summary */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 32, marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#555", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 8 }}>Our offer for your lot</div>
          <div style={{ fontSize: 56, fontWeight: 900, color: "#4ade80", marginBottom: 8 }}>${parseFloat(lot.total_offer).toFixed(2)}</div>
          <div style={{ fontSize: 14, color: "#555" }}>Based on {lot.offer_percent}% of ${parseFloat(lot.total_comp).toFixed(2)} total comp value</div>
        </div>

        {/* Cards breakdown */}
        {cards.length > 0 && (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e1e1e", fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: ".6px" }}>
              Card breakdown
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#0f0f0f" }}>
                  {["Type","Hero","Athlete","Treatment","Weapon","Qty","Comp","Offer"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#444", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", borderBottom: "1px solid #1e1e1e" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cards.map((card, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #161616" }}>
                    <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#a78bfa22", color: "#a78bfa" }}>{card.subset}</span></td>
                    <td style={{ padding: "10px 14px", color: "#e5e5e5", fontWeight: 600 }}>{card.hero}</td>
                    <td style={{ padding: "10px 14px", color: "#a78bfa" }}>{card.athlete}</td>
                    <td style={{ padding: "10px 14px", color: "#777", fontSize: 12 }}>{card.treatment}</td>
                    <td style={{ padding: "10px 14px" }}>
                      {card.weapon && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, background: (weaponColors[card.weapon] || "#333") + "22", color: weaponColors[card.weapon] || "#aaa" }}>{card.weapon}</span>}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#aaa" }}>{card.quantity}</td>
                    <td style={{ padding: "10px 14px", color: "#aaa" }}>${parseFloat(card.comp_value).toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", color: "#4ade80", fontWeight: 600 }}>${parseFloat(card.offer_value).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lot.giveaway_count > 0 && (
              <div style={{ padding: "12px 20px", borderTop: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#777" }}>🎁 Giveaway cards ({lot.giveaway_count} cards @ ${parseFloat(lot.giveaway_comp).toFixed(2)} each)</span>
                <span style={{ color: "#4ade80", fontWeight: 600 }}>${(lot.giveaway_count * parseFloat(lot.giveaway_comp) * (lot.offer_percent / 100)).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Accept section */}
        {accepted || isAlreadyAccepted ? (
          <div style={{ background: "#0d2010", border: "1px solid #166534", borderRadius: 12, padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#4ade80", marginBottom: 8 }}>Offer accepted!</div>
            <div style={{ fontSize: 14, color: "#555" }}>Payment via {lot.payment_method || paymentMethod} — ValleyHitHouse will be in touch shortly.</div>
          </div>
        ) : (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 32 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, textAlign: "center" }}>Ready to accept this offer?</div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 10, textAlign: "center" }}>Select your preferred payment method</div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                {["PayPal", "Venmo", "Zelle"].map(method => (
                  <button key={method} onClick={() => setPaymentMethod(method)} style={{
                    padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
                    border: `2px solid ${paymentMethod === method ? "#4ade80" : "#222"}`,
                    background: paymentMethod === method ? "#0d2010" : "#0f0f0f",
                    color: paymentMethod === method ? "#4ade80" : "#555",
                  }}>{method}</button>
                ))}
              </div>
            </div>
            <button onClick={acceptLot} disabled={accepting} style={{ width: "100%", background: "linear-gradient(135deg,#166534,#15803d)", border: "none", borderRadius: 10, padding: 16, fontSize: 16, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
              {accepting ? "Accepting..." : `Accept offer of $${parseFloat(lot.total_offer).toFixed(2)}`}
            </button>
            <p style={{ fontSize: 12, color: "#444", textAlign: "center", marginTop: 12 }}>By accepting, you agree to ship the lot to ValleyHitHouse within 5 business days.</p>
          </div>
        )}
      </div>
    </div>
  );
}