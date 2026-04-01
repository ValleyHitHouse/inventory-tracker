import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ValleyHitHouse",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#0a0a0a", color: "#e5e5e5", display: "flex", minHeight: "100vh" }}>
        {/* Sidebar */}
        <div style={{ width: 220, background: "#111", borderRight: "1px solid #1e1e1e", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100 }}>
          {/* Logo area */}
          <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #1e1e1e" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fb923c", letterSpacing: "-0.5px" }}>ValleyHitHouse</div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>Dashboard</div>
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
            <NavLink href="/" emoji="🏠" label="Home" />
            <NavLink href="/inventory" emoji="📦" label="Inventory" />
            <NavLink href="/breaks" emoji="🎴" label="Breaks" />
            <NavLink href="/orders" emoji="📋" label="Orders" soon />
            <NavLink href="/customers" emoji="👥" label="Customers" soon />
            <NavLink href="/sales" emoji="📈" label="Sales" soon />
            <NavLink href="/analytics" emoji="📊" label="Analytics" soon />
          </nav>

          {/* Footer */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid #1e1e1e", fontSize: 11, color: "#333" }}>
            VHH © 2026
          </div>
        </div>

        {/* Main content — offset by sidebar width */}
        <div style={{ marginLeft: 220, flex: 1, minHeight: "100vh" }}>
          {children}
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, emoji, label, soon }: { href: string; emoji: string; label: string; soon?: boolean }) {
  return (
    <Link href={href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, color: soon ? "#333" : "#aaa", textDecoration: "none", fontSize: 13, fontWeight: 500, pointerEvents: soon ? "none" : "auto" }}>
      <span>{emoji}</span>
      <span>{label}</span>
      {soon && <span style={{ marginLeft: "auto", fontSize: 10, background: "#1a1a1a", color: "#444", padding: "2px 6px", borderRadius: 4 }}>Soon</span>}
    </Link>
  );
}