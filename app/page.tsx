"use client";
import { useState } from "react";

const LOW = 20;

function statusInfo(qty: number) {
  if (qty === 0) return { label: "Out of stock", color: "#c62828", bg: "#fdecea" };
  if (qty <= LOW) return { label: "Low stock", color: "#f57f17", bg: "#fff8e1" };
  return { label: "In stock", color: "#2e7d32", bg: "#e6f4ea" };
}

function Row({ name, init, cost, reorder }: { name: string; init: number; cost: string; reorder: React.ReactNode }) {
  const [qty, setQty] = useState(init);
  const s = statusInfo(qty);
  return (
    <tr style={{ borderBottom: "1px solid #eee" }}>
      <td style={{ padding: "10px 12px" }}>{name}</td>
      <td style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => setQty(q => Math.max(0, q - 1))} style={btnStyle}>−</button>
          <input value={qty} onChange={e => setQty(Math.max(0, Number(e.target.value)))} style={inputStyle} type="number" />
          <button onClick={() => setQty(q => q + 1)} style={btnStyle}>+</button>
        </div>
      </td>
      <td style={{ padding: "10px 12px", color: "#888" }}>{cost}</td>
      <td style={{ padding: "10px 12px" }}>
        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: s.bg, color: s.color }}>{s.label}</span>
      </td>
      <td style={{ padding: "10px 12px", fontSize: 13 }}>{reorder}</td>
    </tr>
  );
}

const btnStyle = { width: 24, height: 24, border: "1px solid #ddd", background: "#f5f5f5", borderRadius: 4, cursor: "pointer", fontSize: 14 };
const inputStyle = { width: 52, textAlign: "center" as const, border: "1px solid #ddd", borderRadius: 4, padding: "2px 4px", fontSize: 13 };
const thStyle = { padding: "10px 12px", background: "#f5f5f5", borderBottom: "2px solid #e0e0e0", fontSize: 12, textAlign: "left" as const, color: "#666" };

function Section({ title, badge, color, children }: { title: string; badge: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h2>
        <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20, background: color, color: "#333" }}>{badge}</span>
      </div>
      <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead><tr>
            <th style={{ ...thStyle, width: "26%" }}>Item</th>
            <th style={{ ...thStyle, width: "20%" }}>Quantity</th>
            <th style={{ ...thStyle, width: "14%" }}>Cost</th>
            <th style={{ ...thStyle, width: "14%" }}>Status</th>
            <th style={{ ...thStyle, width: "26%" }}>Reorder</th>
          </tr></thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

const link = (url: string, label: string) => <a href={url} target="_blank" style={{ color: "#1a73e8", textDecoration: "none" }}>{label}</a>;
const contact = (msg: string) => <span style={{ color: "#888", fontStyle: "italic" }}>{msg}</span>;

export default function Home() {
  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 960, margin: "40px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>ValleyHitHouse inventory</h1>
      <p style={{ color: "#888", marginBottom: 28, fontSize: 13 }}>Internal use only — click + / − to edit quantities</p>

      <Section title="Card inventory" badge="4 items" color="#e3f2fd">
        <Row name="Giveaway cards" init={100} cost="$1–$2" reorder={contact("—")} />
        <Row name="First time buyer cards" init={50} cost="$25–$50" reorder={contact("—")} />
        <Row name="Insurance cards" init={120} cost="$30–$75" reorder={contact("—")} />
        <Row name="Chaser cards" init={25} cost="$100+" reorder={contact("—")} />
      </Section>

      <Section title="Supplies inventory" badge="12 items" color="#e8f5e9">
        <Row name="Bubble mailers" init={1000} cost="$0.24" reorder={link("https://www.amazon.com/6x10-Self-Seal-Envelopes-Waterproof-Cushioning/dp/B09NJMF6VT/", "Order on Amazon")} />
        <Row name="Bubble holders" init={500} cost="$0.12" reorder={link("https://www.amazon.com/Frienda-Shockproof-Protective-Business-Packaging/dp/B0CM68FCX2/", "Order on Amazon")} />
        <Row name="Team bags" init={1000} cost="$0.03" reorder={link("https://www.amazon.com/Trading-Card-Supplies-Resealable-Plastic/dp/B00F1ZS3EE/", "Order on Amazon")} />
        <Row name="Toploaders" init={1000} cost="$0.10" reorder={link("https://www.cardshellz.com/products/3x4-toploader-35pt-essentials-easy-glide-combo-pack", "Order on CardShellz")} />
        <Row name="Penny sleeves" init={1000} cost="$0.02" reorder={link("https://www.cardshellz.com/products/easy-glide-soft-sleeves", "Order on CardShellz")} />
        <Row name="MagPros" init={800} cost="$2.20" reorder={contact("Email Alex@zioncases.com")} />
        <Row name="Shipping labels" init={500} cost="$0.04" reorder={link("https://www.amazon.com/ROLLO-Thermal-Direct-Shipping-Fan-Fold/dp/B01M9AR01Q/", "Order on Amazon")} />
        <Row name="Boxes (S)" init={100} cost="$2.00" reorder={contact("Amazon — add link")} />
        <Row name="Boxes (M)" init={100} cost="$2.00" reorder={contact("Amazon — add link")} />
        <Row name="Boxes (L)" init={100} cost="$2.00" reorder={contact("Amazon — add link")} />
        <Row name="Packing tape" init={5} cost="$3.00" reorder={link("https://www.amazon.com/Scotch-Shipping-Packaging-Dispenser-142L/dp/B000MVV6AA/", "Order on Amazon")} />
        <Row name="Packing paper" init={1} cost="$28.00" reorder={link("https://www.amazon.com/ANF-Brands-12-1200-feet/dp/B0DNYQLF85/", "Order on Amazon")} />
      </Section>

      <Section title="Branding inventory" badge="3 items" color="#f3e5f5">
        <Row name="Stickers" init={250} cost="$0.50" reorder={contact("Email Alex@zioncases.com")} />
        <Row name="Hats" init={5} cost="$12.00" reorder={contact("Text OGPanda to order")} />
        <Row name="Shirts" init={3} cost="$20.00" reorder={contact("Text OGPanda to order")} />
      </Section>
    </main>
  );
}