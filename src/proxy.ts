import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const AUTH_PATHS = new Set(["/login", "/register"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const claims = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (AUTH_PATHS.has(pathname)) {
    if (claims) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!claims) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|icons|favicon.ico|manifest.webmanifest|sw.js|robots.txt|.*\\..*).*)",
  ],
};
