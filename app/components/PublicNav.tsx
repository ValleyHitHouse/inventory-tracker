"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  {
    label: "Breaks",
    dropdown: [
      {
        heading: "Valley Break Schedule",
        items: [
          { label: "Bo Jackson Battle Arena", href: "/breaks/boba" },
          { label: "Wonders of the First", href: "https://www.whatnot.com/user/valleytcgtavern", external: true },
        ]
      },
      {
        heading: "More",
        items: [
          { label: "Website Breaks", href: "/breaks/website", soon: true },
          { label: "Top Hits of the Week", href: "/breaks/top-hits" },
        ]
      }
    ]
  },
  {
    label: "Card Database",
    dropdown: [
      {
        heading: "Bo Jackson Battle Arena",
        items: [
          { label: "Griffey", href: "/cards/griffey" },
          { label: "Alpha", href: "/cards/alpha" },
          { label: "Alpha Update", href: "/cards/alpha-update" },
          { label: "Tecmo", href: "/cards/tecmo", soon: true },
        ]
      },
      {
        heading: "Tools",
        items: [
          { label: "1/1 Tracker", href: "/cards/tracker" },
        ]
      }
    ]
  },
  {
    label: "Deck Builder",
    dropdown: [
      {
        heading: "Coming Soon",
        items: [
          { label: "Apex Madness Deck Builder", href: "/deck-builder/apex", soon: true },
          { label: "Deck Builder", href: "/deck-builder", soon: true },
        ]
      }
    ]
  },
  { label: "Store", href: "/store", soon: true },
  {
    label: "About",
    dropdown: [
      {
        heading: "Find Us",
        items: [
          { label: "Whatnot — BOBA", href: "https://www.whatnot.com/user/valleyhithouse", external: true },
          { label: "Instagram", href: "https://www.instagram.com/valleyhithouse/", external: true },
          { label: "TikTok", href: "https://www.tiktok.com/@valley.hit.house", external: true },
        ]
      }
    ]
  },
];

