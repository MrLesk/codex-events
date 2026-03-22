import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertApplicationReviewable,
  assertHackathonAllowsApplications,
  assertUserMeetsHackathonProfileRequirements
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
      requireXProfile: false,
      requireLinkedinProfile: false,
      requireGithubProfile: false,
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
      requireXProfile: false,
      requireLinkedinProfile: false,
      requireGithubProfile: false,
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
      requireXProfile: true,
      requireLinkedinProfile: false,
      requireGithubProfile: true,
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
      submittedAt: '2026-03-22T12:00:00.000Z',
      reviewedAt: null,
      reviewedByUserId: null,
      applicationTermsDocumentId: 'terms_1',
      applicationTermsAcceptedAt: '2026-03-22T12:00:00.000Z',
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z'
    })).not.toThrow()

    expect(() => assertApplicationReviewable({
      id: 'application_1',
      hackathonId: 'hackathon_1',
      userId: 'user_1',
      status: 'approved',
      submittedAt: '2026-03-22T12:00:00.000Z',
      reviewedAt: '2026-03-22T12:05:00.000Z',
      reviewedByUserId: 'admin_1',
      applicationTermsDocumentId: 'terms_1',
      applicationTermsAcceptedAt: '2026-03-22T12:00:00.000Z',
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T12:05:00.000Z'
    })).toThrowError(ApiError)
  })
})
