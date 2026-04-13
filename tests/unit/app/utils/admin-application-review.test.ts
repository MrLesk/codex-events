import { describe, expect, test } from 'vitest'

import {
  buildAdminApplicationReviewGroups,
  filterAdminApplicationReviewGroups,
  searchAdminApplicationReviewGroups
} from '../../../../app/utils/admin-application-review'
import type { AdminApplicationRecord } from '../../../../app/utils/admin-workspace'

function createApplication(options: {
  id: string
  displayName: string
  email: string
  status?: 'submitted' | 'approved' | 'rejected' | 'withdrawn'
  submittedAt?: string
  teamIntent?: 'solo' | 'team' | 'unknown'
  teamMembers?: Array<{ fullName?: string, email?: string }>
}) {
  return {
    id: options.id,
    hackathonId: 'hackathon-1',
    userId: `user-${options.id}`,
    status: options.status ?? 'submitted',
    preApprovalStatus: null,
    submittedAt: options.submittedAt ?? '2026-03-29T10:00:00.000Z',
    withdrawnAt: options.status === 'withdrawn' ? '2026-03-30T10:00:00.000Z' : null,
    reviewedAt: null,
    reviewedByUserId: null,
    applicationTermsDocumentId: 'terms-1',
    applicationTermsAcceptedAt: '2026-03-29T09:00:00.000Z',
    registrationDetailsJson: JSON.stringify({
      teamIntent: options.teamIntent ?? 'unknown',
      teamMembers: options.teamMembers ?? [],
      inPersonAttendanceCommitment: false,
      whyThisHackathon: '',
      proofOfExecutionUrl: ''
    }),
    createdAt: '2026-03-29T09:00:00.000Z',
    updatedAt: '2026-03-29T09:00:00.000Z',
    user: {
      id: `user-${options.id}`,
      email: options.email,
      displayName: options.displayName
    }
  } satisfies AdminApplicationRecord
}

