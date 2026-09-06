import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireManager } from "@/lib/auth/session";
import { createDepartmentSchema, updateDepartmentSchema } from "@/lib/validations/organization.schema";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");
    const includeTeams = searchParams.get("includeTeams") === "true";

    const departments = await prisma.department.findMany({
      where: {
        deletedAt: null,
        ...(isActive !== null && isActive !== "" && { isActive: isActive === "true" }),
      },
      orderBy: { name: "asc" },
      include: includeTeams ? {
        teams: {
          where: { deletedAt: null, isActive: true },
          orderBy: { name: "asc" },
        },
        _count: { select: { employees: { where: { deletedAt: null } } } },
      } : {
        _count: { select: { employees: { where: { deletedAt: null } } } },
      },
    });

    return NextResponse.json({ data: departments });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const manager = await requireManager();
    const body = await req.json();
    const parsed = createDepartmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.department.findFirst({
      where: { code: parsed.data.code, deletedAt: null },
    });
    if (existing) {
      return NextResponse.json({ error: "รหัสแผนกนี้ถูกใช้งานแล้ว" }, { status: 409 });
    }

    const department = await prisma.department.create({
      data: parsed.data,
    });

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.CREATE,
      entityType: "Department",
      entityId: department.id,
      newValue: { name: department.name, code: department.code },
    });

    return NextResponse.json({ data: department }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
