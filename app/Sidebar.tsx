"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, emoji, label, soon }: { href: string; emoji: string; label: string; soon?: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 12px", borderRadius: 8, textDecoration: "none",
      fontSize: 13, fontWeight: 500,
      color: isActive ? "#fb923c" : soon ? "#333" : "#aaa",
      background: isActive ? "#1a0f00" : "transparent",
      borderLeft: isActive ? "2px solid #fb923c" : "2px solid transparent",
      pointerEvents: soon ? "none" : "auto"
    }}>
      <span>{emoji}</span>
      <span>{label}</span>
      {soon && <span style={{ marginLeft: "auto", fontSize: 10, background: "#1a1a1a", color: "#444", padding: "2px 6px", borderRadius: 4 }}>Soon</span>}
    </Link>
  );
}

export default function Sidebar() {
  return (
    <div style={{ width: 220, background: "#111", borderRight: "1px solid #1e1e1e", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100 }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img src="/LOGO-BG.png" alt="ValleyHitHouse" style={{ width: 140, height: "auto" }} />
        <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Dashboard</div>
      </div>
      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        <NavLink href="/" emoji="🏠" label="Home" />
        <NavLink href="/inventory" emoji="📦" label="Inventory" />
        <NavLink href="/breaks" emoji="🎴" label="Breaks" />
        <NavLink href="/orders" emoji="📋" label="Orders" soon />
        <NavLink href="/customers" emoji="👥" label="Customers" soon />
        <NavLink href="/sales" emoji="📈" label="Sales" soon />
        <NavLink href="/analytics" emoji="📊" label="Analytics" soon />
      </nav>
      <div style={{ padding: "16px 20px", borderTop: "1px solid #1e1e1e", fontSize: 11, color: "#333" }}>
        VHH © 2026
      </div>
    </div>
  );
}