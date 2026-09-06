import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth, requireManager } from "@/lib/auth/session";
import { createScoreScaleSchema } from "@/lib/validations/evaluation.schema";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const scales = await prisma.scoreScale.findMany({
      where: { isActive: true },
      include: {
        labels: {
          orderBy: { scoreValue: "asc" },
        },
      },
    });
    return NextResponse.json({ data: scales });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const manager = await requireManager();
    const body = await req.json();
    const parsed = createScoreScaleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, minScore, maxScore, isDefault, labels } = parsed.data;

    const scale = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.scoreScale.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      return await tx.scoreScale.create({
        data: {
          name,
          minScore,
          maxScore,
          isDefault,
          labels: {
            create: labels.map((l) => ({
              scoreValue: l.scoreValue,
              label: l.label,
              description: l.description,
            })),
          },
        },
        include: { labels: true },
      });
    });

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.CREATE,
      entityType: "ScoreScale",
      entityId: scale.id,
      newValue: { name, minScore, maxScore },
    });

    return NextResponse.json({ data: scale }, { status: 201 });
  } catch (error: any) {
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
