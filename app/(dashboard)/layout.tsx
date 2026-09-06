import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import SessionProvider from "@/components/providers/session-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as any;

  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  return (
    <SessionProvider session={session}>
      <div className="flex">
        <Sidebar role={user.role} />
        <main className="main-content flex-1">
          <div className="p-6 md:p-8">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}
