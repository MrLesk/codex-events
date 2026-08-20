import { and, asc, eq, lte, sql } from 'drizzle-orm'

import { mediaCleanupOutbox } from '#server/database/schema'
import {
  managedMediaCleanupKinds,
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
  status: 'enqueued' | 'failed' | 'invalid'
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
    .where(lte(mediaCleanupOutbox.availableAt, now.toISOString()))
    .orderBy(asc(mediaCleanupOutbox.createdAt))
    .limit(options.limit ?? managedMediaCleanupOutboxBatchSize)

  const results: ManagedMediaCleanupOutboxDispatchResult[] = []

  for (const row of rows) {
    if (!isManagedMediaCleanupKind(row.kind)) {
      results.push({
        id: row.id,
        kind: row.kind,
        objectKey: row.objectKey,
        status: 'invalid',
        reason: 'outbox_kind_invalid'
      })
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
          lastAttemptedAt: now.toISOString()
        })
        .where(and(
          eq(mediaCleanupOutbox.id, row.id),
          lte(mediaCleanupOutbox.availableAt, now.toISOString())
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
