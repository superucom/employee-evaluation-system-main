import { NextResponse } from "next/server";
import { requireManager } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction } from "@prisma/client";
import { syncAllEvaluatorAssignments } from "@/lib/services/auto-assignment.service";

export async function POST() {
  try {
    const manager = await requireManager();
    const count = await syncAllEvaluatorAssignments();
    await createAuditLog({ userId: manager.id, action: AuditAction.UPDATE, entityType: "EvaluatorAssignmentSync", newValue: { count } });
    return NextResponse.json({ message: "สร้างสิทธิ์การประเมินอัตโนมัติแล้ว", count });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    return NextResponse.json({ error: error.message || "เกิดข้อผิดพลาดในการ Sync" }, { status: 500 });
  }
}
