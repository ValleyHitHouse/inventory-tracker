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

  const rankColor = (i: number) =>
    i === 0 ? "#fb923c" : i === 1 ? "#aaa" : i === 2 ? "#cd7f32" : "#555";

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" }}>
      <style>{`
        .cust-search { width: 100%; max-width: 320px; }
        @media (max-width: 768px) {
          .cust-search { max-width: 100%; }
          .cust-header { flex-direction: column; align-items: flex-start !important; gap: 12px; }
        }
      `}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>

        <div className="cust-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Customers</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
              {loading ? "Loading..." : `${customers.length} unique buyers · tap for full profile`}
            </p>
          </div>
          <input
            className="cust-search"
            style={{ background: "#111", border: "1px solid #222", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#e5e5e5", outline: "none" }}
            placeholder="🔍 Search by username or address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p style={{ color: "#555" }}>Loading customers...</p>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 48, textAlign: "center" }}>
            <p style={{ color: "#555", fontSize: 13 }}>
              {customers.length === 0 ? "No breaks logged yet — customers appear automatically when you log breaks." : "No customers match your search."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((c, i) => (
              <div
                key={i}
                onClick={() => router.push(`/dashboard/customers/${encodeURIComponent(c.username)}`)}
                style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#1a1a1a")}
                onMouseLeave={e => (e.currentTarget.style.background = "#111")}
              >
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: rankColor(i), minWidth: 28 }}>#{i + 1}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa" }}>{c.username}</div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 2, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.shipping_address}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#4ade80" }}>${c.total_spent.toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>total spent</div>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  <div style={{ background: "#0f0f0f", borderRadius: 6, padding: "7px 10px" }}>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>Orders</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#aaa" }}>{c.order_count}</div>
                  </div>
                  <div style={{ background: "#0f0f0f", borderRadius: 6, padding: "7px 10px" }}>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>Breaks</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#38bdf8" }}>{c.break_count}</div>
                  </div>
                  <div style={{ background: "#0f0f0f", borderRadius: 6, padding: "7px 10px" }}>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>Last break</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>{c.last_break_date || "—"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}