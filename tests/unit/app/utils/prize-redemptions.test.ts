import { describe, expect, test } from 'vitest'

import {
  buildPrizeRedemptionOperationsView,
  buildWinnerMemberLookup,
  describePrizeRedemptionRecipient,
  formatPrizeRedemptionStatus,
  getPrizeRedemptionAvailability,
  getPrizeRedemptionStatusColor,
  summarizePrizeRedemptionTask,
  type PrizeRedemptionTask
} from '../../../../app/utils/prize-redemptions'

function createTask(overrides?: Partial<PrizeRedemptionTask>): PrizeRedemptionTask {
  return {
    id: 'redemption_1',
    status: 'pending',
    userId: null,
    teamId: 'team_1',
    legalName: null,
    winnerTermsDocumentId: null,
    winnerTermsAcceptedAt: null,
    redeemedAt: null,
    createdAt: '2026-03-23T12:00:00.000Z',
    updatedAt: '2026-03-23T12:00:00.000Z',
    prize: {
      id: 'prize_1',
      hackathonId: 'hackathon_1',
      name: 'Fixture Prize',
      description: 'Fixture prize description',
      rewardType: 'api_credits',
      rewardValue: '1000',
      rewardCurrency: 'USD',
      awardScope: 'team',
      rankStart: 1,
      rankEnd: 1,
      displayOrder: 0,
      createdAt: '2026-03-23T12:00:00.000Z'
    },
    hackathon: {
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon',
      state: 'winners_announced',
      currentWinnerTermsDocumentId: 'terms_winner_1'
    },
    currentWinnerTerms: {
      id: 'terms_winner_1',
      hackathonId: 'hackathon_1',
      documentType: 'winner_terms',
      version: 2,
      title: 'Winner Terms',
      content: 'Fixture winner terms',
      publishedAt: '2026-03-22T12:00:00.000Z',
      createdAt: '2026-03-22T12:00:00.000Z'
    },
    ...overrides
  }
}

