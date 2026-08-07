"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/db";
import { Page, Section, StatTile, Badge, LinkButton, AlertRow, C } from "@/components/ui";

function money0(n: number) { return "$" + Math.round(n).toLocaleString(); }
function money(n: number) { return "$" + n.toFixed(2); }

function invStatus(units: number, per: number) {
  if (units <= 0) return { key: "out", label: "Out of stock", color: C.red };
  const low = per > 1 ? per : 20;
  if (units <= low) return { key: "low", label: "Low stock", color: C.orange };
  return { key: "in", label: "In stock", color: C.green };
}

export default function CashPage() {
  const [breaks, setBreaks] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [inv, setInv] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const [b, p, s, i] = await Promise.all([
        supabase.from("Breaks").select("date, imc_take, valley_take, commission_amount, commission_paid, breaker"),
        supabase.from("payouts").select("*"),
        fetchAll(() => supabase.from("break_shipments").select("shipper_name, pay_amount, paid")),
        supabase.from("Inventory").select("*").order("id"),
      ]);
      if (b.data) setBreaks(b.data);
      if (p.data) setPayouts(p.data);
      setShipments(s);
      if (i.data) setInv(i.data);
      setLoading(false);
    }
    load();
  }, []);

  // ── BOBA / Valley owed (monthly, from payouts ledger) ──
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
  const valleyByMonth: [string, number][] = [];
  for (const m of Object.keys(monthly).sort((a, z) => z.localeCompare(a))) {
    if (!payMap[m]?.boba_paid_at) bobaOwed += monthly[m].boba;
    if (!payMap[m]?.valley_paid_at) { valleyOwed += monthly[m].valley; valleyByMonth.push([m, monthly[m].valley]); }
  }

  // ── Commission owed by breaker ──
  const commByBreaker: Record<string, number> = {};
  breaks.forEach(b => {
    if (b.commission_paid) return;
    const c = parseFloat(b.commission_amount || "0");
    if (c > 0 && b.breaker) commByBreaker[b.breaker] = (commByBreaker[b.breaker] || 0) + c;
  });
  const commList = Object.entries(commByBreaker).sort((a, b) => b[1] - a[1]);
  const commOwed = commList.reduce((s, [, v]) => s + v, 0);

  // ── Shipper pay owed ──
  const shipByPerson: Record<string, number> = {};
  shipments.forEach(s => {
    if (s.paid) return;
    const v = parseFloat(s.pay_amount || "0");
    if (v > 0 && s.shipper_name) shipByPerson[s.shipper_name] = (shipByPerson[s.shipper_name] || 0) + v;
  });
  const shipList = Object.entries(shipByPerson).sort((a, b) => b[1] - a[1]);
  const shipOwed = shipList.reduce((s, [, v]) => s + v, 0);

  const oweOut = bobaOwed + commOwed + shipOwed;

  // ── Reorder (low/out supplies) ──
  const reorder = inv.filter(x => {
    const q = Number(x.quantity) || 0;
    const per = Number(x.units_per_pack) > 1 ? Number(x.units_per_pack) : 20;
    return q <= 0 || q <= per;
  });

  function fmtMonth(m: string) {
    const [y, mo] = m.split("-");
    return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  if (loading) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: C.faint }}>Loading…</p>
    </div>
  );

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <Page title="Cash position" subtitle={`As of ${today}`}>
      <style>{`
        .cash-top { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 16px; }
        .cash-split { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 820px) { .cash-top { grid-template-columns: 1fr; } .cash-split { grid-template-columns: 1fr; } }
      `}</style>

      {/* Headline */}
      <div className="cash-top">
        <StatTile label="You owe out" value={money0(oweOut)} color={oweOut > 0 ? C.orange : C.green}
          sub={`BOBA ${money0(bobaOwed)} · commissions ${money0(commOwed)} · shippers ${money0(shipOwed)}`} />
        <StatTile label="Valley cut pending" value={money0(valleyOwed)} color={valleyOwed > 0 ? C.blue : C.green}
          sub={valleyOwed > 0 ? "Your 30%, not yet settled" : "All settled"} />
        <StatTile label="Supplies to reorder" value={reorder.length} color={reorder.length > 0 ? C.orange : C.green}
          sub={reorder.length > 0 ? "Low or out of stock" : "All stocked"} onClick={() => router.push("/dashboard/inventory")} />
      </div>

      {/* Owe out breakdown */}
      <Section title="You owe out" right={oweOut === 0 ? <Badge color={C.green}>All clear</Badge> : <span style={{ fontSize: 13, fontWeight: 700, color: C.orange }}>{money(oweOut)}</span>}>
        {oweOut === 0 ? (
          <p style={{ color: C.green, fontSize: 13, margin: 0 }}>Nothing outstanding. Everyone&apos;s paid.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {bobaOwed > 0 && (
              <AlertRow badge="BOBA" badgeColor={C.orange} title="Partner share (70%)" meta="across unpaid months"
                right={<span style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 14, fontWeight: 700, color: C.orange }}>{money(bobaOwed)}</span><LinkButton href="/dashboard/analytics" size="sm">Ledger</LinkButton></span>} />
            )}
            {commList.map(([b, v]) => (
              <AlertRow key={`c${b}`} badge="Commission" badgeColor={C.purple} title={b} meta="breaker commission"
                right={<span style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 14, fontWeight: 700, color: C.purple }}>{money(v)}</span><LinkButton href="/dashboard/payroll" size="sm">Pay</LinkButton></span>} />
            ))}
            {shipList.map(([s, v]) => (
              <AlertRow key={`s${s}`} badge="Shipper" badgeColor={C.blue} title={s} meta="shipping pay"
                right={<span style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>{money(v)}</span><LinkButton href="/dashboard/payroll" size="sm">Pay</LinkButton></span>} />
            ))}
          </div>
        )}
      </Section>

      <div className="cash-split">
        {/* Valley pending */}
        <Section title="Valley cut pending" style={{ marginBottom: 0 }} right={<LinkButton href="/dashboard/analytics" size="sm">Ledger</LinkButton>}>
          {valleyByMonth.length === 0 ? (
            <p style={{ color: C.green, fontSize: 13, margin: 0 }}>All settled.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {valleyByMonth.map(([m, v]) => (
                <div key={m} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: C.surface2, borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: C.text }}>{fmtMonth(m)}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.blue }}>{money(v)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", marginTop: 2 }}>
                <span style={{ fontSize: 12, color: C.faint }}>Total pending</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>{money(valleyOwed)}</span>
              </div>
            </div>
          )}
        </Section>

        {/* Reorder */}
        <Section title={`Reorder${reorder.length ? ` · ${reorder.length}` : ""}`} style={{ marginBottom: 0 }} right={<LinkButton href="/dashboard/inventory" size="sm">Inventory</LinkButton>}>
          {reorder.length === 0 ? (
            <p style={{ color: C.green, fontSize: 13, margin: 0 }}>Everything&apos;s stocked.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {reorder.slice(0, 8).map(x => {
                const q = Number(x.quantity) || 0;
                const st = invStatus(q, Number(x.units_per_pack) > 1 ? Number(x.units_per_pack) : 20);
                const link = x.reorder?.startsWith("http") ? x.reorder : x.reorder ? `https://${x.reorder}` : null;
                return (
                  <div key={x.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 10px", background: C.surface2, borderRadius: 8 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <Badge color={st.color}>{st.label}</Badge>
                      <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{x.name}</span>
                    </span>
                    {link
                      ? <a href={link} target="_blank" style={{ fontSize: 12, color: C.blue, textDecoration: "none", fontWeight: 600 }}>Reorder ↗</a>
                      : <span style={{ fontSize: 11, color: C.muted2 }}>{q} on hand</span>}
                  </div>
                );
              })}
              {reorder.length > 8 && <div style={{ fontSize: 11, color: C.faint }}>+{reorder.length - 8} more on the Inventory page</div>}
            </div>
          )}
        </Section>
      </div>
    </Page>
  );
}
