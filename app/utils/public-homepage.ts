export type PublicHomepageTab = 'active' | 'past'

export interface PublicHomepageHackathonView {
  activeHackathonCount: number
  effectiveTab: PublicHomepageTab
  showFilters: boolean
  useSingleActiveLayout: boolean
}

export function getPublicHomepageHackathonView(
  requestedTab: PublicHomepageTab,
  totalHackathonCount: number,
  pastHackathonCount: number,
  loadedActiveHackathonCount: number
): PublicHomepageHackathonView {
  const activeHackathonCount = Math.max(totalHackathonCount - pastHackathonCount, 0)
  const useSingleActiveLayout = activeHackathonCount === 1 && loadedActiveHackathonCount === 1

  return {
    activeHackathonCount,
    effectiveTab: useSingleActiveLayout ? 'active' : requestedTab,
    showFilters: !useSingleActiveLayout,
    useSingleActiveLayout
  }
}
