"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: orders } = await supabase
        .from("BreakOrders")
        .select("buyer_username, shipping_address, price, break_id, postal_code")
        .eq("cancelled", false)
        .gt("price", 0);

      const { data: breaks } = await supabase.from("Breaks").select("id, date, box_name");

      if (!orders) return;

      const breakMap: Record<number, any> = {};
      for (const b of breaks || []) breakMap[b.id] = b;

      const map: Record<string, any> = {};
      for (const order of orders) {
        const key = order.buyer_username;
        if (!key) continue;
        if (!map[key]) {
          map[key] = {
            username: key,
            shipping_address: order.shipping_address || "—",
            postal_code: order.postal_code || "—",
            total_spent: 0,
            order_count: 0,
            last_break_date: null,
            break_count: new Set(),
          };
        }
        map[key].total_spent += parseFloat(order.price || "0");
        map[key].order_count += 1;
        map[key].break_count.add(order.break_id);
        const brk = breakMap[order.break_id];
        if (brk?.date && (!map[key].last_break_date || brk.date > map[key].last_break_date)) {
          map[key].last_break_date = brk.date;
        }
      }

      const sorted = Object.values(map)
        .map(c => ({ ...c, break_count: c.break_count.size }))
        .sort((a, b) => b.total_spent - a.total_spent);
      setCustomers(sorted);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = customers.filter(c =>
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    (c.shipping_address || "").toLowerCase().includes(search.toLowerCase())
  );

  const s = {
    shell: { background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" },
    content: { padding: 32, maxWidth: 1100, margin: "0 auto" },
    input: { background: "#111", border: "1px solid #222", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#e5e5e5", outline: "none", width: "100%", maxWidth: 320 },
    th: { padding: "10px 14px", textAlign: "left" as const, color: "#444", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".4px", borderBottom: "1px solid #1e1e1e" },
    td: { padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #161616" },
  };

  return (
    <div style={s.shell}>
      <div style={s.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Customers</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
              {loading ? "Loading..." : `${customers.length} unique buyers · click any row for full profile`}
            </p>
          </div>
          <input style={s.input} placeholder="🔍 Search by username or address..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? <p style={{ color: "#555" }}>Loading customers...</p> : filtered.length === 0 ? (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 48, textAlign: "center" }}>
            <p style={{ color: "#555", fontSize: 13 }}>{customers.length === 0 ? "No breaks logged yet — customers appear automatically when you log breaks." : "No customers match your search."}</p>
          </div>
        ) : (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#0f0f0f" }}>
                  <th style={s.th}>#</th>
                  <th style={s.th}>Username</th>
                  <th style={s.th}>Shipping address</th>
                  <th style={s.th}>Total spent</th>
                  <th style={s.th}>Orders</th>
                  <th style={s.th}>Breaks</th>
                  <th style={s.th}>Last break</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={i} onClick={() => router.push(`/customers/${encodeURIComponent(c.username)}`)}
                    style={{ borderBottom: "1px solid #161616", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#1a1a1a")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ ...s.td, color: i === 0 ? "#fb923c" : i === 1 ? "#aaa" : i === 2 ? "#cd7f32" : "#555", fontWeight: 700 }}>#{i + 1}</td>
                    <td style={{ ...s.td, color: "#a78bfa", fontWeight: 600 }}>{c.username}</td>
                    <td style={{ ...s.td, color: "#777", fontSize: 12 }}>{c.shipping_address}</td>
                    <td style={{ ...s.td, color: "#4ade80", fontWeight: 700 }}>${c.total_spent.toFixed(2)}</td>
                    <td style={{ ...s.td, color: "#aaa" }}>{c.order_count}</td>
                    <td style={{ ...s.td, color: "#38bdf8" }}>{c.break_count}</td>
                    <td style={{ ...s.td, color: "#555" }}>{c.last_break_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}