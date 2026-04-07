export default function PublicHome() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: "0 24px" }}>
        <img src="/LOGO-BG.png" alt="ValleyHitHouse" style={{ width: 160, height: "auto", marginBottom: 24 }} />
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fb923c", margin: 0, marginBottom: 8 }}>ValleyHitHouse</h1>
        <p style={{ fontSize: 16, color: "#555", marginBottom: 32 }}>Bo Jackson Battle Arena breaks & card collectibles</p>
        <p style={{ fontSize: 13, color: "#333" }}>Customer features coming soon</p>
      </div>
    </div>
  );
}