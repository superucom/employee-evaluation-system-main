import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireManager } from "@/lib/auth/session";
import { createEvaluationPeriodSchema } from "@/lib/validations/evaluation.schema";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction, PeriodStatus } from "@prisma/client";
import { syncAllEvaluatorAssignments, getDefaultRuleSet } from "@/lib/services/auto-assignment.service";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "";

    const periods = await prisma.evaluationPeriod.findMany({
      where: {
        ...(status && { status: status as PeriodStatus }),
      },
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: { evaluationRecords: true },
        },
      },
    });

    return NextResponse.json({ data: periods });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const manager = await requireManager();
    const body = await req.json();
    const parsed = createEvaluationPeriodSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
    }

    const defaultRuleSet = await getDefaultRuleSet();
    const period = await prisma.evaluationPeriod.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        // Each employee is evaluated once per period; this is no longer a daily target.
        expectedWorkingDays: 1,
        status: PeriodStatus.DRAFT,
        ruleSetId: defaultRuleSet.id,
      },
    });

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.CREATE,
      entityType: "EvaluationPeriod",
      entityId: period.id,
      newValue: { name: period.name, startDate: period.startDate, endDate: period.endDate },
    });

    try {
      await syncAllEvaluatorAssignments();
    } catch (syncError) {
      console.error("POST /api/evaluation-periods auto-assignment sync error:", syncError);
    }

    return NextResponse.json({ data: period }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
