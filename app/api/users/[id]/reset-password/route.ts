import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireManager } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit.service";
import { AuditAction } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// POST /api/users/:id/reset-password
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const manager = await requireManager();
    const { id } = await params;

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, username: true, isActive: true },
    });

    if (!user) return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    if (!user.isActive) return NextResponse.json({ error: "ผู้ใช้งานนี้ถูกระงับการใช้งาน" }, { status: 400 });

    // Generate temporary password (12 chars, readable)
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        updatedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: manager.id,
      action: AuditAction.RESET_PASSWORD,
      entityType: "User",
      entityId: id,
      newValue: { username: user.username, resetBy: manager.id },
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    });

    // Return temp password ONCE — manager must deliver it via internal channel
    return NextResponse.json({
      message: "Reset Password สำเร็จ",
      temporaryPassword: tempPassword,
      warning: "Password นี้จะแสดงเพียงครั้งเดียว กรุณาแจ้งผู้ใช้งานผ่านช่องทางภายในองค์กร",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

function generateTempPassword(): string {
  // Format: 2 uppercase + 4 digits + 2 special + 4 random chars
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$";

  const getRandom = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

  const parts = [
    getRandom(upper),
    getRandom(upper),
    getRandom(lower),
    getRandom(lower),
    getRandom(digits),
    getRandom(digits),
    getRandom(digits),
    getRandom(digits),
    getRandom(special),
  ];

  // Shuffle
  for (let i = parts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }

  return parts.join("");
}
