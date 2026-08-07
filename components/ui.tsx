"use client";
import Link from "next/link";
import React from "react";

// ── Design tokens ─────────────────────────────────────────────
// Single source of truth for the dashboard theme. Codifies the
// colors, radii, and spacing the pages already use so every screen
// stays consistent instead of reinventing its own styles.
export const C = {
  bg: "#0a0a0a",
  surface: "#111",
  surface2: "#0f0f0f",
  border: "#1e1e1e",
  border2: "#161616",
  text: "#e5e5e5",
  muted: "#888",
  muted2: "#666",
  faint: "#555",
  fainter: "#444",
  // accents
  orange: "#fb923c",
  purple: "#a78bfa",
  green: "#4ade80",
  blue: "#38bdf8",
  red: "#f87171",
  pink: "#db2777",
};

export const R = { control: 8, card: 10, tile: 12, pill: 20 };
export const SPACE = { xs: 6, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };

const tint = (hex: string, alpha = "22") => hex + alpha;

// ── Page shell + header ───────────────────────────────────────
export function Page({ title, subtitle, actions, maxWidth = 1100, children }: {
  title?: string; subtitle?: string; actions?: React.ReactNode; maxWidth?: number; children: React.ReactNode;
}) {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, width: "100%", boxSizing: "border-box" }}>
      <div style={{ maxWidth, margin: "0 auto", padding: "24px 16px 60px", width: "100%", boxSizing: "border-box" }}>
        {(title || actions) && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
            <div>
              {title && <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.3px" }}>{title}</h1>}
              {subtitle && <p style={{ fontSize: 13, color: C.faint, marginTop: 6, marginBottom: 0 }}>{subtitle}</p>}
            </div>
            {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ── Section container ─────────────────────────────────────────
export function Section({ title, right, pad = 20, style, children }: {
  title?: string; right?: React.ReactNode; pad?: number; style?: React.CSSProperties; children: React.ReactNode;
}) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: R.card, padding: pad, marginBottom: 16, ...style }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 }}>
          {title && <div style={{ fontSize: 11, fontWeight: 600, color: C.faint, textTransform: "uppercase", letterSpacing: ".6px" }}>{title}</div>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Inner card / panel ────────────────────────────────────────
export function Card({ accent, style, onClick, children }: {
  accent?: string; style?: React.CSSProperties; onClick?: () => void; children: React.ReactNode;
}) {
  return (
    <div onClick={onClick} style={{
      background: C.surface2, border: `1px solid ${accent ? tint(accent, "33") : C.border}`, borderRadius: R.card,
      padding: "14px 16px", cursor: onClick ? "pointer" : undefined, ...style,
    }}>{children}</div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────
export function StatTile({ label, value, color = C.text, sub, onClick }: {
  label: string; value: React.ReactNode; color?: string; sub?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      background: C.surface2, border: `1px solid ${C.border}`, borderRadius: R.tile, padding: "14px 16px",
      cursor: onClick ? "pointer" : undefined,
    }}>
      <div style={{ fontSize: 11, color: C.faint, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {sub != null && <div style={{ fontSize: 11, color: C.fainter, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ── Badge / pill ──────────────────────────────────────────────
export function Badge({ color = C.faint, children }: { color?: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: R.pill, background: tint(color, "22"), color, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

// ── Buttons ───────────────────────────────────────────────────
type BtnProps = { variant?: "primary" | "ghost" | "accent"; accent?: string; size?: "sm" | "md"; style?: React.CSSProperties };

function btnStyle({ variant = "ghost", accent = C.orange, size = "md" }: BtnProps): React.CSSProperties {
  const pad = size === "sm" ? "6px 12px" : "9px 16px";
  const fs = size === "sm" ? 12 : 13;
  if (variant === "primary") return { padding: pad, fontSize: fs, fontWeight: 700, borderRadius: R.control, border: "none", background: "linear-gradient(135deg,#7c3aed,#db2777)", color: "#fff", cursor: "pointer" };
  if (variant === "accent") return { padding: pad, fontSize: fs, fontWeight: 600, borderRadius: R.control, border: `1px solid ${tint(accent, "44")}`, background: tint(accent, "18"), color: accent, cursor: "pointer" };
  return { padding: pad, fontSize: fs, fontWeight: 600, borderRadius: R.control, border: `1px solid ${C.border}`, background: C.surface2, color: C.muted, cursor: "pointer" };
}

export function Button({ variant, accent, size, style, onClick, children }: BtnProps & { onClick?: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ ...btnStyle({ variant, accent, size }), ...style }}>{children}</button>;
}

export function LinkButton({ href, variant, accent, size, style, children }: BtnProps & { href: string; children: React.ReactNode }) {
  return <Link href={href} style={{ ...btnStyle({ variant, accent, size }), textDecoration: "none", display: "inline-block", ...style }}>{children}</Link>;
}

// ── Action row (used in "needs action" / alert lists) ─────────
export function AlertRow({ badge, badgeColor, title, meta, right }: {
  badge?: string; badgeColor?: string; title: React.ReactNode; meta?: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", background: C.surface2, borderRadius: R.control, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {badge && <Badge color={badgeColor}>{badge}</Badge>}
        <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{title}</span>
        {meta != null && <span style={{ fontSize: 11, color: C.muted2 }}>{meta}</span>}
      </div>
      {right}
    </div>
  );
}
