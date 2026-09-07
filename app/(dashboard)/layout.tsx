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
      <div className="dashboard-shell flex min-h-screen min-w-0">
        <Sidebar role={user.role} />
        <main className="main-content min-w-0 w-full flex-1">
          <div className="dashboard-page-container p-4 pt-16 sm:p-5 sm:pt-16 lg:p-8 lg:pt-8">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}
