import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertHackathonSchedule,
  buildHackathonUpdatePayload,
  assertOpenRegistrationAllowed,
  assertOpenSubmissionAllowed,
  assertRoleCapabilityInvariant,
  isHackathonRolePublishedInRoster,
  serializePublishedHackathonRosterMember
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
      lumaEventApiId: null,
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
      requireLumaEmail: false,
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
      lumaEventApiId: null,
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
      requireLumaEmail: false,
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'creator_1',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z'
    }, now)).toThrowError(ApiError)
  })

  test('allows opening registration only from draft while the registration window is active', () => {
    const now = new Date('2026-03-21T13:00:00.000Z')

    expect(() => assertOpenRegistrationAllowed({
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon',
      description: 'Fixture hackathon',
      agendaItemsJson: '[]',
      backgroundImageUrl: null,
      bannerImageUrl: null,
      lumaEventUrl: null,
      lumaEventApiId: null,
      city: 'Vienna',
      country: 'Austria',
      address: 'Fixture Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'draft',
      maxTeamMembers: 5,
      participantsLimit: null,
      inPersonEvent: false,
      requireXProfile: false,
      requireLinkedinProfile: false,
      requireGithubProfile: false,
      requireChatgptEmail: false,
      requireOpenaiOrgId: false,
      requireLumaEmail: false,
      requireWhyThisHackathon: false,
      requireProofOfExecution: false,
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'creator_1',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z'
    }, now)).not.toThrow()

    expect(() => assertOpenRegistrationAllowed({
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon',
      description: 'Fixture hackathon',
      agendaItemsJson: '[]',
      backgroundImageUrl: null,
      bannerImageUrl: null,
      lumaEventUrl: null,
      lumaEventApiId: null,
      city: 'Vienna',
      country: 'Austria',
      address: 'Fixture Address',
      registrationOpensAt: '2026-03-24T12:00:00.000Z',
      registrationClosesAt: '2026-03-25T12:00:00.000Z',
      submissionOpensAt: '2026-03-25T12:00:00.000Z',
      submissionClosesAt: '2026-03-27T12:00:00.000Z',
      state: 'draft',
      maxTeamMembers: 5,
      participantsLimit: null,
      inPersonEvent: false,
      requireXProfile: false,
      requireLinkedinProfile: false,
      requireGithubProfile: false,
      requireChatgptEmail: false,
      requireOpenaiOrgId: false,
      requireLumaEmail: false,
      requireWhyThisHackathon: false,
      requireProofOfExecution: false,
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
      lumaEventApiId: null,
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
      requireLumaEmail: false,
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

  test('derives published judge and staff rosters from canonical role assignments', () => {
    expect(isHackathonRolePublishedInRoster({
      role: 'judge',
      isInJudgePool: true,
      isStaff: false
    }, 'judge')).toBe(true)

    expect(isHackathonRolePublishedInRoster({
      role: 'hackathon_admin',
      isInJudgePool: true,
      isStaff: false
    }, 'judge')).toBe(true)

    expect(isHackathonRolePublishedInRoster({
      role: 'hackathon_admin',
      isInJudgePool: false,
      isStaff: true
    }, 'staff')).toBe(true)

    expect(isHackathonRolePublishedInRoster({
      role: 'staff',
      isInJudgePool: false,
      isStaff: true
    }, 'judge')).toBe(false)
  })

  test('serializes published roster members with full-name fallback and public profile fields only', () => {
    expect(serializePublishedHackathonRosterMember({
      id: 'user_1',
      auth0Subject: 'auth0|user_1',
      email: 'hidden@example.com',
      displayName: 'Display Name',
      firstName: 'Display',
      familyName: 'Name',
      company: 'Codex Labs',
      bio: 'Builds careful systems.',
      isPlatformAdmin: true,
      xProfileUrl: 'https://x.com/display-name',
      linkedinProfileUrl: 'https://linkedin.com/in/display-name',
      githubProfileUrl: 'https://github.com/display-name',
      chatgptEmail: 'hidden-chatgpt@example.com',
      openaiOrgId: 'org-hidden',
      lumaEmail: 'hidden-luma@example.com',
      lumaUsername: 'hidden-luma',
      profileIconUpdatedAt: '2026-03-20T12:00:00.000Z',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z',
      deletedAt: null
    })).toEqual({
      id: 'user_1',
      fullName: 'Display Name',
      company: 'Codex Labs',
      bio: 'Builds careful systems.',
      xProfileUrl: 'https://x.com/display-name',
      linkedinProfileUrl: 'https://linkedin.com/in/display-name',
      githubProfileUrl: 'https://github.com/display-name',
      profileIconUpdatedAt: '2026-03-20T12:00:00.000Z'
    })

    expect(serializePublishedHackathonRosterMember({
      id: 'user_2',
      auth0Subject: 'auth0|user_2',
      email: 'fallback@example.com',
      displayName: 'Fallback Display',
      firstName: '',
      familyName: '',
      company: null,
      bio: null,
      isPlatformAdmin: false,
      xProfileUrl: null,
      linkedinProfileUrl: null,
      githubProfileUrl: null,
      chatgptEmail: null,
      openaiOrgId: null,
      lumaEmail: null,
      lumaUsername: null,
      profileIconUpdatedAt: null,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z',
      deletedAt: null
    }).fullName).toBe('Fallback Display')
  })
})
