import { describe, expect, test } from 'vitest'

import {
  eventBuilderBlockDefinitions,
  eventBuilderBlockTypes,
  eventBuilderTypeProfiles,
  getEventBuilderPaletteBlockTypes,
  resolveEventBuilderBlockType
} from '../../../../../shared/domains/events/builder-blocks'
import type {
  EventBalanceScoringInput
} from '../../../../../shared/domains/events/builder-scoring'
import {
  computeEventBalance,
  eventBalanceEngineVersion,
  resolveEventBalanceBand
} from '../../../../../shared/domains/events/builder-scoring'
import type { EventBuilderTemplateBlock } from '../../../../../shared/domains/events/builder-templates'

function buildAgendaItems(
  blocks: Array<{ builderBlockType?: string | null, durationMinutes: number }>,
  startIso = '2026-09-12T09:00:00.000Z'
) {
  let cursor = Date.parse(startIso)

  return blocks.map((block) => {
    const startsAt = new Date(cursor).toISOString()

    cursor += block.durationMinutes * 60000

    return {
      startsAt,
      endsAt: new Date(cursor).toISOString(),
      builderBlockType: block.builderBlockType
    }
  })
}

export function buildScoringInput(overrides: Partial<EventBalanceScoringInput> = {}): EventBalanceScoringInput {
  return {
    eventType: 'meetup',
    agendaItems: [],
    registrationOpensAt: null,
    registrationClosesAt: null,
    visibleApplicationFieldCount: 0,
    requiredApplicationFieldCount: 0,
    ...overrides
  }
}

export function buildTemplateScoringInput(
  eventType: EventBalanceScoringInput['eventType'],
  blocks: readonly EventBuilderTemplateBlock[]
): EventBalanceScoringInput {
  return buildScoringInput({
    eventType,
    agendaItems: buildAgendaItems(
      blocks.map(block => ({ builderBlockType: block.builderBlockType, durationMinutes: block.durationMinutes }))
    )
  })
}

const balancedMeetupBlocks = [
  { builderBlockType: 'welcome', durationMinutes: 15 },
  { builderBlockType: 'lightning_talk', durationMinutes: 15 },
  { builderBlockType: 'talk', durationMinutes: 30 },
  { builderBlockType: 'break', durationMinutes: 15 },
  { builderBlockType: 'panel', durationMinutes: 45 },
  { builderBlockType: 'networking', durationMinutes: 45 }
]

describe('builder block catalog', () => {
  test('resolves unknown, absent, and legacy block types to custom', () => {
    expect(resolveEventBuilderBlockType('networking')).toBe('networking')
    expect(resolveEventBuilderBlockType('renamed_block')).toBe('custom')
    expect(resolveEventBuilderBlockType(null)).toBe('custom')
    expect(resolveEventBuilderBlockType(undefined)).toBe('custom')
    expect(resolveEventBuilderBlockType('')).toBe('custom')
  })

  test('palette puts custom last and respects per-type availability', () => {
    for (const eventType of ['hackathon', 'meetup', 'build'] as const) {
      const palette = getEventBuilderPaletteBlockTypes(eventType)

      expect(palette[palette.length - 1]).toBe('custom')

      for (const type of palette) {
        expect(eventBuilderBlockDefinitions[type].appliesTo).toContain(eventType)
      }
    }

    expect(getEventBuilderPaletteBlockTypes('hackathon')).toContain('hacking')
    expect(getEventBuilderPaletteBlockTypes('hackathon')).not.toContain('build')
    expect(getEventBuilderPaletteBlockTypes('build')).toContain('build')
    expect(getEventBuilderPaletteBlockTypes('build')).not.toContain('hacking')
    expect(getEventBuilderPaletteBlockTypes('meetup')).not.toContain('hacking')
    expect(getEventBuilderPaletteBlockTypes('meetup')).not.toContain('build')
  })

  test('every block definition is internally consistent', () => {
    for (const type of eventBuilderBlockTypes) {
      const definition = eventBuilderBlockDefinitions[type]

      expect(definition.type).toBe(type)
      expect(definition.defaultDurationMinutes).toBeGreaterThan(0)
      expect(definition.appliesTo.length).toBeGreaterThan(0)
    }
  })
})

