import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireManager } from "@/lib/auth/session";
import { createEvaluationQuestionSchema } from "@/lib/validations/evaluation.schema";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId") ?? "";
    const questions = await prisma.evaluationQuestion.findMany({
      where: { isActive: true, ...(categoryId && { categoryId }) },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
      include: { category: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: questions });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const manager = await requireManager();
    const body = await req.json();
    const parsed = createEvaluationQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
    }
    const question = await prisma.evaluationQuestion.create({ data: parsed.data, include: { category: { select: { id: true, name: true } } } });
    await createAuditLog({ userId: manager.id, action: AuditAction.CREATE, entityType: "EvaluationQuestion", entityId: question.id, newValue: { text: question.text } });
    return NextResponse.json({ data: question }, { status: 201 });
  } catch (error: any) {
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
