import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/session";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await requireAuth();
    if (currentUser.role !== Role.MANAGER) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const limit = Number(searchParams.get("limit") ?? 50);
    const userId = searchParams.get("userId") ?? "";
    const action = searchParams.get("action") ?? "";
    const entityType = searchParams.get("entityType") ?? "";
    const skip = (page - 1) * limit;

    const where: any = {
      ...(userId && { userId }),
      ...(action && { action }),
      ...(entityType && { entityType }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, username: true, fullName: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ data: logs, meta: { total, page, limit } });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
