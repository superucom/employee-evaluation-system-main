import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireManager } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction, PeriodStatus } from "@prisma/client";
import { syncAllEvaluatorAssignments } from "@/lib/services/auto-assignment.service";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const manager = await requireManager();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.evaluationPeriod.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "ไม่พบรอบการประเมิน" }, { status: 404 });

    // Cannot edit a locked period
    if (existing.status === PeriodStatus.LOCKED && body.status !== PeriodStatus.DRAFT) {
      return NextResponse.json({ error: "รอบการประเมินนี้ถูกล็อกแล้ว" }, { status: 400 });
    }

    const auditAction = body.status === PeriodStatus.LOCKED
      ? AuditAction.LOCK_PERIOD
      : body.status === PeriodStatus.ACTIVE
        ? AuditAction.UNLOCK_PERIOD
        : AuditAction.UPDATE;

    // Business Rule: Only one ACTIVE period at a time.
    // When activating this period, auto-close all other currently ACTIVE periods.
    const updated = await prisma.$transaction(async (tx) => {
      if (body.status === PeriodStatus.ACTIVE) {
        await tx.evaluationPeriod.updateMany({
          where: {
            status: PeriodStatus.ACTIVE,
            id: { not: id },
          },
          data: { status: PeriodStatus.CLOSED },
        });
      }

      return tx.evaluationPeriod.update({
        where: { id },
        data: {
          ...(body.name && { name: body.name }),
          ...(body.status && { status: body.status }),
          // One evaluation per employee per period; daily targets are retired.
          expectedWorkingDays: 1,
          ...(body.startDate && { startDate: new Date(body.startDate) }),
          ...(body.endDate && { endDate: new Date(body.endDate) }),
        },
      });
    });

    await createAuditLog({
      userId: manager.id,
      action: auditAction,
      entityType: "EvaluationPeriod",
      entityId: id,
      oldValue: { status: existing.status, name: existing.name },
      newValue: { status: updated.status, name: updated.name },
    });

    try {
      await syncAllEvaluatorAssignments();
    } catch (syncError) {
      console.error("PUT /api/evaluation-periods auto-assignment sync error:", syncError);
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const manager = await requireManager();
    const { id } = await params;

    const existing = await prisma.evaluationPeriod.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            evaluationRecords: true,
            evaluatorAssignments: true,
            workingDayConfigs: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "ไม่พบรอบการประเมิน" }, { status: 404 });
    }

    // Clean up dependent records in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete working day configs
      await tx.workingDayConfig.deleteMany({ where: { periodId: id } });

      // 2. Disassociate or delete evaluator assignments linked specifically to this period
      await tx.evaluatorAssignment.deleteMany({ where: { periodId: id } });

      // 3. Delete evaluation scores & records
      const records = await tx.evaluationRecord.findMany({ where: { periodId: id }, select: { id: true } });
      const recordIds = records.map((r) => r.id);
      if (recordIds.length > 0) {
        await tx.evaluationScore.deleteMany({ where: { recordId: { in: recordIds } } });
        await tx.evaluationRecord.deleteMany({ where: { periodId: id } });
      }

      // 4. Delete the period itself
      await tx.evaluationPeriod.delete({ where: { id } });
    });

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.DELETE,
      entityType: "EvaluationPeriod",
      entityId: id,
      oldValue: { name: existing.name, status: existing.status },
    });

    return NextResponse.json({ success: true, message: "ลบรอบการประเมินสำเร็จ" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: error.message || "เกิดข้อผิดพลาดในการลบ" }, { status: 500 });
  }
}
