export type PublicHomepageTab = 'active' | 'past'

export interface PublicHomepageHackathonView {
  activeHackathonCount: number
  effectiveTab: PublicHomepageTab
  showFilters: boolean
  useSingleActiveLayout: boolean
}

function resolvePublicHomepageEffectiveTab(
  requestedTab: PublicHomepageTab | null,
  activeHackathonCount: number,
  pastHackathonCount: number,
  useSingleActiveLayout: boolean
): PublicHomepageTab {
  if (useSingleActiveLayout) {
    return 'active'
  }

  if (requestedTab) {
    return requestedTab
  }

  if (activeHackathonCount > 0) {
    return 'active'
  }

  if (pastHackathonCount > 0) {
    return 'past'
  }

  return 'active'
}

export function getPublicHomepageHackathonView(
  requestedTab: PublicHomepageTab | null,
  totalHackathonCount: number,
  pastHackathonCount: number,
  loadedActiveHackathonCount: number
): PublicHomepageHackathonView {
  const activeHackathonCount = Math.max(totalHackathonCount - pastHackathonCount, 0)
  const useSingleActiveLayout = pastHackathonCount === 0
    && activeHackathonCount === 1
    && loadedActiveHackathonCount === 1

  return {
    activeHackathonCount,
    effectiveTab: resolvePublicHomepageEffectiveTab(
      requestedTab,
      activeHackathonCount,
      pastHackathonCount,
      useSingleActiveLayout
    ),
    showFilters: !useSingleActiveLayout,
    useSingleActiveLayout
  }
}
