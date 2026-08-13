import { z } from 'zod'

export const talkProposalFormSchema = z.object({
  title: z.string().trim().min(1, 'Enter a talk title.').max(200, 'Keep the title under 200 characters.'),
  abstract: z.string().trim().min(1, 'Enter a talk abstract.').max(8000, 'Keep the abstract under 8,000 characters.'),
  demoOrSlidesUrl: z.union([
    z.literal(''),
    z.string().trim().url('Enter a valid HTTP(S) URL.').refine(value => /^https?:\/\//i.test(value), 'Enter a valid HTTP(S) URL.')
  ])
})

export type TalkProposalStatus = 'draft' | 'submitted' | 'withdrawn' | 'accepted' | 'rejected'

export interface TalkProposalRecord {
  id: string
  eventId: string
  userId: string
  status: TalkProposalStatus
  title: string
  abstract: string
  demoOrSlidesUrl: string | null
  decisionMessage: string | null
  reviewedByUserId: string | null
  submittedAt: string | null
  withdrawnAt: string | null
  revisedAt: string | null
  decidedAt: string | null
  decisionEmailQueuedAt: string | null
  decisionEmailLastAttemptedAt: string | null
  decisionEmailSentAt: string | null
  decisionEmailFailedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TalkProposalReviewEntry {
  proposal: TalkProposalRecord
  owner: {
    id: string
    displayName: string
    firstName: string
    familyName: string
    email: string
  }
  applicationStatus: 'draft' | 'submitted' | 'approved' | 'rejected' | 'withdrawn' | null
}

export const talkProposalStatusLabels: Record<TalkProposalStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  withdrawn: 'Withdrawn',
  accepted: 'Accepted',
  rejected: 'Not accepted'
}

export function isTalkProposalWindowOpen(opensAt: string | null, closesAt: string | null, now = Date.now()) {
  const opens = Date.parse(opensAt ?? '')
  const closes = Date.parse(closesAt ?? '')
  return !Number.isNaN(opens) && !Number.isNaN(closes) && now >= opens && now <= closes
}
