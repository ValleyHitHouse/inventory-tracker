import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";

// Fallback hardcoded users in case Supabase is unavailable
const FALLBACK_USERS: Record<string, { password: string; role: string; name: string }> = {
  mitch: { password: "242424", role: "admin", name: "Mitch" },
  caitlin: { password: "ValleyCait", role: "employee", name: "Caitlin" },
  terrance: { password: "ValleyTerr", role: "employee", name: "Terrance" },
};

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const normalizedUsername = username.toLowerCase().trim();
  let user: { password: string; role: string; name: string } | null = null;

  // Try Supabase first
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );
    const { data: employee } = await supabase
      .from("employees")
      .select("*")
      .eq("username", normalizedUsername)
      .eq("active", true)
      .single();

    if (employee && employee.password_hash === password) {
      user = { password: employee.password_hash, role: employee.role, name: employee.name };
    } else if (employee && employee.password_hash !== password) {
      // Employee exists but wrong password — don't fall back
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }
  } catch (err) {
    console.error("Supabase login error, falling back to hardcoded:", err);
  }

  // Fall back to hardcoded if Supabase didn't find the user
  if (!user) {
    const fallback = FALLBACK_USERS[normalizedUsername];
    if (fallback && fallback.password === password) {
      user = fallback;
    }
  }

  if (!user) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, role: user.role, name: user.name });

  res.cookies.set("vhh-auth", "authenticated", {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  res.cookies.set("vhh-role", user.role, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  res.cookies.set("vhh-user", user.name, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("vhh-auth");
  res.cookies.delete("vhh-role");
  res.cookies.delete("vhh-user");
  return res;
}