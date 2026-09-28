import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

// Lightweight config shared by the proxy (route protection) and the full auth
// setup in auth.ts. It must not import Prisma or other Node-only modules.

const STAFF: Role[] = ["ADMIN", "MANAGER"];
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];
// Admin-only sections (mirrors users:manage / audit:view in lib/rbac.ts).
const ADMIN_ONLY = ["/admin/users", "/admin/audit-logs"];

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  providers: [], // added in auth.ts
  callbacks: {
    // Runs in the proxy for every matched request.
    authorized({ auth, request: { nextUrl } }) {
      const user = auth?.user;
      const path = nextUrl.pathname;

      if (path.startsWith("/admin")) {
        if (!user) return false; // → redirect to /login?callbackUrl=...
        const adminOnly = ADMIN_ONLY.some((p) => path.startsWith(p));
        if (!STAFF.includes(user.role) || (adminOnly && user.role !== "ADMIN")) {
          return Response.redirect(new URL("/unauthorized", nextUrl));
        }
        return true;
      }

      if (path.startsWith("/checkout") || path.startsWith("/orders") || path.startsWith("/account")) {
        return !!user;
      }

      if (user && AUTH_PAGES.some((p) => path.startsWith(p))) {
        return Response.redirect(new URL(STAFF.includes(user.role) ? "/admin" : "/", nextUrl));
      }

      return true;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
