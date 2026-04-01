"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
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
      body: JSON.stringify({ password }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Wrong password — try again.");
      setLoading(false);
    }
  }

  return (
    <main style={{ fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f9f9f9" }}>
      <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "40px 36px", width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>ValleyHitHouse</h1>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 28 }}>Enter the team password to continue</p>
        <form onSubmit={handleSubmit}>
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, marginBottom: 12, boxSizing: "border-box" as const }} autoFocus />
          {error && <p style={{ color: "#c62828", fontSize: 13, marginBottom: 10 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "10px 12px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
            {loading ? "Checking..." : "Enter"}
          </button>
        </form>
      </div>
    </main>
  );
}