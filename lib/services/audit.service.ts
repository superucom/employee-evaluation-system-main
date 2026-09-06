import { prisma } from "@/lib/db/client";
import { AuditAction } from "@prisma/client";

interface CreateAuditLogParams {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  ipAddress?: string;
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValue ? JSON.parse(JSON.stringify(params.oldValue)) : undefined,
        newValue: params.newValue ? JSON.parse(JSON.stringify(params.newValue)) : undefined,
        reason: params.reason,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    // Audit log failure should not break the main operation
    console.error("Failed to create audit log:", error);
  }
}

export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  userId?: string;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
}) {
  const { page = 1, limit = 50, userId, action, entityType, entityId } = params;
  const skip = (page - 1) * limit;

  const where = {
    ...(userId && { userId }),
    ...(action && { action }),
    ...(entityType && { entityType }),
    ...(entityId && { entityId }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, limit };
}