describe('buildAdminApplicationReviewGroups', () => {
  test('groups applicants by exact teammate-hint email matches before considering names', () => {
    const applications = [
      createApplication({
        id: 'application-1',
        displayName: 'Alice Example',
        email: 'alice@example.com',
        submittedAt: '2026-03-29T12:00:00.000Z',
        teamIntent: 'team',
        teamMembers: [{
          fullName: 'Charlie Example',
          email: 'bob@example.com'
        }]
      }),
      createApplication({
        id: 'application-2',
        displayName: 'Bob Example',
        email: 'bob@example.com',
        submittedAt: '2026-03-29T11:00:00.000Z'
      }),
      createApplication({
        id: 'application-3',
        displayName: 'Cara Solo',
        email: 'cara@example.com',
        submittedAt: '2026-03-29T10:00:00.000Z'
      })
    ]

    expect(buildAdminApplicationReviewGroups(applications)).toEqual([{
      id: 'application-1__application-2',
      applicants: expect.arrayContaining([expect.objectContaining({
        application: applications[0],
        hasFuzzyMatch: false,
        matchKinds: ['exact_email']
      }), expect.objectContaining({
        application: applications[1],
        hasFuzzyMatch: false,
        matchKinds: ['exact_email']
      })]),
      pendingTeammates: [],
      isLikelyTeam: true,
      hasFuzzyMatch: false,
      latestSubmittedAt: '2026-03-29T12:00:00.000Z'
    }, {
      id: 'application-3',
      applicants: [expect.objectContaining({
        application: applications[2],
        hasFuzzyMatch: false,
        matchKinds: []
      })],
      pendingTeammates: [],
      isLikelyTeam: false,
      hasFuzzyMatch: false,
      latestSubmittedAt: '2026-03-29T10:00:00.000Z'
    }])
  })

  test('groups applicants by mutual fuzzy full-name hints only when email does not resolve', () => {
    const applications = [
      createApplication({
        id: 'application-1',
        displayName: 'Alice Example',
        email: 'alice@example.com',
        submittedAt: '2026-03-29T12:00:00.000Z',
        teamIntent: 'team',
        teamMembers: [{
          fullName: 'Bbo Example',
          email: 'missing-bob@example.com'
        }]
      }),
      createApplication({
        id: 'application-2',
        displayName: 'Bob Example',
        email: 'bob@example.com',
        submittedAt: '2026-03-29T11:00:00.000Z',
        teamIntent: 'team',
        teamMembers: [{
          fullName: 'Alicee Example',
          email: 'missing-alice@example.com'
        }]
      })
    ]

    expect(buildAdminApplicationReviewGroups(applications)).toEqual([{
      id: 'application-1__application-2',
      applicants: expect.arrayContaining([expect.objectContaining({
        application: applications[0],
        hasFuzzyMatch: true,
        matchKinds: ['fuzzy_name']
      }), expect.objectContaining({
        application: applications[1],
        hasFuzzyMatch: true,
        matchKinds: ['fuzzy_name']
      })]),
      pendingTeammates: [],
      isLikelyTeam: true,
      hasFuzzyMatch: true,
      latestSubmittedAt: '2026-03-29T12:00:00.000Z'
    }])
  })

  test('keeps one-sided fuzzy hints pending instead of grouping unrelated applicants', () => {
    const applications = [
      createApplication({
        id: 'application-1',
        displayName: 'Alice Example',
        email: 'alice@example.com',
        submittedAt: '2026-03-29T12:00:00.000Z',
        teamIntent: 'team',
        teamMembers: [{
          fullName: 'Bbo Example',
          email: 'missing-bob@example.com'
        }]
      }),
      createApplication({
        id: 'application-2',
        displayName: 'Bob Example',
        email: 'bob@example.com',
        submittedAt: '2026-03-29T11:00:00.000Z'
      })
    ]

    expect(buildAdminApplicationReviewGroups(applications)).toEqual([{
      id: 'application-1',
      applicants: [expect.objectContaining({
        application: applications[0],
        hasFuzzyMatch: false,
        matchKinds: []
      })],
      pendingTeammates: [{
        id: 'email:missing-bob@example.com',
        fullName: 'Bbo Example',
        email: 'missing-bob@example.com',
        mentionedByApplicationIds: ['application-1']
      }],
      isLikelyTeam: true,
      hasFuzzyMatch: false,
      latestSubmittedAt: '2026-03-29T12:00:00.000Z'
    }, {
      id: 'application-2',
      applicants: [expect.objectContaining({
        application: applications[1],
        hasFuzzyMatch: false,
        matchKinds: []
      })],
      pendingTeammates: [],
      isLikelyTeam: false,
      hasFuzzyMatch: false,
      latestSubmittedAt: '2026-03-29T11:00:00.000Z'
    }])
  })

  test('deduplicates pending teammate hints across grouped applicants', () => {
    const applications = [
      createApplication({
        id: 'application-1',
        displayName: 'Alice Example',
        email: 'alice@example.com',
        submittedAt: '2026-03-29T12:00:00.000Z',
        teamIntent: 'team',
        teamMembers: [{
          fullName: 'Bob Example',
          email: 'bob@example.com'
        }, {
          fullName: 'Carol Example',
          email: 'carol@example.com'
        }]
      }),
      createApplication({
        id: 'application-2',
        displayName: 'Bob Example',
        email: 'bob@example.com',
        submittedAt: '2026-03-29T11:00:00.000Z',
        teamIntent: 'team',
        teamMembers: [{
          fullName: 'Carol Example',
          email: 'carol@example.com'
        }]
      })
    ]

    expect(buildAdminApplicationReviewGroups(applications)).toEqual([{
      id: 'application-1__application-2',
      applicants: expect.arrayContaining([expect.objectContaining({
        application: applications[0],
        hasFuzzyMatch: false,
        matchKinds: ['exact_email']
      }), expect.objectContaining({
        application: applications[1],
        hasFuzzyMatch: false,
        matchKinds: ['exact_email']
      })]),
      pendingTeammates: [{
        id: 'email:carol@example.com',
        fullName: 'Carol Example',
        email: 'carol@example.com',
        mentionedByApplicationIds: ['application-1', 'application-2']
      }],
      isLikelyTeam: true,
      hasFuzzyMatch: false,
      latestSubmittedAt: '2026-03-29T12:00:00.000Z'
    }])
  })

  test('filters grouped participant records by view without surfacing hidden teammates as pending hints', () => {
    const applications = [
      createApplication({
        id: 'application-1',
        displayName: 'Alice Example',
        email: 'alice@example.com',
        status: 'submitted',
        submittedAt: '2026-03-29T12:00:00.000Z',
        teamIntent: 'team',
        teamMembers: [{
          fullName: 'Bob Example',
          email: 'bob@example.com'
        }, {
          fullName: 'Carol Example',
          email: 'carol@example.com'
        }]
      }),
      createApplication({
        id: 'application-2',
        displayName: 'Bob Example',
        email: 'bob@example.com',
        status: 'approved',
        submittedAt: '2026-03-29T11:00:00.000Z',
        teamIntent: 'team',
        teamMembers: [{
          fullName: 'Alice Example',
          email: 'alice@example.com'
        }, {
          fullName: 'Dave Example',
          email: 'dave@example.com'
        }]
      })
    ]

    const groups = buildAdminApplicationReviewGroups(applications)

    expect(filterAdminApplicationReviewGroups(groups, 'applications')).toEqual([expect.objectContaining({
      applicants: [expect.objectContaining({
        application: applications[0]
      })],
      pendingTeammates: [{
        id: 'email:carol@example.com',
        fullName: 'Carol Example',
        email: 'carol@example.com',
        mentionedByApplicationIds: ['application-1']
      }]
    })])

    expect(filterAdminApplicationReviewGroups(groups, 'approved')).toEqual([expect.objectContaining({
      applicants: [expect.objectContaining({
        application: applications[1]
      })],
      pendingTeammates: [{
        id: 'email:dave@example.com',
        fullName: 'Dave Example',
        email: 'dave@example.com',
        mentionedByApplicationIds: ['application-2']
      }]
    })])
  })

  test('filters rejected participant records without surfacing teammate hints from hidden applicants', () => {
    const applications = [
      createApplication({
        id: 'application-1',
        displayName: 'Alice Example',
        email: 'alice@example.com',
        status: 'rejected',
        submittedAt: '2026-03-29T12:00:00.000Z',
        teamIntent: 'team',
        teamMembers: [{
          fullName: 'Bob Example',
          email: 'bob@example.com'
        }, {
          fullName: 'Carol Example',
          email: 'carol@example.com'
        }]
      }),
      createApplication({
        id: 'application-2',
        displayName: 'Bob Example',
        email: 'bob@example.com',
        status: 'approved',
        submittedAt: '2026-03-29T11:00:00.000Z',
        teamIntent: 'team',
        teamMembers: [{
          fullName: 'Alice Example',
          email: 'alice@example.com'
        }, {
          fullName: 'Dave Example',
          email: 'dave@example.com'
        }]
      })
    ]

    const groups = buildAdminApplicationReviewGroups(applications)

    expect(filterAdminApplicationReviewGroups(groups, 'rejected')).toEqual([expect.objectContaining({
      applicants: [expect.objectContaining({
        application: applications[0]
      })],
      pendingTeammates: [{
        id: 'email:carol@example.com',
        fullName: 'Carol Example',
        email: 'carol@example.com',
        mentionedByApplicationIds: ['application-1']
      }]
    })])
  })

  test('filters withdrawn participant records without surfacing teammate hints from hidden applicants', () => {
    const applications = [
      createApplication({
        id: 'application-1',
        displayName: 'Alice Example',
        email: 'alice@example.com',
        status: 'withdrawn',
        submittedAt: '2026-03-29T12:00:00.000Z',
        teamIntent: 'team',
        teamMembers: [{
          fullName: 'Bob Example',
          email: 'bob@example.com'
        }, {
          fullName: 'Carol Example',
          email: 'carol@example.com'
        }]
      }),
      createApplication({
        id: 'application-2',
        displayName: 'Bob Example',
        email: 'bob@example.com',
        status: 'approved',
        submittedAt: '2026-03-29T11:00:00.000Z',
        teamIntent: 'team',
        teamMembers: [{
          fullName: 'Alice Example',
          email: 'alice@example.com'
        }, {
          fullName: 'Dave Example',
          email: 'dave@example.com'
        }]
      })
    ]

    const groups = buildAdminApplicationReviewGroups(applications)

    expect(filterAdminApplicationReviewGroups(groups, 'withdrawn')).toEqual([expect.objectContaining({
      applicants: [expect.objectContaining({
        application: applications[0]
      })],
      pendingTeammates: [{
        id: 'email:carol@example.com',
        fullName: 'Carol Example',
        email: 'carol@example.com',
        mentionedByApplicationIds: ['application-1']
      }]
    })])
  })
})

