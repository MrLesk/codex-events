import { afterEach, describe, expect, test, vi } from 'vitest'
import { eq } from 'drizzle-orm'

import adminCreditsGetHandler from '../../../../server/api/events/[eventId]/admin/credits/index.get'
import creditClaimPostHandler from '../../../../server/api/events/[eventId]/credits/[creditId]/actions/claim.post'
import creditImportPostHandler from '../../../../server/api/events/[eventId]/credits/[creditId]/import.post'
import creditsPatchHandler from '../../../../server/api/events/[eventId]/credits/[creditId].patch'
import creditsGetHandler from '../../../../server/api/events/[eventId]/credits/index.get'
import creditsPostHandler from '../../../../server/api/events/[eventId]/credits/index.post'
import {
  auditLogs,
  eventCreditCodes,
  eventCreditOffers,
  events,
  eventTermsDocuments,
  platformDocuments,
  userApplications,
  userPlatformDocumentAcceptances,
  users
} from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

describe('TASK-220 event credit routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  async function seedCurrentPlatformConsent(
    harness: ReturnType<typeof createApiRouteTestHarness>,
    userId: string
  ) {
    const existingDocuments = await harness.database.select().from(platformDocuments)

    if (existingDocuments.length === 0) {
      await harness.database.insert(platformDocuments).values([
        {
          id: 'privacy_v1',
          documentType: 'privacy_policy',
          version: 1,
          title: 'Privacy Policy v1',
          content: 'Privacy',
          publishedAt: '2026-03-01T00:00:00.000Z'
        },
        {
          id: 'terms_v1',
          documentType: 'platform_terms',
          version: 1,
          title: 'Platform Terms v1',
          content: 'Terms',
          publishedAt: '2026-03-02T00:00:00.000Z'
        }
      ])
    }

    await harness.database.insert(userPlatformDocumentAcceptances).values([
      {
        id: `acceptance_${userId}_privacy`,
        userId,
        platformDocumentId: 'privacy_v1',
        acceptedAt: '2026-03-03T00:00:00.000Z'
      },
      {
        id: `acceptance_${userId}_terms`,
        userId,
        platformDocumentId: 'terms_v1',
        acceptedAt: '2026-03-03T00:00:00.000Z'
      }
    ])
  }

  async function seedCreditsContext(
    harness: ReturnType<typeof createApiRouteTestHarness>,
    options?: {
      eventType?: 'hackathon' | 'meetup' | 'build'
      includeApprovedApplicationFor?: string[]
      includeSubmittedApplicationFor?: string[]
    }
  ) {
    const eventType = options?.eventType ?? 'hackathon'

    await harness.database.insert(users).values([
      {
        id: 'platform_admin',
        auth0Subject: 'auth0|platform_admin',
        email: 'platform-admin@example.com',
        displayName: 'Platform Admin',
        isPlatformAdmin: true
      },
      {
        id: 'regular_user',
        auth0Subject: 'auth0|regular_user',
        email: 'regular@example.com',
        displayName: 'Regular User'
      },
      {
        id: 'other_user',
        auth0Subject: 'auth0|other_user',
        email: 'other@example.com',
        displayName: 'Other User'
      },
      {
        id: 'submitted_user',
        auth0Subject: 'auth0|submitted_user',
        email: 'submitted@example.com',
        displayName: 'Submitted User'
      }
    ])

    for (const userId of ['platform_admin', 'regular_user', 'other_user', 'submitted_user']) {
      await seedCurrentPlatformConsent(harness, userId)
    }

    await harness.database.insert(events).values({
      id: 'event_1',
      eventType,
      name: 'Fixture Event',
      slug: 'fixture-event',
      description: 'Fixture event',
      city: 'Vienna',
      country: 'Austria',
      address: 'Fixture Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: eventType === 'hackathon' ? '2026-03-23T12:00:00.000Z' : null,
      submissionClosesAt: eventType === 'hackathon' ? '2026-03-25T12:00:00.000Z' : null,
      state: 'registration_open',
      maxTeamMembers: 5,
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'platform_admin'
    })

    await harness.database.insert(eventTermsDocuments).values({
      id: 'terms_1',
      eventId: 'event_1',
      documentType: 'application_terms',
      version: 1,
      title: 'Application Terms',
      content: 'Application Terms',
      publishedAt: '2026-03-21T00:00:00.000Z'
    })

    const applicationRows = [
      ...(options?.includeApprovedApplicationFor ?? []).map((userId, index) => ({
        id: `approved_application_${index + 1}`,
        eventId: 'event_1',
        userId,
        status: 'approved' as const,
        applicationTermsDocumentId: 'terms_1',
        applicationTermsAcceptedAt: '2026-03-22T10:00:00.000Z',
        registrationDetailsJson: '{}',
        submittedAt: '2026-03-22T10:00:00.000Z',
        withdrawnAt: null,
        reviewedAt: '2026-03-22T11:00:00.000Z',
        reviewedByUserId: 'platform_admin',
        createdAt: '2026-03-22T10:00:00.000Z',
        updatedAt: '2026-03-22T11:00:00.000Z'
      })),
      ...(options?.includeSubmittedApplicationFor ?? []).map((userId, index) => ({
        id: `submitted_application_${index + 1}`,
        eventId: 'event_1',
        userId,
        status: 'submitted' as const,
        applicationTermsDocumentId: 'terms_1',
        applicationTermsAcceptedAt: '2026-03-22T10:00:00.000Z',
        registrationDetailsJson: '{}',
        submittedAt: '2026-03-22T10:00:00.000Z',
        withdrawnAt: null,
        reviewedAt: null,
        reviewedByUserId: null,
        createdAt: '2026-03-22T10:00:00.000Z',
        updatedAt: '2026-03-22T10:00:00.000Z'
      }))
    ]

    if (applicationRows.length > 0) {
      await harness.database.insert(userApplications).values(applicationRows)
    }
  }

  test('admin credit routes create, update, import, and list inventory', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/events/:eventId/admin/credits', handler: adminCreditsGetHandler },
        { method: 'post', path: '/api/events/:eventId/credits', handler: creditsPostHandler },
        { method: 'patch', path: '/api/events/:eventId/credits/:creditId', handler: creditsPatchHandler },
        { method: 'post', path: '/api/events/:eventId/credits/:creditId/import', handler: creditImportPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedCreditsContext(harness)

    const createResponse = await harness.request('/api/events/event_1/credits', {
      method: 'POST',
      body: JSON.stringify({
        name: 'OpenAI credits',
        description: 'Redeem at [provider](https://redeem.example)\n\n- Open the link\n- Claim the credits'
      })
    })
    expect(createResponse.status).toBe(200)
    const createdOfferPayload = await createResponse.json()

    const importForm = new FormData()
    importForm.append(
      'file',
      new Blob(['CODE-1\nhttps://redeem.example/token-2\n'], { type: 'text/csv' }),
      'credits.csv'
    )

    const importResponse = await harness.request(`/api/events/event_1/credits/${createdOfferPayload.data.id}/import`, {
      method: 'POST',
      body: importForm
    })
    expect(importResponse.status).toBe(200)
    expect(await importResponse.json()).toEqual({
      data: {
        importedCount: 2
      }
    })

    const updateResponse = await harness.request(`/api/events/event_1/credits/${createdOfferPayload.data.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'OpenAI credits batch 1'
      })
    })
    expect(updateResponse.status).toBe(200)

    const listResponse = await harness.request('/api/events/event_1/admin/credits')
    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toMatchObject({
      data: [
        {
          id: createdOfferPayload.data.id,
          name: 'OpenAI credits batch 1',
          description: 'Redeem at [provider](https://redeem.example)\n\n- Open the link\n- Claim the credits',
          availableCount: 2,
          claimedCount: 0,
          totalCount: 2,
          codes: [
            expect.objectContaining({ value: 'CODE-1', claimedByUser: null }),
            expect.objectContaining({ value: 'https://redeem.example/token-2', claimedByUser: null })
          ]
        }
      ]
    })

    const auditEntries = await harness.database.select().from(auditLogs)
    expect(auditEntries).toEqual([
      expect.objectContaining({ action: 'event_credit_offer.created' }),
      expect.objectContaining({ action: 'event_credit_offer.inventory_imported' }),
      expect.objectContaining({ action: 'event_credit_offer.updated' })
    ])
  })

  test('event admins can manage credits for registration-only events', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/events/:eventId/admin/credits', handler: adminCreditsGetHandler },
        { method: 'post', path: '/api/events/:eventId/credits', handler: creditsPostHandler },
        { method: 'post', path: '/api/events/:eventId/credits/:creditId/import', handler: creditImportPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedCreditsContext(harness, {
      eventType: 'meetup'
    })

    const createResponse = await harness.request('/api/events/event_1/credits', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Event coupons',
        description: 'Redeem this code at check-in.'
      })
    })
    expect(createResponse.status).toBe(200)
    const createdOfferPayload = await createResponse.json()

    const importForm = new FormData()
    importForm.append(
      'file',
      new Blob(['MEETUP-1\n'], { type: 'text/csv' }),
      'credits.csv'
    )

    const importResponse = await harness.request(`/api/events/event_1/credits/${createdOfferPayload.data.id}/import`, {
      method: 'POST',
      body: importForm
    })
    expect(importResponse.status).toBe(200)

    const listResponse = await harness.request('/api/events/event_1/admin/credits')
    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toMatchObject({
      data: [
        {
          id: createdOfferPayload.data.id,
          availableCount: 1,
          totalCount: 1,
          codes: [
            expect.objectContaining({ value: 'MEETUP-1' })
          ]
        }
      ]
    })
  })

  test('admin credit import batches large CSV uploads under D1 parameter limits', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/credits', handler: creditsPostHandler },
        { method: 'post', path: '/api/events/:eventId/credits/:creditId/import', handler: creditImportPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedCreditsContext(harness)

    const createResponse = await harness.request('/api/events/event_1/credits', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Sentry credits',
        description: 'Redeem the Sentry code in the provider console.'
      })
    })
    expect(createResponse.status).toBe(200)
    const createdOfferPayload = await createResponse.json()

    const uploadedValues = Array.from({ length: 100 }, (_, index) => `CODE-${index + 1}`)
    const importForm = new FormData()
    importForm.append(
      'file',
      new Blob([`${uploadedValues.join('\n')}\n`], { type: 'text/csv' }),
      'credits.csv'
    )

    const importResponse = await harness.request(`/api/events/event_1/credits/${createdOfferPayload.data.id}/import`, {
      method: 'POST',
      body: importForm
    })
    expect(importResponse.status).toBe(200)
    expect(await importResponse.json()).toEqual({
      data: {
        importedCount: 100
      }
    })

    const importedCodes = await harness.database.query.eventCreditCodes.findMany({
      where: eq(eventCreditCodes.creditOfferId, createdOfferPayload.data.id)
    })
    expect(importedCodes).toHaveLength(100)
    expect(new Set(importedCodes.map(code => code.value))).toEqual(new Set(uploadedValues))

    const auditEntries = await harness.database.select().from(auditLogs)
    expect(auditEntries).toEqual([
      expect.objectContaining({ action: 'event_credit_offer.created' }),
      expect.objectContaining({
        action: 'event_credit_offer.inventory_imported',
        metadata: expect.objectContaining({
          eventId: 'event_1',
          importedCount: 100
        })
      })
    ])
  })

  test('approved participants can list and claim one credit per offer', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/events/:eventId/credits', handler: creditsGetHandler },
        { method: 'post', path: '/api/events/:eventId/credits/:creditId/actions/claim', handler: creditClaimPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedCreditsContext(harness, {
      includeApprovedApplicationFor: ['regular_user']
    })

    await harness.database.insert(eventCreditOffers).values({
      id: 'credit_offer_1',
      eventId: 'event_1',
      name: 'OpenAI credits',
      description: 'Redeem the code on the [provider site](https://redeem.example).',
      displayOrder: 1,
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z'
    })
    await harness.database.insert(eventCreditCodes).values([
      {
        id: 'credit_code_1',
        creditOfferId: 'credit_offer_1',
        value: 'CODE-1',
        createdAt: '2026-03-22T12:01:00.000Z'
      },
      {
        id: 'credit_code_2',
        creditOfferId: 'credit_offer_1',
        value: 'CODE-2',
        createdAt: '2026-03-22T12:02:00.000Z'
      }
    ])

    const listResponse = await harness.request('/api/events/event_1/credits')
    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toMatchObject({
      data: [
        {
          id: 'credit_offer_1',
          description: 'Redeem the code on the [provider site](https://redeem.example).',
          availableCount: 2,
          totalCount: 2,
          claimedCode: null
        }
      ]
    })

    const claimResponse = await harness.request('/api/events/event_1/credits/credit_offer_1/actions/claim', {
      method: 'POST'
    })
    expect(claimResponse.status).toBe(200)
    expect(await claimResponse.json()).toMatchObject({
      data: {
        id: 'credit_offer_1',
        availableCount: 1,
        totalCount: 2,
        claimedCode: {
          value: 'CODE-1'
        }
      }
    })

    const secondClaimResponse = await harness.request('/api/events/event_1/credits/credit_offer_1/actions/claim', {
      method: 'POST'
    })
    expect(secondClaimResponse.status).toBe(200)
    expect(await secondClaimResponse.json()).toMatchObject({
      data: {
        claimedCode: {
          value: 'CODE-1'
        }
      }
    })

    const claimedRows = await harness.database.query.eventCreditCodes.findMany({
      where: eq(eventCreditCodes.claimedByUserId, 'regular_user')
    })
    expect(claimedRows).toHaveLength(1)

    const auditEntries = await harness.database.select().from(auditLogs)
    expect(auditEntries).toEqual([
      expect.objectContaining({ action: 'event_credit_code.claimed' })
    ])
  })

  test('approved participants can list and claim credits for registration-only events', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/events/:eventId/credits', handler: creditsGetHandler },
        { method: 'post', path: '/api/events/:eventId/credits/:creditId/actions/claim', handler: creditClaimPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedCreditsContext(harness, {
      eventType: 'build',
      includeApprovedApplicationFor: ['regular_user']
    })

    await harness.database.insert(eventCreditOffers).values({
      id: 'credit_offer_1',
      eventId: 'event_1',
      name: 'Build event coupons',
      description: 'Redeem this build-event coupon.',
      displayOrder: 1,
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z'
    })
    await harness.database.insert(eventCreditCodes).values({
      id: 'credit_code_1',
      creditOfferId: 'credit_offer_1',
      value: 'BUILD-1',
      createdAt: '2026-03-22T12:01:00.000Z'
    })

    const listResponse = await harness.request('/api/events/event_1/credits')
    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toMatchObject({
      data: [
        {
          id: 'credit_offer_1',
          totalCount: 1,
          availableCount: 1,
          claimedCode: null
        }
      ]
    })

    const claimResponse = await harness.request('/api/events/event_1/credits/credit_offer_1/actions/claim', {
      method: 'POST'
    })
    expect(claimResponse.status).toBe(200)
    expect(await claimResponse.json()).toMatchObject({
      data: {
        id: 'credit_offer_1',
        claimedCode: {
          value: 'BUILD-1'
        }
      }
    })
  })

  test('claiming credits requires an approved application', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/credits/:creditId/actions/claim', handler: creditClaimPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|submitted_user',
        email: 'submitted@example.com'
      }
    })
    harnesses.push(harness)
    await seedCreditsContext(harness, {
      includeSubmittedApplicationFor: ['submitted_user']
    })

    await harness.database.insert(eventCreditOffers).values({
      id: 'credit_offer_1',
      eventId: 'event_1',
      name: 'OpenAI credits',
      description: 'Redeem the code on the [provider site](https://redeem.example).',
      displayOrder: 1,
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/credits/credit_offer_1/actions/claim', {
      method: 'POST'
    })
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: {
        code: 'event_credit_claim_denied',
        message: 'Only approved participants can claim event credits.',
        details: {
          eventId: 'event_1',
          creditId: 'credit_offer_1',
          userId: 'submitted_user'
        }
      }
    })
  })

  test('claiming returns sold out when no unclaimed inventory remains', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/events/:eventId/credits/:creditId/actions/claim', handler: creditClaimPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      }
    })
    harnesses.push(harness)
    await seedCreditsContext(harness, {
      includeApprovedApplicationFor: ['regular_user', 'other_user']
    })

    await harness.database.insert(eventCreditOffers).values({
      id: 'credit_offer_1',
      eventId: 'event_1',
      name: 'Sentry credits',
      description: 'Redeem the code on the provider site.',
      displayOrder: 1,
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z'
    })
    await harness.database.insert(eventCreditCodes).values({
      id: 'credit_code_1',
      creditOfferId: 'credit_offer_1',
      value: 'CLAIMED-CODE',
      claimedByUserId: 'other_user',
      claimedAt: '2026-03-22T12:05:00.000Z',
      createdAt: '2026-03-22T12:01:00.000Z'
    })

    const response = await harness.request('/api/events/event_1/credits/credit_offer_1/actions/claim', {
      method: 'POST'
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: {
        code: 'event_credit_sold_out',
        message: 'No credits remain for this offer.',
        details: {
          eventId: 'event_1',
          creditId: 'credit_offer_1'
        }
      }
    })
  })
})
