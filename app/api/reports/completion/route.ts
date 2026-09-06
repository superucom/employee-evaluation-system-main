import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/session";
import { Role } from "@prisma/client";
import { getMainTeamName } from "@/lib/utils";

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

    // Get period
    const periodWhere = periodId ? { id: periodId } : { status: "ACTIVE" };
    const period = await prisma.evaluationPeriod.findFirst({ where: periodWhere as any });
    if (!period) return NextResponse.json({ error: "ไม่พบรอบการประเมิน" }, { status: 404 });

    // Get all evaluator assignments
    const assignments = await prisma.evaluatorAssignment.findMany({
      where: { isActive: true },
      include: {
        evaluatorUser: { select: { id: true, fullName: true, username: true } },
        targetEmployee: { select: { id: true } },
        targetDepartment: { select: { id: true } },
        targetTeam: {
          select: {
            id: true,
            name: true,
            code: true,
            departmentId: true,
          },
        },
      },
    });

    // Get all employees
    const employees = await prisma.employee.findMany({
      where: {
        deletedAt: null,
        status: "active",
        ...(departmentId && { departmentId }),
        ...(teamId && { teamId }),
      },
      include: {
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true, code: true, departmentId: true } },
        evaluationRecords: {
          where: { periodId: period.id, status: "SUBMITTED" },
          select: { evaluatorUserId: true, evaluatorUser: { select: { id: true, fullName: true, username: true } } },
        },
      },
    });

    const completionData = employees.map((emp) => {
      // Find expected assignments for this employee
      const mainTeamLabel = emp.team ? getMainTeamName(emp.team) : "";
      
      const expectedEvaluatorsMap = new Map<string, { id: string; name: string; weight: number }>();

      for (const a of assignments) {
        let isMatch = false;
        if (a.assignmentType === "EMPLOYEE" && a.targetEmployeeId === emp.id) {
          isMatch = true;
        } else if (a.assignmentType === "DEPARTMENT" && a.targetDepartmentId === emp.departmentId) {
          isMatch = true;
        } else if (a.assignmentType === "TEAM" && a.targetTeam) {
          if (a.targetTeam.id === emp.teamId || (mainTeamLabel && getMainTeamName(a.targetTeam) === mainTeamLabel)) {
            // Check if department matches
            if (a.targetTeam.departmentId === emp.departmentId) {
              isMatch = true;
            }
          }
        }

        if (isMatch && a.evaluatorUser) {
          const evalId = a.evaluatorUser.id;
          const weightScore = (Number(a.weightPercentage) / 100) * 15;
          if (!expectedEvaluatorsMap.has(evalId)) {
            expectedEvaluatorsMap.set(evalId, {
              id: evalId,
              name: a.evaluatorUser.fullName,
              weight: weightScore,
            });
          }
        }
      }

      const expectedEvaluators = Array.from(expectedEvaluatorsMap.values());
      const submittedEvaluatorIds = new Set(emp.evaluationRecords.map((r) => r.evaluatorUserId));

      let completedScore = 0;
      let totalExpectedScore = 0;
      const pendingEvaluators: { id: string; name: string; weight: number }[] = [];
      const completedEvaluators: { id: string; name: string; weight: number }[] = [];

      if (expectedEvaluators.length > 0) {
        expectedEvaluators.forEach((ev) => {
          totalExpectedScore += ev.weight;
          if (submittedEvaluatorIds.has(ev.id)) {
            completedScore += ev.weight;
            completedEvaluators.push(ev);
          } else {
            pendingEvaluators.push(ev);
          }
        });
      } else {
        // Fallback if no specific assignment: each evaluation submitted counts towards completion
        totalExpectedScore = 15;
        if (emp.evaluationRecords.length > 0) {
          completedScore = 15;
          emp.evaluationRecords.forEach((r) => {
            if (r.evaluatorUser) {
              completedEvaluators.push({ id: r.evaluatorUser.id, name: r.evaluatorUser.fullName, weight: 15 });
            }
          });
        }
      }

      // Format scores to 1 decimal place
      completedScore = Number(completedScore.toFixed(1));
      totalExpectedScore = Number(totalExpectedScore.toFixed(1)) || 15;
      const isComplete = completedScore >= 15 || (expectedEvaluators.length > 0 && pendingEvaluators.length === 0);

      return {
        employee: { id: emp.id, name: emp.name, employeeCode: emp.employeeCode },
        department: emp.department,
        team: emp.team,
        completedScore,
        totalExpectedScore: 15,
        isComplete,
        completedEvaluators,
        pendingEvaluators,
      };
    });

    const completedCount = completionData.filter((d) => d.isComplete).length;
    const overall = {
      totalEmployees: employees.length,
      completedEmployees: completedCount,
    };

    return NextResponse.json({ data: completionData, period, overall });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
