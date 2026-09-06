import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireManager } from "@/lib/auth/session";
import { createTeamSchema, updateTeamSchema } from "@/lib/validations/organization.schema";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId") ?? "";
    const isActive = searchParams.get("isActive");

    const teams = await prisma.team.findMany({
      where: {
        deletedAt: null,
        department: { deletedAt: null },
        ...(departmentId && { departmentId }),
        ...(isActive !== null && isActive !== "" && { isActive: isActive === "true" }),
      },
      orderBy: { name: "asc" },
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { employees: { where: { deletedAt: null } } } },
      },
    });

    return NextResponse.json({ data: teams });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const manager = await requireManager();
    const body = await req.json();
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.team.findFirst({
      where: { code: parsed.data.code, deletedAt: null },
    });
    if (existing) {
      return NextResponse.json({ error: "รหัสทีมนี้ถูกใช้งานแล้ว" }, { status: 409 });
    }

    const team = await prisma.team.create({
      data: parsed.data,
      include: { department: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.CREATE,
      entityType: "Team",
      entityId: team.id,
      newValue: { name: team.name, code: team.code },
    });

    return NextResponse.json({ data: team }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
