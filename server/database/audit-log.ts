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

export function buildAuditLogRecord(entry: AuditLogEntry) {
  return {
    id: entry.id ?? crypto.randomUUID(),
    actorUserId: entry.actorUserId ?? null,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    metadata: entry.metadata ?? {},
    ...(entry.createdAt ? { createdAt: entry.createdAt } : {})
  } satisfies typeof auditLogs.$inferInsert
}

export function buildAuditLogInsert(executor: InsertableExecutor, entry: AuditLogEntry) {
  const record = buildAuditLogRecord(entry)

  return {
    record,
    query: executor.insert(auditLogs).values(record)
  }
}

export async function writeAuditLog(executor: InsertableExecutor, entry: AuditLogEntry) {
  const { query, record } = buildAuditLogInsert(executor, entry)

  await query

  return record
}
