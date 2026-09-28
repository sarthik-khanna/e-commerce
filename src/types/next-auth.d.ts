import type { DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    role?: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

// Auth.js v5 re-exports the JWT type from @auth/core, so augment it there.
declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role;
    checkedAt?: number;
  }
}
