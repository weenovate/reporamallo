import { Prisma, type PrismaClient, type AuditAction } from '@prisma/client';
import { prisma } from '@/lib/db';

type Client = PrismaClient | Prisma.TransactionClient;

export type AuditEntry = {
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
};

export async function recordAudit(entry: AuditEntry, client: Client = prisma): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before ?? Prisma.JsonNull,
      after: entry.after ?? Prisma.JsonNull,
    },
  });
}
