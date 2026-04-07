"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      router.push("/dashboard/home");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Invalid username or password");
      setLoading(false);
    }
  }

  return (
    <main style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: "0 16px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/LOGO-BG.png" alt="ValleyHitHouse" style={{ width: 120, height: "auto", marginBottom: 16 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fb923c", margin: 0 }}>ValleyHitHouse</h1>
          <p style={{ color: "#555", fontSize: 13, marginTop: 6 }}>Team dashboard — sign in to continue</p>
        </div>
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "32px 28px" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Username</label>
              <input
                type="text"
                placeholder="e.g. mitch"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                style={{ width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const }}
              />
            </div>
            {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 14, textAlign: "center" }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg,#7c3aed,#db2877)", border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "#333", marginTop: 20 }}>
          ValleyHitHouse © 2026 · Team portal
        </p>
      </div>
    </main>
  );
}