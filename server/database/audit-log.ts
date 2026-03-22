import { auditLogs } from './schema'

type InsertableExecutor = Pick<ReturnType<typeof import('./client').createDatabase>, 'insert'>

export interface AuditLogEntry {
  actorUserId?: string | null
  entityType: string
  entityId: string
  action: string
  metadata?: Record<string, unknown>
  createdAt?: string
  id?: string
}

export async function writeAuditLog(executor: InsertableExecutor, entry: AuditLogEntry) {
  const record: typeof auditLogs.$inferInsert = {
    id: entry.id ?? crypto.randomUUID(),
    actorUserId: entry.actorUserId ?? null,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    metadata: entry.metadata ?? {},
    ...(entry.createdAt ? { createdAt: entry.createdAt } : {})
  }

  await executor.insert(auditLogs).values(record)

  return record
}
