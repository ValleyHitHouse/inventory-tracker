"use client";
import { useState, useEffect } from "react";

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

export default function Cards() {
  const [cards, setCards] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterSet, setFilterSet] = useState("All");
  const [filterWeapon, setFilterWeapon] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/boba-checklist.csv")
      .then(r => r.text())
      .then(text => {
        setCards(parseCSV(text));
        setLoading(false);
      });
  }, []);

  const sets = ["All", ...Array.from(new Set(cards.map(c => c.Treatment).filter(Boolean))).sort()];
  const weapons = ["All", ...Array.from(new Set(cards.map(c => c.Weapon).filter(Boolean))).sort()];

  const filtered = cards.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c["Card #"]?.toLowerCase().includes(q) ||
      c.Hero?.toLowerCase().includes(q) ||
      c["Athlete Inspiration"]?.toLowerCase().includes(q) ||
      c.Variation?.toLowerCase().includes(q);
    const matchSet = filterSet === "All" || c.Treatment === filterSet;
    const matchWeapon = filterWeapon === "All" || c.Weapon === filterWeapon;
    return matchSearch && matchSet && matchWeapon;
  });

  const weaponColors: Record<string, string> = {
    Fire: "#fb923c", Ice: "#38bdf8", Steel: "#94a3b8",
    Gum: "#f472b6", Hex: "#a78bfa", Glow: "#4ade80", Brawl: "#f87171"
  };

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" },
    content: { padding: 32, maxWidth: 1100, margin: "0 auto" },
    input: { background: "#111", border: "1px solid #222", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "#e5e5e5", outline: "none" },
    select: { background: "#111", border: "1px solid #222", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "#e5e5e5", outline: "none", cursor: "pointer" },
    th: { padding: "10px 14px", textAlign: "left" as const, color: "#444", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".4px", borderBottom: "1px solid #1e1e1e" },
    td: { padding: "11px 14px", fontSize: 13, borderBottom: "1px solid #161616" },
  };

  return (
    <div style={s.shell}>
      <div style={s.content}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Bo Jackson Battle Arena</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
            {loading ? "Loading..." : `${cards.length.toLocaleString()} cards · ${filtered.length.toLocaleString()} showing`}
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <input
            style={{ ...s.input, flex: 1, minWidth: 200 }}
            placeholder="🔍 Search by hero, athlete, card #, variation..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={s.select} value={filterSet} onChange={e => setFilterSet(e.target.value)}>
            {sets.map(s => <option key={s} value={s}>{s === "All" ? "All sets" : s}</option>)}
          </select>
          <select style={s.select} value={filterWeapon} onChange={e => setFilterWeapon(e.target.value)}>
            {weapons.map(w => <option key={w} value={w}>{w === "All" ? "All weapons" : w}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <p style={{ color: "#555" }}>Loading checklist...</p>
        ) : (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ overflowX: "auto", maxHeight: "70vh", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ background: "#0f0f0f" }}>
                    <th style={s.th}>#</th>
                    <th style={s.th}>Hero</th>
                    <th style={s.th}>Athlete</th>
                    <th style={s.th}>Variation</th>
                    <th style={s.th}>Set</th>
                    <th style={s.th}>Weapon</th>
                    <th style={s.th}>Power</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 500).map((c, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #161616" }}>
                      <td style={{ ...s.td, color: "#555", fontFamily: "monospace" }}>{c["Card #"]}</td>
                      <td style={{ ...s.td, color: "#e5e5e5", fontWeight: 600 }}>{c.Hero}</td>
                      <td style={{ ...s.td, color: "#a78bfa" }}>{c["Athlete Inspiration"]}</td>
                      <td style={{ ...s.td, color: "#777" }}>{c.Variation}</td>
                      <td style={{ ...s.td, color: "#555", fontSize: 12 }}>{c.Treatment}</td>
                      <td style={{ ...s.td }}>
                        {c.Weapon && (
                          <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: (weaponColors[c.Weapon] || "#333") + "22", color: weaponColors[c.Weapon] || "#aaa" }}>
                            {c.Weapon}
                          </span>
                        )}
                      </td>
                      <td style={{ ...s.td, color: "#4ade80", fontWeight: 600 }}>{c.Power}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > 500 && (
              <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e1e", fontSize: 12, color: "#555", textAlign: "center" }}>
                Showing first 500 of {filtered.length.toLocaleString()} results — use search or filters to narrow down
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}