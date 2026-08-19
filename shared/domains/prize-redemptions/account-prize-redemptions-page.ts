import { z } from 'zod'

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

const accountPrizeRedemptionEventStateSchema = z.enum([
  'draft',
  'registration_open',
  'submission_open',
  'judging_preparation',
  'blind_review',
  'shortlist',
  'pitch',
  'pitch_review',
  'final_deliberation',
  'winners_announced',
  'completed'
])

export const accountPrizeRedemptionPrizeSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  description: z.string(),
  rewardType: z.enum(['api_credits', 'subscription', 'physical', 'other']),
  rewardValue: z.string(),
  rewardCurrency: z.string().nullable(),
  awardScope: z.enum(['team', 'member']),
  rankStart: z.number().int(),
  rankEnd: z.number().int(),
  displayOrder: z.number().int(),
  createdAt: z.string()
})

export const accountPrizeRedemptionEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  state: accountPrizeRedemptionEventStateSchema,
  currentWinnerTermsDocumentId: z.string().nullable()
})

export const accountPrizeRedemptionRecordSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'redeemed']),
  userId: z.string().nullable(),
  teamId: z.string().nullable(),
  legalName: z.string().nullable(),
  winnerTermsDocumentId: z.string().nullable(),
  winnerTermsAcceptedAt: z.string().nullable(),
  redeemedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  prize: accountPrizeRedemptionPrizeSchema,
  event: accountPrizeRedemptionEventSchema
})

export const accountPrizeRedemptionTermsDocumentSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  documentType: z.literal('winner_terms'),
  version: z.number().int(),
  title: z.string(),
  content: z.string(),
  publishedAt: z.string(),
  createdAt: z.string()
})

export const accountPrizeRedemptionTaskSchema = accountPrizeRedemptionRecordSchema.extend({
  currentWinnerTerms: accountPrizeRedemptionTermsDocumentSchema.nullable()
})

export const accountPrizeRedemptionsPageSchema = z.object({
  redemptions: z.array(accountPrizeRedemptionTaskSchema)
})

export function buildAccountPrizeRedemptionsPageCacheKey() {
  return 'account-prize-redemptions-page'
}
