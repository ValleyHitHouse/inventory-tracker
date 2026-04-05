"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

function NavLink({ href, emoji, label, soon, onClick }: { href: string; emoji: string; label: string; soon?: boolean; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link href={href} onClick={onClick} style={{
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navLinks = (
    <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
      <NavLink href="/" emoji="🏠" label="Home" />
      <NavLink href="/inventory" emoji="📦" label="Inventory" />
      <NavLink href="/breaks" emoji="🎴" label="Breaks" />
      <NavLink href="/customers" emoji="👥" label="Customers" />
      <NavLink href="/cards" emoji="🃏" label="Card Database" />
      <NavLink href="/card-inventory" emoji="📋" label="Card Inventory" />
      <NavLink href="/lot-comp" emoji="🏷️" label="Lot Comps" />
      <NavLink href="/analytics" emoji="📊" label="Analytics" />
      <NavLink href="/settings" emoji="⚙️" label="Settings" />
      <NavLink href="/orders" emoji="📋" label="Orders" soon />
      <NavLink href="/sales" emoji="📈" label="Sales" soon />
    </nav>
  );

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        onClick={() => setMobileOpen(true)}
        style={{
          display: "none",
          position: "fixed", top: 12, left: 12, zIndex: 200,
          background: "#111", border: "1px solid #2a2a2a", borderRadius: 8,
          color: "#fb923c", cursor: "pointer", padding: "8px 10px", fontSize: 18,
          lineHeight: 1,
        }}
        className="vhh-hamburger"
        aria-label="Open menu"
      >
        ☰
      </button>

      {/* Overlay — mobile only */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            display: "none",
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            zIndex: 149,
          }}
          className="vhh-overlay"
        />
      )}

      {/* Sidebar — desktop fixed, mobile drawer */}
      <div
        className={`vhh-sidebar${mobileOpen ? " vhh-sidebar-open" : ""}`}
        style={{
          width: 220, background: "#111", borderRight: "1px solid #1e1e1e",
          display: "flex", flexDirection: "column",
          position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 150,
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img src="/LOGO-BG.png" alt="ValleyHitHouse" style={{ width: 140, height: "auto" }} />
          <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Dashboard</div>
        </div>
        {navLinks}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #1e1e1e", fontSize: 11, color: "#333" }}>
          VHH © 2026
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .vhh-hamburger { display: block !important; }
          .vhh-overlay { display: block !important; }
          .vhh-sidebar {
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }
          .vhh-sidebar-open {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </>
  );
}