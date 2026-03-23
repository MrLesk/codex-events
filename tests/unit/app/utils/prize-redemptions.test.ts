import { describe, expect, test } from 'vitest'

import {
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
})
