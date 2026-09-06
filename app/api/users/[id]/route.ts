import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireManager } from "@/lib/auth/session";
import { updateUserSchema } from "@/lib/validations/user.schema";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction } from "@prisma/client";
import bcrypt from "bcryptjs";
import { syncEvaluatorAssignmentsForUser, syncAllEvaluatorAssignments } from "@/lib/services/auto-assignment.service";

// GET /api/users/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!user) return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    return NextResponse.json({ data: user });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// PUT /api/users/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const manager = await requireManager();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...parsed.data,
        departmentId: parsed.data.departmentId && parsed.data.departmentId.trim() !== "" ? parsed.data.departmentId : null,
        teamId: parsed.data.teamId && parsed.data.teamId.trim() !== "" ? parsed.data.teamId : null,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.UPDATE,
      entityType: "User",
      entityId: id,
      oldValue: { isActive: existing.isActive, role: existing.role },
      newValue: parsed.data,
    });

    let autoAssignmentCount = 0;
    try {
      autoAssignmentCount = await syncEvaluatorAssignmentsForUser(id);
    } catch (syncError) {
      console.error("PUT /api/users auto-assignment sync error:", syncError);
    }

    return NextResponse.json({ data: updated, autoAssignmentCount });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// DELETE /api/users/:id (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const manager = await requireManager();
    const { id } = await params;

    // Prevent self-delete
    if (id === manager.id) {
      return NextResponse.json({ error: "ไม่สามารถลบบัญชีของตัวเองได้" }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await prisma.evaluatorAssignment.deleteMany({
      where: { evaluatorUserId: id, source: "AUTO" },
    });

    try {
      await syncAllEvaluatorAssignments();
    } catch (syncError) {
      console.error("DELETE /api/users auto-assignment sync error:", syncError);
    }

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.DELETE,
      entityType: "User",
      entityId: id,
      oldValue: { username: existing.username },
    });

    return NextResponse.json({ message: "ลบผู้ใช้งานสำเร็จ" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
