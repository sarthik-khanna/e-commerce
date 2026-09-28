import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { Provider } from "next-auth/providers";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations";

// How often the JWT re-checks the database for role changes or deactivation.
const REVALIDATE_USER_MS = 5 * 60 * 1000;

const providers: Provider[] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return null;

      const user = await db.user.findUnique({ where: { email: parsed.data.email } });
      if (!user?.passwordHash || !user.isActive) return null;

      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      // Google verifies email ownership, so linking to an existing
      // email/password account with the same address is safe here.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.email) return false;
      const existing = await db.user.findUnique({
        where: { email: user.email },
        select: { isActive: true },
      });
      // New OAuth users don't exist yet; existing ones must be active.
      return existing ? existing.isActive : true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role ?? "CUSTOMER";
        token.checkedAt = Date.now();
        return token;
      }

      // Periodically re-read the user so role changes and deactivations take effect.
      if (token.sub && Date.now() - (token.checkedAt ?? 0) > REVALIDATE_USER_MS) {
        const fresh = await db.user.findUnique({
          where: { id: token.sub },
          select: { role: true, isActive: true, name: true, image: true },
        });
        if (!fresh || !fresh.isActive) return null; // signs the user out
        token.role = fresh.role;
        token.name = fresh.name;
        token.picture = fresh.image;
        token.checkedAt = Date.now();
      }
      return token;
    },
  },
});
