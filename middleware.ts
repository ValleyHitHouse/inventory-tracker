import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_ROUTES = [
  "/dashboard/analytics",
  "/dashboard/financials",
  "/dashboard/settings",
  "/dashboard/employees",
];

const EMPLOYEE_ROUTES = [
  "/dashboard/inventory",
  "/dashboard/breaks",
  "/dashboard/customers",
  "/dashboard/card-inventory",
  "/dashboard/lot-comp",
  "/dashboard/hours",
  "/dashboard/home",
];

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

  // Employee can't access admin routes
  if (roleCookie === "employee") {
    const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));
    if (isAdminRoute) {
      return NextResponse.redirect(new URL("/dashboard/home", request.url));
    }
    return NextResponse.next();
  }

  // No valid role — kick to login
  return NextResponse.redirect(new URL("/dashboard/login", request.url));
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };