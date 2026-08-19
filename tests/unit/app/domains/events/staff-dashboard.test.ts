import { describe, expect, test } from 'vitest'

import type { AccountStaffEventSummary } from '#shared/domains/account/account-staff-page'
import { formatStaffDashboardRole } from '../../../../../app/domains/events/staff-dashboard'

function createEvent(role: AccountStaffEventSummary['staff']['role']): AccountStaffEventSummary {
  return {
    id: 'event-1',
    eventType: 'hackathon',
    slug: 'codex-vienna',
    name: 'Codex Vienna',
    state: 'registration_open',
    city: 'Vienna',
    country: 'Austria',
    startsAt: '2026-04-01T10:00:00.000Z',
    registrationOpensAt: '2026-03-01T10:00:00.000Z',
    registrationClosesAt: '2026-03-30T10:00:00.000Z',
    submissionClosesAt: null,
    maxTeamMembers: 4,
    staff: {
      role,
      isStaff: true,
      staffTrackId: null
    }
  }
}

describe('formatStaffDashboardRole', () => {
  test('labels event-admin staff assignments explicitly', () => {
    expect(formatStaffDashboardRole(createEvent('event_admin'))).toBe('Event admin staff')
  })

  test('labels staff assignments as staff', () => {
    expect(formatStaffDashboardRole(createEvent('staff'))).toBe('Staff')
  })
})
