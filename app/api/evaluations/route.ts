import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/session";
import { AuditAction, EvaluationStatus, Role } from "@prisma/client";
import { createAuditLog } from "@/lib/services/audit.service";

// GET /api/evaluations
export async function GET(req: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get("periodId") ?? "";
    const status = searchParams.get("status") ?? "";
    const employeeId = searchParams.get("employeeId") ?? "";
    const evaluatorUserId = searchParams.get("evaluatorUserId") ?? "";

    const isManager = currentUser.role === Role.MANAGER;

    const where: any = {
      ...(periodId && { periodId }),
      ...(status && { status: status as EvaluationStatus }),
      ...(employeeId && { employeeId }),
      ...(!isManager && { evaluatorUserId: currentUser.id }),
      ...(isManager && evaluatorUserId && { evaluatorUserId }),
    };

    const records = await prisma.evaluationRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            department: { select: { id: true, name: true } },
            team: { select: { id: true, name: true } },
          },
        },
        evaluatorUser: { select: { id: true, fullName: true, username: true } },
        period: { select: { id: true, name: true, status: true } },
      },
    });

    return NextResponse.json({ data: records });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// DELETE /api/evaluations (Bulk Delete)
export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const body = await req.json();
    const ids: string[] = body.ids || [];

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "กรุณาระบุรายการที่ต้องการลบ" }, { status: 400 });
    }

    const isManager = currentUser.role === Role.MANAGER;

    const records = await prisma.evaluationRecord.findMany({
      where: { id: { in: ids } },
      include: { period: true },
    });

    if (records.length === 0) {
      return NextResponse.json({ error: "ไม่พบรายการที่ต้องการลบ" }, { status: 404 });
    }

    const lockedRecords = records.filter((r) => r.period.status === "LOCKED");
    if (lockedRecords.length > 0) {
      return NextResponse.json({ error: "มีบางรายการอยู่ในรอบการประเมินที่ถูกล็อกแล้ว ไม่สามารถลบได้" }, { status: 400 });
    }

    const unauthorized = records.filter((r) => {
      const isOwnDraft = r.evaluatorUserId === currentUser.id && r.status === EvaluationStatus.DRAFT;
      return !isManager && !isOwnDraft;
    });

    if (unauthorized.length > 0) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ลบบางรายการที่เลือก" }, { status: 403 });
    }

    const validIds = records.map((r) => r.id);

    await prisma.$transaction(async (tx) => {
      await tx.evaluationScore.deleteMany({ where: { recordId: { in: validIds } } });
      await tx.evaluationRecord.deleteMany({ where: { id: { in: validIds } } });
    });

    await createAuditLog({
      userId: currentUser.id,
      action: AuditAction.DELETE,
      entityType: "EvaluationRecordBatch",
      newValue: { count: validIds.length, deletedIds: validIds },
    });

    return NextResponse.json({ message: `ลบรายการประเมิน ${validIds.length} รายการเรียบร้อยแล้ว`, count: validIds.length });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการลบ" }, { status: 500 });
  }
}
