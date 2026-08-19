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

export type AccountEventPageRoutePath<TPage extends AccountEventPageName = AccountEventPageName>
  = `/api/account/events/:slug/${TPage}`

export interface AccountEventPageQuery {
  selectedTeamSlug?: string | null
}

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
} as const satisfies {
  readonly [TPage in AccountEventPageName]: AccountEventPageRoutePath<TPage>
}

export const accountJudgeAssignmentWorkspaceRoutePath
  = '/api/account/events/:slug/judging/assignments/:assignmentId' as const

export function normalizeAccountEventPageQuery(
  query?: AccountEventPageQuery | null
): AccountEventPageQuery {
  const selectedTeamSlug = query?.selectedTeamSlug?.trim().toLowerCase()

  return selectedTeamSlug
    ? { selectedTeamSlug }
    : {}
}

export function buildAccountEventPagePath(
  slug: string,
  page: AccountEventPageName,
  query?: AccountEventPageQuery | null
) {
  const path = `/api/account/events/${encodeURIComponent(slug)}/${page}`
  const normalizedQuery = normalizeAccountEventPageQuery(query)

  if (page !== 'teams' || !normalizedQuery.selectedTeamSlug) {
    return path
  }

  return `${path}?selectedTeamSlug=${encodeURIComponent(normalizedQuery.selectedTeamSlug)}`
}

export function buildAccountEventPageCacheKey(
  slug: string,
  page: AccountEventPageName,
  query?: AccountEventPageQuery | null
) {
  const normalizedQuery = normalizeAccountEventPageQuery(query)
  const selectedTeamKey = page === 'teams' && normalizedQuery.selectedTeamSlug
    ? `:selectedTeamSlug=${encodeURIComponent(normalizedQuery.selectedTeamSlug)}`
    : ''

  return `account-event-page:${slug}:${page}${selectedTeamKey}`
}

export function buildAccountJudgeAssignmentWorkspacePath(
  slug: string,
  assignmentId: string
) {
  return `/api/account/events/${encodeURIComponent(slug)}/judging/assignments/${encodeURIComponent(assignmentId)}`
}
