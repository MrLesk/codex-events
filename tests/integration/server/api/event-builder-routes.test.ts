import { afterEach, describe, expect, test } from 'vitest'

import { eq } from 'drizzle-orm'

import { eventBalanceEngineVersion } from '../../../../shared/domains/events/builder-scoring'
import eventPatchHandler from '../../../../server/api/events/[eventId]/index.patch'
import eventsPostHandler from '../../../../server/api/events/index.post'
import publicEventDetailGetHandler from '../../../../server/api/public/events/[slug]/index.get'
import { events, users } from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

describe('event builder creation flow routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  function createHarness() {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events', handler: eventsPostHandler },
        { method: 'patch', path: '/api/events/:eventId', handler: eventPatchHandler },
        { method: 'get', path: '/api/public/events/:slug', handler: publicEventDetailGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })

    harnesses.push(harness)

    return harness
  }

  async function seedPlatformAdmin(harness: ReturnType<typeof createApiRouteTestHarness>) {
    await harness.database.insert(users).values({
      id: 'platform_admin',
      auth0Subject: 'auth0|platform_admin',
      email: 'platform-admin@example.com',
      displayName: 'Platform Admin',
      isPlatformAdmin: true
    })
  }

  const builderCreateBody = {
    eventType: 'meetup',
    creationFlow: 'builder',
    name: 'Builder Meetup',
    slug: 'builder-meetup',
    description: 'Assembled with the event builder.',
    agendaItems: [
      {
        id: 'block_1',
        startsAt: '2026-04-10T18:00:00.000Z',
        endsAt: '2026-04-10T18:30:00.000Z',
        title: 'Opening Talk',
        details: null,
        displayOrder: 0,
        builderBlockType: 'talk'
      },
      {
        id: 'block_2',
        startsAt: '2026-04-10T18:30:00.000Z',
        endsAt: '2026-04-10T19:15:00.000Z',
        title: 'Networking',
        details: null,
        displayOrder: 1,
        builderBlockType: 'networking'
      }
    ],
    city: 'Vienna',
    country: 'Austria',
    address: 'Karlsplatz 1',
    registrationOpensAt: '2026-03-25T12:00:00.000Z',
    registrationClosesAt: '2026-04-10T18:00:00.000Z'
  }

  test('POST /api/events persists builder flow, balance score, and annotations', async () => {
    const harness = createHarness()

    await seedPlatformAdmin(harness)

    const response = await harness.request('/api/events', {
      method: 'POST',
      body: JSON.stringify(builderCreateBody)
    })

    expect(response.status).toBe(200)

    const payload = await response.json()

    expect(payload.data.creationFlow).toBe('builder')
    expect(typeof payload.data.balanceScore).toBe('number')
    expect(payload.data.balanceScore).toBeGreaterThanOrEqual(0)
    expect(payload.data.balanceScore).toBeLessThanOrEqual(100)
    expect(payload.data.balanceBreakdown).toMatchObject({ engineVersion: eventBalanceEngineVersion })
    expect(payload.data.agendaItems[0].builderBlockType).toBe('talk')

    const storedEvent = await harness.database.query.events.findFirst({
      where: eq(events.slug, 'builder-meetup')
    })

    expect(storedEvent?.creationFlow).toBe('builder')
    expect(storedEvent?.balanceScore).toBe(payload.data.balanceScore)
    expect(storedEvent?.agendaItemsJson).toContain('builderBlockType')
  })

  test('POST /api/events without creationFlow stays classic and still gets a score', async () => {
    const harness = createHarness()

    await seedPlatformAdmin(harness)

    const { creationFlow: _creationFlow, ...classicBody } = builderCreateBody
    const response = await harness.request('/api/events', {
      method: 'POST',
      body: JSON.stringify({ ...classicBody, slug: 'classic-meetup' })
    })

    expect(response.status).toBe(200)

    const payload = await response.json()

    expect(payload.data.creationFlow).toBe('classic')
    expect(typeof payload.data.balanceScore).toBe('number')
  })

  test('PATCH keeps the flow immutable, recomputes the score, and round-trips annotations', async () => {
    const harness = createHarness()

    await seedPlatformAdmin(harness)

    const createResponse = await harness.request('/api/events', {
      method: 'POST',
      body: JSON.stringify(builderCreateBody)
    })
    const created = await createResponse.json()
    const initialScore = created.data.balanceScore

    const patchResponse = await harness.request(`/api/events/${created.data.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        creationFlow: 'classic',
        agendaItems: [
          {
            id: 'block_1',
            startsAt: '2026-04-10T18:00:00.000Z',
            endsAt: '2026-04-10T19:00:00.000Z',
            title: 'Opening Talk',
            details: null,
            displayOrder: 0,
            builderBlockType: 'talk'
          },
          {
            id: 'block_2',
            startsAt: '2026-04-10T19:00:00.000Z',
            endsAt: '2026-04-10T20:00:00.000Z',
            title: 'Rooftop Mixing',
            details: null,
            displayOrder: 1,
            builderFocusCost: 14,
            builderEnergyDelta: -6
          }
        ]
      })
    })

    expect(patchResponse.status).toBe(200)

    const patched = await patchResponse.json()

    expect(patched.data.creationFlow).toBe('builder')
    expect(patched.data.agendaItems).toHaveLength(2)
    expect(patched.data.agendaItems[0].builderBlockType).toBe('talk')
    expect(patched.data.agendaItems[1].builderFocusCost).toBe(14)
    expect(patched.data.agendaItems[1].builderEnergyDelta).toBe(-6)
    expect(patched.data.balanceScore).not.toBe(initialScore)

    const storedEvent = await harness.database.query.events.findFirst({
      where: eq(events.id, created.data.id)
    })

    expect(storedEvent?.creationFlow).toBe('builder')
    expect(storedEvent?.balanceScore).toBe(patched.data.balanceScore)
  })

  test('public event payloads expose no builder metadata', async () => {
    const harness = createHarness()

    await seedPlatformAdmin(harness)

    const createResponse = await harness.request('/api/events', {
      method: 'POST',
      body: JSON.stringify(builderCreateBody)
    })

    expect(createResponse.status).toBe(200)

    await harness.database
      .update(events)
      .set({ state: 'registration_open' })
      .where(eq(events.slug, 'builder-meetup'))

    const publicResponse = await harness.request('/api/public/events/builder-meetup')

    expect(publicResponse.status).toBe(200)

    const publicPayload = await publicResponse.json()

    expect('creationFlow' in publicPayload.data).toBe(false)
    expect('balanceScore' in publicPayload.data).toBe(false)
    expect('balanceBreakdown' in publicPayload.data).toBe(false)

    for (const item of publicPayload.data.agendaItems) {
      expect('builderBlockType' in item).toBe(false)
      expect('builderFocusCost' in item).toBe(false)
      expect('builderEnergyDelta' in item).toBe(false)
    }
  })
})
