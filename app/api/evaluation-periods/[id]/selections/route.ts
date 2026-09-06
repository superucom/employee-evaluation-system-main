import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireManager } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction, Role } from "@prisma/client";
import { syncAllEvaluatorAssignments } from "@/lib/services/auto-assignment.service";

const SLOT_ROLES: Record<string, Role> = {
  CR_SUPER: Role.SUPER,
  CR_SUPPORT_SUPER: Role.SUPPORT_SUPER,
  CR_SUPER_CR: Role.SUPER_CR,
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const selections = await prisma.periodEvaluatorSelection.findMany({ where: { periodId: id, isActive: true }, include: { evaluatorUser: { select: { id: true, username: true, fullName: true, role: true, team: { select: { name: true, code: true } } } } }, orderBy: { slotKey: "asc" } });
    return NextResponse.json({ data: selections });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const manager = await requireManager();
    const { id } = await params;
    const period = await prisma.evaluationPeriod.findUnique({ where: { id } });
    if (!period) return NextResponse.json({ error: "ไม่พบรอบการประเมิน" }, { status: 404 });
    if (period.status === "LOCKED" || period.status === "CLOSED") return NextResponse.json({ error: "รอบนี้ถูกล็อกแล้ว ไม่สามารถเปลี่ยนผู้ประเมินได้" }, { status: 400 });
    if (!Array.isArray((await req.clone().json()).selections)) return NextResponse.json({ error: "ข้อมูลผู้ประเมินไม่ถูกต้อง" }, { status: 400 });
    const body = await req.json();
    const selections = body.selections as Array<{ slotKey: string; evaluatorUserId: string; mainTeamKey?: string | null }>;

    await prisma.$transaction(async (tx) => {
      await tx.periodEvaluatorSelection.updateMany({ where: { periodId: id }, data: { isActive: false } });
      for (const selection of selections) {
        const expectedRole = SLOT_ROLES[selection.slotKey];
        if (!expectedRole) throw new Error(`ไม่รู้จักช่องผู้ประเมิน ${selection.slotKey}`);
        const user = await tx.user.findFirst({ where: { id: selection.evaluatorUserId, isActive: true, deletedAt: null } });
        if (!user || user.role !== expectedRole) throw new Error(`ผู้ใช้สำหรับ ${selection.slotKey} ไม่ตรงกับ Role ที่กำหนด`);
        await tx.periodEvaluatorSelection.upsert({ where: { periodId_slotKey: { periodId: id, slotKey: selection.slotKey } }, update: { evaluatorUserId: selection.evaluatorUserId, mainTeamKey: selection.mainTeamKey || null, isActive: true }, create: { periodId: id, slotKey: selection.slotKey, evaluatorUserId: selection.evaluatorUserId, mainTeamKey: selection.mainTeamKey || null, isActive: true } });
      }
    });

    await syncAllEvaluatorAssignments();
    await createAuditLog({ userId: manager.id, action: AuditAction.UPDATE, entityType: "PeriodEvaluatorSelection", entityId: id, newValue: { selections } });
    return NextResponse.json({ message: "บันทึกผู้ประเมินประจำรอบและสร้างสิทธิ์อัตโนมัติแล้ว" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: error.message || "เกิดข้อผิดพลาด" }, { status: 400 });
  }
}
