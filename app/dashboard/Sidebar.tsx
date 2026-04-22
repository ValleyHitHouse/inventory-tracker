"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

function NavLink({ href, emoji, label, soon, onClick }: {
  href: string; emoji: string; label: string; soon?: boolean; onClick?: () => void
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");
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

function WebsiteManagementNav() {
  const pathname = usePathname();
  const isActive =
    pathname.startsWith("/dashboard/public-breaks") ||
    pathname.startsWith("/dashboard/top-hits") ||
    pathname.startsWith("/dashboard/1of1") ||
    pathname.startsWith("/dashboard/slides");
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "9px 12px", borderRadius: 8,
          fontSize: 13, fontWeight: 500, cursor: "pointer",
          color: isActive ? "#fb923c" : "#aaa",
          background: isActive ? "#1a0f00" : "transparent",
          borderLeft: isActive ? "2px solid #fb923c" : "2px solid transparent",
          border: "none", outline: "none", textAlign: "left" as const,
          boxSizing: "border-box" as const,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span>🌐</span>
          <span>Website Management</span>
        </span>
        <span style={{
          fontSize: 10, color: "#444",
          transition: "transform 0.2s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          display: "inline-block",
        }}>▾</span>
      </button>
      {open && (
        <div style={{ paddingLeft: 16, marginTop: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <NavLink href="/dashboard/public-breaks" emoji="📅" label="Break Schedule" />
          <NavLink href="/dashboard/top-hits" emoji="🔥" label="Top Hits" />
          <NavLink href="/dashboard/1of1" emoji="✨" label="1/1 Tracker" />
          <NavLink href="/dashboard/slides" emoji="🎠" label="Hero Slides" />
        </div>
      )}
    </div>
  );
}

export default function DashboardSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const cookies = document.cookie.split(";").reduce((acc, c) => {
      const [k, v] = c.trim().split("=");
      acc[k] = v;
      return acc;
    }, {} as Record<string, string>);
    setRole(cookies["vhh-role"] || "");
    setUserName(cookies["vhh-user"] || "");
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  async function handleLogout() {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/dashboard/login");
    router.refresh();
  }

  const isAdmin = role === "admin";

  const navLinks = (
    <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
      <NavLink href="/dashboard/home" emoji="🏠" label="Home" />
      <NavLink href="/dashboard/inventory" emoji="📦" label="Inventory" />
      <NavLink href="/dashboard/breaks" emoji="🎴" label="Breaks" />
      <NavLink href="/dashboard/customers" emoji="👥" label="Customers" />
      <NavLink href="/dashboard/cards" emoji="🃏" label="Card Database" />
      <NavLink href="/dashboard/card-inventory" emoji="📋" label="Card Inventory" />
      <NavLink href="/dashboard/lot-comp" emoji="🏷️" label="Lot Comps" />
      <NavLink href="/dashboard/hours" emoji="⏱️" label="My Hours" />
      {isAdmin && (
        <>
          <div style={{ height: 1, background: "#1e1e1e", margin: "8px 12px" }} />
          <div style={{ fontSize: 10, color: "#333", textTransform: "uppercase", letterSpacing: ".6px", padding: "4px 12px" }}>Admin only</div>
          <NavLink href="/dashboard/analytics" emoji="📊" label="Analytics" />
          <NavLink href="/dashboard/financials" emoji="🧾" label="Financials" />
          <NavLink href="/dashboard/giveaways" emoji="🎁" label="Giveaways" />
          <NavLink href="/dashboard/employees" emoji="👤" label="Employees" />
          <NavLink href="/dashboard/settings" emoji="⚙️" label="Settings" />
          <div style={{ height: 1, background: "#1e1e1e", margin: "8px 12px" }} />
          <WebsiteManagementNav />
        </>
      )}
    </nav>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="vhh-hamburger"
        aria-label="Open menu"
        style={{
          display: "none", position: "fixed", top: 12, left: 12, zIndex: 300,
          background: "#111", border: "1px solid #2a2a2a", borderRadius: 8,
          color: "#fb923c", cursor: "pointer", padding: "8px 10px",
          fontSize: 18, lineHeight: 1,
        }}
      >☰</button>

      <div
        onClick={() => setMobileOpen(false)}
        className={`vhh-overlay${mobileOpen ? " vhh-overlay-open" : ""}`}
        style={{
          display: "none", position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.6)", zIndex: 149,
        }}
      />

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

        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e1e" }}>
          {userName && (
            <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>
              Signed in as <span style={{ color: "#fb923c" }}>{userName}</span>
              {isAdmin && <span style={{ fontSize: 10, color: "#333", marginLeft: 6 }}>(admin)</span>}
            </div>
          )}
          <button onClick={handleLogout} style={{ width: "100%", background: "none", border: "1px solid #222", borderRadius: 6, padding: "7px 12px", fontSize: 12, color: "#555", cursor: "pointer", textAlign: "left" as const }}>
            Sign out
          </button>
          <div style={{ fontSize: 10, color: "#222", marginTop: 8 }}>VHH © 2026</div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .vhh-hamburger { display: block !important; }
          .vhh-overlay-open { display: block !important; }
          .vhh-sidebar { transform: translateX(-100%); transition: transform 0.25s ease; will-change: transform; }
          .vhh-sidebar-open { transform: translateX(0) !important; }
        }
      `}</style>
    </>
  );
}