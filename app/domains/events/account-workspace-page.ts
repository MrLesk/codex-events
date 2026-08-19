import type { PublicEventState } from '~/domains/events/presentation'
import type { EventType } from '~/domains/events/records'

export const accountEventPageNames = [
  'entry',
  'prizes',
  'operations',
  'submissions',
  'judging',
  'settings',
  'participants',
  'workspace',
  'teams',
  'rosters',
  'gallery',
  'feedback',
  'certificates'
] as const

export type AccountEventPageName = (typeof accountEventPageNames)[number]

export interface AccountEventPageEvent {
  id: string
  slug: string
  name: string
  eventType: EventType
  state: PublicEventState
}

export interface AccountEventPageVisibility {
  canManage: boolean
  canJudge: boolean
  canViewParticipantsAndTeams: boolean
  isStaff: boolean
}

/**
 * The envelope is deliberately small. Each child page owns the concrete
 * payload type that is supplied as TPage.
 */
export interface AccountEventPageResponse<TPage> {
  event: AccountEventPageEvent
  visibility: AccountEventPageVisibility
  page: TPage
}

export type AccountEventEntryPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventPrizesPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventOperationsPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventSubmissionsPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventJudgingPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventSettingsPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventParticipantsPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventWorkspacePage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventTeamsPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventRostersPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventGalleryPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventFeedbackPage<TPage> = AccountEventPageResponse<TPage>
export type AccountEventCertificatesPage<TPage> = AccountEventPageResponse<TPage>

export const accountEventPagePaths = {
  entry: '/api/account/events/:slug/entry',
  prizes: '/api/account/events/:slug/prizes',
  operations: '/api/account/events/:slug/operations',
  submissions: '/api/account/events/:slug/submissions',
  judging: '/api/account/events/:slug/judging',
  settings: '/api/account/events/:slug/settings',
  participants: '/api/account/events/:slug/participants',
  workspace: '/api/account/events/:slug/workspace',
  teams: '/api/account/events/:slug/teams',
  rosters: '/api/account/events/:slug/rosters',
  gallery: '/api/account/events/:slug/gallery',
  feedback: '/api/account/events/:slug/feedback',
  certificates: '/api/account/events/:slug/certificates'
} as const satisfies Record<AccountEventPageName, string>

export function buildAccountEventPagePath(
  slug: string,
  page: AccountEventPageName
) {
  return `/api/account/events/${encodeURIComponent(slug)}/${page}`
}

export function buildAccountEventPageCacheKey(
  slug: string,
  page: AccountEventPageName
) {
  return `account-event-page:${slug}:${page}`
}
