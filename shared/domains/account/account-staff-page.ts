import { z } from 'zod'

export const accountStaffPagePath = '/api/account/staff-workspace' as const

export type AccountStaffEventType = 'hackathon' | 'meetup' | 'build'

export type AccountStaffEventState
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

export type AccountStaffRole = 'event_admin' | 'staff'

export interface AccountStaffEventSummary {
  id: string
  eventType: AccountStaffEventType
  slug: string
  name: string
  state: AccountStaffEventState
  city: string
  country: string
  startsAt: string
  registrationOpensAt: string
  registrationClosesAt: string
  submissionClosesAt: string | null
  maxTeamMembers: number
  staff: {
    role: AccountStaffRole
    isStaff: true
    staffTrackId: string | null
  }
}

export interface AccountStaffPage {
  current: AccountStaffEventSummary[]
  past: AccountStaffEventSummary[]
}

const accountStaffEventTypeSchema = z.enum(['hackathon', 'meetup', 'build'])
const accountStaffEventStateSchema = z.enum([
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

export const accountStaffEventSummarySchema = z.object({
  id: z.string(),
  eventType: accountStaffEventTypeSchema,
  slug: z.string(),
  name: z.string(),
  state: accountStaffEventStateSchema,
  city: z.string(),
  country: z.string(),
  startsAt: z.string(),
  registrationOpensAt: z.string(),
  registrationClosesAt: z.string(),
  submissionClosesAt: z.string().nullable(),
  maxTeamMembers: z.number().int(),
  staff: z.object({
    role: z.enum(['event_admin', 'staff']),
    isStaff: z.literal(true),
    staffTrackId: z.string().nullable()
  })
})

export const accountStaffPageSchema = z.object({
  current: z.array(accountStaffEventSummarySchema),
  past: z.array(accountStaffEventSummarySchema)
})

export function buildAccountStaffPageCacheKey() {
  return 'account-staff-page'
}
