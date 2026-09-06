import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireManager } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const manager = await requireManager();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.gradeConfig.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "ไม่พบข้อมูลเกรด" }, { status: 404 });

    const updated = await prisma.gradeConfig.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.label && { label: body.label }),
        ...(body.minPercentage !== undefined && { minPercentage: body.minPercentage }),
        ...(body.maxPercentage !== undefined && { maxPercentage: body.maxPercentage }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.UPDATE,
      entityType: "GradeConfig",
      entityId: id,
      oldValue: { label: existing.label, min: existing.minPercentage, max: existing.maxPercentage },
      newValue: body,
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const manager = await requireManager();
    const { id } = await params;

    const existing = await prisma.gradeConfig.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "ไม่พบข้อมูลเกรด" }, { status: 404 });

    await prisma.gradeConfig.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.DELETE,
      entityType: "GradeConfig",
      entityId: id,
      oldValue: { label: existing.label },
    });

    return NextResponse.json({ message: "ลบเกรดสำเร็จ" });
  } catch (error: any) {
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
