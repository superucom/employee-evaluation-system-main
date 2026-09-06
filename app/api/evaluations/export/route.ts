import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/session";
import { EvaluationStatus, Role } from "@prisma/client";

// GET /api/evaluations/export
// Returns the complete evaluator-period dataset needed by the client-side Excel exporter.
export async function GET(req: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get("periodId") ?? "";
    const requestedEvaluatorUserId = searchParams.get("evaluatorUserId") ?? "";
    const statusParam = searchParams.get("status") ?? "";

    if (!periodId) {
      return NextResponse.json({ error: "กรุณาระบุรอบการประเมิน" }, { status: 400 });
    }

    if (statusParam && !Object.values(EvaluationStatus).includes(statusParam as EvaluationStatus)) {
      return NextResponse.json({ error: "สถานะการประเมินไม่ถูกต้อง" }, { status: 400 });
    }

    const evaluatorUserId =
      currentUser.role === Role.MANAGER ? requestedEvaluatorUserId : currentUser.id;

    if (!evaluatorUserId) {
      return NextResponse.json({ error: "กรุณาระบุผู้ประเมิน" }, { status: 400 });
    }

    const records = await prisma.evaluationRecord.findMany({
      where: {
        periodId,
        evaluatorUserId,
        ...(statusParam && { status: statusParam as EvaluationStatus }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          include: {
            department: { select: { id: true, name: true, code: true } },
            team: { select: { id: true, name: true, code: true } },
          },
        },
        evaluatorUser: { select: { id: true, fullName: true, username: true } },
        period: { select: { id: true, name: true, status: true } },
        scores: {
          include: {
            question: {
              include: {
                category: { select: { id: true, name: true, sortOrder: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ data: records });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการเตรียมข้อมูล Export" }, { status: 500 });
  }
}

