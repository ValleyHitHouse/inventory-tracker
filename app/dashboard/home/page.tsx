"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const [i, b, l, p] = await Promise.all([
        supabase.from("Inventory").select("*").order("id"),
        supabase.from("Breaks").select("*").order("date", { ascending: false }),
        supabase.from("lotcomps").select("*").order("created_at", { ascending: false }),
        supabase.from("payouts").select("*"),
      ]);
      if (i.data) setInv(i.data);
      if (b.data) setBreaks(b.data);
      if (l.data) setLots(l.data);
      if (p.data) setPayouts(p.data);
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
        @media (max-width: 820px) {
          .cc-actions { grid-template-columns: 1fr 1fr; }
          .cc-money { grid-template-columns: 1fr 1fr; }
          .cc-week { grid-template-columns: 1fr 1fr; }
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
          <StatTile label="This week net" value={money0(wkProfit)} color={wkProfit >= 0 ? C.green : C.red} sub={`${thisWeek.length} break${thisWeek.length === 1 ? "" : "s"} · ${money0(wkRevenue)} rev`} onClick={() => router.push("/dashboard/recap")} />
        </div>
      </Section>

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
