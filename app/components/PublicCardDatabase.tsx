"use client";
import { useState, useEffect } from "react";
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

const weaponColors: Record<string, string> = {
  Fire: "#fb923c", Ice: "#38bdf8", Steel: "#94a3b8",
  Gum: "#f472b6", Hex: "#a78bfa", Glow: "#4ade80", Brawl: "#f87171"
};

interface Props {
  title: string;
  set: string;
  file: string;
  color: string;
  description: string;
}

export default function PublicCardDatabase({ title, set, file, color, description }: Props) {
  const [cards, setCards] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterWeapon, setFilterWeapon] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(file).then(r => r.text()).then(text => {
      setCards(parseCSV(text));
      setLoading(false);
    });
  }, [file]);

  const weapons = ["All", ...Array.from(new Set(cards.map((c: any) => c.Weapon).filter(Boolean))).sort()];

  const filtered = cards.filter((c: any) => {
    const q = search.toLowerCase().trim();
    const combined = [c["Card #"], c.Hero, c["Athlete Inspiration"], c.Variation, c.Treatment, c.Weapon, c.Power].join(" ").toLowerCase();
    const matchSearch = !q || q.split(" ").filter(Boolean).every((w: string) => combined.includes(w));
    const matchWeapon = filterWeapon === "All" || c.Weapon === filterWeapon;
    return matchSearch && matchWeapon;
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "100px 24px 60px", width: "100%", boxSizing: "border-box" }}>
      <style>{`
        .pcd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
        .pcd-filters { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        @media (max-width: 768px) {
          .pcd-filters { flex-direction: column; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Link href="/" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Home</Link>
          <span style={{ color: "#333" }}>›</span>
          <span style={{ fontSize: 13, color: "#555" }}>Card Database</span>
          <span style={{ color: "#333" }}>›</span>
          <span style={{ fontSize: 13, color }}>Bo Jackson Battle Arena</span>
        </div>
        <div style={{ fontSize: 11, color, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>Bo Jackson Battle Arena</div>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, margin: 0, marginBottom: 10 }}>{title}</h1>
        <p style={{ fontSize: 15, color: "#555", margin: 0 }}>{description}</p>
        {!loading && <p style={{ fontSize: 13, color: "#333", marginTop: 8 }}>{cards.length.toLocaleString()} cards total · {filtered.length.toLocaleString()} showing</p>}
      </div>

      {/* Filters */}
      <div className="pcd-filters">
        <input
          style={{ flex: 1, background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#e5e5e5", outline: "none", minWidth: 200, boxSizing: "border-box" as const }}
          placeholder="🔍 Search by hero, athlete, card #, variation..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#e5e5e5", outline: "none", cursor: "pointer" }}
          value={filterWeapon}
          onChange={e => setFilterWeapon(e.target.value)}
        >
          {weapons.map(w => <option key={w} value={w}>{w === "All" ? "All weapons" : w}</option>)}
        </select>
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#555" }}>Loading checklist...</div>
      ) : (
        <div className="pcd-grid">
          {filtered.slice(0, 500).map((c: any, i: number) => (
            <div key={i} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e5e5e5" }}>{c.Hero}</div>
                  <div style={{ fontSize: 13, color, marginTop: 2 }}>{c["Athlete Inspiration"]}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>{c["Card #"]}</div>
                  {c.Power && <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", marginTop: 2 }}>⚡{c.Power}</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {c.Weapon && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: (weaponColors[c.Weapon] || "#333") + "22", color: weaponColors[c.Weapon] || "#aaa" }}>{c.Weapon}</span>}
                {c.Treatment && <span style={{ fontSize: 11, color: "#555", padding: "2px 8px", borderRadius: 20, background: "#1a1a1a" }}>{c.Treatment}</span>}
                {c.Variation && <span style={{ fontSize: 11, color: "#777" }}>{c.Variation}</span>}
              </div>
            </div>
          ))}
          {filtered.length > 500 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 20, fontSize: 13, color: "#555" }}>
              Showing 500 of {filtered.length.toLocaleString()} — use search to narrow down
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1e1e1e", padding: "40px 0", marginTop: 60 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
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