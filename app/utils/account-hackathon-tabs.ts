export const accountHackathonWorkspaceTabs = [
  'overview',
  'prizes',
  'details',
  'judges',
  'staff',
  'judging',
  'operations',
  'settings'
] as const

export type AccountHackathonWorkspaceTab = (typeof accountHackathonWorkspaceTabs)[number]

export interface AccountHackathonTabAccessOptions {
  hasPublishedPrizes: boolean
  canJudge: boolean
  canAdmin: boolean
}

export interface AccountHackathonTabAccess {
  availableTabs: AccountHackathonWorkspaceTab[]
  showPrizeConfiguration: boolean
  showAgendaConfigurationInDetails: boolean
}

export function getAccountHackathonTabAccess(
  options: AccountHackathonTabAccessOptions
): AccountHackathonTabAccess {
  const { hasPublishedPrizes, canJudge, canAdmin } = options
  const availableTabs: AccountHackathonWorkspaceTab[] = ['overview']

  if (hasPublishedPrizes || canAdmin) {
    availableTabs.push('prizes')
  }

  availableTabs.push('details', 'judges', 'staff')

  if (canJudge) {
    availableTabs.push('judging')
  }

  if (canAdmin) {
    availableTabs.push('operations', 'settings')
  }

  return {
    availableTabs,
    showPrizeConfiguration: canAdmin,
    showAgendaConfigurationInDetails: canAdmin
  }
}
