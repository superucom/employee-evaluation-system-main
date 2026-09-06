import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireManager } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction, Role } from "@prisma/client";
import { getDefaultRuleSet } from "@/lib/services/auto-assignment.service";

const VALID_ROLES = new Set(Object.values(Role));

function validateRules(rules: any[], totalPoints: number) {
  if (!Array.isArray(rules) || rules.length === 0) return "ต้องมีเกณฑ์อย่างน้อย 1 รายการ";
  const groups = new Map<string, number>();
  for (const rule of rules) {
    if (!rule.code || !rule.targetGroup || !VALID_ROLES.has(rule.evaluatorRole) || !rule.evaluatorScope) {
      return "ข้อมูลเกณฑ์ไม่ครบถ้วน";
    }
    if (rule.isActive === false) continue;
    const points = Number(rule.weightPoints);
    if (!Number.isFinite(points) || points < 0) return "คะแนนต้องเป็นตัวเลขที่ไม่ติดลบ";
    groups.set(rule.targetGroup, (groups.get(rule.targetGroup) || 0) + points);
  }
  for (const [group, sum] of groups) {
    if (Math.abs(sum - totalPoints) > 0.01) return `กลุ่ม ${group} ต้องมีคะแนนรวม ${totalPoints} คะแนน (ปัจจุบัน ${sum})`;
  }
  return null;
}

export async function GET() {
  try {
    await requireManager();
    const defaultRuleSet = await getDefaultRuleSet();
    const ruleSets = await prisma.evaluationRuleSet.findMany({
      orderBy: [{ name: "asc" }, { version: "desc" }],
      include: {
        rules: { orderBy: { sortOrder: "asc" }, include: { category: { select: { id: true, name: true } } } },
        _count: { select: { periods: true } },
      },
    });
    return NextResponse.json({ data: ruleSets, defaultRuleSetId: defaultRuleSet.id });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const manager = await requireManager();
    const body = await req.json();
    const name = String(body.name || "").trim();
    const totalPoints = Number(body.totalPoints ?? 15);
    const error = validateRules(body.rules, totalPoints);
    if (!name || !Number.isFinite(totalPoints) || totalPoints <= 0 || error) {
      return NextResponse.json({ error: error || "ข้อมูล Rule Set ไม่ถูกต้อง" }, { status: 400 });
    }

    const latest = await prisma.evaluationRuleSet.findFirst({ where: { name }, orderBy: { version: "desc" }, select: { version: true } });
    const ruleSet = await prisma.evaluationRuleSet.create({
      data: {
        name,
        version: (latest?.version || 0) + 1,
        totalPoints,
        rules: {
          create: body.rules.map((rule: any, index: number) => ({
            code: String(rule.code),
            targetGroup: String(rule.targetGroup),
            evaluatorRole: rule.evaluatorRole,
            evaluatorScope: String(rule.evaluatorScope),
            categoryId: rule.categoryId || null,
            weightPoints: Number(rule.weightPoints),
            selectionMode: String(rule.selectionMode || "AUTO"),
            sortOrder: Number(rule.sortOrder ?? index),
          })),
        },
      },
      include: { rules: true },
    });

    await createAuditLog({ userId: manager.id, action: AuditAction.CREATE, entityType: "EvaluationRuleSet", entityId: ruleSet.id, newValue: { name, version: ruleSet.version } });
    return NextResponse.json({ data: ruleSet }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
