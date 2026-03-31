import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const auth = request.cookies.get("vhh-auth")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";
  if (auth === process.env.SITE_PASSWORD) {
    if (isLoginPage) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }
  if (isLoginPage) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };