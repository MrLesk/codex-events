export type PublicHomepageTab = 'active' | 'past'

export interface PublicHomepageEventView {
  activeEventCount: number
  effectiveTab: PublicHomepageTab
  showFilters: boolean
  useSingleEventLayout: boolean
}

function resolvePublicHomepageEffectiveTab(
  requestedTab: PublicHomepageTab | null,
  activeEventCount: number,
  pastEventCount: number,
  singleEventTab: PublicHomepageTab | null
): PublicHomepageTab {
  if (singleEventTab) {
    return singleEventTab
  }

  if (requestedTab) {
    return requestedTab
  }

  if (activeEventCount > 0) {
    return 'active'
  }

  if (pastEventCount > 0) {
    return 'past'
  }

  return 'active'
}

export function getPublicHomepageEventView(
  requestedTab: PublicHomepageTab | null,
  totalEventCount: number,
  pastEventCount: number,
  loadedEventCount: number
): PublicHomepageEventView {
  const activeEventCount = Math.max(totalEventCount - pastEventCount, 0)
  const useSingleEventLayout = totalEventCount === 1 && loadedEventCount === 1
  const singleEventTab = useSingleEventLayout && pastEventCount > 0
    ? 'past'
    : useSingleEventLayout
      ? 'active'
      : null

  return {
    activeEventCount,
    effectiveTab: resolvePublicHomepageEffectiveTab(
      requestedTab,
      activeEventCount,
      pastEventCount,
      singleEventTab
    ),
    showFilters: !useSingleEventLayout,
    useSingleEventLayout
  }
}
