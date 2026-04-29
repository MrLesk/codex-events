export type PublicHomepageTab = 'active' | 'past'

export interface PublicHomepageHackathonView {
  activeHackathonCount: number
  effectiveTab: PublicHomepageTab
  showFilters: boolean
  useSingleHackathonLayout: boolean
}

function resolvePublicHomepageEffectiveTab(
  requestedTab: PublicHomepageTab | null,
  activeHackathonCount: number,
  pastHackathonCount: number,
  singleHackathonTab: PublicHomepageTab | null
): PublicHomepageTab {
  if (singleHackathonTab) {
    return singleHackathonTab
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
  loadedHackathonCount: number
): PublicHomepageHackathonView {
  const activeHackathonCount = Math.max(totalHackathonCount - pastHackathonCount, 0)
  const useSingleHackathonLayout = totalHackathonCount === 1 && loadedHackathonCount === 1
  const singleHackathonTab = useSingleHackathonLayout && pastHackathonCount > 0
    ? 'past'
    : useSingleHackathonLayout
      ? 'active'
      : null

  return {
    activeHackathonCount,
    effectiveTab: resolvePublicHomepageEffectiveTab(
      requestedTab,
      activeHackathonCount,
      pastHackathonCount,
      singleHackathonTab
    ),
    showFilters: !useSingleHackathonLayout,
    useSingleHackathonLayout
  }
}
