"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/db";
import { Page, Section, StatTile, LinkButton, AlertRow, C } from "@/components/ui";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0);
  return x;
}
function money0(n: number) { return "$" + Math.round(n).toLocaleString(); }

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [inv, setInv] = useState<any[]>([]);
  const [breaks, setBreaks] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const [i, b, l, p, o] = await Promise.all([
        supabase.from("Inventory").select("*").order("id"),
        supabase.from("Breaks").select("*").order("date", { ascending: false }),
        supabase.from("lotcomps").select("*").order("created_at", { ascending: false }),
        supabase.from("payouts").select("*"),
        fetchAll(() => supabase.from("BreakOrders").select("buyer_username, price, break_id").eq("cancelled", false)),
      ]);
      if (i.data) setInv(i.data);
      if (b.data) setBreaks(b.data);
      if (l.data) setLots(l.data);
      if (p.data) setPayouts(p.data);
      setOrders(o);
      setLoading(false);
    }
    load();
  }, []);

  // ── Needs action ────────────────────────────────
  const reorder = inv.filter(x => {
    const q = Number(x.quantity) || 0;
    const per = Number(x.units_per_pack) > 1 ? Number(x.units_per_pack) : 20;
    return q <= 0 || q <= per;
  });
  const unsubmitted = breaks.filter(b => !b.boba_submitted);
  const pendingLots = lots.filter(l => l.status === "pending");

  // ── Money owed ──────────────────────────────────
  const monthly: Record<string, { boba: number; valley: number }> = {};
  for (const b of breaks) {
    if (!b.date) continue;
    const m = b.date.slice(0, 7);
    (monthly[m] ||= { boba: 0, valley: 0 });
    monthly[m].boba += parseFloat(b.imc_take || "0");
    monthly[m].valley += parseFloat(b.valley_take || "0");
  }
  const payMap: Record<string, any> = {};
  for (const p of payouts) payMap[p.month] = p;
  let bobaOwed = 0, valleyOwed = 0;
  for (const m of Object.keys(monthly)) {
    if (!payMap[m]?.boba_paid_at) bobaOwed += monthly[m].boba;
    if (!payMap[m]?.valley_paid_at) valleyOwed += monthly[m].valley;
  }
  const commissionOwed = breaks.filter(b => !b.commission_paid).reduce((s, b) => s + parseFloat(b.commission_amount || "0"), 0);

  // ── This week ───────────────────────────────────
  const now = new Date();
  const wkStart = startOfWeek(now);
  const wkEnd = new Date(wkStart); wkEnd.setDate(wkEnd.getDate() + 7);
  const thisWeek = breaks.filter(b => {
    if (!b.date) return false;
    const t = new Date(b.date + "T12:00:00").getTime();
    return t >= wkStart.getTime() && t < wkEnd.getTime();
  });
  const wkRevenue = thisWeek.reduce((s, b) => s + parseFloat(b.revenue || "0"), 0);
  const wkProfit = thisWeek.reduce((s, b) => s + parseFloat(b.net_profit || "0"), 0);
  const lastBreak = breaks[0];

  // last week (for deltas)
  const lwStart = new Date(wkStart); lwStart.setDate(lwStart.getDate() - 7);
  const lastWeek = breaks.filter(b => {
    if (!b.date) return false;
    const t = new Date(b.date + "T12:00:00").getTime();
    return t >= lwStart.getTime() && t < wkStart.getTime();
  });
  const lwRevenue = lastWeek.reduce((s, b) => s + parseFloat(b.revenue || "0"), 0);
  const lwProfit = lastWeek.reduce((s, b) => s + parseFloat(b.net_profit || "0"), 0);

  // momentum: last 10 breaks, oldest → newest
  const momentum = [...breaks].filter(b => b.date).slice(0, 10).reverse();
  const momoMax = Math.max(...momentum.map(b => parseFloat(b.revenue || "0")), 1);

  // top buyer this week
  const wkIds = new Set(thisWeek.map(b => String(b.id)));
  const wkBuyer: Record<string, number> = {};
  orders.forEach(o => {
    if (!wkIds.has(String(o.break_id))) return;
    const p = parseFloat(o.price || "0");
    if (p > 0 && o.buyer_username) wkBuyer[o.buyer_username] = (wkBuyer[o.buyer_username] || 0) + p;
  });
  const topBuyer = Object.entries(wkBuyer).sort((a, b) => b[1] - a[1])[0];

  const deltaNode = (cur: number, prev: number) => {
    if (prev === 0 && cur === 0) return <span style={{ color: C.faint }}>no change vs last wk</span>;
    const diff = cur - prev;
    const pct = prev !== 0 ? (diff / Math.abs(prev)) * 100 : 100;
    const up = diff >= 0;
    return <span style={{ color: diff === 0 ? C.faint : up ? C.green : C.red }}>{up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}% vs last wk</span>;
  };

  const actionCount = reorder.length + unsubmitted.length + pendingLots.length;

  const quickActions = [
    { label: "Run a break", desc: "Log a new break", href: "/dashboard/breaks", accent: C.orange, icon: "🎴" },
    { label: "Restock", desc: "Check & reorder supplies", href: "/dashboard/inventory", accent: C.green, icon: "📦" },
    { label: "Get paid", desc: "Payroll", href: "/dashboard/payroll", accent: C.blue, icon: "💰" },
    { label: "Review week", desc: "Weekly recap", href: "/dashboard/recap", accent: C.purple, icon: "🗓️" },
  ];

  if (loading) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: C.faint }}>Loading…</p>
    </div>
  );

  const fmtDate = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <Page title="Command center" subtitle={fmtDate}>
      <style>{`
        .cc-actions { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 16px; }
        .cc-money { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
        .cc-week { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
        .cc-split { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; margin-bottom: 16px; }
        @media (max-width: 820px) {
          .cc-actions { grid-template-columns: 1fr 1fr; }
          .cc-money { grid-template-columns: 1fr 1fr; }
          .cc-week { grid-template-columns: 1fr 1fr; }
          .cc-split { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Quick actions */}
      <div className="cc-actions">
        {quickActions.map(a => (
          <div key={a.href} onClick={() => router.push(a.href)} style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", cursor: "pointer",
            display: "flex", flexDirection: "column", gap: 6, transition: "border-color .15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = a.accent + "66")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
            <div style={{ fontSize: 22 }}>{a.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{a.label}</div>
            <div style={{ fontSize: 12, color: C.faint }}>{a.desc}</div>
          </div>
        ))}
      </div>

      {/* Money position */}
      <Section title="Money" right={<LinkButton href="/dashboard/analytics" size="sm">Open ledger</LinkButton>}>
        <div className="cc-money">
          <StatTile label="Valley owed" value={money0(valleyOwed)} color={valleyOwed > 0 ? C.blue : C.green} sub={valleyOwed > 0 ? "Unpaid" : "Settled"} onClick={() => router.push("/dashboard/analytics")} />
          <StatTile label="BOBA owed" value={money0(bobaOwed)} color={bobaOwed > 0 ? C.orange : C.green} sub={bobaOwed > 0 ? "Unpaid" : "Settled"} onClick={() => router.push("/dashboard/analytics")} />
          <StatTile label="Commission owed" value={money0(commissionOwed)} color={commissionOwed > 0 ? C.purple : C.green} sub={commissionOwed > 0 ? "To breakers" : "All paid"} onClick={() => router.push("/dashboard/analytics")} />
          <StatTile label="This week net" value={money0(wkProfit)} color={wkProfit >= 0 ? C.green : C.red} sub={deltaNode(wkProfit, lwProfit)} onClick={() => router.push("/dashboard/recap")} />
        </div>
      </Section>

      {/* Momentum + top buyer */}
      <div className="cc-split">
        <Section title="Momentum" style={{ marginBottom: 0 }} right={<LinkButton href="/dashboard/analytics" size="sm">Analytics</LinkButton>}>
          {momentum.length === 0 ? (
            <p style={{ color: C.faint, fontSize: 13, margin: 0 }}>No breaks yet.</p>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 90, marginBottom: 12 }}>
                {momentum.map((b, i) => {
                  const rev = parseFloat(b.revenue || "0");
                  const prof = parseFloat(b.net_profit || "0");
                  const h = Math.max((rev / momoMax) * 84, 4);
                  return (
                    <div key={i} onClick={() => router.push(`/breaks/${b.id}`)} title={`${b.box_name || b.date} · ${money0(rev)}`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", cursor: "pointer" }}>
                      <div style={{ height: h, borderRadius: "4px 4px 0 0", background: prof >= 0 ? "linear-gradient(180deg,#a78bfa,#7c3aed)" : "linear-gradient(180deg,#f87171,#dc2626)" }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <div><span style={{ color: C.faint }}>Revenue </span><span style={{ color: C.green, fontWeight: 600 }}>{money0(wkRevenue)}</span> {deltaNode(wkRevenue, lwRevenue)}</div>
                <div><span style={{ color: C.faint }}>Net </span><span style={{ color: C.purple, fontWeight: 600 }}>{money0(wkProfit)}</span></div>
              </div>
              <div style={{ fontSize: 10, color: C.fainter, marginTop: 8 }}>Last {momentum.length} breaks · purple = profit, red = loss</div>
            </>
          )}
        </Section>

        <Section title="Top buyer this week" style={{ marginBottom: 0 }} right={<LinkButton href="/dashboard/customers" size="sm">Customers</LinkButton>}>
          {!topBuyer ? (
            <p style={{ color: C.faint, fontSize: 13, margin: 0 }}>No orders logged this week yet.</p>
          ) : (
            <div onClick={() => router.push(`/customers/${encodeURIComponent(topBuyer[0])}`)} style={{ cursor: "pointer" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.purple, marginBottom: 2 }}>{topBuyer[0]}</div>
              <div style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>{money0(topBuyer[1])} <span style={{ color: C.faint, fontWeight: 400 }}>spent this week</span></div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(wkBuyer).sort((a, b) => b[1] - a[1]).slice(1, 4).map(([u, v]) => (
                  <div key={u} onClick={(e) => { e.stopPropagation(); router.push(`/customers/${encodeURIComponent(u)}`); }} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
                    <span>{u}</span><span style={{ color: C.green }}>{money0(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Needs action */}
      <Section title={`Needs action${actionCount > 0 ? ` · ${actionCount}` : ""}`}>
        {actionCount === 0 ? (
          <p style={{ color: C.green, fontSize: 13, margin: 0 }}>All clear. Nothing needs your attention right now.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {unsubmitted.slice(0, 4).map(b => (
              <AlertRow key={`b${b.id}`} badge="BOBA" badgeColor={C.orange} title={b.box_name || b.date} meta={`${b.date} · not submitted`}
                right={<LinkButton href={`/breaks/${b.id}`} size="sm" accent={C.orange} variant="accent">Submit</LinkButton>} />
            ))}
            {reorder.slice(0, 5).map(x => {
              const q = Number(x.quantity) || 0;
              const st = q <= 0 ? { l: "Out of stock", c: C.red } : { l: "Low stock", c: C.orange };
              const link = x.reorder?.startsWith("http") ? x.reorder : x.reorder ? `https://${x.reorder}` : null;
              return (
                <AlertRow key={`i${x.id}`} badge={st.l} badgeColor={st.c} title={x.name} meta={`${q} on hand`}
                  right={link
                    ? <a href={link} target="_blank" style={{ fontSize: 12, color: C.blue, textDecoration: "none", fontWeight: 600 }}>Reorder ↗</a>
                    : <LinkButton href="/dashboard/inventory" size="sm">Open</LinkButton>} />
              );
            })}
            {pendingLots.slice(0, 3).map(l => (
              <AlertRow key={`l${l.id}`} badge="Lot comp" badgeColor={C.purple} title={l.buyer_username || `Lot #${l.id}`} meta="pending acceptance"
                right={<LinkButton href="/dashboard/lot-comp" size="sm">Open</LinkButton>} />
            ))}
          </div>
        )}
      </Section>

      {/* Last break */}
      {lastBreak && (
        <Section title="Last break" right={<LinkButton href={`/breaks/${lastBreak.id}`} size="sm">View</LinkButton>}>
          <div className="cc-week">
            <StatTile label="Break" value={<span style={{ fontSize: 15 }}>{lastBreak.box_name || "—"}</span>} sub={lastBreak.date} />
            <StatTile label="Revenue" value={money0(parseFloat(lastBreak.revenue || "0"))} color={C.green} />
            <StatTile label="Net profit" value={money0(parseFloat(lastBreak.net_profit || "0"))} color={parseFloat(lastBreak.net_profit || "0") >= 0 ? C.purple : C.red} />
            <StatTile label="BOBA submitted" value={lastBreak.boba_submitted ? "Yes" : "No"} color={lastBreak.boba_submitted ? C.green : C.red} />
          </div>
        </Section>
      )}
    </Page>
  );
}
