"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PublicNav from "../../components/PublicNav";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data } = await supabase.from("customer_profiles").select("*").eq("id", user.id).single();
      setProfile(data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" }}>
      <PublicNav />
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "100px 24px 60px" }}>
        {loading ? (
          <p style={{ color: "#555" }}>Loading...</p>
        ) : !profile ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#555" }}>Profile not found.</p>
            <Link href="/" style={{ color: "#fb923c" }}>Go home</Link>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, marginBottom: 4 }}>
                {profile.first_name} {profile.last_name}
              </h1>
              <p style={{ fontSize: 14, color: "#555" }}>{profile.email}</p>
            </div>
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 16 }}>Account details</div>
              {[
                { label: "First name", value: profile.first_name },
                { label: "Last name", value: profile.last_name },
                { label: "Email", value: profile.email },
                { label: "Whatnot username", value: profile.whatnot_username || "—" },
                { label: "Shipping address", value: profile.shipping_address || "—" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #161616", fontSize: 14 }}>
                  <span style={{ color: "#555" }}>{row.label}</span>
                  <span style={{ color: "#e5e5e5" }}>{row.value}</span>
                </div>
              ))}
            </div>
            <button onClick={handleSignOut} style={{ width: "100%", background: "none", border: "1px solid #333", borderRadius: 8, padding: 12, fontSize: 14, color: "#555", cursor: "pointer" }}>
              Sign out
            </button>
          </>
        )}
      </div>
    </div>
  );
}