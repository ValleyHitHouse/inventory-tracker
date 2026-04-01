import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  if (password === process.env.SITE_PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("vhh-auth", process.env.SITE_PASSWORD!, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  }
  return NextResponse.json({ error: "Wrong password" }, { status: 401 });
}