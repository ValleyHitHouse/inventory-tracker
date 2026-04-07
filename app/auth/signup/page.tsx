"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PublicNav from "../../components/PublicNav";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [whatnotUsername, setWhatnotUsername] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!firstName || !lastName || !email || !password) return setError("Please fill in all required fields.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    const { data, error: signupError } = await supabase.auth.signUp({ email, password });
    if (signupError) { setError(signupError.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from("customer_profiles").insert({
        id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        whatnot_username: whatnotUsername || null,
        shipping_address: shippingAddress || null,
      });
    }
    setLoading(false);
    setSuccess(true);
  }

  const inputStyle = { width: "100%", background: "#0f0f0f", border: "1px solid #222", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: "#e5e5e5", outline: "none", boxSizing: "border-box" as const };
  const labelStyle = { fontSize: 12, color: "#666", marginBottom: 5, display: "block" };

  if (success) return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" }}>
      <PublicNav />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "120px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#4ade80", marginBottom: 8 }}>Check your email!</h1>
        <p style={{ fontSize: 15, color: "#555", marginBottom: 24 }}>We sent a confirmation link to <span style={{ color: "#e5e5e5" }}>{email}</span>. Click it to activate your account.</p>
        <Link href="/" style={{ display: "inline-block", padding: "12px 24px", background: "linear-gradient(135deg,#fb923c,#f472b6)", borderRadius: 8, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Back to home</Link>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" }}>
      <PublicNav />
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "100px 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#e5e5e5", margin: 0, marginBottom: 8 }}>Join the Valley</h1>
          <p style={{ fontSize: 14, color: "#555" }}>Create your free VHH account</p>
        </div>
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "32px 28px" }}>
          <form onSubmit={handleSignup}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>First name <span style={{ color: "#fb923c" }}>*</span></label>
                <input style={inputStyle} placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Last name <span style={{ color: "#fb923c" }}>*</span></label>
                <input style={inputStyle} placeholder="Smith" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email <span style={{ color: "#fb923c" }}>*</span></label>
              <input style={inputStyle} type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Password <span style={{ color: "#fb923c" }}>*</span></label>
                <input style={inputStyle} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Confirm password <span style={{ color: "#fb923c" }}>*</span></label>
                <input style={inputStyle} type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Whatnot username <span style={{ color: "#444" }}>(optional)</span></label>
              <input style={inputStyle} placeholder="e.g. johncollector" value={whatnotUsername} onChange={e => setWhatnotUsername(e.target.value)} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Shipping address <span style={{ color: "#444" }}>(optional)</span></label>
              <input style={inputStyle} placeholder="123 Main St, City, State, ZIP" value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} />
            </div>
            {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 14, textAlign: "center" }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg,#fb923c,#f472b6)", border: "none", borderRadius: 8, padding: 14, fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: 13, color: "#444", marginTop: 20 }}>
            Already have an account? <Link href="/auth/login" style={{ color: "#fb923c", textDecoration: "none" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}