describe('searchAdminApplicationReviewGroups', () => {
  test('returns grouped results when a participant identity field matches the search query', () => {
    const applications = [
      createApplication({
        id: 'application-1',
        displayName: 'Alice Example',
        email: 'alice@example.com',
        submittedAt: '2026-03-29T12:00:00.000Z',
        teamIntent: 'team',
        teamMembers: [{
          fullName: 'Bob Example',
          email: 'bob@example.com'
        }]
      }),
      createApplication({
        id: 'application-2',
        displayName: 'Bob Example',
        email: 'bob@example.com',
        submittedAt: '2026-03-29T11:00:00.000Z',
        teamIntent: 'team',
        teamMembers: [{
          fullName: 'Alice Example',
          email: 'alice@example.com'
        }]
      }),
      createApplication({
        id: 'application-3',
        displayName: 'Cara Solo',
        email: 'cara@example.com',
        submittedAt: '2026-03-29T10:00:00.000Z'
      })
    ]

    const groups = buildAdminApplicationReviewGroups(applications)
    const results = searchAdminApplicationReviewGroups(groups, 'bob@example.com')

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual(expect.objectContaining({
      id: 'application-1__application-2',
      applicants: expect.arrayContaining([
        expect.objectContaining({
          application: applications[0]
        }),
        expect.objectContaining({
          application: applications[1]
        })
      ])
    }))
  })

  test('matches by user ID and returns the full grouped context', () => {
    const applications = [
      createApplication({
        id: 'application-1',
        displayName: 'Alice Example',
        email: 'alice@example.com'
      }),
      createApplication({
        id: 'application-2',
        displayName: 'Bob Example',
        email: 'bob@example.com'
      })
    ]

    const groups = buildAdminApplicationReviewGroups(applications)
    const results = searchAdminApplicationReviewGroups(groups, 'user-application-2')

    expect(results).toEqual([expect.objectContaining({
      id: 'application-2',
      applicants: [expect.objectContaining({
        application: applications[1]
      })]
    })])
  })

  test('matches unmatched teammate hints without removing the surrounding group context', () => {
    const applications = [
      createApplication({
        id: 'application-1',
        displayName: 'Alice Example',
        email: 'alice@example.com',
        teamIntent: 'team',
        teamMembers: [{
          fullName: 'Carol Example',
          email: 'carol@example.com'
        }]
      }),
      createApplication({
        id: 'application-2',
        displayName: 'Bob Example',
        email: 'bob@example.com'
      })
    ]

    const groups = buildAdminApplicationReviewGroups(applications)
    const results = searchAdminApplicationReviewGroups(groups, 'carol@example.com')

    expect(results).toEqual([expect.objectContaining({
      id: 'application-1',
      applicants: [expect.objectContaining({
        application: applications[0]
      })],
      pendingTeammates: [{
        id: 'email:carol@example.com',
        fullName: 'Carol Example',
        email: 'carol@example.com',
        mentionedByApplicationIds: ['application-1']
      }]
    })])
  })

  test('falls back to Fuse.js fuzzy matching for lightly misspelled participant names', () => {
    const applications = [
      createApplication({
        id: 'application-1',
        displayName: 'Alice Example',
        email: 'alice@example.com'
      }),
      createApplication({
        id: 'application-2',
        displayName: 'Bob Example',
        email: 'bob@example.com'
      })
    ]

    const groups = buildAdminApplicationReviewGroups(applications)
    const results = searchAdminApplicationReviewGroups(groups, 'Bbo Example')

    expect(results[0]).toEqual(expect.objectContaining({
      id: 'application-2',
      applicants: [expect.objectContaining({
        application: applications[1]
      })]
    }))
  })
})
