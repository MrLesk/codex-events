import type { EventState } from '~/domains/events/states'

export type PublicHomepageTab = 'active' | 'past'

interface PublicHomepageEventEntry {
  state: EventState
}

export interface PublicHomepageEventView {
  activeEventCount: number
  effectiveTab: PublicHomepageTab
  showFilters: boolean
  showTimelineRail: boolean
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

export function getPublicHomepageTabForEvent(event: PublicHomepageEventEntry): PublicHomepageTab {
  return event.state === 'completed' ? 'past' : 'active'
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
  const effectiveTab = resolvePublicHomepageEffectiveTab(
    requestedTab,
    activeEventCount,
    pastEventCount,
    singleEventTab
  )
  const effectiveTabEventCount = effectiveTab === 'past'
    ? pastEventCount
    : activeEventCount

  return {
    activeEventCount,
    effectiveTab,
    showFilters: !useSingleEventLayout,
    showTimelineRail: effectiveTabEventCount > 1,
    useSingleEventLayout
  }
}
