import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireManager } from "@/lib/auth/session";
import { updateDepartmentSchema } from "@/lib/validations/organization.schema";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const manager = await requireManager();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.evaluationCategory.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "ไม่พบหมวดหมู่" }, { status: 404 });

    const updated = await prisma.evaluationCategory.update({ where: { id }, data: body });
    await createAuditLog({ userId: manager.id, action: AuditAction.UPDATE, entityType: "EvaluationCategory", entityId: id, oldValue: { name: existing.name }, newValue: body });
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
    await prisma.evaluationCategory.update({ where: { id }, data: { isActive: false } });
    await createAuditLog({ userId: manager.id, action: AuditAction.DELETE, entityType: "EvaluationCategory", entityId: id });
    return NextResponse.json({ message: "ลบหมวดหมู่สำเร็จ" });
  } catch (error: any) {
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