describe('prize-redemption workspace helpers', () => {
  test('formats redemption status labels and colors', () => {
    expect(formatPrizeRedemptionStatus('pending')).toBe('Pending')
    expect(formatPrizeRedemptionStatus('redeemed')).toBe('Redeemed')
    expect(getPrizeRedemptionStatusColor('pending')).toBe('warning')
    expect(getPrizeRedemptionStatusColor('redeemed')).toBe('success')
  })

  test('describes team and member redemption recipients', () => {
    expect(describePrizeRedemptionRecipient(createTask())).toContain('Any active team admin')
    expect(describePrizeRedemptionRecipient(createTask({
      prize: {
        ...createTask().prize,
        awardScope: 'member'
      },
      userId: 'user_1'
    }))).toContain('user_1')

    const winnerMemberNamesByUserId = buildWinnerMemberLookup([
      {
        teamId: 'team_1',
        teamName: 'Alpha Team',
        submissionId: 'submission_1',
        projectName: 'Winner Project',
        summary: 'Winning summary',
        repositoryUrl: null,
        demoUrl: null,
        finalRank: 1,
        prizes: [],
        teamMembers: [
          {
            id: 'user_1',
            fullName: 'Winner Member One',
            bio: null,
            xProfileUrl: null,
            linkedinProfileUrl: null,
            githubProfileUrl: null,
            profileIconUrl: null
          }
        ]
      }
    ])

    expect(describePrizeRedemptionRecipient(createTask({
      prize: {
        ...createTask().prize,
        awardScope: 'member'
      },
      userId: 'user_1'
    }), winnerMemberNamesByUserId)).toContain('Winner Member One')
  })

  test('summarizes pending versus redeemed tasks and blocks missing current terms', () => {
    expect(summarizePrizeRedemptionTask(createTask())).toContain('exact current winner terms')
    expect(summarizePrizeRedemptionTask(createTask({
      status: 'redeemed',
      legalName: 'Alex Example'
    }))).toContain('Alex Example')

    expect(getPrizeRedemptionAvailability(createTask())).toEqual({
      isEnabled: true
    })
    expect(getPrizeRedemptionAvailability(createTask({
      currentWinnerTerms: null
    }))).toEqual({
      isEnabled: false,
      reason: 'The current winner terms are unavailable for this hackathon.'
    })
  })

  test('groups podium awards first and keeps additional winners visible as team rows', () => {
    const winners = [
      {
        teamId: 'team_1',
        teamName: 'Alpha Team',
        submissionId: 'submission_1',
        projectName: 'Alpha Project',
        summary: null,
        repositoryUrl: null,
        demoUrl: null,
        finalRank: 1,
        prizes: [
          {
            ...createTask().prize,
            id: 'prize_rank_1',
            name: '1st Place API Credits',
            rankStart: 1,
            rankEnd: 1
          },
          {
            ...createTask().prize,
            id: 'prize_top_5',
            name: 'Top 5 Teams Member Benefit',
            rewardType: 'subscription',
            rewardValue: '1 year ChatGPT Pro',
            rewardCurrency: null,
            awardScope: 'member',
            rankStart: 1,
            rankEnd: 5
          }
        ],
        teamMembers: [
          {
            id: 'user_1',
            fullName: 'Winner Member One',
            bio: null,
            xProfileUrl: null,
            linkedinProfileUrl: null,
            githubProfileUrl: null,
            profileIconUrl: null
          }
        ]
      },
      {
        teamId: 'team_4',
        teamName: 'Delta Team',
        submissionId: 'submission_4',
        projectName: 'Delta Project',
        summary: null,
        repositoryUrl: null,
        demoUrl: null,
        finalRank: 4,
        prizes: [
          {
            ...createTask().prize,
            id: 'prize_top_5',
            name: 'Top 5 Teams Member Benefit',
            rewardType: 'subscription',
            rewardValue: '1 year ChatGPT Pro',
            rewardCurrency: null,
            awardScope: 'member',
            rankStart: 1,
            rankEnd: 5
          }
        ],
        teamMembers: [
          {
            id: 'user_4',
            fullName: 'Winner Member Four',
            bio: null,
            xProfileUrl: null,
            linkedinProfileUrl: null,
            githubProfileUrl: null,
            profileIconUrl: null
          }
        ]
      },
      {
        teamId: 'team_5',
        teamName: 'Epsilon Team',
        submissionId: 'submission_5',
        projectName: 'Epsilon Project',
        summary: null,
        repositoryUrl: null,
        demoUrl: null,
        finalRank: 5,
        prizes: [
          {
            ...createTask().prize,
            id: 'prize_top_5',
            name: 'Top 5 Teams Member Benefit',
            rewardType: 'subscription',
            rewardValue: '1 year ChatGPT Pro',
            rewardCurrency: null,
            awardScope: 'member',
            rankStart: 1,
            rankEnd: 5
          }
        ],
        teamMembers: [
          {
            id: 'user_5',
            fullName: 'Winner Member Five',
            bio: null,
            xProfileUrl: null,
            linkedinProfileUrl: null,
            githubProfileUrl: null,
            profileIconUrl: null
          }
        ]
      },
      {
        teamId: 'team_2',
        teamName: 'Beta Team',
        submissionId: 'submission_2',
        projectName: 'Beta Project',
        summary: null,
        repositoryUrl: null,
        demoUrl: null,
        finalRank: 2,
        prizes: [
          {
            ...createTask().prize,
            id: 'prize_rank_2',
            name: '2nd Place API Credits',
            rankStart: 2,
            rankEnd: 2
          },
          {
            ...createTask().prize,
            id: 'prize_top_5',
            name: 'Top 5 Teams Member Benefit',
            rewardType: 'subscription',
            rewardValue: '1 year ChatGPT Pro',
            rewardCurrency: null,
            awardScope: 'member',
            rankStart: 1,
            rankEnd: 5
          }
        ],
        teamMembers: [
          {
            id: 'user_2',
            fullName: 'Winner Member Two',
            bio: null,
            xProfileUrl: null,
            linkedinProfileUrl: null,
            githubProfileUrl: null,
            profileIconUrl: null
          }
        ]
      }
    ]

    const redemptions = [
      createTask({
        id: 'redemption_rank_1',
        prize: {
          ...createTask().prize,
          id: 'prize_rank_1',
          name: '1st Place API Credits',
          rankStart: 1,
          rankEnd: 1
        }
      }),
      createTask({
        id: 'redemption_rank_2',
        teamId: 'team_2',
        prize: {
          ...createTask().prize,
          id: 'prize_rank_2',
          name: '2nd Place API Credits',
          rankStart: 2,
          rankEnd: 2
        }
      }),
      createTask({
        id: 'redemption_member_1',
        userId: 'user_1',
        prize: {
          ...createTask().prize,
          id: 'prize_top_5',
          name: 'Top 5 Teams Member Benefit',
          rewardType: 'subscription',
          rewardValue: '1 year ChatGPT Pro',
          rewardCurrency: null,
          awardScope: 'member',
          rankStart: 1,
          rankEnd: 5
        }
      }),
      createTask({
        id: 'redemption_member_2',
        status: 'redeemed',
        userId: 'user_2',
        teamId: 'team_2',
        legalName: 'Winner Member Two',
        prize: {
          ...createTask().prize,
          id: 'prize_top_5',
          name: 'Top 5 Teams Member Benefit',
          rewardType: 'subscription',
          rewardValue: '1 year ChatGPT Pro',
          rewardCurrency: null,
          awardScope: 'member',
          rankStart: 1,
          rankEnd: 5
        }
      }),
      createTask({
        id: 'redemption_member_4',
        userId: 'user_4',
        teamId: 'team_4',
        prize: {
          ...createTask().prize,
          id: 'prize_top_5',
          name: 'Top 5 Teams Member Benefit',
          rewardType: 'subscription',
          rewardValue: '1 year ChatGPT Pro',
          rewardCurrency: null,
          awardScope: 'member',
          rankStart: 1,
          rankEnd: 5
        }
      }),
      createTask({
        id: 'redemption_member_5',
        status: 'redeemed',
        userId: 'user_5',
        teamId: 'team_5',
        legalName: 'Winner Member Five',
        prize: {
          ...createTask().prize,
          id: 'prize_top_5',
          name: 'Top 5 Teams Member Benefit',
          rewardType: 'subscription',
          rewardValue: '1 year ChatGPT Pro',
          rewardCurrency: null,
          awardScope: 'member',
          rankStart: 1,
          rankEnd: 5
        }
      })
    ]

    expect(buildPrizeRedemptionOperationsView(winners, redemptions)).toEqual({
      podiumItems: [
        expect.objectContaining({
          winner: expect.objectContaining({ teamName: 'Alpha Team', finalRank: 1 }),
          primaryPrize: expect.objectContaining({ id: 'prize_rank_1' }),
          additionalPrizes: [expect.objectContaining({ id: 'prize_top_5' })]
        }),
        expect.objectContaining({
          winner: expect.objectContaining({ teamName: 'Beta Team', finalRank: 2 }),
          primaryPrize: expect.objectContaining({ id: 'prize_rank_2' }),
          additionalPrizes: [expect.objectContaining({ id: 'prize_top_5' })]
        })
      ],
      additionalWinnerItems: [
        expect.objectContaining({
          winner: expect.objectContaining({ teamName: 'Delta Team', finalRank: 4 }),
          prizes: [expect.objectContaining({ id: 'prize_top_5' })],
          recipientLabels: ['Winner Member Four'],
          pendingCount: 1,
          redeemedCount: 0,
          totalCount: 1
        }),
        expect.objectContaining({
          winner: expect.objectContaining({ teamName: 'Epsilon Team', finalRank: 5 }),
          prizes: [expect.objectContaining({ id: 'prize_top_5' })],
          recipientLabels: ['Winner Member Five'],
          pendingCount: 0,
          redeemedCount: 1,
          totalCount: 1
        })
      ]
    })
  })
})
