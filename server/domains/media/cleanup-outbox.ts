import { and, asc, eq, lte, sql } from 'drizzle-orm'

import { mediaCleanupOutbox } from '#server/database/schema'
import {
  managedMediaCleanupKinds,
  isManagedMediaCleanupObjectKey,
  sendManagedMediaCleanupMessage,
  type ManagedMediaCleanupKind,
  type ManagedMediaCleanupQueueProducer
} from '#server/domains/media/cleanup-queue'
import type { AppDatabase } from '#server/database/client'

export const managedMediaCleanupOutboxBatchSize = 25

export type ManagedMediaCleanupOutboxDispatchResult = {
  id: string
  kind: string
  objectKey: string
  status: 'enqueued' | 'failed' | 'quarantined'
  reason: string
}

function isManagedMediaCleanupKind(value: string): value is ManagedMediaCleanupKind {
  return (managedMediaCleanupKinds as readonly string[]).includes(value)
}

export async function dispatchManagedMediaCleanupOutbox(options: {
  database: AppDatabase
  producer: ManagedMediaCleanupQueueProducer
  now?: Date
  limit?: number
}) {
  const now = options.now ?? new Date()
  const rows = await options.database
    .select()
    .from(mediaCleanupOutbox)
    .where(and(
      eq(mediaCleanupOutbox.status, 'pending'),
      lte(mediaCleanupOutbox.availableAt, now.toISOString())
    ))
    .orderBy(asc(mediaCleanupOutbox.createdAt))
    .limit(options.limit ?? managedMediaCleanupOutboxBatchSize)

  const results: ManagedMediaCleanupOutboxDispatchResult[] = []
  const attemptedAt = now.toISOString()

  for (const row of rows) {
    const quarantine = async (reason: string) => {
      await options.database
        .update(mediaCleanupOutbox)
        .set({
          status: 'quarantined',
          attemptCount: sql`${mediaCleanupOutbox.attemptCount} + 1`,
          lastAttemptedAt: attemptedAt,
          lastError: reason
        })
        .where(and(
          eq(mediaCleanupOutbox.id, row.id),
          eq(mediaCleanupOutbox.status, 'pending'),
          lte(mediaCleanupOutbox.availableAt, attemptedAt)
        ))

      console.error('Managed media cleanup outbox row quarantined.', {
        outboxId: row.id,
        kind: row.kind,
        reason
      })

      results.push({
        id: row.id,
        kind: row.kind,
        objectKey: row.objectKey,
        status: 'quarantined',
        reason
      })
    }

    if (!isManagedMediaCleanupKind(row.kind)) {
      await quarantine('outbox_kind_invalid')
      continue
    }

    if (!isManagedMediaCleanupObjectKey(row.kind, row.objectKey)) {
      await quarantine('outbox_object_key_invalid')
      continue
    }

    try {
      await sendManagedMediaCleanupMessage(options.producer, {
        kind: row.kind,
        objectKey: row.objectKey
      }, now)
      await options.database
        .delete(mediaCleanupOutbox)
        .where(eq(mediaCleanupOutbox.id, row.id))

      results.push({
        id: row.id,
        kind: row.kind,
        objectKey: row.objectKey,
        status: 'enqueued',
        reason: 'queue_message_sent'
      })
    } catch (error) {
      await options.database
        .update(mediaCleanupOutbox)
        .set({
          attemptCount: sql`${mediaCleanupOutbox.attemptCount} + 1`,
          lastAttemptedAt: attemptedAt,
          lastError: error instanceof Error ? error.message : 'outbox_dispatch_failed'
        })
        .where(and(
          eq(mediaCleanupOutbox.id, row.id),
          eq(mediaCleanupOutbox.status, 'pending'),
          lte(mediaCleanupOutbox.availableAt, attemptedAt)
        ))

      results.push({
        id: row.id,
        kind: row.kind,
        objectKey: row.objectKey,
        status: 'failed',
        reason: error instanceof Error ? error.message : 'outbox_dispatch_failed'
      })
    }
  }

  return results
}
