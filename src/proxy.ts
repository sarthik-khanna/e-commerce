import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next.js 16 "proxy" (formerly middleware). It does a fast, database-free JWT
// check to redirect unauthenticated or unauthorized users. Pages, server
// actions and API routes still enforce permissions themselves (defense in depth).
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/admin/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/account/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
