import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const stored = process.env.SITE_PASSWORD;
  
  if (!stored) {
    return NextResponse.json({ error: "No password set", debug: "SITE_PASSWORD is undefined" }, { status: 500 });
  }
  
  if (password === stored) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("vhh-auth", stored, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  }
  return NextResponse.json({ error: "Wrong password", debug: `Expected ${stored.length} chars, got ${password.length} chars` }, { status: 401 });
}