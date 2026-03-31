export default function Home() {
  const products = [
    { id: 1, name: "Box Cutter", quantity: 42, location: "Shelf A1", status: "In Stock" },
    { id: 2, name: "Packing Tape", quantity: 8, location: "Shelf B3", status: "Low Stock" },
    { id: 3, name: "Bubble Wrap", quantity: 0, location: "Shelf C2", status: "Out of Stock" },
    { id: 4, name: "Shipping Labels", quantity: 200, location: "Shelf A4", status: "In Stock" },
    { id: 5, name: "Pallet Wrap", quantity: 15, location: "Shelf D1", status: "In Stock" },
  ];

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 900, margin: "40px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>Inventory Tracker</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>ValleyHitHouse — internal use only</p>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
        <thead>
          <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
            <th style={{ padding: "12px 16px", borderBottom: "2px solid #e0e0e0" }}>Product</th>
            <th style={{ padding: "12px 16px", borderBottom: "2px solid #e0e0e0" }}>Quantity</th>
            <th style={{ padding: "12px 16px", borderBottom: "2px solid #e0e0e0" }}>Location</th>
            <th style={{ padding: "12px 16px", borderBottom: "2px solid #e0e0e0" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "12px 16px" }}>{p.name}</td>
              <td style={{ padding: "12px 16px" }}>{p.quantity}</td>
              <td style={{ padding: "12px 16px", color: "#888" }}>{p.location}</td>
              <td style={{ padding: "12px 16px" }}>
                <span style={{
                  padding: "3px 10px", borderRadius: 20, fontSize: 13,
                  background: p.status === "In Stock" ? "#e6f4ea" : p.status === "Low Stock" ? "#fff8e1" : "#fdecea",
                  color: p.status === "In Stock" ? "#2e7d32" : p.status === "Low Stock" ? "#f57f17" : "#c62828",
                }}>
                  {p.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}