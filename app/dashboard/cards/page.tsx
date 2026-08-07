"use client";
import { useState, useEffect } from "react";
import { parseCSV } from "@/lib/csv";
import { CARD_SETS as SETS } from "@/lib/cardSets";
import { Page, Badge, C } from "@/components/ui";

const weaponColors: Record<string, string> = {
  Fire: "#fb923c", Ice: "#38bdf8", Steel: "#94a3b8",
  Gum: "#f472b6", Hex: "#a78bfa", Glow: "#4ade80", Brawl: "#f87171",
};

export default function Cards() {
  const [cardsBySet, setCardsBySet] = useState<Record<number, any[]>>({});
  const [scope, setScope] = useState<"all" | number>("all"); // which set(s) to browse
  const [search, setSearch] = useState("");
  const [filterTreatment, setFilterTreatment] = useState("All");
  const [filterWeapon, setFilterWeapon] = useState("All");
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState("Card #");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Load every set once so search can span all of them.
  useEffect(() => {
    Promise.all(
      SETS.map((s, i) =>
        fetch(s.file)
          .then(r => r.text())
          .then(text => parseCSV(text).map(c => ({ ...c, __set: s.label, __setIdx: i, __color: s.color })))
          .catch(() => [] as any[])
      )
    ).then(perSet => {
      const map: Record<number, any[]> = {};
      perSet.forEach((rows, i) => { map[i] = rows; });
      setCardsBySet(map);
      setLoading(false);
    });
  }, []);

  // reset value-filters when the set scope changes (their options differ)
  useEffect(() => { setFilterTreatment("All"); setFilterWeapon("All"); }, [scope]);

  const allCards = Object.values(cardsBySet).flat();
  const cards = scope === "all" ? allCards : (cardsBySet[scope] || []);
  const activeColor = scope === "all" ? C.purple : SETS[scope].color;
  const showSetCol = scope === "all";

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }

  const treatments = ["All", ...Array.from(new Set(cards.map((c: any) => c.Treatment).filter(Boolean))).sort()];
  const weapons = ["All", ...Array.from(new Set(cards.map((c: any) => c.Weapon).filter(Boolean))).sort()];

  const filtered = cards.filter((c: any) => {
    const q = search.toLowerCase().trim();
    const combined = [c["Card #"], c.Hero, c["Athlete Inspiration"], c.Variation, c.Treatment, c.Weapon, c.Power, c.__set].join(" ").toLowerCase();
    const matchSearch = !q || q.split(" ").filter(Boolean).every((word: string) => combined.includes(word));
    const matchTreatment = filterTreatment === "All" || c.Treatment === filterTreatment;
    const matchWeapon = filterWeapon === "All" || c.Weapon === filterWeapon;
    return matchSearch && matchTreatment && matchWeapon;
  });

  const sorted = [...filtered].sort((a: any, b: any) => {
    const aVal = a[sortCol] ?? "";
    const bVal = b[sortCol] ?? "";
    if (sortCol === "Power") return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    if (sortCol === "Card #") {
      const parse = (v: string) => {
        const n = parseInt(String(v).replace(/\D/g, ""));
        return isNaN(n) ? 9999 : n + (String(v).startsWith("P") ? 10000 : 0);
      };
      return sortDir === "asc" ? parse(aVal) - parse(bVal) : parse(bVal) - parse(aVal);
    }
    return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
  });

  function SortTh({ col, label }: { col: string; label: string }) {
    const active = sortCol === col;
    return (
      <th onClick={() => handleSort(col)} style={{
        padding: "10px 14px", textAlign: "left", color: active ? activeColor : C.fainter,
        fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px",
        borderBottom: `1px solid ${C.border}`, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
      }}>
        {label} {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
      </th>
    );
  }

  const inputStyle: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 14px", fontSize: 13, color: C.text, outline: "none", width: "100%", boxSizing: "border-box" };
  const selectStyle: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 14px", fontSize: 13, color: C.text, outline: "none", cursor: "pointer", boxSizing: "border-box" };

  const scopeBtns: { key: "all" | number; label: string; color: string }[] = [
    { key: "all", label: "All sets", color: C.purple },
    ...SETS.map((s, i) => ({ key: i as number, label: s.label, color: s.color })),
  ];

  const SetBadge = ({ c }: { c: any }) => (
    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: (c.__color || "#333") + "22", color: c.__color || "#aaa", whiteSpace: "nowrap" }}>{c.__set}</span>
  );

  return (
    <Page title="Bo Jackson Battle Arena" subtitle={loading ? "Loading checklists…" : `${cards.length.toLocaleString()} cards · ${filtered.length.toLocaleString()} showing`}>
      <style>{`
        .cards-table-wrap { display: block; }
        .cards-mobile-list { display: none; }
        .cards-filter-row { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .cards-selects { display: flex; gap: 12px; }
        @media (max-width: 768px) {
          .cards-table-wrap { display: none; }
          .cards-mobile-list { display: flex; flex-direction: column; gap: 8px; }
          .cards-filter-row { flex-direction: column; gap: 8px; }
          .cards-selects { flex-direction: row; gap: 8px; }
          .cards-selects select { flex: 1; }
        }
      `}</style>

      {/* Set scope */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${scopeBtns.length}, 1fr)`, gap: 8, marginBottom: 16 }}>
        {scopeBtns.map(b => {
          const on = scope === b.key;
          return (
            <button key={String(b.key)} onClick={() => setScope(b.key)} style={{
              padding: "8px 4px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${on ? b.color : C.border}`, background: on ? b.color + "22" : C.surface, color: on ? b.color : C.faint,
            }}>{b.label}</button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="cards-filter-row">
        <input style={{ ...inputStyle, flex: 1 }} placeholder={scope === "all" ? "🔍 Search all sets by hero, athlete, card #, weapon…" : "🔍 Search this set…"} value={search} onChange={e => setSearch(e.target.value)} />
        <div className="cards-selects">
          <select style={selectStyle} value={filterTreatment} onChange={e => setFilterTreatment(e.target.value)}>
            {treatments.map(t => <option key={t} value={t}>{t === "All" ? "All treatments" : t}</option>)}
          </select>
          <select style={selectStyle} value={filterWeapon} onChange={e => setFilterWeapon(e.target.value)}>
            {weapons.map(w => <option key={w} value={w}>{w === "All" ? "All weapons" : w}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ color: C.faint }}>Loading checklists…</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="cards-table-wrap">
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ overflowX: "auto", maxHeight: "70vh", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                    <tr style={{ background: C.surface2 }}>
                      <SortTh col="Card #" label="#" />
                      <SortTh col="Hero" label="Hero" />
                      <SortTh col="Athlete Inspiration" label="Athlete" />
                      <SortTh col="Variation" label="Variation" />
                      <SortTh col="Treatment" label="Treatment" />
                      <SortTh col="Weapon" label="Weapon" />
                      <SortTh col="Power" label="Power" />
                      {showSetCol && <SortTh col="__set" label="Set" />}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.slice(0, 500).map((c: any, i: number) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border2}` }}>
                        <td style={{ padding: "11px 14px", color: C.faint, fontFamily: "monospace" }}>{c["Card #"]}</td>
                        <td style={{ padding: "11px 14px", color: C.text, fontWeight: 600 }}>{c.Hero}</td>
                        <td style={{ padding: "11px 14px", color: activeColor }}>{c["Athlete Inspiration"]}</td>
                        <td style={{ padding: "11px 14px", color: C.muted }}>{c.Variation}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: C.faint }}>{c.Treatment}</td>
                        <td style={{ padding: "11px 14px" }}>
                          {c.Weapon && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: (weaponColors[c.Weapon] || "#333") + "22", color: weaponColors[c.Weapon] || "#aaa" }}>{c.Weapon}</span>}
                        </td>
                        <td style={{ padding: "11px 14px", color: C.green, fontWeight: 600 }}>{c.Power}</td>
                        {showSetCol && <td style={{ padding: "11px 14px" }}><SetBadge c={c} /></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length > 500 && (
                <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.faint, textAlign: "center" }}>
                  Showing first 500 of {filtered.length.toLocaleString()} — narrow with search or filters
                </div>
              )}
            </div>
          </div>

          {/* Mobile card list */}
          <div className="cards-mobile-list">
            {sorted.slice(0, 500).map((c: any, i: number) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", width: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{c.Hero}</div>
                    <div style={{ fontSize: 13, color: activeColor, marginTop: 2 }}>{c["Athlete Inspiration"]}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: C.faint, fontFamily: "monospace" }}>{c["Card #"]}</div>
                    {c.Power && <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginTop: 2 }}>⚡{c.Power}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {c.Weapon && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: (weaponColors[c.Weapon] || "#333") + "22", color: weaponColors[c.Weapon] || "#aaa" }}>{c.Weapon}</span>}
                  {c.Treatment && <span style={{ fontSize: 11, color: C.faint, padding: "2px 8px", borderRadius: 20, background: "#1a1a1a" }}>{c.Treatment}</span>}
                  {c.Variation && <span style={{ fontSize: 11, color: C.muted }}>{c.Variation}</span>}
                  {showSetCol && <SetBadge c={c} />}
                </div>
              </div>
            ))}
            {filtered.length > 500 && (
              <div style={{ padding: 12, fontSize: 12, color: C.faint, textAlign: "center" }}>Showing first 500 of {filtered.length.toLocaleString()} — narrow with search or filters</div>
            )}
          </div>
        </>
      )}
    </Page>
  );
}
