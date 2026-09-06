import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireManager } from "@/lib/auth/session";
import { updateTeamSchema } from "@/lib/validations/organization.schema";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const manager = await requireManager();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateTeamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.team.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: "ไม่พบทีม" }, { status: 404 });

    const updated = await prisma.team.update({
      where: { id },
      data: parsed.data,
      include: { department: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.UPDATE,
      entityType: "Team",
      entityId: id,
      oldValue: { name: existing.name, isActive: existing.isActive },
      newValue: parsed.data,
    });

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

    const existing = await prisma.team.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: "ไม่พบทีม" }, { status: 404 });

    const employeeCount = await prisma.employee.count({
      where: { teamId: id, deletedAt: null, status: "active" },
    });
    if (employeeCount > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบทีมได้ เนื่องจากมีพนักงาน ${employeeCount} คนอยู่ในทีม` },
        { status: 400 }
      );
    }

    await prisma.team.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.DELETE,
      entityType: "Team",
      entityId: id,
      oldValue: { name: existing.name, code: existing.code },
    });

    return NextResponse.json({ message: "ลบทีมสำเร็จ" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
