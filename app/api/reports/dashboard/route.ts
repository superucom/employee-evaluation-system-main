import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/session";
import { Role } from "@prisma/client";

// GET /api/reports/dashboard
export async function GET(req: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get("periodId") ?? "";

    if (currentUser.role === Role.MANAGER) {
      // Manager dashboard data
      const periodWhere = periodId ? { id: periodId } : { status: "ACTIVE" };
      const activePeriod = await prisma.evaluationPeriod.findFirst({
        where: periodWhere as any,
        orderBy: { startDate: "desc" }, // Deterministic: pick latest ACTIVE period
      });

      const [totalEmployees, totalEvaluators, totalDepartments, totalTeams, totalPeriods, totalEvaluations, completedEvaluations] = await Promise.all([
        prisma.employee.count({ where: { deletedAt: null, status: "active" } }),
        prisma.user.count({ where: { deletedAt: null, isActive: true, role: { in: [Role.EVALUATOR, Role.SUPER, Role.SUPPORT_SUPER, Role.SUPER_CR, Role.HEAD, Role.SUPPORT_HEAD] } } }),
        prisma.department.count({ where: { deletedAt: null, isActive: true } }),
        prisma.team.count({ where: { deletedAt: null, isActive: true } }),
        prisma.evaluationPeriod.count(),
        prisma.evaluationRecord.count({ where: activePeriod ? { periodId: activePeriod.id } : {} }),
        prisma.evaluationRecord.count({ where: { status: "SUBMITTED", ...(activePeriod ? { periodId: activePeriod.id } : {}) } }),
      ]);

      // Score by department
      const scoreByDept = await prisma.evaluationRecord.groupBy({
        by: ["employeeId"],
        where: { status: "SUBMITTED", ...(activePeriod ? { periodId: activePeriod.id } : {}) },
        _avg: { finalPercentage: true },
      });

      // Monthly trend (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyTrend = await prisma.evaluationRecord.groupBy({
        by: ["periodId"],
        where: { status: "SUBMITTED", createdAt: { gte: sixMonthsAgo } },
        _avg: { finalPercentage: true },
        _count: { id: true },
      });

      return NextResponse.json({
        data: {
          stats: {
            totalEmployees,
            totalEvaluators,
            totalDepartments,
            totalTeams, // Real count from DB
            totalPeriods,
            totalEvaluations,
            completedEvaluations,
            pendingEvaluations: totalEvaluations - completedEvaluations,
            completionRate:
              totalEvaluations > 0 ? (completedEvaluations / totalEvaluations) * 100 : 0,
          },
          activePeriod,
          monthlyTrend,
        },
      });
    } else {
      // Evaluator dashboard data
      const assignments = await prisma.evaluatorAssignment.findMany({
        where: { evaluatorUserId: currentUser.id, isActive: true },
        select: {
          assignmentType: true,
          targetEmployeeId: true,
          targetDepartmentId: true,
          targetTeamId: true,
        },
      });

      const activePeriod = await prisma.evaluationPeriod.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" }, // Deterministic: pick latest ACTIVE period
      });

      const myEvaluations = await prisma.evaluationRecord.findMany({
        where: {
          evaluatorUserId: currentUser.id,
          ...(activePeriod ? { periodId: activePeriod.id } : {}),
        },
        select: { id: true, status: true, workingDaysCount: true, employeeId: true },
      });

      const completedCount = myEvaluations.filter((e) => e.status === "SUBMITTED").length;
      const draftCount = myEvaluations.filter((e) => e.status === "DRAFT").length;

      return NextResponse.json({
        data: {
          assignmentsCount: assignments.length,
          activePeriod,
          evaluations: {
            total: myEvaluations.length,
            completed: completedCount,
            draft: draftCount,
          },
        },
      });
    }
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
