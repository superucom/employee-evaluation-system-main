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

    const existing = await prisma.evaluatorAssignment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "ไม่พบการมอบหมาย" }, { status: 404 });

    const updated = await prisma.evaluatorAssignment.update({
      where: { id },
      data: {
        ...(body.weightPercentage !== undefined && { weightPercentage: body.weightPercentage }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.UPDATE,
      entityType: "EvaluatorAssignment",
      entityId: id,
      oldValue: { weight: existing.weightPercentage },
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

    const existing = await prisma.evaluatorAssignment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "ไม่พบการมอบหมาย" }, { status: 404 });

    await prisma.evaluatorAssignment.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.DELETE,
      entityType: "EvaluatorAssignment",
      entityId: id,
    });

    return NextResponse.json({ message: "ยกเลิกการมอบหมายสำเร็จ" });
  } catch (error: any) {
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
