export const accountHackathonWorkspaceTabs = [
  'overview',
  'team',
  'prizes',
  'details',
  'judges',
  'staff',
  'judging',
  'participants',
  'teams',
  'submissions',
  'operations',
  'settings'
] as const

export type AccountHackathonWorkspaceTab = (typeof accountHackathonWorkspaceTabs)[number]

export interface AccountHackathonTabAccessOptions {
  hasParticipantAccessRecord: boolean
  hasPublishedPrizes: boolean
  canJudge: boolean
  canManage: boolean
  canViewParticipantsAndTeams: boolean
}

export interface AccountHackathonTabAccess {
  availableTabs: AccountHackathonWorkspaceTab[]
  showPrizeConfiguration: boolean
  showAgendaConfigurationInDetails: boolean
}

export function canAccessAccountHackathonWorkspace(options: {
  hasAccessRecord: boolean
  canJudge: boolean
  canManage: boolean
  canViewParticipantsAndTeams: boolean
}) {
  return options.hasAccessRecord
    || options.canJudge
    || options.canManage
    || options.canViewParticipantsAndTeams
}

export function resolveAccountHackathonScopedId(options: {
  accessRecordId?: string | null
  hackathonId: string
}) {
  const accessRecordId = options.accessRecordId?.trim() ?? ''
  return accessRecordId.length > 0 ? accessRecordId : options.hackathonId.trim()
}

export function getAccountHackathonTabAccess(
  options: AccountHackathonTabAccessOptions
): AccountHackathonTabAccess {
  const {
    hasParticipantAccessRecord,
    hasPublishedPrizes,
    canJudge,
    canManage,
    canViewParticipantsAndTeams
  } = options
  const availableTabs: AccountHackathonWorkspaceTab[] = ['overview']

  if (hasParticipantAccessRecord) {
    availableTabs.push('team')
  }

  if (hasPublishedPrizes || canManage) {
    availableTabs.push('prizes')
  }

  availableTabs.push('details', 'judges', 'staff')

  if (canJudge) {
    availableTabs.push('judging')
  }

  if (canViewParticipantsAndTeams) {
    availableTabs.push('participants')
  }

  if (canManage) {
    availableTabs.push('submissions', 'operations', 'settings')
  } else if (canViewParticipantsAndTeams) {
    availableTabs.push('teams')
  }

  return {
    availableTabs,
    showPrizeConfiguration: canManage,
    showAgendaConfigurationInDetails: canManage
  }
}
