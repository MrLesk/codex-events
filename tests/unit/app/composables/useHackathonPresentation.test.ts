import { describe, expect, test } from 'vitest'

import {
  formatHackathonDateWithWeekday,
  getHackathonEarliestStartAt,
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
      timeLines: ['09:00 AM', '09:45 AM'],
      timeFlowDirection: 'down',
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
      timeLines: ['09:00 AM', '09:45 AM'],
      timeFlowDirection: 'down',
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
      timeLines: ['11:00 PM - Sun, Mar 29 | 01:00 AM'],
      timeFlowDirection: null,
      metaLabel: 'Sat, Mar 28 | 11:00 PM - Sun, Mar 29 | 01:00 AM'
    })
  })

  test('returns the earliest agenda start when agenda items exist', () => {
    expect(getHackathonEarliestStartAt({
      agendaItems: [
        {
          id: 'closing',
          startsAt: '2026-03-29T14:00:00Z',
          endsAt: null,
          title: 'Closing',
          details: null,
          displayOrder: 2
        },
        {
          id: 'opening',
          startsAt: '2026-03-28T09:00:00Z',
          endsAt: null,
          title: 'Opening',
          details: null,
          displayOrder: 1
        }
      ],
      submissionOpensAt: '2026-03-27T08:00:00Z'
    })).toBe('2026-03-28T09:00:00Z')
  })

  test('falls back to submission start when no agenda items exist', () => {
    expect(getHackathonEarliestStartAt({
      agendaItems: [],
      submissionOpensAt: '2026-03-27T08:00:00Z'
    })).toBe('2026-03-27T08:00:00Z')
  })

  test('formats the hackathon day with the current Intl locale weekday', () => {
    const value = '2026-03-28T09:00:00Z'

    expect(formatHackathonDateWithWeekday(value)).toBe(new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(value)))
  })
})
