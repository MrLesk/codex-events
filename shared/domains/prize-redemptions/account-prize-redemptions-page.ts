export const accountPrizeRedemptionsPagePath = '/api/prize-redemptions/workspace' as const

export type AccountPrizeRedemptionStatus = 'pending' | 'redeemed'
export type AccountPrizeRedemptionRewardType = 'api_credits' | 'subscription' | 'physical' | 'other'
export type AccountPrizeRedemptionAwardScope = 'team' | 'member'
export type AccountPrizeRedemptionEventState
  = | 'draft'
    | 'registration_open'
    | 'submission_open'
    | 'judging_preparation'
    | 'blind_review'
    | 'shortlist'
    | 'pitch'
    | 'pitch_review'
    | 'final_deliberation'
    | 'winners_announced'
    | 'completed'

export interface AccountPrizeRedemptionPrize {
  id: string
  eventId: string
  name: string
  description: string
  rewardType: AccountPrizeRedemptionRewardType
  rewardValue: string
  rewardCurrency: string | null
  awardScope: AccountPrizeRedemptionAwardScope
  rankStart: number
  rankEnd: number
  displayOrder: number
  createdAt: string
}

export interface AccountPrizeRedemptionEvent {
  id: string
  name: string
  slug: string
  state: AccountPrizeRedemptionEventState
  currentWinnerTermsDocumentId: string | null
}

export interface AccountPrizeRedemptionRecord {
  id: string
  status: AccountPrizeRedemptionStatus
  userId: string | null
  teamId: string | null
  legalName: string | null
  winnerTermsDocumentId: string | null
  winnerTermsAcceptedAt: string | null
  redeemedAt: string | null
  createdAt: string
  updatedAt: string
  prize: AccountPrizeRedemptionPrize
  event: AccountPrizeRedemptionEvent
}

export interface AccountPrizeRedemptionTermsDocument {
  id: string
  eventId: string
  documentType: 'winner_terms'
  version: number
  title: string
  content: string
  publishedAt: string
  createdAt: string
}

export interface AccountPrizeRedemptionTask extends AccountPrizeRedemptionRecord {
  currentWinnerTerms: AccountPrizeRedemptionTermsDocument | null
}

export interface AccountPrizeRedemptionsPage {
  redemptions: AccountPrizeRedemptionTask[]
}

export function buildAccountPrizeRedemptionsPageCacheKey() {
  return 'account-prize-redemptions-page'
}