describe('computeEventBalance', () => {
  test('is deterministic for identical input', () => {
    const input = buildScoringInput({
      agendaItems: buildAgendaItems(balancedMeetupBlocks),
      registrationOpensAt: '2026-08-29T09:00:00.000Z'
    })

    expect(computeEventBalance(input)).toEqual(computeEventBalance(input))
  })

  test('returns clamped integer meters and embeds the engine version', () => {
    const result = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems(balancedMeetupBlocks)
    }))

    expect(result.breakdown.engineVersion).toBe(eventBalanceEngineVersion)

    for (const value of [
      result.score,
      result.breakdown.focusBudget,
      result.breakdown.energyCurve,
      result.breakdown.boredomRisk,
      result.breakdown.returnIntent
    ]) {
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })

  test('an empty agenda scores low with an actionable tip', () => {
    const result = computeEventBalance(buildScoringInput())

    expect(result.score).toBeLessThan(60)
    expect(result.tips.some(tip => tip.id === 'agenda-empty')).toBe(true)
  })

  test('a balanced agenda scores well and includes a boost tip', () => {
    const result = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems(balancedMeetupBlocks)
    }))

    expect(result.score).toBeGreaterThanOrEqual(70)
    expect(result.tips.some(tip => tip.tone === 'boost')).toBe(true)
  })

  test('a social-only agenda is capped at Needs work no matter the polish', () => {
    const result = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([
        { builderBlockType: 'networking', durationMinutes: 45 }
      ])
    }))

    expect(result.score).toBeLessThanOrEqual(35)
    expect(result.band.id).toBe('needs_work')
    expect(result.tips.some(tip => tip.id === 'agenda-no-session')).toBe(true)
  })

  test('focus cost scales with block duration', () => {
    const short = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([{ builderBlockType: 'talk', durationMinutes: 30 }])
    }))
    const long = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([{ builderBlockType: 'talk', durationMinutes: 90 }])
    }))

    expect(long.focusSpent).toBeGreaterThan(short.focusSpent)
    expect(long.breakdown.focusBudget).toBeGreaterThan(short.breakdown.focusBudget)
  })

  test('variety is earned: a single-format agenda scores lower than a mixed one', () => {
    const single = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([{ builderBlockType: 'workshop', durationMinutes: 60 }])
    }))
    const varied = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems(balancedMeetupBlocks)
    }))

    expect(single.breakdown.boredomRisk).toBeLessThan(varied.breakdown.boredomRisk)
  })

  test('breaks follow an inverted U: token breaks restore nothing, long holes decline', () => {
    // Interactive drain keeps the tip list quiet so the break tips surface.
    const drain = [{ builderBlockType: 'workshop', durationMinutes: 90 }]
    const restoreAfter = (breakMinutes: number) => {
      const result = computeEventBalance(buildScoringInput({
        agendaItems: buildAgendaItems([...drain, { builderBlockType: 'break', durationMinutes: breakMinutes }])
      }))

      return result.energyByItem[1]! - result.energyByItem[0]!
    }

    expect(restoreAfter(5)).toBe(0)
    expect(restoreAfter(20)).toBeGreaterThan(restoreAfter(10))
    expect(restoreAfter(60)).toBeLessThan(restoreAfter(25))

    const tokenBreak = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([...drain, { builderBlockType: 'break', durationMinutes: 5 }])
    }))
    const marathonBreak = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([...drain, { builderBlockType: 'break', durationMinutes: 60 }])
    }))

    expect(tokenBreak.tips.some(tip => tip.id === 'energy-token-break')).toBe(true)
    expect(marathonBreak.tips.some(tip => tip.id === 'energy-marathon-break')).toBe(true)
  })

  test('recovery saturates: a marathon break cannot outheal a meal', () => {
    const drain = [{ builderBlockType: 'panel', durationMinutes: 90 }]
    const longBreak = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([...drain, { builderBlockType: 'break', durationMinutes: 45 }])
    }))
    const meal = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([...drain, { builderBlockType: 'food', durationMinutes: 45 }])
    }))

    const longBreakRecovery = longBreak.energyByItem[1]! - longBreak.energyByItem[0]!
    const mealRecovery = meal.energyByItem[1]! - meal.energyByItem[0]!

    expect(longBreakRecovery).toBeLessThan(mealRecovery)
    expect(longBreakRecovery).toBeLessThan(3 * 12)
  })

  test('a lightning round is a legal format, not monotony', () => {
    const talkTrack = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([
        { builderBlockType: 'welcome', durationMinutes: 15 },
        ...Array.from({ length: 9 }, () => ({ builderBlockType: 'lightning_talk', durationMinutes: 15 })),
        { builderBlockType: 'break', durationMinutes: 15 },
        { builderBlockType: 'networking', durationMinutes: 60 }
      ])
    }))

    expect(talkTrack.tips.some(tip => tip.id === 'boredom-repeats')).toBe(false)
    expect(talkTrack.breakdown.boredomRisk).toBeGreaterThanOrEqual(50)
    expect(talkTrack.score).toBeGreaterThanOrEqual(70)
  })

  test('a demo night is a complete event and demos are a strong close', () => {
    const demoNight = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([
        { builderBlockType: 'welcome', durationMinutes: 15 },
        { builderBlockType: 'demos', durationMinutes: 60 },
        { builderBlockType: 'networking', durationMinutes: 45 }
      ])
    }))

    expect(demoNight.focusState).not.toBe('thin')
    expect(demoNight.score).toBeGreaterThanOrEqual(80)

    const demoClose = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([
        { builderBlockType: 'talk', durationMinutes: 30 },
        { builderBlockType: 'demos', durationMinutes: 30 }
      ])
    }))

    expect(demoClose.tips.some(tip => tip.id === 'return-strong-close')).toBe(true)
  })

  test('a long hackathon without a real meal crashes and scores lower', () => {
    const hackBlocks = [
      { builderBlockType: 'welcome', durationMinutes: 20 },
      { builderBlockType: 'keynote', durationMinutes: 30 },
      { builderBlockType: 'team_formation', durationMinutes: 30 },
      { builderBlockType: 'hacking', durationMinutes: 150 },
      { builderBlockType: 'hacking', durationMinutes: 150 },
      { builderBlockType: 'demos_judging', durationMinutes: 60 },
      { builderBlockType: 'awards_closing', durationMinutes: 30 },
      { builderBlockType: 'networking', durationMinutes: 45 }
    ]
    const lunchless = computeEventBalance(buildScoringInput({
      eventType: 'hackathon',
      agendaItems: buildAgendaItems(hackBlocks)
    }))
    const withLunch = computeEventBalance(buildScoringInput({
      eventType: 'hackathon',
      agendaItems: buildAgendaItems([
        ...hackBlocks.slice(0, 4),
        { builderBlockType: 'food', durationMinutes: 45 },
        ...hackBlocks.slice(4)
      ])
    }))

    expect(lunchless.tips.some(tip => tip.id === 'energy-crash')).toBe(true)
    expect(withLunch.score - lunchless.score).toBeGreaterThanOrEqual(8)
  })

  test('token blocks earn no bonuses: 10m food and 5m closes do not pay', () => {
    const longAgenda = [
      { builderBlockType: 'workshop', durationMinutes: 90 },
      { builderBlockType: 'build', durationMinutes: 180 }
    ]
    const tokenFood = computeEventBalance(buildScoringInput({
      eventType: 'build',
      agendaItems: buildAgendaItems([...longAgenda, { builderBlockType: 'food', durationMinutes: 10 }])
    }))

    expect(tokenFood.tips.some(tip => tip.id === 'return-no-food')).toBe(true)

    const tokenClose = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([
        { builderBlockType: 'talk', durationMinutes: 30 },
        { builderBlockType: 'talk', durationMinutes: 30 },
        { builderBlockType: 'networking', durationMinutes: 5 }
      ])
    }))

    expect(tokenClose.tips.some(tip => tip.id === 'return-strong-close')).toBe(false)
  })

  test('untyped agendas cap at Fair, below any honest scored agenda band', () => {
    const untyped = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([
        { builderBlockType: null, durationMinutes: 60 },
        { builderBlockType: null, durationMinutes: 60 },
        { builderBlockType: null, durationMinutes: 60 }
      ])
    }))

    expect(untyped.score).toBeLessThanOrEqual(55)
  })

  test('custom blocks with declared dials are scored content', () => {
    const undialed = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([
        { builderBlockType: 'welcome', durationMinutes: 15 },
        { builderBlockType: null, durationMinutes: 90 },
        { builderBlockType: 'networking', durationMinutes: 45 }
      ])
    }))
    const dialed = computeEventBalance(buildScoringInput({
      agendaItems: [
        ...buildAgendaItems([
          { builderBlockType: 'welcome', durationMinutes: 15 },
          { builderBlockType: null, durationMinutes: 90 },
          { builderBlockType: 'networking', durationMinutes: 45 }
        ]).map((item, index) => index === 1 ? { ...item, focusCost: 14, energyDelta: -6 } : item)
      ]
    }))

    // Dialed custom content escapes the no-session cap and moves the meters.
    expect(dialed.score).toBeGreaterThan(undialed.score)
    expect(dialed.focusSpent).toBeGreaterThanOrEqual(14)
    expect(dialed.focusState).not.toBe('thin')
  })

  test('an unbroken passive stretch degrades boredom and energy', () => {
    const monotone = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([
        { builderBlockType: 'talk', durationMinutes: 60 },
        { builderBlockType: 'talk', durationMinutes: 60 },
        { builderBlockType: 'talk', durationMinutes: 60 },
        { builderBlockType: 'talk', durationMinutes: 60 }
      ])
    }))
    const varied = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems(balancedMeetupBlocks)
    }))

    expect(monotone.breakdown.boredomRisk).toBeLessThan(varied.breakdown.boredomRisk)
    expect(monotone.breakdown.energyCurve).toBeLessThan(varied.breakdown.energyCurve)
    expect(monotone.tips.some(tip => tip.tone === 'warning')).toBe(true)
  })

  test('recovery blocks repair a draining agenda', () => {
    const drained = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([
        { builderBlockType: 'keynote', durationMinutes: 30 },
        { builderBlockType: 'panel', durationMinutes: 45 },
        { builderBlockType: 'keynote', durationMinutes: 30 },
        { builderBlockType: 'panel', durationMinutes: 45 }
      ])
    }))
    const recovered = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([
        { builderBlockType: 'keynote', durationMinutes: 30 },
        { builderBlockType: 'break', durationMinutes: 15 },
        { builderBlockType: 'panel', durationMinutes: 45 },
        { builderBlockType: 'food', durationMinutes: 45 },
        { builderBlockType: 'keynote', durationMinutes: 30 },
        { builderBlockType: 'networking', durationMinutes: 45 }
      ])
    }))

    expect(recovered.breakdown.energyCurve).toBeGreaterThan(drained.breakdown.energyCurve)
  })

  test('a marathon hacking block is not punished as a passive stretch', () => {
    const result = computeEventBalance(buildScoringInput({
      eventType: 'hackathon',
      agendaItems: buildAgendaItems([
        { builderBlockType: 'welcome', durationMinutes: 15 },
        { builderBlockType: 'team_formation', durationMinutes: 30 },
        { builderBlockType: 'hacking', durationMinutes: 360 },
        { builderBlockType: 'food', durationMinutes: 45 },
        { builderBlockType: 'networking', durationMinutes: 45 }
      ])
    }))

    // One session format caps the variety base; the point is no stretch penalty.
    expect(result.breakdown.boredomRisk).toBeGreaterThanOrEqual(70)
    expect(result.tips.some(tip => tip.id === 'boredom-long-stretch')).toBe(false)
  })

  test('untyped items are neutral: never punished, flagged when they dominate', () => {
    const allCustom = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([
        { builderBlockType: null, durationMinutes: 60 },
        { builderBlockType: 'legacy_thing', durationMinutes: 60 },
        { builderBlockType: undefined, durationMinutes: 60 }
      ])
    }))

    expect(allCustom.breakdown.lowConfidence).toBe(true)
    expect(allCustom.breakdown.focusBudget).toBe(60)
    expect(allCustom.breakdown.energyCurve).toBe(60)
    expect(allCustom.breakdown.boredomRisk).toBe(60)
    expect(allCustom.score).toBeGreaterThanOrEqual(40)
    expect(allCustom.tips.some(tip => tip.id === 'agenda-low-confidence')).toBe(true)

    const minorityCustom = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([
        ...balancedMeetupBlocks,
        { builderBlockType: 'legacy_thing', durationMinutes: 15 }
      ])
    }))

    expect(minorityCustom.breakdown.lowConfidence).toBe(false)
  })

  test('registration lead time is measured against the event start, not wall clock', () => {
    const agendaItems = buildAgendaItems(balancedMeetupBlocks, '2030-05-01T18:00:00.000Z')
    const longLead = computeEventBalance(buildScoringInput({
      agendaItems,
      registrationOpensAt: '2030-04-10T00:00:00.000Z',
      registrationClosesAt: '2030-05-01T18:00:00.000Z'
    }))
    const shortLead = computeEventBalance(buildScoringInput({
      agendaItems,
      registrationOpensAt: '2030-04-30T00:00:00.000Z',
      registrationClosesAt: '2030-05-01T18:00:00.000Z'
    }))

    expect(longLead.breakdown.returnIntent).toBeGreaterThan(shortLead.breakdown.returnIntent)
    expect(shortLead.tips.some(tip => tip.id === 'return-short-lead')).toBe(true)
  })

  test('platform configuration never earns points; heavy application forms cost them', () => {
    const agendaItems = buildAgendaItems(balancedMeetupBlocks)
    const baseline = computeEventBalance(buildScoringInput({ agendaItems }))
    const leanForm = computeEventBalance(buildScoringInput({
      agendaItems,
      visibleApplicationFieldCount: 3,
      requiredApplicationFieldCount: 2
    }))
    const heavyForm = computeEventBalance(buildScoringInput({
      agendaItems,
      visibleApplicationFieldCount: 9,
      requiredApplicationFieldCount: 8
    }))

    expect(leanForm.score).toBe(baseline.score)
    // Heavy forms only warn: selective registration wins on show-up in the field data.
    expect(heavyForm.score).toBe(baseline.score)
    expect(heavyForm.tips.some(tip => tip.id === 'return-heavy-application')).toBe(true)
  })

  test('tips cap at four, keep warnings first, and reserve a boost slot', () => {
    const result = computeEventBalance(buildScoringInput({
      agendaItems: buildAgendaItems([
        { builderBlockType: 'keynote', durationMinutes: 90 },
        { builderBlockType: 'keynote', durationMinutes: 90 },
        { builderBlockType: 'talk', durationMinutes: 60 },
        { builderBlockType: 'panel', durationMinutes: 60 },
        { builderBlockType: 'demos_judging', durationMinutes: 60 }
      ]),
      requiredApplicationFieldCount: 8,
      visibleApplicationFieldCount: 9
    }))

    expect(result.tips.length).toBeLessThanOrEqual(4)

    const lastBoostIndex = result.tips.findLastIndex(tip => tip.tone === 'boost')
    const firstWarningIndex = result.tips.findIndex(tip => tip.tone === 'warning')

    if (lastBoostIndex !== -1 && firstWarningIndex !== -1) {
      expect(firstWarningIndex).toBeLessThan(lastBoostIndex)
    }
  })

  test('bands map score ranges to labels', () => {
    expect(resolveEventBalanceBand(0).id).toBe('needs_work')
    expect(resolveEventBalanceBand(39).id).toBe('needs_work')
    expect(resolveEventBalanceBand(40).id).toBe('fair')
    expect(resolveEventBalanceBand(60).id).toBe('good')
    expect(resolveEventBalanceBand(80).id).toBe('excellent')
    expect(resolveEventBalanceBand(100).id).toBe('excellent')
  })

  test('per-type focus budgets differ and change the same agenda footprint', () => {
    expect(eventBuilderTypeProfiles.meetup.focusBudget).toBeLessThan(eventBuilderTypeProfiles.build.focusBudget)
    expect(eventBuilderTypeProfiles.build.focusBudget).toBeLessThan(eventBuilderTypeProfiles.hackathon.focusBudget)

    const heavyBlocks = [
      { builderBlockType: 'keynote', durationMinutes: 30 },
      { builderBlockType: 'workshop', durationMinutes: 60 },
      { builderBlockType: 'panel', durationMinutes: 45 },
      { builderBlockType: 'talk', durationMinutes: 30 },
      { builderBlockType: 'break', durationMinutes: 15 },
      { builderBlockType: 'networking', durationMinutes: 45 }
    ]
    const meetup = computeEventBalance(buildScoringInput({ agendaItems: buildAgendaItems(heavyBlocks) }))
    const hackathon = computeEventBalance(buildScoringInput({
      eventType: 'hackathon',
      agendaItems: buildAgendaItems(heavyBlocks)
    }))

    expect(meetup.focusBudget).toBe(90)
    expect(hackathon.focusBudget).toBe(160)
    expect(meetup.focusSpent).toBe(hackathon.focusSpent)
    expect(meetup.focusState).not.toBe('thin')
  })
})
