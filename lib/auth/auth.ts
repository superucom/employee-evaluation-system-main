import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/client";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validations/auth.schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;

        const user = await prisma.user.findFirst({
          where: {
            username,
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            username: true,
            passwordHash: true,
            fullName: true,
            role: true,
            departmentId: true,
            teamId: true,
            mustChangePassword: true,
            isActive: true,
          },
        });

        if (!user) return null;

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) return null;

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          username: user.username,
          name: user.fullName,
          role: user.role,
          departmentId: user.departmentId,
          teamId: user.teamId,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.departmentId = (user as any).departmentId;
        token.teamId = (user as any).teamId;
        token.mustChangePassword = (user as any).mustChangePassword;
      }
      if (trigger === "update" && session) {
        if (typeof session.mustChangePassword === "boolean") {
          token.mustChangePassword = session.mustChangePassword;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).username = token.username;
        (session.user as any).role = token.role;
        (session.user as any).departmentId = token.departmentId;
        (session.user as any).teamId = token.teamId;
        (session.user as any).mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.AUTH_SECRET,
});
