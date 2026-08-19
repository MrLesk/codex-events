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

export function buildAccountStaffPageCacheKey() {
  return 'account-staff-page'
}
