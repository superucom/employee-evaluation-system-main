import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireManager } from "@/lib/auth/session";
import { createEvaluatorAssignmentSchema } from "@/lib/validations/evaluation.schema";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction } from "@prisma/client";
import { validateTotalWeight, getTotalWeight } from "@/lib/calculations/score";
import { getMainTeamName } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const { searchParams } = new URL(req.url);
    const requestedEvaluatorUserId = searchParams.get("evaluatorUserId") ?? "";
    const evaluatorUserId = currentUser.role === "MANAGER" ? requestedEvaluatorUserId : currentUser.id;
    if (currentUser.role !== "MANAGER" && requestedEvaluatorUserId && requestedEvaluatorUserId !== currentUser.id) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ดูสิทธิ์ของผู้ประเมินคนอื่น" }, { status: 403 });
    }
    const periodId = searchParams.get("periodId") ?? "";
    const targetEmployeeId = searchParams.get("targetEmployeeId") ?? "";

    const assignments = await prisma.evaluatorAssignment.findMany({
      where: {
        isActive: true,
        ...(evaluatorUserId && { evaluatorUserId }),
        ...(periodId && { periodId }),
        ...(targetEmployeeId && { targetEmployeeId }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        evaluatorUser: { select: { id: true, fullName: true, username: true, role: true } },
        targetEmployee: {
          select: {
            id: true,
            name: true,
            nickname: true,
            employeeCode: true,
          },
        },
        targetDepartment: { select: { id: true, name: true } },
        targetTeam: {
          select: {
            id: true,
            name: true,
            code: true,
            department: { select: { id: true, name: true, code: true } },
          },
        },
        period: { select: { id: true, name: true } },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ data: assignments });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const manager = await requireManager();
    const body = await req.json();

    // Support bulk assignment with weight validation
    const assignments = Array.isArray(body) ? body : [body];

    const parsed = assignments.map((a) => createEvaluatorAssignmentSchema.safeParse(a));
    const errors = parsed.filter((p) => !p.success);
    if (errors.length > 0) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const validData = parsed.map((p) => (p as any).data);

    // Validate total weight = 100% for same target
    const weights = validData.map((d: any) => Number(d.weightPercentage));
    if (weights.length > 0) {
      const total = getTotalWeight(weights);
      if (!validateTotalWeight(weights) && weights.length > 1) {
        return NextResponse.json({
          error: `น้ำหนักรวมต้องเท่ากับ 100% (ปัจจุบัน: ${total.toFixed(2)}%)`,
        }, { status: 400 });
      }
    }

    const createdRecords: any[] = [];

    for (const data of validData) {
      if (data.assignmentType === "TEAM" && data.targetMainTeam) {
        const suffix = String(data.targetMainTeam).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-1);
        const targetMainLabel = suffix === "A" ? "ทีม A" : suffix === "B" ? "ทีม B" : suffix === "C" ? "ทีม C" : "ทีม D";
        const excludedDeptIds: string[] = Array.isArray(data.excludedDepartmentIds) ? data.excludedDepartmentIds : [];

        const allTeams = await prisma.team.findMany({
          where: {
            deletedAt: null,
            ...(excludedDeptIds.length > 0 && {
              departmentId: { notIn: excludedDeptIds },
            }),
          },
        });

        // Strictly match teams belonging ONLY to the selected main team
        const matchedTeams = allTeams.filter((t) => getMainTeamName(t) === targetMainLabel);

        for (const t of matchedTeams) {
          const rec = await prisma.evaluatorAssignment.create({
            data: {
              evaluatorUserId: data.evaluatorUserId,
              assignmentType: "TEAM",
              targetTeamId: t.id,
              periodId: data.periodId ?? null,
              categoryId: data.categoryId ?? null,
              weightPercentage: data.weightPercentage,
            },
          });
          createdRecords.push(rec);
        }
        const existing = await prisma.evaluatorAssignment.findFirst({
          where: {
            evaluatorUserId: data.evaluatorUserId,
            assignmentType: data.assignmentType,
            targetEmployeeId: data.targetEmployeeId ?? null,
            targetDepartmentId: data.targetDepartmentId ?? null,
            targetTeamId: data.targetTeamId ?? null,
            periodId: data.periodId ?? null,
            categoryId: data.categoryId ?? null,
            isActive: true,
          },
        });

        if (existing) {
          const rec = await prisma.evaluatorAssignment.update({
            where: { id: existing.id },
            data: {
              weightPercentage: data.weightPercentage,
            },
          });
          createdRecords.push(rec);
        } else {
          const rec = await prisma.evaluatorAssignment.create({
            data: {
              evaluatorUserId: data.evaluatorUserId,
              assignmentType: data.assignmentType,
              targetEmployeeId: data.targetEmployeeId ?? null,
              targetDepartmentId: data.targetDepartmentId ?? null,
              targetTeamId: data.targetTeamId ?? null,
              periodId: data.periodId ?? null,
              categoryId: data.categoryId ?? null,
              weightPercentage: data.weightPercentage,
            },
          });
          createdRecords.push(rec);
        }
      }
    }

    const created = createdRecords;

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.CREATE,
      entityType: "EvaluatorAssignment",
      newValue: { count: created.length },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
