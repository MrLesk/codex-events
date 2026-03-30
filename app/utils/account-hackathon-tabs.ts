export const accountHackathonWorkspaceTabs = [
  'overview',
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

export function getAccountHackathonTabAccess(
  options: AccountHackathonTabAccessOptions
): AccountHackathonTabAccess {
  const { hasPublishedPrizes, canJudge, canManage, canViewParticipantsAndTeams } = options
  const availableTabs: AccountHackathonWorkspaceTab[] = ['overview']

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
