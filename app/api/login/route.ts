import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
export const dynamic = "force-dynamic";

const USERS: Record<string, { password: string; role: string; name: string }> = {
  mitch: { password: "242424", role: "admin", name: "Mitch" },
  caitlin: { password: "ValleyCait", role: "employee", name: "Caitlin" },
  terrance: { password: "ValleyTerr", role: "employee", name: "Terrance" },
};

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const user = USERS[username.toLowerCase().trim()];

  if (!user || user.password !== password) {
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