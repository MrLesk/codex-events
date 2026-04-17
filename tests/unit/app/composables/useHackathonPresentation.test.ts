import { describe, expect, test } from 'vitest'

import {
  describeHackathonWindowNote,
  describeHackathonWindowStatus,
  formatHackathonLocation,
  formatHackathonStateLabel,
  formatHackathonDateWithWeekday,
  formatPrizeReward,
  getPublicHackathonStatePresentation,
  resolvePublicHackathonHeaderStateClass,
  summarizeHackathonState,
  resolveHackathonStateColor,
  getHackathonDateTimePresentation,
  getHackathonWindowProgress,
  getHackathonEarliestStartAt,
  getAgendaItemPresentation,
  shouldShowAgendaDayContext
} from '../../../../app/composables/useHackathonPresentation'

describe('public hackathon agenda presentation helpers', () => {
  test('omits the country when city and country are identical', () => {
    expect(formatHackathonLocation({
      city: 'Singapore',
      country: 'Singapore'
    })).toBe('Singapore')
  })

  test('keeps city and country when they differ', () => {
    expect(formatHackathonLocation({
      city: 'Vienna',
      country: 'Austria'
    })).toBe('Vienna, Austria')
  })

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

  test('collapses equal agenda start and end times to a single label', () => {
    expect(getAgendaItemPresentation({
      startsAt: '2026-03-28T09:00:00',
      endsAt: '2026-03-28T09:00:00'
    }, false)).toEqual({
      dayLabel: null,
      dateLabel: null,
      timeLabel: '09:00 AM',
      timeLines: ['09:00 AM'],
      timeFlowDirection: null,
      metaLabel: '09:00 AM'
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

  test('formats a hackathon boundary into separate day, date, and time labels', () => {
    const value = '2026-03-28T09:00:00Z'
    const date = new Date(value)
    const expectedDayLabel = new Intl.DateTimeFormat('en-US', {
      weekday: 'short'
    }).format(date)
    const expectedDateLabel = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date)
    const expectedTimeLabel = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)

    expect(getHackathonDateTimePresentation(value)).toEqual({
      dayLabel: expectedDayLabel,
      dateLabel: expectedDateLabel,
      timeLabel: expectedTimeLabel,
      metaLabel: `${expectedDayLabel}, ${expectedDateLabel} | ${expectedTimeLabel}`
    })
  })

  test('keeps the window open only until the exact closing timestamp', () => {
    const now = new Date('2026-03-28T00:30:00Z')
    const end = '2026-03-28T01:00:00Z'
    const expectedCloseTime = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(end))

    expect(describeHackathonWindowStatus('2026-02-26T00:00:00Z', end, now)).toBe('Open now')
    expect(describeHackathonWindowNote('2026-02-26T00:00:00Z', end, now)).toBe(`Closes at ${expectedCloseTime}`)
  })

  test('uses elapsed timestamp progress while registration remains open', () => {
    const progress = getHackathonWindowProgress(
      '2026-02-26T00:00:00Z',
      '2026-03-28T01:00:00Z',
      new Date('2026-03-28T00:30:00Z')
    )

    expect(progress).toBeGreaterThan(90)
    expect(progress).toBeLessThan(100)
  })

  test('marks the window closed at the exact closing timestamp', () => {
    const end = '2026-03-28T01:00:00Z'
    const now = new Date(end)

    expect(describeHackathonWindowStatus('2026-02-26T00:00:00Z', end, now)).toBe('Closed')
    expect(describeHackathonWindowNote('2026-02-26T00:00:00Z', end, now)).toBe('Closed Mar 28')
    expect(getHackathonWindowProgress('2026-02-26T00:00:00Z', end, now)).toBe(100)
  })

  test('presents a closed public registration badge once the exact registration close timestamp passes', () => {
    expect(getPublicHackathonStatePresentation({
      state: 'registration_open',
      registrationOpensAt: '2026-02-26T00:00:00Z',
      registrationClosesAt: '2026-03-28T01:00:00Z'
    }, new Date('2026-03-28T01:00:00Z'))).toEqual({
      label: 'Registration closed',
      color: 'neutral'
    })
  })

  test('preserves the normal public registration badge while the registration window is still open', () => {
    expect(getPublicHackathonStatePresentation({
      state: 'registration_open',
      registrationOpensAt: '2026-02-26T00:00:00Z',
      registrationClosesAt: '2026-03-28T01:00:00Z'
    }, new Date('2026-03-28T00:30:00Z'))).toEqual({
      label: 'Registration open',
      color: 'info'
    })
  })

  test('resolves the canonical lifecycle chip classes from the public detail presentation', () => {
    expect(resolvePublicHackathonHeaderStateClass({
      state: 'submission_open'
    })).toBe('bg-purple-500/10 text-purple-400 border border-purple-500/20')

    expect(resolvePublicHackathonHeaderStateClass({
      state: 'registration_open',
      registrationOpensAt: '2026-02-26T00:00:00Z',
      registrationClosesAt: '2026-03-28T01:00:00Z'
    }, new Date('2026-03-28T00:30:00Z'))).toBe(
      'border border-sky-600/35 bg-sky-500/16 text-sky-800 dark:border-sky-400/35 dark:bg-sky-500/14 dark:text-sky-300'
    )

    expect(resolvePublicHackathonHeaderStateClass({
      state: 'registration_open',
      registrationOpensAt: '2026-02-26T00:00:00Z',
      registrationClosesAt: '2026-03-28T01:00:00Z'
    }, new Date('2026-03-28T01:00:00Z'))).toBe('bg-white/[0.05] text-[#A3A3A3] border border-white/[0.08]')
  })

  test('formats canonical judging lifecycle labels, colors, and summaries', () => {
    expect(formatHackathonStateLabel('blind_review')).toBe('Blind review')
    expect(formatHackathonStateLabel('pitch')).toBe('Pitch')
    expect(resolveHackathonStateColor('pitch')).toBe('primary')
    expect(resolveHackathonStateColor('pitch_review')).toBe('primary')
    expect(summarizeHackathonState('judging_preparation')).toBe('Team formation is closed. Existing submissions can still be finalized until judging starts.')
    expect(summarizeHackathonState('shortlist')).toBe('Blind-review scores are locked in and finalists are being selected for the pitch stage.')
    expect(summarizeHackathonState('pitch')).toBe('Finalists are presenting live in order. Admins enable each team one at a time before post-pitch judge review opens.')
    expect(summarizeHackathonState('final_deliberation')).toBe('Final combined scores are under review before winners are announced.')
  })

  test('formats currency-backed prize rewards with Intl currency formatting', () => {
    expect(formatPrizeReward({
      rewardValue: '1200',
      rewardCurrency: 'USD'
    })).toBe(new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD'
    }).format(1200))
  })

  test('formats numeric prize rewards without a currency code using Intl number formatting', () => {
    expect(formatPrizeReward({
      rewardValue: '5000',
      rewardCurrency: null
    })).toBe(new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 20
    }).format(5000))
  })

  test('keeps free-form prize reward labels unchanged', () => {
    expect(formatPrizeReward({
      rewardValue: 'Mentorship',
      rewardCurrency: null
    })).toBe('Mentorship')
  })

  test('falls back to grouped numeric output plus currency code when the currency code is not Intl-compatible', () => {
    expect(formatPrizeReward({
      rewardValue: '1200',
      rewardCurrency: 'USDT'
    })).toBe(`${new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 20
    }).format(1200)} USDT`)
  })
})
