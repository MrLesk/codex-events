import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertHackathonSchedule,
  buildHackathonUpdatePayload,
  assertOpenRegistrationAllowed,
  assertOpenSubmissionAllowed,
  assertRoleCapabilityInvariant,
  createHackathonBodySchema,
  getPublicHackathonBySlugOrThrow,
  isHackathonRolePublishedInRoster,
  serializeHackathon,
  serializePublicHackathon,
  serializePublishedHackathonRosterMember,
  updateHackathonBodySchema
} from '../../../../server/utils/hackathon-management'

function buildHackathonRecord(
  overrides: Partial<Parameters<typeof serializeHackathon>[0]> = {}
): Parameters<typeof serializeHackathon>[0] {
  return {
    id: 'hackathon_1',
    name: 'Fixture Hackathon',
    slug: 'fixture-hackathon',
    description: 'Fixture hackathon',
    agendaItemsJson: '[]',
    backgroundImageUrl: null,
    bannerImageUrl: null,
    discordServerUrl: null,
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
    blindReviewCount: 1,
    pitchReviewEnabled: false,
    blindScoreWeightPercent: 70,
    pitchScoreWeightPercent: 30,
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
    updatedAt: '2026-03-20T10:00:00.000Z',
    ...overrides
  }
}

function collectDrizzleParamValues(node: unknown, values: string[] = []) {
  if (!node || typeof node !== 'object') {
    return values
  }

  if (Array.isArray(node)) {
    node.forEach(item => collectDrizzleParamValues(item, values))
    return values
  }

  const sqlNode = node as {
    constructor?: { name?: string }
    queryChunks?: unknown[]
    value?: unknown
  }

  if (sqlNode.constructor?.name === 'Param' && typeof sqlNode.value === 'string') {
    values.push(sqlNode.value)
    return values
  }

  if (Array.isArray(sqlNode.queryChunks)) {
    collectDrizzleParamValues(sqlNode.queryChunks, values)
  }

  return values
}

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
      discordServerUrl: null,
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
      discordServerUrl: null,
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
      discordServerUrl: null,
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
      discordServerUrl: null,
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
      discordServerUrl: null,
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

  test('parses configurable judging fields in create and update request schemas', () => {
    expect(createHackathonBodySchema.parse({
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon',
      description: 'Fixture hackathon',
      agendaItems: [],
      tracks: [],
      discordServerUrl: 'https://discord.gg/codex',
      city: 'Vienna',
      country: 'Austria',
      address: 'Fixture Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      blindReviewCount: '2',
      pitchReviewEnabled: 'true',
      blindScoreWeightPercent: '60',
      pitchScoreWeightPercent: '40'
    })).toMatchObject({
      discordServerUrl: 'https://discord.gg/codex',
      blindReviewCount: 2,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 60,
      pitchScoreWeightPercent: 40
    })

    expect(updateHackathonBodySchema.parse({
      discordServerUrl: 'https://discord.gg/codex',
      blindReviewCount: '0',
      pitchReviewEnabled: false,
      blindScoreWeightPercent: '100',
      pitchScoreWeightPercent: '0'
    })).toMatchObject({
      discordServerUrl: 'https://discord.gg/codex',
      blindReviewCount: 0,
      pitchReviewEnabled: false,
      blindScoreWeightPercent: 100,
      pitchScoreWeightPercent: 0
    })
  })

  test('serializes configurable judging fields for internal hackathon responses', () => {
    expect(serializeHackathon(buildHackathonRecord({
      state: 'blind_review',
      blindReviewCount: 2,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 60,
      pitchScoreWeightPercent: 40
    }))).toMatchObject({
      state: 'blind_review',
      blindReviewCount: 2,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 60,
      pitchScoreWeightPercent: 40
    })
  })

  test('hides street address in public hackathon responses', () => {
    expect(serializePublicHackathon(buildHackathonRecord({
      address: 'Fixture Address'
    }))).toMatchObject({
      city: 'Vienna',
      country: 'Austria',
      address: ''
    })
  })

  test('includes canonical judging review states in public hackathon visibility queries', async () => {
    let capturedWhere: unknown

    const database = {
      query: {
        hackathons: {
          findFirst: async ({ where }: { where: unknown }) => {
            capturedWhere = where
            return buildHackathonRecord({
              state: 'blind_review'
            })
          }
        }
      }
    } as Parameters<typeof getPublicHackathonBySlugOrThrow>[0]

    await expect(getPublicHackathonBySlugOrThrow(database, 'fixture-hackathon')).resolves.toMatchObject({
      slug: 'fixture-hackathon',
      state: 'blind_review'
    })

    const visibilityValues = collectDrizzleParamValues(capturedWhere)

    expect(visibilityValues).toContain('blind_review')
    expect(visibilityValues).toContain('pitch_review')
    expect(visibilityValues).toContain('final_deliberation')
    expect(visibilityValues).not.toContain('judge_review')
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