export default function PublicNav() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleScroll() { setScrolled(window.scrollY > 20); }
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const mobileStyles = `
    .pub-nav-links { display: flex; align-items: center; gap: 4px; }
    .pub-mobile-btn { display: none; }
    .pub-mobile-menu { display: none; }
    @media (max-width: 768px) {
      .pub-nav-links { display: none; }
      .pub-mobile-btn { display: block !important; }
      .pub-mobile-menu.open { display: block !important; }
    }
  `;

  return (
    <nav ref={navRef} style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? "rgba(10,10,10,0.97)" : "rgba(10,10,10,0.85)",
      backdropFilter: "blur(12px)",
      borderBottom: scrolled ? "1px solid #1e1e1e" : "1px solid transparent",
      transition: "all 0.3s ease",
    }}>
      <style>{mobileStyles}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>

        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/LOGO-BG.png" alt="ValleyHitHouse" style={{ width: 40, height: "auto" }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: "#fb923c", letterSpacing: "-0.5px" }}>ValleyHitHouse</span>
        </Link>

        {/* Desktop nav links */}
        <div className="pub-nav-links">
          {NAV_ITEMS.map(item => (
            <div key={item.label} style={{ position: "relative" }}>
              {item.href && !item.dropdown ? (
                <Link href={item.href} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "8px 14px", borderRadius: 8, textDecoration: "none",
                  fontSize: 14, fontWeight: 600,
                  color: item.soon ? "#444" : "#aaa",
                  pointerEvents: item.soon ? "none" : "auto",
                  transition: "color 0.2s",
                }}
                  onMouseEnter={e => { if (!item.soon) (e.target as HTMLElement).style.color = "#fb923c"; }}
                  onMouseLeave={e => { if (!item.soon) (e.target as HTMLElement).style.color = "#aaa"; }}
                >
                  {item.label}
                  {item.soon && <span style={{ fontSize: 9, background: "#1a1a1a", color: "#444", padding: "1px 5px", borderRadius: 3, marginLeft: 4 }}>SOON</span>}
                </Link>
              ) : (
                <button
                  onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "8px 14px", borderRadius: 8,
                    fontSize: 14, fontWeight: 600,
                    color: openDropdown === item.label ? "#fb923c" : "#aaa",
                    background: "none", border: "none", cursor: "pointer",
                    transition: "color 0.2s",
                  }}
                >
                  {item.label}
                  <span style={{ fontSize: 10, transition: "transform 0.2s", transform: openDropdown === item.label ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                </button>
              )}

              {/* Dropdown */}
              {item.dropdown && openDropdown === item.label && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", left: "50%",
                  transform: "translateX(-50%)",
                  background: "#111", border: "1px solid #1e1e1e", borderRadius: 12,
                  padding: 16, minWidth: 220,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                  display: "flex", gap: 20,
                }}>
                  {item.dropdown.map(group => (
                    <div key={group.heading}>
                      <div style={{ fontSize: 10, color: "#444", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #1e1e1e" }}>
                        {group.heading}
                      </div>
                      {group.items.map(subItem => (
                        subItem.external ? (
                          <a key={subItem.label} href={subItem.href} target="_blank" rel="noopener noreferrer"
                            onClick={() => setOpenDropdown(null)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "7px 10px", borderRadius: 6, textDecoration: "none", fontSize: 13, color: subItem.soon ? "#333" : "#888", pointerEvents: subItem.soon ? "none" : "auto", whiteSpace: "nowrap" }}
                            onMouseEnter={e => { if (!subItem.soon) (e.currentTarget as HTMLElement).style.color = "#fb923c"; (e.currentTarget as HTMLElement).style.background = "#1a1a1a"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = subItem.soon ? "#333" : "#888"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                          >
                            {subItem.label}
                            {subItem.soon ? <span style={{ fontSize: 9, background: "#1a1a1a", color: "#444", padding: "1px 5px", borderRadius: 3 }}>SOON</span> : <span style={{ fontSize: 10, color: "#444" }}>↗</span>}
                          </a>
                        ) : (
                          <Link key={subItem.label} href={subItem.href}
                            onClick={() => setOpenDropdown(null)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "7px 10px", borderRadius: 6, textDecoration: "none", fontSize: 13, color: subItem.soon ? "#333" : "#888", pointerEvents: subItem.soon ? "none" : "auto", whiteSpace: "nowrap" }}
                            onMouseEnter={e => { if (!subItem.soon) (e.currentTarget as HTMLElement).style.color = "#fb923c"; (e.currentTarget as HTMLElement).style.background = "#1a1a1a"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = subItem.soon ? "#333" : "#888"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                          >
                            {subItem.label}
                            {subItem.soon && <span style={{ fontSize: 9, background: "#1a1a1a", color: "#444", padding: "1px 5px", borderRadius: 3 }}>SOON</span>}
                          </Link>
                        )
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Auth buttons */}
          <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
            <Link href="/auth/login" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#aaa", textDecoration: "none", border: "1px solid #222" }}>Sign in</Link>
            <Link href="/auth/signup" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", textDecoration: "none", background: "linear-gradient(135deg,#fb923c,#f472b6)" }}>Join</Link>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="pub-mobile-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ display: "none", background: "none", border: "1px solid #222", borderRadius: 8, padding: "8px 10px", color: "#fb923c", fontSize: 18, cursor: "pointer" }}
        >☰</button>
      </div>

      {/* Mobile menu */}
      <div className={`pub-mobile-menu${mobileOpen ? " open" : ""}`} style={{
        display: "none",
        background: "#111", borderTop: "1px solid #1e1e1e",
        padding: "16px 24px 24px",
        maxHeight: "80vh", overflowY: "auto",
      }}>
        {NAV_ITEMS.map(item => (
          <div key={item.label} style={{ marginBottom: 4 }}>
            {item.href && !item.dropdown ? (
              <Link href={item.href} onClick={() => setMobileOpen(false)} style={{ display: "block", padding: "10px 0", fontSize: 15, fontWeight: 600, color: item.soon ? "#444" : "#aaa", textDecoration: "none", borderBottom: "1px solid #1a1a1a" }}>
                {item.label} {item.soon && <span style={{ fontSize: 10, color: "#444" }}>SOON</span>}
              </Link>
            ) : (
              <div>
                <div style={{ padding: "10px 0", fontSize: 15, fontWeight: 600, color: "#fb923c", borderBottom: "1px solid #1a1a1a" }}>{item.label}</div>
                {item.dropdown?.map(group => (
                  <div key={group.heading} style={{ paddingLeft: 12, marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4, marginTop: 8 }}>{group.heading}</div>
                    {group.items.map(subItem => (
                      subItem.external ? (
                        <a key={subItem.label} href={subItem.href} target="_blank" rel="noopener noreferrer"
                          onClick={() => setMobileOpen(false)}
                          style={{ display: "block", padding: "8px 0", fontSize: 14, color: subItem.soon ? "#444" : "#777", textDecoration: "none" }}>
                          {subItem.label} {subItem.soon && <span style={{ fontSize: 9, color: "#444" }}>SOON</span>}
                        </a>
                      ) : (
                        <Link key={subItem.label} href={subItem.href}
                          onClick={() => setMobileOpen(false)}
                          style={{ display: "block", padding: "8px 0", fontSize: 14, color: subItem.soon ? "#444" : "#777", textDecoration: "none" }}>
                          {subItem.label} {subItem.soon && <span style={{ fontSize: 9, color: "#444" }}>SOON</span>}
                        </Link>
                      )
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Link href="/auth/login" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#aaa", textDecoration: "none", border: "1px solid #222", textAlign: "center" as const }}>Sign in</Link>
          <Link href="/auth/signup" onClick={() => setMobileOpen(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#fff", textDecoration: "none", background: "linear-gradient(135deg,#fb923c,#f472b6)", textAlign: "center" as const }}>Join</Link>
        </div>
      </div>
    </nav>
  );
}