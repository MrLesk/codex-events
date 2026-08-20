import type { PublicEventState } from '~/domains/events/presentation'
import type { EventType } from '~/domains/events/records'
import type { AccountEventPageShell } from '#shared/domains/events/account-event-page-shell'

export {
  accountEventPageNames,
  accountEventPagePaths,
  accountJudgeAssignmentWorkspaceRoutePath,
  buildAccountEventPageCacheKey,
  buildAccountEventPagePath,
  buildAccountJudgeAssignmentWorkspacePath,
  normalizeAccountEventPageQuery,
  type AccountEventPageName,
  type AccountEventPageQuery,
  type AccountEventPageRoutePath
} from '#shared/domains/events/account-event-page-registry'

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
  shell?: AccountEventPageShell
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

export function shouldIncludeAccountEventShell(input: {
  isHardDirectNavigation: boolean
  isNonEntryNavigation: boolean
  hasEntryState: boolean
}) {
  return input.isHardDirectNavigation
    && input.isNonEntryNavigation
    && !input.hasEntryState
}
