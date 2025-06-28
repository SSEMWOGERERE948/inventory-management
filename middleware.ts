import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    console.log("🔍 Middleware:", {
      path: pathname,
      hasToken: !!token,
      role: token?.role,
      email: token?.email,
    })

    // Allow access to auth pages
    if (pathname.startsWith("/auth/")) {
      return NextResponse.next()
    }

    // Redirect root to dashboard
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Admin only routes
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      console.log("❌ Admin access denied, redirecting to dashboard")
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Company Director routes
    if (pathname.startsWith("/director") && token?.role !== "COMPANY_DIRECTOR") {
      console.log("❌ Director access denied, redirecting to dashboard")
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Role-based dashboard redirects
    if (pathname === "/dashboard") {
      if (token?.role === "ADMIN") {
        console.log("✅ Admin user, redirecting to /admin")
        return NextResponse.redirect(new URL("/admin", req.url))
      } else if (token?.role === "COMPANY_DIRECTOR") {
        console.log("✅ Director user, redirecting to /director")
        return NextResponse.redirect(new URL("/director", req.url))
      }
      // Regular users stay on /dashboard
    }

    console.log("✅ Access granted to:", pathname)
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages without token
        if (req.nextUrl.pathname.startsWith("/auth/")) {
          return true
        }
        // Require token for all other protected routes
        return !!token
      },
    },
  },
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}
