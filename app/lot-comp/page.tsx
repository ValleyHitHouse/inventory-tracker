"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

function parseCSV(text: string) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  return lines.slice(1).map(line => {
    const vals: string[] = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    vals.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

const SETS = [
  { label: "Griffey", file: "/boba-checklist.csv" },
  { label: "Alpha", file: "/alpha-boba-checklist.csv" },
  { label: "Alpha Update", file: "/alpha-update-boba-checklist.csv" },
];

const SUBSETS = ["Chasers", "Insurance", "First Timers"];

const weaponColors: Record<string, string> = {
  Fire: "#fb923c", Ice: "#38bdf8", Steel: "#94a3b8",
  Gum: "#f472b6", Hex: "#a78bfa", Glow: "#4ade80", Brawl: "#f87171"
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#fb923c",
  accepted: "#a78bfa",
  in_transit: "#38bdf8",
  arrived: "#4ade80",
  received: "#555",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  in_transit: "In Transit",
  arrived: "Arrived",
  received: "Received",
};

export default function LotCompPage() {
  const [view, setView] = useState<"list"|"new"|"detail">("list");
  const [lots, setLots] = useState<any[]>([]);
  const [selectedLot, setSelectedLot] = useState<any>(null);
  const [lotCards, setLotCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New lot form
  const [lotName, setLotName] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [giveawayCount, setGiveawayCount] = useState(0);
  const [giveawayComp, setGiveawayComp] = useState("");
  const [offerPercent, setOfferPercent] = useState("70");
  const [selectedSet, setSelectedSet] = useState(0);
  const [activeSubset, setActiveSubset] = useState("Chasers");
  const [allCards, setAllCards] = useState<any[]>([]);
  const [cardSearch, setCardSearch] = useState("");
  const [pickedCards, setPickedCards] = useState<Record<string, {card: any, qty: number, comp: string, subset: string}>>({});

  // Detail view
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("USPS");
  const [savingTracking, setSavingTracking] = useState(false);
  const [receivingLot, setReceivingLot] = useState(false);

  useEffect(() => { loadLots(); }, []);

  useEffect(() => {
    fetch(SETS[selectedSet].file)
      .then(r => r.text())
      .then(text => setAllCards(parseCSV(text)));
  }, [selectedSet]);

  async function loadLots() {
    setLoading(true);
    const { data } = await supabase.from("LotComps").select("*").order("created_at", { ascending: false });
    if (data) setLots(data);
    setLoading(false);
  }

  async function loadLotDetail(lot: any) {
    setSelectedLot(lot);
    setTrackingNumber(lot.tracking_number || "");
    setCarrier(lot.carrier || "USPS");
    const { data } = await supabase.from("LotCompCards").select("*").eq("lot_id", lot.id);
    if (data) setLotCards(data);
    setView("detail");
  }

  const filteredCards = allCards.filter(c => {
    const q = cardSearch.toLowerCase();
    return !q || c.Hero?.toLowerCase().includes(q) || c["Athlete Inspiration"]?.toLowerCase().includes(q) || c["Card #"]?.toLowerCase().includes(q) || c.Treatment?.toLowerCase().includes(q);
  }).slice(0, 50);

  function pickCard(card: any) {
    const key = `${card["Card #"]}-${card.Weapon}-${card.Treatment}-${activeSubset}`;
    setPickedCards(prev => ({
      ...prev,
      [key]: prev[key] ? { ...prev[key], qty: prev[key].qty + 1 } : { card, qty: 1, comp: "", subset: activeSubset }
    }));
  }

  function updateComp(key: string, comp: string) {
    setPickedCards(prev => ({ ...prev, [key]: { ...prev[key], comp } }));
  }

  function updateQty(key: string, qty: number) {
    if (qty <= 0) {
      setPickedCards(prev => { const n = { ...prev }; delete n[key]; return n; });
    } else {
      setPickedCards(prev => ({ ...prev, [key]: { ...prev[key], qty } }));
    }
  }

  // Totals
  const cardCompTotal = Object.values(pickedCards).reduce((sum, { comp, qty }) => sum + parseFloat(comp || "0") * qty, 0);
  const giveawayCompTotal = parseFloat(giveawayComp || "0") * giveawayCount;
  const totalComp = cardCompTotal + giveawayCompTotal;
  const totalOffer = totalComp * (parseFloat(offerPercent || "0") / 100);

  async function saveLot() {
    if (!lotName) return alert("Please enter a lot name!");
    setSaving(true);

    const { data: lot } = await supabase.from("LotComps").insert({
      lot_name: lotName,
      seller_name: sellerName,
      giveaway_count: giveawayCount,
      giveaway_comp: parseFloat(giveawayComp || "0"),
      offer_percent: parseFloat(offerPercent || "70"),
      total_comp: Math.round(totalComp * 100) / 100,
      total_offer: Math.round(totalOffer * 100) / 100,
      status: "pending",
    }).select().single();

    if (lot) {
      const cardRows = Object.values(pickedCards).map(({ card, qty, comp, subset }) => ({
        lot_id: lot.id,
        card_number: card["Card #"],
        hero: card.Hero,
        athlete: card["Athlete Inspiration"],
        treatment: card.Treatment,
        weapon: card.Weapon,
        set_name: SETS[selectedSet].label,
        subset,
        quantity: qty,
        comp_value: parseFloat(comp || "0"),
        offer_value: parseFloat(comp || "0") * (parseFloat(offerPercent || "0") / 100),
      }));
      if (cardRows.length > 0) await supabase.from("LotCompCards").insert(cardRows);
    }

    await loadLots();
    setSaving(false);
    setView("list");
    resetForm();
  }

  function resetForm() {
    setLotName(""); setSellerName(""); setGiveawayCount(0); setGiveawayComp("");
    setOfferPercent("70"); setPickedCards({}); setCardSearch("");
  }

  async function saveTracking() {
    if (!trackingNumber) return alert("Please enter a tracking number!");
    setSavingTracking(true);
    await supabase.from("LotComps").update({
      tracking_number: trackingNumber,
      carrier,
      status: "in_transit",
    }).eq("id", selectedLot.id);
    setSelectedLot({ ...selectedLot, tracking_number: trackingNumber, carrier, status: "in_transit" });
    setSavingTracking(false);
  }

  async function markArrived() {
    await supabase.from("LotComps").update({ status: "arrived", arrived_at: new Date().toISOString() }).eq("id", selectedLot.id);
    setSelectedLot({ ...selectedLot, status: "arrived" });
    loadLots();
  }

  async function receiveLot() {
    setReceivingLot(true);

    // Add giveaway cards to inventory
    if (selectedLot.giveaway_count > 0) {
      const { data: gt } = await supabase.from("giveawaytotal").select("total").single();
      if (gt) await supabase.from("giveawaytotal").update({ total: gt.total + selectedLot.giveaway_count }).eq("id", 1);
      const { data: givInv } = await supabase.from("Inventory").select("id,quantity").eq("id", 1).single();
      if (givInv) await supabase.from("Inventory").update({ quantity: givInv.quantity + selectedLot.giveaway_count }).eq("id", 1);
    }

    // Add each card to cardinventory and update main inventory counts
    const subsetToId: Record<string, number> = { Chasers: 4, Insurance: 3, "First Timers": 2 };
    for (const card of lotCards) {
      // Add to cardinventory
      await supabase.from("cardinventory").insert({
        subset: card.subset,
        card_number: card.card_number,
        hero: card.hero,
        athlete: card.athlete,
        variation: card.treatment,
        weapon: card.weapon,
        set_name: card.set_name,
        quantity: card.quantity,
        price_paid: card.offer_value,
      });

      // Update main inventory count
      const invId = subsetToId[card.subset];
      if (invId) {
        const { data: inv } = await supabase.from("Inventory").select("id,quantity").eq("id", invId).single();
        if (inv) await supabase.from("Inventory").update({ quantity: inv.quantity + card.quantity }).eq("id", invId);
      }
    }

    await supabase.from("LotComps").update({ status: "received", received_at: new Date().toISOString() }).eq("id", selectedLot.id);
    setSelectedLot({ ...selectedLot, status: "received" });
    setReceivingLot(false);
    loadLots();
  }

  function getTrackingUrl(carrier: string, tracking: string) {
    if (carrier === "USPS") return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`;
    if (carrier === "UPS") return `https://www.ups.com/track?tracknum=${tracking}`;
    if (carrier === "FedEx") return `https://www.fedex.com/fedextrack/?trknbr=${tracking}`;
    return "#";
  }

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" },
    content: { padding: 32, maxWidth: 1100, margin: "0 auto" },
    section: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: ".6px", marginBottom: 14 },
    input: { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#e5e5e5", outline: "none" },
    smallInput: { background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "6px 10px", fontSize: 13, color: "#e5e5e5", outline: "none", width: 80, textAlign: "center" as const },
    submitBtn: { background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" },
    label: { fontSize: 12, color: "#666", marginBottom: 5, display: "block" },
    th: { padding: "10px 14px", textAlign: "left" as const, color: "#444", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".4px", borderBottom: "1px solid #1e1e1e" },
    td: { padding: "11px 14px", fontSize: 13, borderBottom: "1px solid #161616" },
  };

  // DETAIL VIEW
  if (view === "detail" && selectedLot) {
    const status = selectedLot.status;
    return (
      <div style={s.shell}>
        <div style={s.content}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{selectedLot.lot_name}</h1>
                <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: STATUS_COLORS[status] + "22", color: STATUS_COLORS[status], fontWeight: 600 }}>
                  {STATUS_LABELS[status]}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "#555", margin: 0 }}>Seller: {selectedLot.seller_name || "—"}</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setView("list")} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>← Back</button>
              {status === "pending" && (
                <Link href={`/lot-comp/${selectedLot.id}`} target="_blank" style={{ ...s.submitBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                  🔗 Open seller page
                </Link>
              )}
              {status === "accepted" && (
                <button onClick={() => setView("detail")} style={{ ...s.submitBtn, background: "#166534" }}>
                  ✓ Accepted — add tracking below
                </button>
              )}
              {status === "arrived" && (
                <button onClick={receiveLot} disabled={receivingLot} style={{ ...s.submitBtn, background: "linear-gradient(135deg,#166534,#15803d)" }}>
                  {receivingLot ? "Receiving..." : "📦 Receive lot"}
                </button>
              )}
            </div>
          </div>

          {/* Summary stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            <div style={s.section}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Total comp</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#e5e5e5" }}>${parseFloat(selectedLot.total_comp).toFixed(2)}</div>
            </div>
            <div style={s.section}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Offer ({selectedLot.offer_percent}%)</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80" }}>${parseFloat(selectedLot.total_offer).toFixed(2)}</div>
            </div>
            <div style={s.section}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Giveaway cards</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fb923c" }}>{selectedLot.giveaway_count}</div>
            </div>
            <div style={s.section}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>Payment</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#a78bfa" }}>{selectedLot.payment_method || "—"}</div>
            </div>
          </div>

          {/* Tracking section */}
          {(status === "accepted" || status === "in_transit" || status === "arrived") && (
            <div style={s.section}>
              <div style={s.sectionTitle}>📦 Shipping & tracking</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 12, alignItems: "end" }}>
                <div>
                  <label style={s.label}>Tracking number</label>
                  <input style={s.input} placeholder="Enter tracking number" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} />
                </div>
                <div>
                  <label style={s.label}>Carrier</label>
                  <select style={s.input} value={carrier} onChange={e => setCarrier(e.target.value)}>
                    <option value="USPS">USPS</option>
                    <option value="UPS">UPS</option>
                    <option value="FedEx">FedEx</option>
                  </select>
                </div>
                <button onClick={saveTracking} disabled={savingTracking} style={{ ...s.submitBtn, whiteSpace: "nowrap" }}>
                  {savingTracking ? "Saving..." : "Save tracking"}
                </button>
                {selectedLot.tracking_number && (
                  <a href={getTrackingUrl(selectedLot.carrier, selectedLot.tracking_number)} target="_blank" style={{ ...s.submitBtn, background: "#1a1a2e", border: "1px solid #333", textDecoration: "none", display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}>
                    🔍 Track package
                  </a>
                )}
              </div>
              {status === "in_transit" && (
                <button onClick={markArrived} style={{ marginTop: 12, background: "#166534", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                  ✓ Mark as arrived
                </button>
              )}
            </div>
          )}

          {/* Seller page link */}
          <div style={s.section}>
            <div style={s.sectionTitle}>🔗 Seller page</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input style={{ ...s.input, color: "#555" }} readOnly value={`${typeof window !== "undefined" ? window.location.origin : ""}/lot-comp/${selectedLot.id}`} />
              <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/lot-comp/${selectedLot.id}`)}
                style={{ ...s.submitBtn, whiteSpace: "nowrap", padding: "10px 20px" }}>
                Copy link
              </button>
            </div>
          </div>

          {/* Cards in lot */}
          <div style={s.section}>
            <div style={s.sectionTitle}>Cards in this lot</div>
            {lotCards.length === 0 ? (
              <p style={{ color: "#555", fontSize: 13 }}>No specific cards logged</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#0f0f0f" }}>
                    <th style={s.th}>Subset</th>
                    <th style={s.th}>#</th>
                    <th style={s.th}>Hero</th>
                    <th style={s.th}>Athlete</th>
                    <th style={s.th}>Treatment</th>
                    <th style={s.th}>Weapon</th>
                    <th style={s.th}>Qty</th>
                    <th style={s.th}>Comp</th>
                    <th style={s.th}>Offer</th>
                  </tr>
                </thead>
                <tbody>
                  {lotCards.map((card, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #161616" }}>
                      <td style={{ ...s.td }}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#a78bfa22", color: "#a78bfa" }}>{card.subset}</span></td>
                      <td style={{ ...s.td, color: "#555", fontFamily: "monospace" }}>{card.card_number}</td>
                      <td style={{ ...s.td, color: "#e5e5e5", fontWeight: 600 }}>{card.hero}</td>
                      <td style={{ ...s.td, color: "#a78bfa" }}>{card.athlete}</td>
                      <td style={{ ...s.td, color: "#777" }}>{card.treatment}</td>
                      <td style={{ ...s.td }}>
                        {card.weapon && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, background: (weaponColors[card.weapon] || "#333") + "22", color: weaponColors[card.weapon] || "#aaa" }}>{card.weapon}</span>}
                      </td>
                      <td style={{ ...s.td, color: "#aaa" }}>{card.quantity}</td>
                      <td style={{ ...s.td, color: "#e5e5e5" }}>${parseFloat(card.comp_value).toFixed(2)}</td>
                      <td style={{ ...s.td, color: "#4ade80", fontWeight: 600 }}>${parseFloat(card.offer_value).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // NEW LOT VIEW
  if (view === "new") return (
    <div style={s.shell}>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>New lot comp</h1>
          <button onClick={() => setView("list")} style={{ fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>← Back</button>
        </div>

        {/* Lot details */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Lot details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={s.label}>Lot name</label><input style={s.input} placeholder="e.g. John's Griffey Lot" value={lotName} onChange={e => setLotName(e.target.value)} /></div>
            <div><label style={s.label}>Seller name</label><input style={s.input} placeholder="e.g. John Smith" value={sellerName} onChange={e => setSellerName(e.target.value)} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><label style={s.label}>Giveaway cards in lot</label><input style={s.input} type="number" min={0} value={giveawayCount} onChange={e => setGiveawayCount(Number(e.target.value))} /></div>
            <div><label style={s.label}>Comp per giveaway card ($)</label><input style={s.input} type="number" min={0} step="0.01" placeholder="e.g. 1.50" value={giveawayComp} onChange={e => setGiveawayComp(e.target.value)} /></div>
            <div><label style={s.label}>Offer % of comp</label><input style={s.input} type="number" min={0} max={100} placeholder="e.g. 70" value={offerPercent} onChange={e => setOfferPercent(e.target.value)} /></div>
          </div>
        </div>

        {/* Card picker */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Add cards from database</div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {SETS.map((set, i) => (
              <button key={i} onClick={() => setSelectedSet(i)} style={{ padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${selectedSet === i ? "#fb923c" : "#222"}`, background: selectedSet === i ? "#fb923c22" : "#0f0f0f", color: selectedSet === i ? "#fb923c" : "#555" }}>{set.label}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {SUBSETS.map(sub => (
              <button key={sub} onClick={() => setActiveSubset(sub)} style={{ padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${activeSubset === sub ? "#a78bfa" : "#222"}`, background: activeSubset === sub ? "#a78bfa22" : "#0f0f0f", color: activeSubset === sub ? "#a78bfa" : "#555" }}>{sub}</button>
            ))}
          </div>

          <input style={{ ...s.input, marginBottom: 12 }} placeholder="🔍 Search by hero, athlete, card #, treatment..." value={cardSearch} onChange={e => setCardSearch(e.target.value)} />

          <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid #1e1e1e", borderRadius: 8 }}>
            {filteredCards.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#555", fontSize: 13 }}>Type to search cards</div>
            ) : filteredCards.map((card, i) => {
              const key = `${card["Card #"]}-${card.Weapon}-${card.Treatment}-${activeSubset}`;
              const isPicked = !!pickedCards[key];
              return (
                <div key={i} onClick={() => pickCard(card)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #161616", cursor: "pointer", background: isPicked ? "#a78bfa11" : "transparent" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: "#555", fontSize: 11, fontFamily: "monospace" }}>{card["Card #"]}</span>
                    <span style={{ color: "#e5e5e5", fontWeight: 600, fontSize: 13 }}>{card.Hero}</span>
                    <span style={{ color: "#a78bfa", fontSize: 12 }}>{card["Athlete Inspiration"]}</span>
                    {card.Weapon && <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 11, background: (weaponColors[card.Weapon] || "#333") + "22", color: weaponColors[card.Weapon] || "#aaa" }}>{card.Weapon}</span>}
                    {card.Treatment && <span style={{ color: "#777", fontSize: 11 }}>{card.Treatment}</span>}
                    {card.Power && <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 600 }}>⚡{card.Power}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: isPicked ? "#a78bfa" : "#333", whiteSpace: "nowrap", marginLeft: 8 }}>{isPicked ? "✓ Added" : "+ Add"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Picked cards with comp values */}
        {Object.keys(pickedCards).length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Cards in lot — enter comp value per card</div>
            {Object.entries(pickedCards).map(([key, { card, qty, comp, subset }]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #161616" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#a78bfa22", color: "#a78bfa" }}>{subset}</span>
                  <span style={{ color: "#555", fontSize: 11, fontFamily: "monospace" }}>{card["Card #"]}</span>
                  <span style={{ color: "#e5e5e5", fontSize: 13, fontWeight: 600 }}>{card.Hero}</span>
                  <span style={{ color: "#a78bfa", fontSize: 12 }}>{card["Athlete Inspiration"]}</span>
                  {card.Weapon && <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 11, background: (weaponColors[card.Weapon] || "#333") + "22", color: weaponColors[card.Weapon] || "#aaa" }}>{card.Weapon}</span>}
                  {card.Treatment && <span style={{ color: "#777", fontSize: 11 }}>{card.Treatment}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "#555" }}>Comp $</span>
                    <input type="number" min={0} step="0.01" placeholder="0.00" value={comp} onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); updateComp(key, e.target.value); }} style={s.smallInput} />
                    {comp && <span style={{ fontSize: 11, color: "#4ade80" }}>→ ${(parseFloat(comp) * (parseFloat(offerPercent || "0") / 100) * qty).toFixed(2)} offer</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={e => { e.stopPropagation(); updateQty(key, qty - 1); }} style={{ width: 24, height: 24, border: "1px solid #333", background: "#0f0f0f", borderRadius: 4, cursor: "pointer", color: "#aaa" }}>−</button>
                    <span style={{ fontSize: 13, minWidth: 20, textAlign: "center" }}>{qty}</span>
                    <button onClick={e => { e.stopPropagation(); updateQty(key, qty + 1); }} style={{ width: 24, height: 24, border: "1px solid #333", background: "#0f0f0f", borderRadius: 4, cursor: "pointer", color: "#aaa" }}>+</button>
                  </div>
                </div>
              </div>
            ))}

            {/* Totals */}
            <div style={{ marginTop: 16, background: "#0f0f0f", borderRadius: 8, padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div><div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>TOTAL COMP</div><div style={{ fontSize: 22, fontWeight: 700, color: "#e5e5e5" }}>${totalComp.toFixed(2)}</div></div>
              <div><div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>OFFER ({offerPercent}%)</div><div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80" }}>${totalOffer.toFixed(2)}</div></div>
              <div><div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>GIVEAWAY COMP</div><div style={{ fontSize: 22, fontWeight: 700, color: "#fb923c" }}>${giveawayCompTotal.toFixed(2)}</div></div>
            </div>
          </div>
        )}

        <button style={{ ...s.submitBtn, width: "100%" }} onClick={saveLot} disabled={saving}>
          {saving ? "Saving..." : "Generate lot & create seller link"}
        </button>
      </div>
    </div>
  );

  // LIST VIEW
  return (
    <div style={s.shell}>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Lot Comps</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>{lots.length} lots created</p>
          </div>
          <button onClick={() => setView("new")} style={s.submitBtn}>+ New lot comp</button>
        </div>

        {loading ? <p style={{ color: "#555" }}>Loading...</p> : lots.length === 0 ? (
          <div style={{ ...s.section, textAlign: "center", padding: 48 }}>
            <p style={{ color: "#555", fontSize: 13 }}>No lots yet — click "New lot comp" to get started</p>
          </div>
        ) : (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#0f0f0f" }}>
                  <th style={s.th}>Lot name</th>
                  <th style={s.th}>Seller</th>
                  <th style={s.th}>Total comp</th>
                  <th style={s.th}>Offer</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Payment</th>
                  <th style={s.th}>Date</th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #161616" }}>
                    <td style={{ ...s.td, color: "#e5e5e5", fontWeight: 600 }}>{lot.lot_name}</td>
                    <td style={{ ...s.td, color: "#777" }}>{lot.seller_name || "—"}</td>
                    <td style={{ ...s.td, color: "#e5e5e5" }}>${parseFloat(lot.total_comp).toFixed(2)}</td>
                    <td style={{ ...s.td, color: "#4ade80", fontWeight: 600 }}>${parseFloat(lot.total_offer).toFixed(2)}</td>
                    <td style={{ ...s.td }}>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: STATUS_COLORS[lot.status] + "22", color: STATUS_COLORS[lot.status], fontWeight: 600 }}>
                        {STATUS_LABELS[lot.status]}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: "#a78bfa" }}>{lot.payment_method || "—"}</td>
                    <td style={{ ...s.td, color: "#555" }}>{new Date(lot.created_at).toLocaleDateString()}</td>
                    <td style={{ ...s.td }}>
                      <button onClick={() => loadLotDetail(lot)} style={{ fontSize: 11, background: "none", border: "1px solid #333", color: "#aaa", borderRadius: 5, padding: "4px 10px", cursor: "pointer" }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}