import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/session";
import { changePasswordSchema } from "@/lib/validations/auth.schema";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await requireAuth();

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    // Get current password hash
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json({ error: "Password ปัจจุบันไม่ถูกต้อง" }, { status: 400 });
    }

    // Check new password is different
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return NextResponse.json(
        { error: "Password ใหม่ต้องแตกต่างจาก Password เดิม" },
        { status: 400 }
      );
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 12);

    // Update password and clear mustChangePassword flag
    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      },
    });

    // Audit log
    await createAuditLog({
      userId: currentUser.id,
      action: AuditAction.CHANGE_PASSWORD,
      entityType: "User",
      entityId: currentUser.id,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({
      message: "เปลี่ยน Password สำเร็จ",
      username: currentUser.username,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }
    console.error("Change password error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }
}
