import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  // Check against employees table
  const { data: employee, error } = await supabase
    .from("employees")
    .select("*")
    .eq("username", username.toLowerCase().trim())
    .eq("active", true)
    .single();

  if (error || !employee) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  if (employee.password_hash !== password) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, role: employee.role, name: employee.name });

  res.cookies.set("vhh-auth", "authenticated", {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  res.cookies.set("vhh-role", employee.role, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  res.cookies.set("vhh-user", employee.name, {
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