import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

/** First valid JWT: Bearer first so API calls work when an old cookie is invalid or out of sync with localStorage. */
function getVerifiedAuthToken(request) {
  const candidates = [];
  const header = request.headers.get("authorization");
  const bearerMatch = header?.match(/^\s*Bearer\s+(\S+)/i);
  if (bearerMatch?.[1]) {
    candidates.push(bearerMatch[1]);
  }
  const cookieToken = request.cookies.get("authToken")?.value;
  if (cookieToken) {
    candidates.push(cookieToken);
  }
  for (const raw of candidates) {
    if (verifyToken(raw)) {
      return raw;
    }
  }
  return null;
}

export function middleware(request) {
  const token = getVerifiedAuthToken(request);
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/register", "/"];
  const publicApiRoutes = ["/api/chat", "/api/auth/login", "/api/auth/register"];

  // If user is not authenticated and trying to access protected route
  if (
    !token &&
    !publicRoutes.includes(pathname) &&
    pathname.startsWith("/api") &&
    !publicApiRoutes.includes(pathname)
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // If user is authenticated and trying to access auth pages, redirect to chat
  if (token && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
