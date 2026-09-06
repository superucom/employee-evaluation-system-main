import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { StatCards, QuickActions, RecentTable } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!user) redirect("/login");

  if (user.role === Role.MANAGER) {
    return <ManagerDashboard userId={user.id} />;
  }
  return <EvaluatorDashboard userId={user.id} userName={user.name} />;
}

async function ManagerDashboard({ userId }: { userId: string }) {
  const [
    totalEmployees,
    totalEvaluators,
    totalDepartments,
    activePeriod,
    submittedEvaluations,
    activeTeams,
  ] = await Promise.all([
    prisma.employee.count({ where: { deletedAt: null, status: "active" } }),
    prisma.user.count({ where: { deletedAt: null, isActive: true, role: { in: ["EVALUATOR", "SUPER", "SUPPORT_SUPER", "SUPER_CR", "HEAD", "SUPPORT_HEAD"] } } }),
    prisma.department.count({ where: { deletedAt: null, isActive: true } }),
    prisma.evaluationPeriod.findFirst({ where: { status: "ACTIVE" }, orderBy: { startDate: "desc" } }),
    prisma.evaluationRecord.count({ where: { status: "SUBMITTED" } }),
    prisma.team.findMany({ where: { deletedAt: null, isActive: true }, select: { name: true, code: true } }),
  ]);

  // Count distinct main team groups (Team A / B / C / D) from actual DB data
  const { getMainTeamName } = await import("@/lib/utils");
  const mainTeamNames = new Set(activeTeams.map((t) => getMainTeamName(t)));
  const totalMainTeams = mainTeamNames.size;

  // Completion rate: submitted vs total active assignments (expected evaluations)
  // Use submitted evaluations vs total evaluations in the active period (submitted + draft)
  const totalEvaluations = await prisma.evaluationRecord.count({
    where: activePeriod ? { periodId: activePeriod.id } : undefined,
  });
  const completionRate = totalEvaluations > 0 ? (submittedEvaluations / totalEvaluations) * 100 : 0;

  const stats = [
    { label: "พนักงานทั้งหมด", value: totalEmployees, icon: "👥", gradient: "#5D786C", shadow: "rgba(93,120,108,0.25)" },
    { label: "ผู้ประเมิน", value: totalEvaluators, icon: "📋", gradient: "#6F8F82", shadow: "rgba(111,143,130,0.25)" },
    { label: "ทีมหลัก", value: totalMainTeams, icon: "🏛️", gradient: "#477A61", shadow: "rgba(71,122,97,0.25)" },
    { label: "ประเมินแล้ว", value: submittedEvaluations, icon: "✓", gradient: "#557B78", shadow: "rgba(85,123,120,0.25)" },
    { label: "รอการประเมิน", value: Math.max(0, totalEvaluations - submittedEvaluations), icon: "⏳", gradient: "#91A99E", shadow: "rgba(145,169,158,0.25)" },
    { label: "แผนก", value: totalDepartments, icon: "🏢", gradient: "#B8C9C0", shadow: "rgba(184,201,192,0.25)" },
  ];

  const quickActions = [
    { label: "เพิ่มพนักงาน", href: "/employees", icon: "👤", desc: "เพิ่มพนักงานใหม่เข้าระบบ" },
    { label: "สร้างรอบประเมิน", href: "/evaluation-periods", icon: "📅", desc: "กำหนดรอบการประเมิน" },
    { label: "ดูรายงาน", href: "/reports/performance", icon: "📊", desc: "รายงานผลการประเมิน" },
    { label: "Audit Log", href: "/audit-logs", icon: "🔍", desc: "ประวัติการดำเนินการ" },
  ];

  const recent = await prisma.evaluationRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      employee: { select: { name: true, employeeCode: true } },
      evaluatorUser: { select: { fullName: true } },
      period: { select: { name: true } },
    },
  });

  const recentRows = recent.map((r) => ({
    id: r.id,
    employeeName: r.employee.name,
    employeeCode: r.employee.employeeCode,
    evaluatorName: r.evaluatorUser.fullName,
    periodName: r.period.name,
    finalPercentage: r.finalPercentage ? Number(r.finalPercentage).toFixed(1) : null,
    grade: r.grade,
    status: r.status,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ================= CENTERED TITLE & DESCRIPTION ================= */}
      <header className="text-center py-6 border-b border-border">
        <div className="inline-flex items-center justify-center gap-3 mb-3">
          <span className="w-10 h-[1.5px] bg-primary" />
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="w-10 h-[1.5px] bg-primary" />
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
          แดชบอร์ดภาพรวมการประเมิน
        </h1>
        
        <p className="mt-2 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto font-normal">
              ระบบประเมินผลการปฏิบัติงานพนักงานประจำรอบ • Performance Evaluation
        </p>

        {activePeriod && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary border border-primary text-xs font-semibold text-primary">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>รอบการประเมินปัจจุบัน: <strong>{activePeriod.name}</strong></span>
          </div>
        )}
      </header>

      {/* Stat cards */}
      <StatCards stats={stats} />

      {/* Middle row: Completion Rate & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completion rate Card */}
        <div className="bg-card border border-primary/40 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                อัตราความสำเร็จ
              </h3>
              <span className="text-xs font-semibold text-primary">COMPLETION</span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="text-4xl sm:text-5xl font-bold text-foreground">
                  {completionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  เสร็จสิ้น {submittedEvaluations} จากทั้งหมด {totalEvaluations} รายการ
                </p>
              </div>

              {/* Minimalist Circular Meter */}
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90 flex-shrink-0">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--secondary)" strokeWidth="3.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${completionRate} ${100 - completionRate}`}
                />
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground text-center">
            รอบประเมินกำลังดำเนินการตามเกณฑ์มาตรฐาน
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="lg:col-span-2 bg-card border border-primary/40 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              ทางลัดการทำงาน
            </h3>
            <span className="text-xs font-semibold text-primary">QUICK ACTIONS</span>
          </div>
          <QuickActions actions={quickActions} />
        </div>
      </div>

      {/* Recent Evaluations Table */}
      <RecentTable rows={recentRows} />
    </div>
  );
}

