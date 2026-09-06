import { auth } from "@/lib/auth/auth";
import { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  departmentId?: string | null;
  teamId?: string | null;
  mustChangePassword: boolean;
}

export async function getSession(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as unknown as SessionUser;
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireManager(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== Role.MANAGER) {
    throw new Error("FORBIDDEN");
  }
  return user;
}
