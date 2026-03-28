import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertInPersonAttendanceCommitment,
  assertApplicationReviewable,
  assertHackathonAllowsApplications,
  assertUserMeetsHackathonProfileRequirements,
  serializeRegistrationDetailsJson
} from '../../../../server/utils/applications'

describe('application utilities', () => {
  test('applications can only be submitted while registration is open', () => {
    expect(() => assertHackathonAllowsApplications({
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon',
      description: 'Fixture hackathon',
      backgroundImageUrl: null,
      bannerImageUrl: null,
      city: 'Vienna',
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
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'creator_1',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z'
    })).not.toThrow()

    expect(() => assertHackathonAllowsApplications({
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon',
      description: 'Fixture hackathon',
      backgroundImageUrl: null,
      bannerImageUrl: null,
      city: 'Vienna',
      address: 'Fixture Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'submission_open',
      maxTeamMembers: 5,
      participantsLimit: null,
      inPersonEvent: false,
      requireXProfile: false,
      requireLinkedinProfile: false,
      requireGithubProfile: false,
      requireChatgptEmail: false,
      requireOpenaiOrgId: false,
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'creator_1',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z'
    })).toThrowError(ApiError)
  })

  test('required profile flags are enforced against the user profile', () => {
    expect(() => assertUserMeetsHackathonProfileRequirements({
      id: 'user_1',
      auth0Subject: 'auth0|user_1',
      email: 'user@example.com',
      displayName: 'User',
      isPlatformAdmin: false,
      xProfileUrl: null,
      linkedinProfileUrl: null,
      githubProfileUrl: null,
      chatgptEmail: null,
      openaiOrgId: null,
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      deletedAt: null
    }, {
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon',
      description: 'Fixture hackathon',
      backgroundImageUrl: null,
      bannerImageUrl: null,
      city: 'Vienna',
      address: 'Fixture Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      participantsLimit: null,
      inPersonEvent: false,
      requireXProfile: true,
      requireLinkedinProfile: false,
      requireGithubProfile: true,
      requireChatgptEmail: true,
      requireOpenaiOrgId: true,
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'creator_1',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z'
    })).toThrowError(ApiError)
  })

  test('luma username requirement only applies when a luma event URL is configured', () => {
    expect(() => assertUserMeetsHackathonProfileRequirements({
      id: 'user_1',
      auth0Subject: 'auth0|user_1',
      email: 'user@example.com',
      displayName: 'User',
      isPlatformAdmin: false,
      xProfileUrl: null,
      linkedinProfileUrl: null,
      githubProfileUrl: null,
      chatgptEmail: null,
      openaiOrgId: null,
      lumaUsername: null,
      profileIconUpdatedAt: null,
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      deletedAt: null
    }, {
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon',
      description: 'Fixture hackathon',
      backgroundImageUrl: null,
      bannerImageUrl: null,
      lumaEventUrl: null,
      city: 'Vienna',
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
      requireLumaProfile: true,
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'creator_1',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z'
    })).not.toThrow()

    expect(() => assertUserMeetsHackathonProfileRequirements({
      id: 'user_1',
      auth0Subject: 'auth0|user_1',
      email: 'user@example.com',
      displayName: 'User',
      isPlatformAdmin: false,
      xProfileUrl: null,
      linkedinProfileUrl: null,
      githubProfileUrl: null,
      chatgptEmail: null,
      openaiOrgId: null,
      lumaUsername: null,
      profileIconUpdatedAt: null,
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      deletedAt: null
    }, {
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon',
      description: 'Fixture hackathon',
      backgroundImageUrl: null,
      bannerImageUrl: null,
      lumaEventUrl: 'https://luma.com/codex',
      city: 'Vienna',
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
      requireLumaProfile: true,
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null,
      createdByUserId: 'creator_1',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z'
    })).toThrowError(ApiError)
  })

  test('only submitted applications can be reviewed', () => {
    expect(() => assertApplicationReviewable({
      id: 'application_1',
      hackathonId: 'hackathon_1',
      userId: 'user_1',
      status: 'submitted',
      preApprovalStatus: null,
      submittedAt: '2026-03-22T12:00:00.000Z',
      reviewedAt: null,
      reviewedByUserId: null,
      applicationTermsDocumentId: 'terms_1',
      applicationTermsAcceptedAt: '2026-03-22T12:00:00.000Z',
      registrationDetailsJson: '{"teamIntent":"unknown","teamMembers":[]}',
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z'
    })).not.toThrow()

    expect(() => assertApplicationReviewable({
      id: 'application_1',
      hackathonId: 'hackathon_1',
      userId: 'user_1',
      status: 'approved',
      preApprovalStatus: null,
      submittedAt: '2026-03-22T12:00:00.000Z',
      reviewedAt: '2026-03-22T12:05:00.000Z',
      reviewedByUserId: 'admin_1',
      applicationTermsDocumentId: 'terms_1',
      applicationTermsAcceptedAt: '2026-03-22T12:00:00.000Z',
      registrationDetailsJson: '{"teamIntent":"unknown","teamMembers":[]}',
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T12:05:00.000Z'
    })).toThrowError(ApiError)
  })

  test('serializes registration details and enforces max team-member hints', () => {
    expect(serializeRegistrationDetailsJson({
      id: 'hackathon_1',
      maxTeamMembers: 2,
      inPersonEvent: true,
      requireWhyThisHackathon: true,
      requireProofOfExecution: true
    }, {
      registrationTeamIntent: 'team',
      registrationTeamMembers: [
        {
          fullName: ' Ada Lovelace ',
          email: 'ada@example.com'
        },
        {
          fullName: 'Grace Hopper',
          email: null
        }
      ],
      inPersonAttendanceCommitment: true,
      whyThisHackathon: ' I have shipped similar projects before. ',
      proofOfExecutionUrl: 'https://github.com/example/shipped-work'
    })).toBe(JSON.stringify({
      teamIntent: 'team',
      teamMembers: [
        {
          fullName: 'Ada Lovelace',
          email: 'ada@example.com'
        },
        {
          fullName: 'Grace Hopper'
        }
      ],
      inPersonAttendanceCommitment: true,
      whyThisHackathon: 'I have shipped similar projects before.',
      proofOfExecutionUrl: 'https://github.com/example/shipped-work'
    }))

    expect(() => serializeRegistrationDetailsJson({
      id: 'hackathon_1',
      maxTeamMembers: 1,
      inPersonEvent: false,
      requireWhyThisHackathon: false,
      requireProofOfExecution: false
    }, {
      registrationTeamIntent: 'team',
      registrationTeamMembers: [
        {
          fullName: 'Ada Lovelace',
          email: null
        },
        {
          fullName: 'Grace Hopper',
          email: null
        }
      ],
      inPersonAttendanceCommitment: false,
      whyThisHackathon: '',
      proofOfExecutionUrl: ''
    })).toThrowError(ApiError)
  })

  test('enforces why-this-hackathon and proof-of-execution requirements when configured', () => {
    expect(() => serializeRegistrationDetailsJson({
      id: 'hackathon_1',
      maxTeamMembers: 4,
      inPersonEvent: false,
      requireWhyThisHackathon: true,
      requireProofOfExecution: false
    }, {
      registrationTeamIntent: 'unknown',
      registrationTeamMembers: [],
      inPersonAttendanceCommitment: false,
      whyThisHackathon: '',
      proofOfExecutionUrl: ''
    })).toThrowError(ApiError)

    expect(() => serializeRegistrationDetailsJson({
      id: 'hackathon_1',
      maxTeamMembers: 4,
      inPersonEvent: false,
      requireWhyThisHackathon: false,
      requireProofOfExecution: true
    }, {
      registrationTeamIntent: 'unknown',
      registrationTeamMembers: [],
      inPersonAttendanceCommitment: false,
      whyThisHackathon: '',
      proofOfExecutionUrl: ''
    })).toThrowError(ApiError)
  })

  test('rejects non-http proof-of-execution URLs', () => {
    expect(() => serializeRegistrationDetailsJson({
      id: 'hackathon_1',
      maxTeamMembers: 4,
      inPersonEvent: false,
      requireWhyThisHackathon: false,
      requireProofOfExecution: false
    }, {
      registrationTeamIntent: 'unknown',
      registrationTeamMembers: [],
      inPersonAttendanceCommitment: false,
      whyThisHackathon: '',
      proofOfExecutionUrl: 'ftp://example.com/project'
    })).toThrowError(ApiError)
  })

  test('requires explicit in-person commitment only for in-person hackathons', () => {
    expect(() => assertInPersonAttendanceCommitment({
      id: 'hackathon_1',
      inPersonEvent: true
    }, {
      inPersonAttendanceCommitment: false
    })).toThrowError(ApiError)

    expect(() => assertInPersonAttendanceCommitment({
      id: 'hackathon_1',
      inPersonEvent: true
    }, {
      inPersonAttendanceCommitment: true
    })).not.toThrow()

    expect(() => assertInPersonAttendanceCommitment({
      id: 'hackathon_1',
      inPersonEvent: false
    }, {
      inPersonAttendanceCommitment: false
    })).not.toThrow()
  })
})
