import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireManager } from "@/lib/auth/session";
import { AuditAction, EvaluationStatus, Role } from "@prisma/client";
import { createAuditLog } from "@/lib/services/audit.service";

// GET /api/evaluations/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireAuth();
    const { id } = await params;

    const record = await prisma.evaluationRecord.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            department: true,
            team: true,
          },
        },
        evaluatorUser: { select: { id: true, fullName: true, username: true } },
        period: true,
        scores: {
          include: {
            question: {
              include: { category: true },
            },
          },
        },
      },
    });

    if (!record) return NextResponse.json({ error: "ไม่พบข้อมูลการประเมิน" }, { status: 404 });

    // Evaluator can only see their own records
    if (currentUser.role === Role.EVALUATOR && record.evaluatorUserId !== currentUser.id) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    }

    return NextResponse.json({ data: record });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// PUT /api/evaluations/:id — Update (edit draft or manager override)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const record = await prisma.evaluationRecord.findUnique({
      where: { id },
      include: { period: true },
    });

    if (!record) return NextResponse.json({ error: "ไม่พบข้อมูลการประเมิน" }, { status: 404 });

    // Period must not be locked
    if (record.period.status === "LOCKED") {
      return NextResponse.json({ error: "รอบการประเมินนี้ถูกล็อกแล้ว ไม่สามารถแก้ไขได้" }, { status: 400 });
    }

    const isManager = currentUser.role === Role.MANAGER;
    const isOwner = record.evaluatorUserId === currentUser.id;

    // Evaluator can only edit their own submitted evaluations (before lock)
    if (!isManager && !isOwner) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ไขการประเมินนี้" }, { status: 403 });
    }

    // Manager override requires reason
    const isOverride = isManager && !isOwner;
    if (isOverride && !body.overrideReason) {
      return NextResponse.json({ error: "กรุณาระบุเหตุผลในการแก้ไข (Manager Override)" }, { status: 400 });
    }

    const oldValue = {
      comment: record.comment,
      rawScore: record.rawScore,
      status: record.status,
    };

    // Update record
    const updated = await prisma.$transaction(async (tx) => {
      // Update scores if provided
      if (body.scores && Array.isArray(body.scores)) {
        for (const score of body.scores) {
          await tx.evaluationScore.upsert({
            where: { recordId_questionId: { recordId: id, questionId: score.questionId } },
            update: { scoreValue: score.scoreValue, comment: score.comment },
            create: { recordId: id, questionId: score.questionId, scoreValue: score.scoreValue, comment: score.comment },
          });
        }
      }

      const savedScores = await tx.evaluationScore.findMany({
        where: { recordId: id },
        select: { scoreValue: true },
      });
      const supervisorScore = savedScores.length === 3
        ? savedScores.reduce((sum, score) => sum + score.scoreValue, 0)
        : null;

      return await tx.evaluationRecord.update({
        where: { id },
        data: {
          ...(body.comment !== undefined && { comment: body.comment }),
          supervisorScore,
          totalScore: null,
          finalPercentage: null,
          weightedScore: null,
          grade: null,
          ...(body.status && { status: body.status }),
          ...(isOverride && {
            isOverride: true,
            overrideReason: body.overrideReason,
            overriddenBy: currentUser.id,
          }),
          ...(body.status === EvaluationStatus.SUBMITTED && !record.submittedAt && {
            submittedAt: new Date(),
          }),
        },
      });
    });

    await createAuditLog({
      userId: currentUser.id,
      action: isOverride ? AuditAction.OVERRIDE : AuditAction.UPDATE,
      entityType: "EvaluationRecord",
      entityId: id,
      oldValue,
      newValue: { comment: body.comment, status: body.status },
      reason: isOverride ? body.overrideReason : undefined,
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// DELETE /api/evaluations/:id (Manager only or own draft)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireAuth();
    const { id } = await params;

    const record = await prisma.evaluationRecord.findUnique({
      where: { id },
      include: { period: true },
    });

    if (!record) return NextResponse.json({ error: "ไม่พบข้อมูลการประเมิน" }, { status: 404 });
    if (record.period.status === "LOCKED") {
      return NextResponse.json({ error: "รอบการประเมินนี้ถูกล็อกแล้ว" }, { status: 400 });
    }

    const isManager = currentUser.role === Role.MANAGER;
    const isOwnDraft = record.evaluatorUserId === currentUser.id && record.status === EvaluationStatus.DRAFT;

    if (!isManager && !isOwnDraft) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ลบการประเมินนี้" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.evaluationScore.deleteMany({ where: { recordId: id } });
      await tx.evaluationRecord.delete({ where: { id } });
    });

    await createAuditLog({
      userId: currentUser.id,
      action: AuditAction.DELETE,
      entityType: "EvaluationRecord",
      entityId: id,
      oldValue: { status: record.status, employeeId: record.employeeId },
    });

    return NextResponse.json({ message: "ลบการประเมินสำเร็จ" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
