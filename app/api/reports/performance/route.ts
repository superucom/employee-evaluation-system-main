import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireManager } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction, Role } from "@prisma/client";
import { calculateCompletionRate } from "@/lib/calculations/working-days";

// GET /api/reports/performance
export async function GET(req: NextRequest) {
  try {
    const currentUser = await requireAuth();
    if (currentUser.role !== Role.MANAGER) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get("periodId") ?? "";
    const departmentId = searchParams.get("departmentId") ?? "";
    const teamId = searchParams.get("teamId") ?? "";
    const employeeId = searchParams.get("employeeId") ?? "";
    const page = Number(searchParams.get("page") ?? 1);
    const limit = Number(searchParams.get("limit") ?? 50);
    const skip = (page - 1) * limit;

    const where: any = {
      status: "SUBMITTED",
      ...(periodId && { periodId }),
      ...(employeeId && { employeeId }),
      ...(departmentId && { employee: { departmentId } }),
      ...(teamId && { employee: { teamId } }),
    };

    const [records, total] = await Promise.all([
      prisma.evaluationRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ employee: { name: "asc" } }, { evalStartDate: "desc" }],
        include: {
          employee: {
            include: {
              department: { select: { id: true, name: true } },
              team: { select: { id: true, name: true } },
            },
          },
          evaluatorUser: { select: { id: true, fullName: true, username: true } },
          period: { select: { id: true, name: true } },
          scores: {
            include: {
              question: {
                include: { category: true },
              },
            },
          },
        },
      }),
      prisma.evaluationRecord.count({ where }),
    ]);

    // Group by employee to calculate summary
    const employeeSummary: Record<string, any> = {};
    for (const record of records) {
      const empId = record.employeeId;
      if (!employeeSummary[empId]) {
        employeeSummary[empId] = {
          employee: record.employee,
          period: record.period,
          evaluations: [],
          totalWeightedScore: 0,
          totalWeight: 0,
        };
      }
      employeeSummary[empId].evaluations.push({
        evaluator: record.evaluatorUser,
        rawScore: record.rawScore,
        weightedScore: record.weightedScore,
        finalPercentage: record.finalPercentage,
        grade: record.grade,
        workScore: record.workScore,
        behaviorScore: record.behaviorScore,
        supervisorScore: record.supervisorScore,
        totalScore: record.totalScore,
        evalStartDate: record.evalStartDate,
        evalEndDate: record.evalEndDate,
        workingDaysCount: record.workingDaysCount,
      });
    }

    return NextResponse.json({
      data: records,
      summary: Object.values(employeeSummary),
      meta: { total, page, limit },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
