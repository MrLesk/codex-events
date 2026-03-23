import type {
  HackathonState,
  TermsDocument,
  WinnerEntry
} from './admin-workspace'

export interface PrizeRedemptionPrize {
  id: string
  hackathonId: string
  name: string
  description: string
  rewardType: 'api_credits' | 'subscription' | 'physical' | 'other'
  rewardValue: string
  rewardCurrency: string | null
  awardScope: 'team' | 'member'
  rankStart: number
  rankEnd: number
  createdAt: string
}

export interface PrizeRedemptionHackathon {
  id: string
  name: string
  slug: string
  state: HackathonState
  currentWinnerTermsDocumentId: string | null
}

export interface PrizeRedemptionRecord {
  id: string
  status: 'pending' | 'redeemed'
  userId: string | null
  teamId: string | null
  legalName: string | null
  winnerTermsDocumentId: string | null
  winnerTermsAcceptedAt: string | null
  redeemedAt: string | null
  createdAt: string
  updatedAt: string
  prize: PrizeRedemptionPrize
  hackathon: PrizeRedemptionHackathon
}

export interface PrizeRedemptionTask extends PrizeRedemptionRecord {
  currentWinnerTerms: TermsDocument | null
}

export interface PrizeRedemptionCurrentTermsResponse {
  application_terms: TermsDocument | null
  winner_terms: TermsDocument | null
}

export interface PrizeRedemptionAdminView {
  winners: WinnerEntry[]
  redemptions: PrizeRedemptionRecord[]
}

export interface PrizeRedemptionApiDataResponse<T> {
  data: T
}

export interface PrizeRedemptionApiErrorShape {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface PrizeRedemptionAvailability {
  isEnabled: boolean
  reason?: string
}

export function formatPrizeRedemptionStatus(status: PrizeRedemptionRecord['status']) {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'redeemed':
      return 'Redeemed'
  }
}

export function getPrizeRedemptionStatusColor(status: PrizeRedemptionRecord['status']) {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'redeemed':
      return 'success'
  }
}

export function describePrizeRedemptionRecipient(redemption: PrizeRedemptionRecord) {
  if (redemption.prize.awardScope === 'team') {
    return 'Team award. Any active team admin for the winning team can complete redemption.'
  }

  return redemption.userId
    ? `Member award assigned to user ${redemption.userId}.`
    : 'Member award assigned to an eligible winning participant.'
}

export function summarizePrizeRedemptionTask(redemption: PrizeRedemptionRecord) {
  if (redemption.status === 'redeemed') {
    return redemption.legalName
      ? `Redeemed under the legal name ${redemption.legalName}.`
      : 'This prize redemption is already complete.'
  }

  return redemption.prize.awardScope === 'team'
    ? 'Submit the winning team’s legal recipient name and accept the exact current winner terms.'
    : 'Submit the recipient legal name and accept the exact current winner terms for this hackathon.'
}

export function getPrizeRedemptionAvailability(task: PrizeRedemptionTask): PrizeRedemptionAvailability {
  if (task.status !== 'pending') {
    return {
      isEnabled: false,
      reason: 'Only pending prize redemptions can be submitted.'
    }
  }

  if (!task.currentWinnerTerms) {
    return {
      isEnabled: false,
      reason: 'The current winner terms are unavailable for this hackathon.'
    }
  }

  return {
    isEnabled: true
  }
}

export function buildWinnerLookup(winners: WinnerEntry[]) {
  return new Map(winners.map(winner => [winner.teamId, winner] as const))
}

export function normalizePrizeRedemptionApiError(error: unknown): PrizeRedemptionApiErrorShape {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      data?: {
        error?: PrizeRedemptionApiErrorShape
      }
      response?: {
        _data?: {
          error?: PrizeRedemptionApiErrorShape
        }
      }
      message?: string
      statusMessage?: string
    }

    const apiError = maybeError.data?.error ?? maybeError.response?._data?.error

    if (apiError?.code && apiError.message) {
      return apiError
    }

    if (typeof maybeError.statusMessage === 'string' && maybeError.statusMessage.length > 0) {
      return {
        code: 'request_failed',
        message: maybeError.statusMessage
      }
    }

    if (typeof maybeError.message === 'string' && maybeError.message.length > 0) {
      return {
        code: 'request_failed',
        message: maybeError.message
      }
    }
  }

  return {
    code: 'request_failed',
    message: 'The prize redemption request could not be completed.'
  }
}
