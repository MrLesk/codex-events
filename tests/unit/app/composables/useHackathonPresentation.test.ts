import { describe, expect, test } from 'vitest'

import {
  getAgendaItemPresentation,
  shouldShowAgendaDayContext
} from '../../../../app/composables/useHackathonPresentation'

describe('public hackathon agenda presentation helpers', () => {
  test('collapses agenda labels to time-only when the full agenda fits in one local day', () => {
    const agendaItems = [
      {
        startsAt: '2026-03-28T09:00:00',
        endsAt: '2026-03-28T09:45:00'
      },
      {
        startsAt: '2026-03-28T16:00:00',
        endsAt: null
      }
    ]

    expect(shouldShowAgendaDayContext(agendaItems)).toBe(false)
    expect(getAgendaItemPresentation(agendaItems[0], false)).toEqual({
      dayLabel: null,
      dateLabel: null,
      timeLabel: '09:00 AM - 09:45 AM',
      metaLabel: '09:00 AM - 09:45 AM'
    })
  })

  test('includes weekday and calendar date when the agenda spans multiple days', () => {
    const agendaItems = [
      {
        startsAt: '2026-03-27T09:00:00',
        endsAt: '2026-03-27T09:45:00'
      },
      {
        startsAt: '2026-03-28T09:00:00',
        endsAt: null
      }
    ]

    expect(shouldShowAgendaDayContext(agendaItems)).toBe(true)
    expect(getAgendaItemPresentation(agendaItems[0], true)).toEqual({
      dayLabel: 'Fri',
      dateLabel: 'Mar 27',
      timeLabel: '09:00 AM - 09:45 AM',
      metaLabel: 'Fri, Mar 27 | 09:00 AM - 09:45 AM'
    })
  })

  test('retains end-day context when an individual agenda item crosses midnight', () => {
    expect(getAgendaItemPresentation({
      startsAt: '2026-03-28T23:00:00',
      endsAt: '2026-03-29T01:00:00'
    }, true)).toEqual({
      dayLabel: 'Sat',
      dateLabel: 'Mar 28',
      timeLabel: '11:00 PM - Sun, Mar 29 | 01:00 AM',
      metaLabel: 'Sat, Mar 28 | 11:00 PM - Sun, Mar 29 | 01:00 AM'
    })
  })
})
