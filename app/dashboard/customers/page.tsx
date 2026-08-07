"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/db";
import { zipToState, stateFromAddress, STATE_NAMES } from "@/lib/zipState";
import { US_STATE_PATHS, US_VIEWBOX } from "@/lib/usStatePaths";
import { Page, Section, StatTile, Badge, C } from "@/components/ui";

function money0(n: number) { return "$" + Math.round(n).toLocaleString(); }
function daysSince(d?: string | null) { if (!d) return Infinity; return (Date.now() - new Date(d + "T12:00:00").getTime()) / 86400000; }

// tiers by lifetime spend
function tierOf(spend: number) {
  if (spend >= 1000) return { key: "whale", label: "Whale", color: C.purple };
  if (spend >= 500) return { key: "vip", label: "VIP", color: C.blue };
  if (spend >= 150) return { key: "regular", label: "Regular", color: C.green };
  return { key: "casual", label: "Casual", color: C.muted2 };
}

function lerpHex(a: string, b: string, t: number) {
  const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
  const ar = ah >> 16, ag = (ah >> 8) & 255, ab = ah & 255;
  const br = bh >> 16, bg = (bh >> 8) & 255, bb = bh & 255;
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const [orders, breaksRes] = await Promise.all([
        fetchAll(() => supabase.from("BreakOrders").select("buyer_username, shipping_address, price, break_id, postal_code").eq("cancelled", false).gt("price", 0)),
        supabase.from("Breaks").select("id, date"),
      ]);
      const breakDate: Record<string, string> = {};
      for (const b of breaksRes.data || []) breakDate[String(b.id)] = b.date;

      const map: Record<string, any> = {};
      for (const o of orders) {
        const key = o.buyer_username;
        if (!key) continue;
        if (!map[key]) map[key] = { username: key, total_spent: 0, order_count: 0, breaks: new Set(), last: null, postal_code: o.postal_code, shipping_address: o.shipping_address };
        const c = map[key];
        c.total_spent += parseFloat(o.price || "0");
        c.order_count += 1;
        c.breaks.add(o.break_id);
        if (o.postal_code && !c.postal_code) c.postal_code = o.postal_code;
        if (o.shipping_address && !c.shipping_address) c.shipping_address = o.shipping_address;
        const d = breakDate[String(o.break_id)];
        if (d && (!c.last || d > c.last)) c.last = d;
      }
      const arr = Object.values(map).map((c: any) => ({
        ...c,
        breaks: c.breaks.size,
        state: zipToState(c.postal_code) || stateFromAddress(c.shipping_address),
      })).sort((a, b) => b.total_spent - a.total_spent);
      setCustomers(arr);
      setLoading(false);
    }
    load();
  }, []);

  // aggregates
  const totalRevenue = customers.reduce((s, c) => s + c.total_spent, 0);
  const repeat = customers.filter(c => c.breaks >= 2).length;
  const tierCounts = { whale: 0, vip: 0, regular: 0, casual: 0 } as Record<string, number>;
  customers.forEach(c => { tierCounts[tierOf(c.total_spent).key]++; });

  // quiet whales: high spenders who haven't bought in 30+ days
  const quiet = customers.filter(c => c.total_spent >= 500 && daysSince(c.last) > 30).slice(0, 8);

  // per-state spend for the map
  const byState: Record<string, { spend: number; buyers: number }> = {};
  customers.forEach(c => {
    if (!c.state) return;
    (byState[c.state] ||= { spend: 0, buyers: 0 });
    byState[c.state].spend += c.total_spent;
    byState[c.state].buyers += 1;
  });
  const maxStateSpend = Math.max(...Object.values(byState).map(s => s.spend), 1);
  const topStates = Object.entries(byState).sort((a, b) => b[1].spend - a[1].spend).slice(0, 8);
  const colorFor = (spend: number) => spend <= 0 ? "#161616" : lerpHex("#10281c", "#4ade80", Math.sqrt(spend / maxStateSpend));

  const filtered = customers.filter(c =>
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    (c.state || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: C.faint }}>Loading…</p>
    </div>
  );

  const inputStyle: React.CSSProperties = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: C.text, outline: "none", minWidth: 220 };

  return (
    <Page title="Customers" subtitle={`${customers.length} buyers tracked`}>
      <style>{`
        .cu-grid4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
        .cu-map { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; }
        .cu-row { display: grid; grid-template-columns: 2fr 0.8fr 0.7fr 0.7fr 1fr; gap: 10px; align-items: center; padding: 11px 12px; border-bottom: 1px solid ${C.border2}; }
        .cu-head { display: grid; grid-template-columns: 2fr 0.8fr 0.7fr 0.7fr 1fr; gap: 10px; padding: 8px 12px; border-bottom: 1px solid ${C.border}; }
        @media (max-width: 820px) {
          .cu-grid4 { grid-template-columns: 1fr 1fr; }
          .cu-map { grid-template-columns: 1fr; }
          .cu-head { display: none; }
          .cu-row { grid-template-columns: 1fr 1fr; gap: 4px 10px; }
          .cu-row .cu-name { grid-column: 1 / -1; }
          .cu-num::before { content: attr(data-l); display:block; font-size:10px; color:${C.faint}; text-transform:uppercase; letter-spacing:.4px; }
        }
      `}</style>

      {/* Overview */}
      <div className="cu-grid4" style={{ marginBottom: 16 }}>
        <StatTile label="Total customers" value={customers.length} color={C.text} />
        <StatTile label="Tracked revenue" value={money0(totalRevenue)} color={C.green} />
        <StatTile label="Repeat buyers" value={repeat} color={C.blue} sub={`${customers.length ? Math.round((repeat / customers.length) * 100) : 0}% of buyers`} />
        <StatTile label="Whales" value={tierCounts.whale} color={C.purple} sub="$1k+ lifetime" />
      </div>

      {/* Whale tracker */}
      <Section title="Whale tracker">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {[{ k: "whale", l: "Whale", c: C.purple, d: "$1,000+" }, { k: "vip", l: "VIP", c: C.blue, d: "$500–999" }, { k: "regular", l: "Regular", c: C.green, d: "$150–499" }, { k: "casual", l: "Casual", c: C.muted2, d: "under $150" }].map(t => (
            <div key={t.k} style={{ flex: "1 1 140px", background: C.surface2, border: `1px solid ${t.c}22`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 8, background: t.c }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t.l}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: t.c, marginTop: 6 }}>{tierCounts[t.k]}</div>
              <div style={{ fontSize: 11, color: C.faint }}>{t.d}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, color: C.faint, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>
          🐋 Quiet whales <span style={{ color: C.fainter }}>· big spenders who haven&apos;t bought in 30+ days</span>
        </div>
        {quiet.length === 0 ? (
          <p style={{ color: C.green, fontSize: 13, margin: 0 }}>None. Every $500+ buyer has ordered recently.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {quiet.map(c => (
              <div key={c.username} onClick={() => router.push(`/customers/${encodeURIComponent(c.username)}`)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: C.surface2, borderRadius: 8, cursor: "pointer", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge color={tierOf(c.total_spent).color}>{tierOf(c.total_spent).label}</Badge>
                  <span style={{ fontSize: 13, color: C.purple, fontWeight: 600 }}>{c.username}</span>
                  {c.state && <span style={{ fontSize: 11, color: C.muted2 }}>{c.state}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 12, color: C.faint }}>last seen {daysSince(c.last) === Infinity ? "—" : `${Math.round(daysSince(c.last))}d ago`}</span>
                  <span style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>{money0(c.total_spent)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Map */}
      <Section title="Where your buyers are">
        <div className="cu-map">
          <div>
            <svg viewBox={US_VIEWBOX} style={{ width: "100%", height: "auto", display: "block" }}>
              {Object.entries(US_STATE_PATHS).map(([ab, d]) => (
                <path key={ab} d={d} fill={colorFor(byState[ab]?.spend || 0)} stroke={C.bg} strokeWidth={1}>
                  <title>{STATE_NAMES[ab] || ab}: {money0(byState[ab]?.spend || 0)} · {byState[ab]?.buyers || 0} buyer{(byState[ab]?.buyers || 0) === 1 ? "" : "s"}</title>
                </path>
              ))}
            </svg>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 11, color: C.faint }}>
              <span>Less</span>
              <div style={{ flex: 1, maxWidth: 160, height: 8, borderRadius: 4, background: `linear-gradient(90deg, #10281c, ${C.green})` }} />
              <span>More spend</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.faint, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 10 }}>Top states by spend</div>
            {topStates.length === 0 ? (
              <p style={{ color: C.faint, fontSize: 13 }}>No location data yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {topStates.map(([st, v]) => (
                  <div key={st}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: C.text }}>{STATE_NAMES[st] || st} <span style={{ color: C.faint }}>· {v.buyers}</span></span>
                      <span style={{ color: C.green, fontWeight: 600 }}>{money0(v.spend)}</span>
                    </div>
                    <div style={{ height: 6, background: C.border2, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${(v.spend / maxStateSpend) * 100}%`, height: "100%", background: C.green }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.fainter, marginTop: 12 }}>Location is derived from each buyer&apos;s shipping ZIP. Buyers with no shipping data aren&apos;t placed.</div>
      </Section>

      {/* Directory */}
      <Section title="Directory" right={<input style={inputStyle} placeholder="Search buyer or state…" value={search} onChange={e => setSearch(e.target.value)} />}>
        <div className="cu-head">
          <div style={{ fontSize: 11, color: C.fainter, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px" }}>Buyer</div>
          <div style={{ fontSize: 11, color: C.green, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", textAlign: "right" }}>Spent</div>
          <div style={{ fontSize: 11, color: C.fainter, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", textAlign: "right" }}>Orders</div>
          <div style={{ fontSize: 11, color: C.fainter, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", textAlign: "right" }}>Breaks</div>
          <div style={{ fontSize: 11, color: C.fainter, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", textAlign: "right" }}>Last seen</div>
        </div>
        {filtered.slice(0, 100).map((c, i) => {
          const t = tierOf(c.total_spent);
          const ds = daysSince(c.last);
          return (
            <div key={c.username} className="cu-row" onClick={() => router.push(`/customers/${encodeURIComponent(c.username)}`)} style={{ cursor: "pointer" }}>
              <div className="cu-name" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 11, color: C.fainter, fontWeight: 700, minWidth: 22 }}>#{i + 1}</span>
                <Badge color={t.color}>{t.label}</Badge>
                <span style={{ fontSize: 13, color: C.purple, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.username}</span>
                {c.state && <span style={{ fontSize: 11, color: C.muted2 }}>{c.state}</span>}
              </div>
              <div className="cu-num" data-l="Spent" style={{ textAlign: "right", fontSize: 13, color: C.green, fontWeight: 600 }}>{money0(c.total_spent)}</div>
              <div className="cu-num" data-l="Orders" style={{ textAlign: "right", fontSize: 13, color: C.muted }}>{c.order_count}</div>
              <div className="cu-num" data-l="Breaks" style={{ textAlign: "right", fontSize: 13, color: C.muted }}>{c.breaks}</div>
              <div className="cu-num" data-l="Last seen" style={{ textAlign: "right", fontSize: 12, color: ds > 30 ? C.orange : C.muted2 }}>{ds === Infinity ? "—" : `${Math.round(ds)}d`}</div>
            </div>
          );
        })}
        {filtered.length > 100 && <div style={{ fontSize: 11, color: C.faint, marginTop: 10 }}>Showing top 100 of {filtered.length}. Search to narrow.</div>}
        {filtered.length === 0 && <p style={{ color: C.faint, fontSize: 13, margin: "12px 0 0" }}>No buyers match.</p>}
      </Section>
    </Page>
  );
}
