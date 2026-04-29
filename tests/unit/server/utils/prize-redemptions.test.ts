import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/http/api-error'
import { assertPrizeRedemptionRedeemable } from '../../../../server/utils/prize-redemptions'

function createHackathon(state: 'winners_announced' | 'completed' | 'shortlist') {
  return {
    id: 'hackathon_1',
    name: 'Outcome Hackathon',
    slug: 'outcome-hackathon',
    description: 'Outcome Hackathon',
    discordServerUrl: null,
    city: 'Vienna',
    country: 'Austria',
    address: 'Fixture Address',
    registrationOpensAt: '2026-03-20T12:00:00.000Z',
    registrationClosesAt: '2026-03-23T12:00:00.000Z',
    submissionOpensAt: '2026-03-23T12:00:00.000Z',
    submissionClosesAt: '2026-03-25T12:00:00.000Z',
    state,
    maxTeamMembers: 4,
    requireXProfile: false,
    requireLinkedinProfile: false,
    requireGithubProfile: false,
    currentApplicationTermsDocumentId: null,
    currentWinnerTermsDocumentId: 'terms_winner_1',
    createdByUserId: 'platform_admin',
    createdAt: '2026-03-20T12:00:00.000Z',
    updatedAt: '2026-03-20T12:00:00.000Z'
  }
}

function createRedemption(status: 'pending' | 'redeemed' = 'pending') {
  return {
    id: 'redemption_1',
    prizeId: 'prize_1',
    userId: 'user_1',
    teamId: 'team_1',
    status,
    legalName: null,
    winnerTermsDocumentId: null,
    winnerTermsAcceptedAt: null,
    redeemedAt: null,
    createdAt: '2026-03-22T12:00:00.000Z',
    updatedAt: '2026-03-22T12:00:00.000Z'
  }
}

describe('prize redemption utilities', () => {
  test('redemption requires pending state after winner announcement and exact current winner terms', () => {
    expect(() => assertPrizeRedemptionRedeemable(
      createHackathon('winners_announced'),
      createRedemption('pending'),
      'terms_winner_1',
      {
        legalName: 'Alex Example',
        winnerTermsDocumentId: 'terms_winner_1'
      }
    )).not.toThrow()

    expect(() => assertPrizeRedemptionRedeemable(
      createHackathon('shortlist'),
      createRedemption('pending'),
      'terms_winner_1',
      {
        legalName: 'Alex Example',
        winnerTermsDocumentId: 'terms_winner_1'
      }
    )).toThrowError(ApiError)

    expect(() => assertPrizeRedemptionRedeemable(
      createHackathon('completed'),
      createRedemption('redeemed'),
      'terms_winner_1',
      {
        legalName: 'Alex Example',
        winnerTermsDocumentId: 'terms_winner_1'
      }
    )).toThrowError(ApiError)

    expect(() => assertPrizeRedemptionRedeemable(
      createHackathon('winners_announced'),
      createRedemption('pending'),
      'terms_winner_2',
      {
        legalName: 'Alex Example',
        winnerTermsDocumentId: 'terms_winner_1'
      }
    )).toThrowError(ApiError)
  })
})
