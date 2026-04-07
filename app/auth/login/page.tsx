"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PublicNav from "../../components/PublicNav";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) { setError(loginError.message); setLoading(false); return; }
    router.push("/auth/profile");
    router.refresh();
  }

  const inputStyle = { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const };

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" }}>
      <PublicNav />
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "120px 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/LOGO-BG.png" alt="VHH" style={{ width: 60, height: "auto", marginBottom: 16 }} />
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#e5e5e5", margin: 0, marginBottom: 8 }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: "#555" }}>Sign in to your VHH account</p>
        </div>
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "32px 28px" }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Email</label>
              <input style={inputStyle} type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 5, display: "block" }}>Password</label>
              <input style={inputStyle} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 14, textAlign: "center" }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg,#fb923c,#f472b6)", border: "none", borderRadius: 8, padding: 14, fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: 13, color: "#444", marginTop: 20 }}>
            Don't have an account? <Link href="/auth/signup" style={{ color: "#fb923c", textDecoration: "none" }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}