async function EvaluatorDashboard({ userId, userName }: { userId: string; userName: string }) {
  const activePeriod = await prisma.evaluationPeriod.findFirst({ where: { status: "ACTIVE" } });

  const myEvaluations = activePeriod
    ? await prisma.evaluationRecord.findMany({
        where: { evaluatorUserId: userId, periodId: activePeriod.id },
        include: { employee: { select: { id: true, name: true, employeeCode: true } } },
        orderBy: { evalStartDate: "desc" },
        take: 5,
      })
    : [];

  const assignments = await prisma.evaluatorAssignment.findMany({
    where: { evaluatorUserId: userId, isActive: true },
    include: {
      targetEmployee: { select: { id: true, name: true } },
      targetDepartment: { select: { id: true, name: true } },
      targetTeam: { select: { id: true, name: true } },
    },
    take: 10,
  });

  const submittedCount = myEvaluations.filter((e) => e.status === "SUBMITTED").length;
  const draftCount = myEvaluations.filter((e) => e.status === "DRAFT").length;

  const evalStats = [
    { label: "การมอบหมายของฉัน", value: assignments.length, icon: "📋", gradient: "#5D786C", shadow: "rgba(93,120,108,0.25)" },
    { label: "ประเมินแล้วในรอบนี้", value: submittedCount, icon: "✓", gradient: "#477A61", shadow: "rgba(71,122,97,0.25)" },
    { label: "ฉบับร่าง", value: draftCount, icon: "📝", gradient: "#91A99E", shadow: "rgba(145,169,158,0.25)" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Centered Evaluator Header */}
      <header className="text-center py-6 border-b border-border">
        <div className="inline-flex items-center justify-center gap-3 mb-3">
          <span className="w-10 h-[1.5px] bg-primary" />
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="w-10 h-[1.5px] bg-primary" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          สวัสดี, {userName}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {activePeriod ? `รอบการประเมิน: ${activePeriod.name}` : "ไม่มีรอบการประเมินที่เปิดอยู่"}
        </p>
      </header>

      <StatCards stats={evalStats} />

      <div className="bg-card border border-primary/40 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border pb-3">
          การมอบหมายของฉัน
        </h3>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">ยังไม่มีการมอบหมายในระบบ</p>
        ) : (
          <div className="divide-y divide-border">
            {assignments.map((a) => (
              <div key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {a.assignmentType === "EMPLOYEE" && a.targetEmployee?.name}
                    {a.assignmentType === "DEPARTMENT" && `แผนก: ${a.targetDepartment?.name}`}
                    {a.assignmentType === "TEAM" && `ทีม: ${a.targetTeam?.name}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.assignmentType === "EMPLOYEE" ? "พนักงานรายบุคคล" : a.assignmentType}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs bg-secondary border border-primary text-primary font-semibold">
                  น้ำหนัก {Number(a.weightPercentage).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 pt-4 border-t border-border">
          <Link
            href="/evaluations"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-foreground"
          >
            <span>ไปยังหน้ารายการประเมิน</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
