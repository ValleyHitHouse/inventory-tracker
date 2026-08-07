import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PAGES, routeToKey, DEFAULT_EMPLOYEE_KEYS } from "@/lib/pages";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/" ||
    pathname.startsWith("/lot-comp/") ||
    pathname === "/dashboard/login"
  ) {
    return NextResponse.next();
  }

  // Only protect /dashboard routes
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get("vhh-auth")?.value;
  const roleCookie = request.cookies.get("vhh-role")?.value;

  // Not logged in
  if (!authCookie) {
    return NextResponse.redirect(new URL("/dashboard/login", request.url));
  }

  // Admin can access everything
  if (roleCookie === "admin") {
    return NextResponse.next();
  }

  // No valid role — kick to login
  if (roleCookie !== "employee") {
    return NextResponse.redirect(new URL("/dashboard/login", request.url));
  }

  // Employee: enforce their page permission set.
  // Parse the readable vhh-perms cookie (JSON array of page keys). If it's
  // missing (older session) or malformed, fall back to the default set so
  // nobody gets locked out unexpectedly.
  let perms: string[] = DEFAULT_EMPLOYEE_KEYS;
  const raw = request.cookies.get("vhh-perms")?.value;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) perms = parsed;
    } catch {
      perms = DEFAULT_EMPLOYEE_KEYS;
    }
  }

  const key = routeToKey(pathname);

  // Routes that don't map to a known page (e.g. /dashboard root) pass through.
  if (!key) {
    return NextResponse.next();
  }

  // Allowed — let it through.
  if (perms.includes(key)) {
    return NextResponse.next();
  }

  // Blocked. Send them to the first page they're actually allowed to see,
  // preferring home; if they have nothing, back to login.
  const landing =
    (perms.includes("home") ? PAGES.find(p => p.key === "home") : undefined) ||
    PAGES.find(p => perms.includes(p.key));
  if (landing) {
    return NextResponse.redirect(new URL(landing.route, request.url));
  }
  return NextResponse.redirect(new URL("/dashboard/login", request.url));
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };
