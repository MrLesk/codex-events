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
  displayOrder: number
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

export type PrizeRedemptionTeamMember = WinnerEntry['teamMembers'][number]

export interface PrizeRedemptionFinalRankingEntry {
  teamId: string
  teamName: string
  submissionId: string
  projectName: string | null
  finalRank: number
  teamMembers: PrizeRedemptionTeamMember[]
}

export interface PrizeRedemptionBlindRankingEntry {
  teamId: string
  teamName: string
  submissionId: string
  projectName: string | null
  blindRank: number
  teamMembers: PrizeRedemptionTeamMember[]
}

export interface PrizeRedemptionAdminView {
  winners: WinnerEntry[]
  redemptions: PrizeRedemptionRecord[]
  finalRankingEntries: PrizeRedemptionFinalRankingEntry[]
  blindRankingEntries: PrizeRedemptionBlindRankingEntry[]
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

export interface PrizeRedemptionWinnerRecipientEntry {
  redemptionId: string
  prize: PrizeRedemptionPrize
  label: string
  status: PrizeRedemptionRecord['status']
  legalName: string | null
}

export interface PrizeRedemptionWinnerItem {
  winner: WinnerEntry
  prizes: PrizeRedemptionPrize[]
  recipientEntries: PrizeRedemptionWinnerRecipientEntry[]
  pendingCount: number
  redeemedCount: number
  totalCount: number
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

export function buildWinnerMemberLookup(winners: WinnerEntry[]) {
  return new Map(
    winners.flatMap(winner =>
      winner.teamMembers.map(member => [member.id, member.fullName] as const)
    )
  )
}

function comparePrizeDefinitions(
  left: Pick<PrizeRedemptionPrize, 'displayOrder' | 'rankStart' | 'rankEnd' | 'createdAt' | 'id'>,
  right: Pick<PrizeRedemptionPrize, 'displayOrder' | 'rankStart' | 'rankEnd' | 'createdAt' | 'id'>
) {
  return left.displayOrder - right.displayOrder
    || left.rankEnd - right.rankEnd
    || right.rankStart - left.rankStart
    || left.createdAt.localeCompare(right.createdAt)
    || left.id.localeCompare(right.id)
}

export function buildPrizeRedemptionOperationsView(
  winners: WinnerEntry[],
  redemptions: PrizeRedemptionRecord[],
  finalRankingEntries: PrizeRedemptionFinalRankingEntry[] = []
) {
  const winnerMemberNamesByUserId = buildWinnerMemberLookup(winners)
  const winnerSubmissionIds = new Set(winners.map(winner => winner.submissionId))

  const winnerItems: PrizeRedemptionWinnerItem[] = winners
    .sort((left, right) => left.finalRank - right.finalRank)
    .map((winner) => {
      const prizeIds = new Set(winner.prizes.map(prize => prize.id))
      const recipientEntries = redemptions
        .filter(redemption =>
          redemption.teamId === winner.teamId
          && prizeIds.has(redemption.prize.id)
        )
        .sort((left, right) => {
          const leftLabel = left.prize.awardScope === 'team'
            ? (left.teamId ? winner.teamName : '')
            : (left.userId ? (winnerMemberNamesByUserId.get(left.userId) ?? left.userId) : '')
          const rightLabel = right.prize.awardScope === 'team'
            ? (right.teamId ? winner.teamName : '')
            : (right.userId ? (winnerMemberNamesByUserId.get(right.userId) ?? right.userId) : '')

          return comparePrizeDefinitions(left.prize, right.prize)
            || leftLabel.localeCompare(rightLabel)
            || left.createdAt.localeCompare(right.createdAt)
        })
        .map(redemption => ({
          redemptionId: redemption.id,
          label: redemption.prize.awardScope === 'team'
            ? winner.teamName
            : (redemption.userId ? (winnerMemberNamesByUserId.get(redemption.userId) ?? redemption.userId) : 'No recipient recorded'),
          status: redemption.status,
          prize: redemption.prize,
          legalName: redemption.legalName
        }))

      return {
        winner,
        prizes: [...winner.prizes].sort(comparePrizeDefinitions),
        recipientEntries,
        pendingCount: recipientEntries.filter(entry => entry.status === 'pending').length,
        redeemedCount: recipientEntries.filter(entry => entry.status === 'redeemed').length,
        totalCount: recipientEntries.length
      }
    })

  const shortlistedEntries = [...finalRankingEntries]
    .filter(entry => !winnerSubmissionIds.has(entry.submissionId))
    .sort((left, right) =>
      left.finalRank - right.finalRank
      || left.teamName.localeCompare(right.teamName)
      || left.submissionId.localeCompare(right.submissionId)
    )

  return {
    winnerItems,
    shortlistedEntries
  }
}

export function buildPrizeRedemptionPostShortlistEntries(
  blindRankingEntries: PrizeRedemptionBlindRankingEntry[],
  finalistSubmissionIds: string[]
) {
  if (finalistSubmissionIds.length === 0) {
    return []
  }

  const finalistSubmissionIdSet = new Set(finalistSubmissionIds)

  return [...blindRankingEntries]
    .filter(entry => !finalistSubmissionIdSet.has(entry.submissionId))
    .sort((left, right) =>
      left.blindRank - right.blindRank
      || left.teamName.localeCompare(right.teamName)
      || left.submissionId.localeCompare(right.submissionId)
    )
}

export function describePrizeRedemptionRecipient(
  redemption: PrizeRedemptionRecord,
  winnerMemberNamesByUserId?: Map<string, string>
) {
  if (redemption.prize.awardScope === 'team') {
    return 'Team award. Any active team admin for the winning team can complete redemption.'
  }

  if (!redemption.userId) {
    return 'Member award assigned to an eligible winning participant.'
  }

  const winnerMemberName = winnerMemberNamesByUserId?.get(redemption.userId)

  return winnerMemberName
    ? `Member award assigned to ${winnerMemberName}.`
    : `Member award assigned to user ${redemption.userId}.`
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
