export const accountHackathonWorkspaceTabs = [
  'overview',
  'team',
  'submission',
  'prizes',
  'details',
  'judges',
  'staff',
  'participants',
  'teams',
  'submissions',
  'judging',
  'operations',
  'settings'
] as const

export type AccountHackathonWorkspaceTab = (typeof accountHackathonWorkspaceTabs)[number]

export interface AccountHackathonTabAccessOptions {
  hasApprovedParticipantAccess: boolean
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
    hasApprovedParticipantAccess,
    hasPublishedPrizes,
    canJudge,
    canManage,
    canViewParticipantsAndTeams
  } = options
  const availableTabs: AccountHackathonWorkspaceTab[] = ['overview']

  if (hasApprovedParticipantAccess) {
    availableTabs.push('team')
    availableTabs.push('submission')
  }

  if (hasPublishedPrizes || canManage) {
    availableTabs.push('prizes')
  }

  availableTabs.push('details', 'judges', 'staff')

  if (canViewParticipantsAndTeams) {
    availableTabs.push('participants')
  }

  if (canManage) {
    availableTabs.push('submissions')

    if (canJudge) {
      availableTabs.push('judging')
    }

    availableTabs.push('operations', 'settings')
  } else if (canViewParticipantsAndTeams) {
    if (canJudge) {
      availableTabs.push('judging')
    }

    availableTabs.push('teams')
  } else if (canJudge) {
    availableTabs.push('judging')
  }

  return {
    availableTabs,
    showPrizeConfiguration: canManage,
    showAgendaConfigurationInDetails: canManage
  }
}
