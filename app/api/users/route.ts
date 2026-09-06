import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireManager } from "@/lib/auth/session";
import { createUserSchema, updateUserSchema } from "@/lib/validations/user.schema";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction } from "@prisma/client";
import bcrypt from "bcryptjs";
import { syncEvaluatorAssignmentsForUser } from "@/lib/services/auto-assignment.service";

// GET /api/users — List users (Manager only)
export async function GET(req: NextRequest) {
  try {
    await requireManager();

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const limit = Number(searchParams.get("limit") ?? 20);
    const search = searchParams.get("search") ?? "";
    const role = searchParams.get("role") ?? "";
    const isActive = searchParams.get("isActive");
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(search && {
        OR: [
          { username: { contains: search, mode: "insensitive" } },
          { fullName: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(role && { role }),
      ...(isActive !== null && isActive !== "" && { isActive: isActive === "true" }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ data: users, meta: { total, page, limit } });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// POST /api/users — Create user (Manager only)
export async function POST(req: NextRequest) {
  try {
    const manager = await requireManager();
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { username, password, fullName, role, departmentId, teamId } = parsed.data;

    // Check duplicate username
    const existing = await prisma.user.findFirst({
      where: { username, deletedAt: null },
    });
    if (existing) {
      return NextResponse.json({ error: "Username นี้ถูกใช้งานแล้ว" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        fullName,
        role,
        departmentId: departmentId && departmentId.trim() !== "" ? departmentId : null,
        teamId: teamId && teamId.trim() !== "" ? teamId : null,
        mustChangePassword: true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.CREATE,
      entityType: "User",
      entityId: user.id,
      newValue: { username: user.username, role: user.role },
    });

    let autoAssignmentCount = 0;
    try {
      autoAssignmentCount = await syncEvaluatorAssignmentsForUser(user.id);
    } catch (syncError) {
      console.error("POST /api/users auto-assignment sync error:", syncError);
    }

    return NextResponse.json({ data: user, autoAssignmentCount }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
