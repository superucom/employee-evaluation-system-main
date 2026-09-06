import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction, EvaluationStatus } from "@prisma/client";
import {
  calculateEvaluationScore,
  calculateSupervisorScore,
} from "@/lib/calculations/score";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const body = await req.json();

    const { periodId, isDraft, evaluations } = body;

    if (
      !periodId ||
      !Array.isArray(evaluations) ||
      evaluations.length === 0
    ) {
      return NextResponse.json({ error: "ข้อมูลการประเมินไม่ครบถ้วน" }, { status: 400 });
    }

    // Verify period exists and is not locked
    const period = await prisma.evaluationPeriod.findUnique({ where: { id: periodId } });
    if (!period) return NextResponse.json({ error: "ไม่พบรอบการประเมิน" }, { status: 404 });
    if (period.status === "LOCKED") {
      return NextResponse.json({ error: "รอบการประเมินนี้ถูกล็อกแล้ว" }, { status: 400 });
    }

    // An evaluation is submitted once per employee for the whole period.
    // Keep the period dates on the record for reporting, but do not create
    // daily records or calculate a 20-day completion count.
    const periodStartDate = period.startDate;
    const periodEndDate = period.endDate;
    const workingDaysCount = 1;

    // Get the score scale used by the supervisor assessment questions.
    const defaultScale = await prisma.scoreScale.findFirst({
      where: { isDefault: true, isActive: true },
    });
    const minScore = defaultScale?.minScore ?? 1;
    const maxScore = defaultScale?.maxScore ?? 5;

    const status = isDraft === true ? EvaluationStatus.DRAFT : EvaluationStatus.SUBMITTED;
    const submittedAt = isDraft === true ? null : new Date();

    // Prefetch all employees in ONE single query
    const empIds = evaluations.map((e: any) => e.employeeId).filter(Boolean);
    if (new Set(empIds).size !== empIds.length) {
      return NextResponse.json({ error: "ในหนึ่งคำขอห้ามมีพนักงานซ้ำกัน" }, { status: 400 });
    }
    const employees = await prisma.employee.findMany({
      where: { id: { in: empIds } },
      select: { id: true, departmentId: true, teamId: true },
    });
    const empMap = new Map(employees.map((e) => [e.id, e]));

    // Only the manager can bypass evaluator assignments. Every other role
    // must have an active employee/department/team assignment for this period.
    if (currentUser.role !== "MANAGER") {
      const assignments = await prisma.evaluatorAssignment.findMany({
        where: {
          evaluatorUserId: currentUser.id,
          isActive: true,
          OR: [{ periodId }, { periodId: null }],
        },
        select: {
          assignmentType: true,
          targetEmployeeId: true,
          targetDepartmentId: true,
          targetTeamId: true,
        },
      });

      const authorizedEmployeeIds = new Set<string>();
      for (const assignment of assignments) {
        for (const employee of employees) {
          const matches =
            (assignment.assignmentType === "EMPLOYEE" && assignment.targetEmployeeId === employee.id) ||
            (assignment.assignmentType === "DEPARTMENT" && assignment.targetDepartmentId === employee.departmentId) ||
            (assignment.assignmentType === "TEAM" && assignment.targetTeamId === employee.teamId);
          if (matches) authorizedEmployeeIds.add(employee.id);
        }
      }

      const unauthorizedEmployeeIds = empIds.filter((id: string) => !authorizedEmployeeIds.has(id));
      if (unauthorizedEmployeeIds.length > 0) {
        return NextResponse.json(
          { error: "คุณไม่มีสิทธิ์ประเมินพนักงานบางรายการในรอบนี้", employeeIds: unauthorizedEmployeeIds },
          { status: 403 }
        );
      }
    }

    // Process all employee evaluations with generous timeout & parallel insertion
    const createdRecords = await prisma.$transaction(
      async (tx) => {
        // Delete any existing records for these employees in this period by this evaluator to avoid duplicate errors
        await tx.evaluationRecord.deleteMany({
          where: {
            periodId,
            evaluatorUserId: currentUser.id,
            employeeId: { in: empIds },
          },
        });

        const createPromises = evaluations.map((item: any) => {
          const { employeeId, comment, scores } = item;
          if (!employeeId || !scores || scores.length === 0) return null;

          if (scores.length !== 3 || new Set(scores.map((score: any) => score.questionId)).size !== 3) {
            throw new Error("การประเมินจากหัวหน้างานต้องมีคำถาม 3 ข้อ รวม 15 คะแนน");
          }
          if (scores.some((score: any) => !Number.isInteger(score.scoreValue) || score.scoreValue < 1 || score.scoreValue > 5)) {
            throw new Error("คะแนนแต่ละข้อของการประเมินจากหัวหน้างานต้องอยู่ระหว่าง 1 ถึง 5");
          }

          if (!empMap.has(employeeId)) return null;

          const scoreValues = scores.map((s: any) => ({
            scoreValue: s.scoreValue,
            minScore,
            maxScore,
          }));
          const rawScore = calculateEvaluationScore(scoreValues);
          const supervisorScore = calculateSupervisorScore(scores);

          return tx.evaluationRecord.create({
            data: {
              periodId,
              employeeId,
              evaluatorUserId: currentUser.id,
              evalStartDate: periodStartDate,
              evalEndDate: periodEndDate,
              workingDaysCount,
              status,
              comment: comment || null,
              rawScore,
              // Only the supervisor section (15 points) is implemented now.
              // Final score and grade remain empty until work (65) and
              // behavior (20) scores are available.
              supervisorScore,
              weightedScore: null,
              finalPercentage: null,
              grade: null,
              submittedAt,
              scores: {
                create: scores.map((s: any) => ({
                  questionId: s.questionId,
                  scoreValue: s.scoreValue,
                  comment: s.comment || null,
                })),
              },
            },
          });
        });

        const results = await Promise.all(createPromises.filter(Boolean));
        return results;
      },
      {
        maxWait: 30000,
        timeout: 60000,
      }
    );

    await createAuditLog({
      userId: currentUser.id,
      action: isDraft ? AuditAction.CREATE : AuditAction.SUBMIT_EVALUATION,
      entityType: "EvaluationRecord",
      newValue: {
        count: createdRecords.length,
        periodId,
        evalStartDate: periodStartDate,
        evalEndDate: periodEndDate,
        status,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `บันทึกผลการประเมินพนักงาน ${createdRecords.length} คน เรียบร้อยแล้ว`,
        count: createdRecords.length,
        data: createdRecords,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN")
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    console.error("POST /api/evaluations/batch error:", error);
    return NextResponse.json(
      { error: error?.message || "เกิดข้อผิดพลาดในการบันทึกการประเมินรวม" },
      { status: 500 }
    );
  }
}
