import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireManager } from "@/lib/auth/session";
import { updateEmployeeSchema } from "@/lib/validations/employee.schema";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction } from "@prisma/client";
import { syncAllEvaluatorAssignments } from "@/lib/services/auto-assignment.service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;

    const employee = await prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        evaluationRecords: {
          orderBy: { evalStartDate: "desc" },
          take: 10,
          include: {
            evaluatorUser: { select: { id: true, fullName: true } },
            period: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!employee) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });
    return NextResponse.json({ data: employee });
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
    const body = await req.json();
    const parsed = updateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });

    // Check duplicate employee code if being changed
    if (parsed.data.employeeCode && parsed.data.employeeCode !== existing.employeeCode) {
      const duplicate = await prisma.employee.findFirst({
        where: { employeeCode: parsed.data.employeeCode, deletedAt: null, id: { not: id } },
      });
      if (duplicate) {
        return NextResponse.json({ error: "รหัสพนักงานนี้ถูกใช้งานแล้ว" }, { status: 409 });
      }
    }

    // Validate teamId belongs to the specified departmentId to prevent FK violation
    if (parsed.data.teamId && parsed.data.departmentId) {
      const team = await prisma.team.findFirst({
        where: {
          id: parsed.data.teamId,
          departmentId: parsed.data.departmentId,
          deletedAt: null,
        },
      });
      if (!team) {
        // Auto-fix: find first available team in the department
        const firstTeam = await prisma.team.findFirst({
          where: { departmentId: parsed.data.departmentId, deletedAt: null },
          orderBy: { name: "asc" },
        });
        if (!firstTeam) {
          return NextResponse.json(
            { error: "ไม่พบทีมย่อยในแผนกที่เลือก กรุณาตรวจสอบข้อมูล" },
            { status: 422 }
          );
        }
        // Use the first team in the department automatically
        (parsed.data as any).teamId = firstTeam.id;
      }
    } else if (parsed.data.teamId && !parsed.data.departmentId) {
      // teamId without departmentId — verify team exists
      const team = await prisma.team.findFirst({
        where: { id: parsed.data.teamId, deletedAt: null },
      });
      if (!team) {
        return NextResponse.json(
          { error: "ทีมย่อย (teamId) ที่เลือกไม่ถูกต้อง กรุณาเลือกทีมใหม่" },
          { status: 422 }
        );
      }
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...parsed.data,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      },
      include: {
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.UPDATE,
      entityType: "Employee",
      entityId: id,
      oldValue: { name: existing.name, status: existing.status },
      newValue: parsed.data,
    });

    let autoAssignmentCount = 0;
    try {
      autoAssignmentCount = await syncAllEvaluatorAssignments();
    } catch (syncError) {
      console.error("PUT /api/employees auto-assignment sync error:", syncError);
    }

    return NextResponse.json({ data: updated, autoAssignmentCount });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "ทีมย่อย (teamId) ไม่ตรงกับแผนก กรุณาเลือกทีมใหม่" },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const manager = await requireManager();
    const { id } = await params;

    const existing = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });

    await prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), status: "inactive" },
    });

    try {
      await syncAllEvaluatorAssignments();
    } catch (syncError) {
      console.error("DELETE /api/employees auto-assignment sync error:", syncError);
    }

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.DELETE,
      entityType: "Employee",
      entityId: id,
      oldValue: { employeeCode: existing.employeeCode, name: existing.name },
    });

    return NextResponse.json({ message: "ลบพนักงานสำเร็จ" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
