import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertHackathonSchedule,
  buildHackathonUpdatePayload,
  assertOpenSubmissionAllowed,
  assertRoleCapabilityInvariant
} from '../../../../server/utils/hackathon-management'

describe('hackathon management utilities', () => {
  test('enforces canonical role capability combinations', () => {
    expect(() => assertRoleCapabilityInvariant('judge', {
      isInJudgePool: false,
      isStaff: false
    })).toThrowError(ApiError)
    expect(() => assertRoleCapabilityInvariant('judge', {
      isInJudgePool: true,
      isStaff: false
    })).not.toThrow()

    expect(() => assertRoleCapabilityInvariant('staff', {
      isInJudgePool: false,
      isStaff: false
    })).toThrowError(ApiError)
    expect(() => assertRoleCapabilityInvariant('staff', {
      isInJudgePool: false,
      isStaff: true
    })).not.toThrow()

    expect(() => assertRoleCapabilityInvariant('hackathon_admin', {
      isInJudgePool: false,
      isStaff: false
    })).not.toThrow()
    expect(() => assertRoleCapabilityInvariant('hackathon_admin', {
      isInJudgePool: true,
      isStaff: true
    })).not.toThrow()
  })

  test('validates canonical hackathon schedule ordering', () => {
    expect(() => assertHackathonSchedule({
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z'
    })).not.toThrow()

    expect(() => assertHackathonSchedule({
      registrationOpensAt: '2026-03-24T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z'
    })).toThrowError(ApiError)
  })

  test('allows opening submission only after registration closes and while the submission window is open', () => {
    const now = new Date('2026-03-23T13:00:00.000Z')

    expect(() => assertOpenSubmissionAllowed({
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon',
      description: 'Fixture hackathon',
      agendaItemsJson: '[]',
      backgroundImageUrl: null,
      bannerImageUrl: null,
      lumaEventUrl: null,
      city: 'Vienna',
      country: 'Austria',
      address: 'Fixture Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      participantsLimit: null,
      inPersonEvent: false,
      requireXProfile: false,
      requireLinkedinProfile: false,
      requireGithubProfile: false,
      requireChatgptEmail: false,
      requireOpenaiOrgId: false,
      requireLumaProfile: false,
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'creator_1',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z'
    }, now)).not.toThrow()

    expect(() => assertOpenSubmissionAllowed({
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon',
      description: 'Fixture hackathon',
      agendaItemsJson: '[]',
      backgroundImageUrl: null,
      bannerImageUrl: null,
      lumaEventUrl: null,
      city: 'Vienna',
      country: 'Austria',
      address: 'Fixture Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-24T12:00:00.000Z',
      submissionOpensAt: '2026-03-24T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      participantsLimit: null,
      inPersonEvent: false,
      requireXProfile: false,
      requireLinkedinProfile: false,
      requireGithubProfile: false,
      requireChatgptEmail: false,
      requireOpenaiOrgId: false,
      requireLumaProfile: false,
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'creator_1',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z'
    }, now)).toThrowError(ApiError)
  })

  test('builds partial hackathon updates from agenda-only patch bodies', () => {
    const patch = buildHackathonUpdatePayload({
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon',
      description: 'Fixture hackathon',
      agendaItemsJson: '[]',
      backgroundImageUrl: null,
      bannerImageUrl: null,
      lumaEventUrl: null,
      city: 'Vienna',
      country: 'Austria',
      address: 'Fixture Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      participantsLimit: null,
      inPersonEvent: false,
      requireXProfile: false,
      requireLinkedinProfile: false,
      requireGithubProfile: false,
      requireChatgptEmail: false,
      requireOpenaiOrgId: false,
      requireLumaProfile: false,
      requireWhyThisHackathon: false,
      requireProofOfExecution: false,
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'creator_1',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z'
    }, {
      agendaItems: [
        {
          id: 'agenda_item_1',
          startsAt: '2026-03-24T09:00:00.000Z',
          endsAt: '2026-03-24T10:00:00.000Z',
          title: 'Kickoff',
          details: 'Welcome and orientation.',
          displayOrder: 1
        }
      ]
    })

    expect(patch).toMatchObject({
      agendaItemsJson: JSON.stringify([
        {
          id: 'agenda_item_1',
          startsAt: '2026-03-24T09:00:00.000Z',
          endsAt: '2026-03-24T10:00:00.000Z',
          title: 'Kickoff',
          details: 'Welcome and orientation.',
          displayOrder: 1
        }
      ])
    })
    expect(patch).not.toHaveProperty('agendaItems')
    expect(patch).not.toHaveProperty('name')
    expect(typeof patch.updatedAt).toBe('string')
  })
})
