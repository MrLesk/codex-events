import { describe, expect, test } from 'vitest'

import type { SessionActor } from '../../../../../app/domains/accounts/session-actor'

import { filterStaffAccessibleEvents } from '../../../../../app/domains/events/staff-dashboard'

interface StaffDashboardEventFixture {
  id: string
  slug: string
}

function createEvent(overrides: Partial<StaffDashboardEventFixture> = {}): StaffDashboardEventFixture {
  return {
    id: 'event-1',
    slug: 'codex-vienna',
    ...overrides
  }
}

function createActor(overrides: Partial<SessionActor> = {}): SessionActor {
  return {
    kind: 'platform_user',
    isAuthenticated: true,
    hasPlatformAccount: true,
    hasAcceptedCurrentPlatformDocuments: true,
    sessionUser: {
      sub: 'auth0|staff',
      email: 'staff@example.com',
      name: 'Staff Member'
    },
    platformUser: {
      id: 'user-staff',
      email: 'staff@example.com',
      displayName: 'Staff Member',
      firstName: 'Staff',
      familyName: 'Member',
      company: null,
      bio: null,
      isPlatformAdmin: false,
      isEventOrganizer: false,
      xProfileUrl: null,
      linkedinProfileUrl: null,
      githubProfileUrl: null,
      chatgptEmail: null,
      openaiOrgId: null,
      lumaEmail: null,
      lumaUsername: null,
      profileIconUpdatedAt: null,
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      deletedAt: null
    },
    isPlatformAdmin: false,
    isEventOrganizer: false,
    eventRoles: [{
      eventId: 'event-1',
      role: 'staff',
      isInJudgePool: false,
      isStaff: true,
      createdAt: '2026-04-01T00:00:00.000Z'
    }],
    ...overrides
  }
}

describe('filterStaffAccessibleEvents', () => {
  test('includes events with an explicit staff assignment', () => {
    expect(filterStaffAccessibleEvents([
      createEvent(),
      createEvent({
        id: 'event-2',
        slug: 'codex-berlin'
      })
    ], createActor()).map(event => event.id)).toEqual(['event-1'])
  })

  test('includes events where the admin assignment is also marked as staff', () => {
    expect(filterStaffAccessibleEvents([
      createEvent()
    ], createActor({
      eventRoles: [{
        eventId: 'event-1',
        role: 'event_admin',
        isInJudgePool: false,
        isStaff: true,
        createdAt: '2026-04-01T00:00:00.000Z'
      }]
    })).map(event => event.id)).toEqual(['event-1'])
  })

  test('excludes events without staff visibility on the current assignment', () => {
    expect(filterStaffAccessibleEvents([
      createEvent()
    ], createActor({
      eventRoles: [{
        eventId: 'event-1',
        role: 'event_admin',
        isInJudgePool: false,
        isStaff: false,
        createdAt: '2026-04-01T00:00:00.000Z'
      }]
    }))).toEqual([])
  })

  test('excludes anonymous and identity-only actors', () => {
    expect(filterStaffAccessibleEvents([
      createEvent()
    ], {
      kind: 'anonymous',
      isAuthenticated: false,
      hasPlatformAccount: false,
      hasAcceptedCurrentPlatformDocuments: false,
      sessionUser: null,
      platformUser: null,
      isPlatformAdmin: false,
      isEventOrganizer: false,
      eventRoles: []
    })).toEqual([])

    expect(filterStaffAccessibleEvents([
      createEvent()
    ], {
      kind: 'authenticated_identity',
      isAuthenticated: true,
      hasPlatformAccount: false,
      hasAcceptedCurrentPlatformDocuments: false,
      sessionUser: {
        sub: 'auth0|identity',
        email: 'identity@example.com',
        name: 'Identity'
      },
      platformUser: null,
      isPlatformAdmin: false,
      isEventOrganizer: false,
      eventRoles: []
    })).toEqual([])
  })
})
