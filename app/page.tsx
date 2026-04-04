"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function Home() {
  const [invCount, setInvCount] = useState<number | null>(null);
  const [breakCount, setBreakCount] = useState<number | null>(null);
  const [lastProfit, setLastProfit] = useState<number | null>(null);
  const [lowStock, setLowStock] = useState<number | null>(null);
  const [lotCount, setLotCount] = useState<number | null>(null);
  const [customerCount, setCustomerCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("Inventory").select("*").then(({ data }) => {
      if (data) {
        setInvCount(data.length);
        setLowStock(data.filter(i => i.quantity <= 20).length);
      }
    });
    supabase.from("Breaks").select("*").order("date", { ascending: false }).then(({ data }) => {
      if (data) {
        setBreakCount(data.length);
        if (data[0]) setLastProfit(data[0].net_profit);
      }
    });
    supabase.from("lotcomps").select("*").then(({ data }) => {
      if (data) setLotCount(data.length);
    });
    supabase.from("BreakOrders").select("buyer_username").then(({ data }) => {
      if (data) {
        const unique = new Set(data.map(r => r.buyer_username).filter(Boolean));
        setCustomerCount(unique.size);
      }
    });
  }, []);

  const cards = [
    { href: "/inventory", emoji: "📦", label: "Inventory", desc: "Track stock levels across cards, supplies & branding", color: "#a78bfa", stat: invCount !== null ? `${invCount} SKUs` : "—", warn: lowStock ? `${lowStock} low stock` : null },
    { href: "/breaks", emoji: "🎴", label: "Breaks", desc: "Log Whatnot breaks, upload CSVs, track profit & IMC split", color: "#f472b6", stat: breakCount !== null ? `${breakCount} logged` : "—", warn: null },
    { href: "/customers", emoji: "👥", label: "Customers", desc: "Buyer history pulled from Whatnot CSV data", color: "#4ade80", stat: customerCount !== null ? `${customerCount} buyers` : "—", warn: null },
    { href: "/cards", emoji: "🃏", label: "Card Database", desc: "Griffey, Alpha & Alpha Update checklists", color: "#38bdf8", stat: "3 sets", warn: null },
    { href: "/card-inventory", emoji: "📋", label: "Card Inventory", desc: "Track chasers, insurance & first timer cards by lot", color: "#fb923c", stat: "Lot intake", warn: null },
    { href: "/lot-comp", emoji: "🏷️", label: "Lot Comps", desc: "Comp lots, generate seller links & receive inventory", color: "#f472b6", stat: lotCount !== null ? `${lotCount} lots` : "—", warn: null },
  ];

  return (
    <div style={{ padding: 32, background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fb923c", margin: 0 }}>ValleyHitHouse</h1>
        <p style={{ fontSize: 14, color: "#555", marginTop: 6 }}>Welcome back. What are we working on today?</p>
      </div>

      {/* Top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
        <StatBox label="Total SKUs" value={invCount ?? "—"} color="#a78bfa" />
        <StatBox label="Breaks logged" value={breakCount ?? "—"} color="#f472b6" />
        <StatBox label="Last break profit" value={lastProfit !== null ? `$${parseFloat(lastProfit.toString()).toFixed(2)}` : "—"} color={lastProfit !== null && lastProfit >= 0 ? "#4ade80" : "#f87171"} />
        <StatBox label="Total customers" value={customerCount ?? "—"} color="#38bdf8" />
      </div>

      {/* Nav cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {cards.map(c => (
          <Link key={c.href} href={c.href} style={{ textDecoration: "none" }}>
            <div
              style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 20, cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = c.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#1e1e1e")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ fontSize: 24 }}>{c.emoji}</span>
                <span style={{ fontSize: 12, color: c.color, fontWeight: 600 }}>{c.stat}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#e5e5e5", marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>{c.desc}</div>
              {c.warn && <div style={{ marginTop: 10, fontSize: 11, color: "#fb923c", background: "#1a1000", padding: "4px 8px", borderRadius: 6, display: "inline-block" }}>⚠ {c.warn}</div>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}