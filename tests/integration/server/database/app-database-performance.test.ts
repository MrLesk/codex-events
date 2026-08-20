import { performance } from 'node:perf_hooks'

import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'

import participantsPageGetHandler from '../../../../server/api/account/events/[slug]/participants.get'
import { createNonHttpDatabase } from '../../../../server/database/non-http'
import { eventRoleAssignments, events, users } from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'
import { createTestD1Database } from '../../../support/backend/fake-d1'

function median(samples: number[]) {
  const sorted = [...samples].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

function measure(operation: () => unknown, iterations: number) {
  const samples: number[] = []

  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now()
    operation()
    samples.push(performance.now() - startedAt)
  }

  return median(samples)
}

describe('AppDatabase facade hot path', () => {
  test('captures construction and representative builder timings for before/after comparison', async () => {
    const d1Database = createTestD1Database()
    await d1Database.getDatabase()

    try {
      const constructionMedianMs = measure(
        () => createNonHttpDatabase(d1Database as never),
        40
      )
      const database = createNonHttpDatabase(d1Database as never)
      const builderMedianMs = measure(() => {
        database
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, 'benchmark-user'))
          .limit(1)
          .toSQL()
      }, 100)
      const relationalLookupMedianMs = measure(() => {
        database.query.users.findMany({ columns: { id: true } })
      }, 100)

      console.info('[TASK-432.9] AppDatabase medians (ms)', {
        constructionMedianMs: constructionMedianMs.toFixed(3),
        builderMedianMs: builderMedianMs.toFixed(3),
        relationalLookupMedianMs: relationalLookupMedianMs.toFixed(3)
      })
      expect(constructionMedianMs).toBeGreaterThanOrEqual(0)
      expect(builderMedianMs).toBeGreaterThanOrEqual(0)
      expect(relationalLookupMedianMs).toBeGreaterThanOrEqual(0)
    } finally {
      await d1Database.close()
    }
  })

  test('captures a representative authenticated Participants page wall-time median', async () => {
    const harness = createApiRouteTestHarness({
      routes: [{
        method: 'get',
        path: '/api/account/events/:slug/participants',
        handler: participantsPageGetHandler
      }],
      sessionUser: {
        sub: 'auth0|benchmark_participants_admin',
        email: 'benchmark_participants_admin@example.com',
        name: 'Benchmark Participants Admin'
      }
    })

    try {
      const now = '2026-08-19T12:00:00.000Z'
      await harness.database.insert(users).values({
        id: 'benchmark_participants_admin',
        auth0Subject: 'auth0|benchmark_participants_admin',
        email: 'benchmark_participants_admin@example.com',
        displayName: 'Benchmark Participants Admin'
      })
      await harness.database.insert(events).values({
        id: 'benchmark_participants_event',
        eventType: 'hackathon',
        name: 'Benchmark Participants Event',
        slug: 'benchmark-participants-event',
        description: 'A bounded benchmark fixture.',
        city: 'Vienna',
        country: 'Austria',
        address: 'Benchmark address',
        registrationOpensAt: '2026-08-15T12:00:00.000Z',
        registrationClosesAt: '2026-08-16T12:00:00.000Z',
        submissionOpensAt: '2026-08-17T12:00:00.000Z',
        submissionClosesAt: '2026-08-18T12:00:00.000Z',
        state: 'judging_preparation',
        maxTeamMembers: 4,
        createdByUserId: 'benchmark_participants_admin',
        createdAt: now,
        updatedAt: now
      })
      await harness.database.insert(eventRoleAssignments).values({
        id: 'benchmark_participants_admin_role',
        eventId: 'benchmark_participants_event',
        userId: 'benchmark_participants_admin',
        role: 'event_admin',
        isInJudgePool: false,
        isStaff: false,
        createdAt: now
      })

      await harness.request('/api/account/events/benchmark-participants-event/participants?includeEventShell=true')
      const samples: number[] = []
      for (let index = 0; index < 10; index += 1) {
        const startedAt = performance.now()
        const response = await harness.request('/api/account/events/benchmark-participants-event/participants')
        samples.push(performance.now() - startedAt)
        expect(response.status).toBe(200)
      }

      const participantsPageMedianMs = median(samples)
      console.info('[TASK-432.9] Participants page median (ms)', {
        participantsPageMedianMs: participantsPageMedianMs.toFixed(3)
      })
      expect(participantsPageMedianMs).toBeGreaterThanOrEqual(0)
    } finally {
      await harness.d1Database.close()
    }
  })
})
