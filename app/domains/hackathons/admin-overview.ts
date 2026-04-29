import type {
  HackathonAgendaItem,
  HackathonRecord
} from '~/domains/hackathons/records'
import type { HackathonState } from '~/domains/hackathons/states'

export const adminOverviewTabs = ['active', 'upcoming', 'past'] as const

export type AdminOverviewTab = typeof adminOverviewTabs[number]

interface AdminOverviewHackathonTiming {
  agendaItems: Pick<HackathonAgendaItem, 'startsAt'>[]
  state: HackathonState
  submissionOpensAt: string
}

export function getAdminOverviewHackathonStartsAt(hackathon: AdminOverviewHackathonTiming) {
  let earliestStartAt = hackathon.submissionOpensAt
  let earliestStartAtTimestamp = Date.parse(earliestStartAt)

  for (const item of hackathon.agendaItems) {
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

export function getAdminOverviewTabForHackathon(
  hackathon: AdminOverviewHackathonTiming,
  nowTimestamp: number = Date.now()
): AdminOverviewTab {
  if (hackathon.state === 'completed') {
    return 'past'
  }

  if (hackathon.state === 'draft') {
    return 'upcoming'
  }

  const startsAtTimestamp = Date.parse(getAdminOverviewHackathonStartsAt(hackathon))

  if (!Number.isNaN(startsAtTimestamp) && startsAtTimestamp > nowTimestamp) {
    return 'upcoming'
  }

  return 'active'
}

export function countAdminOverviewHackathonsByTab(
  hackathons: Pick<HackathonRecord, 'agendaItems' | 'state' | 'submissionOpensAt'>[],
  nowTimestamp: number = Date.now()
) {
  return hackathons.reduce<Record<AdminOverviewTab, number>>((counts, hackathon) => {
    const tab = getAdminOverviewTabForHackathon(hackathon, nowTimestamp)
    counts[tab] += 1
    return counts
  }, {
    active: 0,
    upcoming: 0,
    past: 0
  })
}
