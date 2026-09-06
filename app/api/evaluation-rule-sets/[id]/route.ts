import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireManager } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction } from "@prisma/client";
import { syncAllEvaluatorAssignments } from "@/lib/services/auto-assignment.service";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const manager = await requireManager();
    const { id } = await params;
    const body = await req.json();
    const existing = await prisma.evaluationRuleSet.findUnique({ where: { id }, include: { periods: true } });
    if (!existing) return NextResponse.json({ error: "ไม่พบ Rule Set" }, { status: 404 });
    if (existing.periods.some((p) => p.status === "LOCKED" || p.status === "CLOSED")) {
      return NextResponse.json({ error: "Rule Set นี้ถูกใช้งานกับรอบที่ล็อกแล้ว ไม่สามารถแก้ไขได้" }, { status: 400 });
    }

    const updates = Array.isArray(body.rules) ? body.rules : [];
    const totalPoints = Number(body.totalPoints ?? existing.totalPoints);
    const sums = new Map<string, number>();
    for (const rule of updates) {
      if (rule.isActive === false) continue;
      sums.set(rule.targetGroup, (sums.get(rule.targetGroup) || 0) + Number(rule.weightPoints));
    }
    for (const [group, sum] of sums) {
      if (Math.abs(sum - totalPoints) > 0.01) return NextResponse.json({ error: `กลุ่ม ${group} ต้องมีคะแนนรวม ${totalPoints} คะแนน` }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.evaluationRule.updateMany({ where: { ruleSetId: id }, data: { isActive: false } });
      for (const rule of updates) {
        await tx.evaluationRule.upsert({
          where: { ruleSetId_code: { ruleSetId: id, code: String(rule.code) } },
          update: { targetGroup: rule.targetGroup, evaluatorRole: rule.evaluatorRole, evaluatorScope: rule.evaluatorScope, categoryId: rule.categoryId || null, weightPoints: Number(rule.weightPoints), selectionMode: rule.selectionMode || "AUTO", sortOrder: Number(rule.sortOrder || 0), isActive: rule.isActive !== false },
          create: { ruleSetId: id, code: String(rule.code), targetGroup: rule.targetGroup, evaluatorRole: rule.evaluatorRole, evaluatorScope: rule.evaluatorScope, categoryId: rule.categoryId || null, weightPoints: Number(rule.weightPoints), selectionMode: rule.selectionMode || "AUTO", sortOrder: Number(rule.sortOrder || 0), isActive: rule.isActive !== false },
        });
      }
      return tx.evaluationRuleSet.update({ where: { id }, data: { totalPoints } });
    });

    await createAuditLog({ userId: manager.id, action: AuditAction.UPDATE, entityType: "EvaluationRuleSet", entityId: id, newValue: { totalPoints, ruleCount: updates.length } });
    await syncAllEvaluatorAssignments();
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
