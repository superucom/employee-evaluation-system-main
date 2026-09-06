import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const body = await req.json();
    const { periodId, employeeId, excludeRecordId } = body;

    if (!periodId || !employeeId) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    // One evaluation is allowed per employee/evaluator/period.
    const existingRecord = await prisma.evaluationRecord.findFirst({
      where: {
        periodId,
        employeeId,
        evaluatorUserId: currentUser.id,
        status: { not: "DRAFT" },
        ...(excludeRecordId ? { id: { not: excludeRecordId } } : {}),
      },
      select: { id: true },
    });

    return NextResponse.json({
      workingDaysCount: 1,
      hasOverlap: Boolean(existingRecord),
      overlappingDays: existingRecord ? ["รอบการประเมินนี้"] : [],
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
