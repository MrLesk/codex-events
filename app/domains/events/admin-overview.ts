import type {
  EventAgendaItem,
  EventRecord
} from '~/domains/events/records'
import type { EventState } from '~/domains/events/states'

export const adminOverviewTabs = ['active', 'upcoming', 'past'] as const

export type AdminOverviewTab = typeof adminOverviewTabs[number]

interface AdminOverviewEventTiming {
  agendaItems: Pick<EventAgendaItem, 'startsAt'>[]
  state: EventState
  submissionOpensAt: string
}

export function getAdminOverviewEventStartsAt(event: AdminOverviewEventTiming) {
  let earliestStartAt = event.submissionOpensAt
  let earliestStartAtTimestamp = Date.parse(earliestStartAt)

  for (const item of event.agendaItems) {
    const agendaItemStartsAtTimestamp = Date.parse(item.startsAt)

    if (
      Number.isNaN(agendaItemStartsAtTimestamp)
      || (!Number.isNaN(earliestStartAtTimestamp) && agendaItemStartsAtTimestamp >= earliestStartAtTimestamp)
    ) {
      continue
    }

    earliestStartAt = item.startsAt
    earliestStartAtTimestamp = agendaItemStartsAtTimestamp
  }

  return earliestStartAt
}

export function getAdminOverviewTabForEvent(
  event: AdminOverviewEventTiming,
  nowTimestamp: number = Date.now()
): AdminOverviewTab {
  if (event.state === 'completed') {
    return 'past'
  }

  if (event.state === 'draft') {
    return 'upcoming'
  }

  const startsAtTimestamp = Date.parse(getAdminOverviewEventStartsAt(event))

  if (!Number.isNaN(startsAtTimestamp) && startsAtTimestamp > nowTimestamp) {
    return 'upcoming'
  }

  return 'active'
}

export function countAdminOverviewEventsByTab(
  events: Pick<EventRecord, 'agendaItems' | 'state' | 'submissionOpensAt'>[],
  nowTimestamp: number = Date.now()
) {
  return events.reduce<Record<AdminOverviewTab, number>>((counts, event) => {
    const tab = getAdminOverviewTabForEvent(event, nowTimestamp)
    counts[tab] += 1
    return counts
  }, {
    active: 0,
    upcoming: 0,
    past: 0
  })
}
