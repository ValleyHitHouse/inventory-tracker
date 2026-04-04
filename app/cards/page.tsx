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

const SETS = [
  { label: "Griffey", file: "/boba-checklist.csv", color: "#fb923c" },
  { label: "Alpha", file: "/alpha-boba-checklist.csv", color: "#a78bfa" },
  { label: "Alpha Update", file: "/alpha-update-boba-checklist.csv", color: "#38bdf8" },
];

export default function Cards() {
  const [activeSet, setActiveSet] = useState(0);
  const [cardsBySet, setCardsBySet] = useState<Record<number, any[]>>({});
  const [search, setSearch] = useState("");
  const [filterSet, setFilterSet] = useState("All");
  const [filterWeapon, setFilterWeapon] = useState("All");
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState("Card #");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");

  useEffect(() => {
    setLoading(true);
    setSearch("");
    setFilterSet("All");
    setFilterWeapon("All");
    if (cardsBySet[activeSet]) { setLoading(false); return; }
    fetch(SETS[activeSet].file)
      .then(r => r.text())
      .then(text => {
        setCardsBySet(prev => ({ ...prev, [activeSet]: parseCSV(text) }));
        setLoading(false);
      });
  }, [activeSet]);

  const cards = cardsBySet[activeSet] || [];
  const activeColor = SETS[activeSet].color;

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const treatments = ["All", ...Array.from(new Set(cards.map(c => c.Treatment).filter(Boolean))).sort()];
  const weapons = ["All", ...Array.from(new Set(cards.map(c => c.Weapon).filter(Boolean))).sort()];

 const filtered = cards.filter(c => {
    const q = search.toLowerCase().trim();
    const combined = [c["Card #"], c.Hero, c["Athlete Inspiration"], c.Variation, c.Treatment, c.Weapon, c.Power].join(" ").toLowerCase();
    const matchSearch = !q || q.split(" ").filter(Boolean).every(word => combined.includes(word));
    const matchSet = filterSet === "All" || c.Treatment === filterSet;
    const matchWeapon = filterWeapon === "All" || c.Weapon === filterWeapon;
    return matchSearch && matchSet && matchWeapon;
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortCol] ?? "";
    let bVal = b[sortCol] ?? "";
    if (sortCol === "Power") return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    if (sortCol === "Card #") {
      const parse = (v: string) => {
        const n = parseInt(v.replace(/\D/g, ""));
        return isNaN(n) ? 9999 : n + (v.startsWith("P") ? 10000 : 0);
      };
      return sortDir === "asc" ? parse(aVal) - parse(bVal) : parse(bVal) - parse(aVal);
    }
    return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
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
    td: { padding: "11px 14px", fontSize: 13, borderBottom: "1px solid #161616" },
  };

  function SortTh({ col, label }: { col: string; label: string }) {
    const active = sortCol === col;
    return (
      <th onClick={() => handleSort(col)} style={{
        padding: "10px 14px", textAlign: "left", color: active ? activeColor : "#444",
        fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px",
        borderBottom: "1px solid #1e1e1e", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap"
      }}>
        {label} {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
      </th>
    );
  }

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

        {/* Set switcher */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {SETS.map((set, i) => (
            <button key={i} onClick={() => setActiveSet(i)} style={{
              padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${activeSet === i ? set.color : "#222"}`,
              background: activeSet === i ? set.color + "22" : "#111",
              color: activeSet === i ? set.color : "#555",
            }}>
              {set.label}
            </button>
          ))}
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
            {treatments.map(t => <option key={t} value={t}>{t === "All" ? "All sets" : t}</option>)}
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
                    <SortTh col="Card #" label="#" />
                    <SortTh col="Hero" label="Hero" />
                    <SortTh col="Athlete Inspiration" label="Athlete" />
                    <SortTh col="Variation" label="Variation" />
                    <SortTh col="Treatment" label="Set" />
                    <SortTh col="Weapon" label="Weapon" />
                    <SortTh col="Power" label="Power" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.slice(0, 500).map((c, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #161616" }}>
                      <td style={{ ...s.td, color: "#555", fontFamily: "monospace" }}>{c["Card #"]}</td>
                      <td style={{ ...s.td, color: "#e5e5e5", fontWeight: 600 }}>{c.Hero}</td>
                      <td style={{ ...s.td, color: activeColor }}>{c["Athlete Inspiration"]}</td>
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