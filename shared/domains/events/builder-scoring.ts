import type { EventBuilderBlockDefinition, EventBuilderEventType } from './builder-blocks'
import {
  eventBuilderBlockDefinitions,
  eventBuilderTypeProfiles,
  resolveEventBuilderBlockType
} from './builder-blocks'

export const eventBalanceEngineVersion = 5

export const eventBalanceBandIds = ['needs_work', 'fair', 'good', 'excellent'] as const

export type EventBalanceBandId = (typeof eventBalanceBandIds)[number]

export interface EventBalanceBand {
  id: EventBalanceBandId
  label: string
  minScore: number
}

export const eventBalanceBands: readonly EventBalanceBand[] = [
  { id: 'needs_work', label: 'Needs work', minScore: 0 },
  { id: 'fair', label: 'Fair', minScore: 40 },
  { id: 'good', label: 'Good', minScore: 60 },
  { id: 'excellent', label: 'Excellent', minScore: 80 }
]

export function resolveEventBalanceBand(score: number): EventBalanceBand {
  let resolved = eventBalanceBands[0]!

  for (const band of eventBalanceBands) {
    if (score >= band.minScore) {
      resolved = band
    }
  }

  return resolved
}

export type EventBalanceMeterId = 'focusBudget' | 'energyCurve' | 'boredomRisk' | 'returnIntent'

export interface EventBalanceAgendaItemInput {
  startsAt: string
  endsAt: string | null
  builderBlockType?: string | null
  /** Organizer-declared focus cost for custom blocks (absolute, not duration scaled). */
  focusCost?: number | null
  /** Organizer-declared energy delta for custom blocks (absolute, not duration scaled). */
  energyDelta?: number | null
}

/**
 * The score reads only what shapes the attendee experience: the agenda,
 * registration timing, and application friction. Platform configuration
 * (links, judging, capacity, …) is completeness, not quality. It never
 * earns points.
 */
export interface EventBalanceScoringInput {
  eventType: EventBuilderEventType
  agendaItems: EventBalanceAgendaItemInput[]
  registrationOpensAt: string | null
  registrationClosesAt: string | null
  visibleApplicationFieldCount: number
  requiredApplicationFieldCount: number
}

export interface EventBalanceBreakdown {
  engineVersion: number
  lowConfidence: boolean
  focusBudget: number
  energyCurve: number
  boredomRisk: number
  returnIntent: number
}

export type EventBalanceTipTone = 'boost' | 'warning'

export interface EventBalanceTip {
  id: string
  message: string
  tone: EventBalanceTipTone
  meter: EventBalanceMeterId
  priority: number
}

export type EventBalanceFocusState = 'thin' | 'balanced' | 'overstuffed'

export interface EventBalanceResult {
  score: number
  band: EventBalanceBand
  breakdown: EventBalanceBreakdown
  tips: EventBalanceTip[]
  focusSpent: number
  focusBudget: number
  focusState: EventBalanceFocusState
  /** Energy after each agenda item, aligned to the input order (undialed custom blocks carry the previous value). */
  energyByItem: number[]
  energyMinimum: number
  /** Cumulative focus spent after each agenda item, aligned to the input order. */
  focusByItem: number[]
}

interface ResolvedAgendaBlock {
  definition: EventBuilderBlockDefinition
  durationMinutes: number
  isCustom: boolean
  /** Organizer-declared costs for custom blocks; null when undialed. */
  customFocusCost: number | null
  customEnergyDelta: number | null
}

const scoreWeightsByEventType: Record<EventBuilderEventType, Record<EventBalanceMeterId, number>> = {
  hackathon: { focusBudget: 0.25, energyCurve: 0.25, boredomRisk: 0.2, returnIntent: 0.3 },
  build: { focusBudget: 0.25, energyCurve: 0.25, boredomRisk: 0.2, returnIntent: 0.3 },
  meetup: { focusBudget: 0.2, energyCurve: 0.2, boredomRisk: 0.3, returnIntent: 0.3 }
}

const neutralMeterValue = 60
const minimumTypedCoverage = 0.5
/** Untyped agendas can never look better than an honest mediocre one. */
const lowConfidenceScoreCap = 55
const frictionRequiredFieldWarningThreshold = 6
/** Agendas at or above this total length are expected to feed people. */
const foodExpectedTotalMinutes = 270
/** Food and closing bonuses only pay for blocks long enough to be real. */
const minimumFoodMinutes = 30
const minimumCloseMinutes = 20
const dayMilliseconds = 24 * 60 * 60 * 1000

function clampValue(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function minutesBetween(startsAt: string, endsAt: string | null) {
  if (!endsAt) {
    return null
  }

  const start = Date.parse(startsAt)
  const end = Date.parse(endsAt)

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return null
  }

  return (end - start) / 60000
}

function resolveAgendaBlocks(items: EventBalanceAgendaItemInput[]): ResolvedAgendaBlock[] {
  return items.map((item) => {
    const type = resolveEventBuilderBlockType(item.builderBlockType)
    const definition = eventBuilderBlockDefinitions[type]
    const isCustom = type === 'custom'

    return {
      definition,
      durationMinutes: minutesBetween(item.startsAt, item.endsAt) ?? definition.defaultDurationMinutes,
      isCustom,
      customFocusCost: isCustom && typeof item.focusCost === 'number' ? item.focusCost : null,
      customEnergyDelta: isCustom && typeof item.energyDelta === 'number' ? item.energyDelta : null
    }
  })
}

function isPassiveBlock(definition: EventBuilderBlockDefinition) {
  return !definition.interactive && (definition.kind === 'session' || definition.kind === 'ceremony')
}

/** A block the engine can reason about: typed, or a custom block with declared costs. */
function isScoredBlock(block: ResolvedAgendaBlock) {
  return !block.isCustom || block.customFocusCost !== null || block.customEnergyDelta !== null
}

/** Declared content: what people actually show up for. */
function isContentBlock(block: ResolvedAgendaBlock) {
  if (block.isCustom) {
    return block.customFocusCost !== null || block.customEnergyDelta !== null
  }

  return block.definition.kind === 'session'
}

/**
 * Duration scaling follows the physical process, not one shared law:
 * passive attention decays superlinearly past its default, deep-work drain
 * accelerates after the second hour, and recovery saturates instead of
 * letting long breaks outheal meals.
 */
function passiveRatio(definition: EventBuilderBlockDefinition, durationMinutes: number, exponent: number) {
  const ratio = clampValue(durationMinutes / definition.defaultDurationMinutes, 0.35, 2)

  return ratio <= 1 ? ratio : Math.pow(ratio, exponent)
}

function deepWorkRatio(definition: EventBuilderBlockDefinition, durationMinutes: number, exponent: number) {
  const ratio = clampValue(durationMinutes / definition.defaultDurationMinutes, 0.25, 3)

  return ratio <= 1 ? ratio : Math.pow(ratio, exponent)
}

function saturatingRatio(definition: EventBuilderBlockDefinition, durationMinutes: number) {
  const ratio = clampValue(durationMinutes / definition.defaultDurationMinutes, 0.25, 3)

  return (2 * ratio) / (ratio + 1)
}

/**
 * Breaks follow an inverted U: the first five minutes are transition, not
 * rest; restoration peaks around 20-25 minutes; past that the room disperses
 * and a long hole in the schedule stops being recovery.
 */
function breakRestore(durationMinutes: number) {
  const restMinutes = Math.max(0, durationMinutes - 5)
  const base = 13 * ((2 * restMinutes) / (restMinutes + 15))

  if (durationMinutes <= 25) {
    return base
  }

  const peak = 13 * ((2 * 20) / (20 + 15))

  return Math.max(3, peak - (durationMinutes - 25) * 0.18)
}

function linearRatio(definition: EventBuilderBlockDefinition, durationMinutes: number) {
  return clampValue(durationMinutes / definition.defaultDurationMinutes, 0.25, 2.5)
}

/** Focus cost of a block at a given duration. */
export function getScaledBlockFocusCost(definition: EventBuilderBlockDefinition, durationMinutes: number) {
  if (definition.focusCost === 0) {
    return 0
  }

  if (definition.stretchExempt) {
    return definition.focusCost * deepWorkRatio(definition, durationMinutes, 1)
  }

  if (isPassiveBlock(definition)) {
    return definition.focusCost * passiveRatio(definition, durationMinutes, 1.25)
  }

  return definition.focusCost * linearRatio(definition, durationMinutes)
}

/** Energy delta of a block at a given duration. */
export function getScaledBlockEnergyDelta(definition: EventBuilderBlockDefinition, durationMinutes: number) {
  if (definition.energyDelta === 0) {
    return 0
  }

  // Breaks follow the inverted U; other positive deltas saturate so a
  // marathon block is never a second lunch.
  if (definition.type === 'break') {
    return breakRestore(durationMinutes)
  }

  if (definition.energyDelta > 0) {
    return definition.energyDelta * saturatingRatio(definition, durationMinutes)
  }

  if (definition.stretchExempt) {
    return definition.energyDelta * deepWorkRatio(definition, durationMinutes, 1.25)
  }

  if (isPassiveBlock(definition)) {
    return definition.energyDelta * passiveRatio(definition, durationMinutes, 1.4)
  }

  return definition.energyDelta * linearRatio(definition, durationMinutes)
}

function blockFocusCost(block: ResolvedAgendaBlock) {
  if (block.isCustom) {
    return block.customFocusCost ?? 0
  }

  return getScaledBlockFocusCost(block.definition, block.durationMinutes)
}

function blockEnergyDelta(block: ResolvedAgendaBlock) {
  if (block.isCustom) {
    return block.customEnergyDelta ?? 0
  }

  return getScaledBlockEnergyDelta(block.definition, block.durationMinutes)
}

interface MeterComputation {
  value: number
  tips: EventBalanceTip[]
}

function computeFocusMeter(
  scoredBlocks: ResolvedAgendaBlock[],
  eventType: EventBuilderEventType
): MeterComputation & { spent: number, budget: number, state: EventBalanceFocusState } {
  const profile = eventBuilderTypeProfiles[eventType]
  const spent = scoredBlocks.reduce((total, block) => total + blockFocusCost(block), 0)
  const contentMinutes = scoredBlocks
    .filter(isContentBlock)
    .reduce((total, block) => total + block.durationMinutes, 0)
  const ratio = spent / profile.focusBudget
  const tips: EventBalanceTip[] = []
  let state: EventBalanceFocusState = 'balanced'
  let value = 100

  // Thin measures content minutes (a reason to show up); overstuffed measures
  // focus spend (cognitive load). They are deliberately different currencies.
  if (contentMinutes < profile.minContentMinutes) {
    state = 'thin'
    value = 20 + (contentMinutes / profile.minContentMinutes) * 80
    tips.push({
      id: 'focus-thin',
      message: 'The program is thin. Add a session, demo, or build block to give attendees a reason to come.',
      tone: 'warning',
      meter: 'focusBudget',
      priority: 70
    })
  } else if (ratio > 1) {
    state = 'overstuffed'
    value = 70 - Math.min(50, (ratio - 1) * 100)
    tips.push({
      id: 'focus-over-budget',
      message: 'The agenda is over the focus budget and attendees will burn out. Trim or split sessions.',
      tone: 'warning',
      meter: 'focusBudget',
      priority: 90
    })
  } else if (ratio > profile.overstuffedFocusRatio) {
    state = 'overstuffed'
    value = 100 - ((ratio - profile.overstuffedFocusRatio) / (1 - profile.overstuffedFocusRatio)) * 30
    tips.push({
      id: 'focus-crowded',
      message: 'The agenda is close to the focus budget. One more heavy session tips it over.',
      tone: 'warning',
      meter: 'focusBudget',
      priority: 55
    })
  } else {
    tips.push({
      id: 'focus-balanced',
      message: 'Focus spend is balanced for this event type.',
      tone: 'boost',
      meter: 'focusBudget',
      priority: 40
    })
  }

  return { value: clampValue(value, 0, 100), tips, spent: Math.round(spent), budget: profile.focusBudget, state }
}

function computeEnergyMeter(blocks: ResolvedAgendaBlock[]): MeterComputation & { byItem: number[], minimum: number } {
  const byItem: number[] = []
  const tips: EventBalanceTip[] = []
  let energy = 100
  let minimum = 100
  let weightedTotal = 0
  let weightedMinutes = 0

  for (const block of blocks) {
    if (isScoredBlock(block)) {
      energy = clampValue(energy + blockEnergyDelta(block), 0, 100)
      minimum = Math.min(minimum, energy)
    }

    byItem.push(Math.round(energy))
    weightedTotal += energy * block.durationMinutes
    weightedMinutes += block.durationMinutes
  }

  const mean = weightedMinutes > 0 ? weightedTotal / weightedMinutes : 100
  const final = energy
  // The meter blends the worst moment, the whole arc, and how people walk out.
  const value = Math.round(clampValue(0.4 * minimum + 0.4 * mean + 0.2 * final, 0, 100))
  const hasDrainingBlock = blocks.some(block => isScoredBlock(block) && blockEnergyDelta(block) < 0)

  const hasTokenBreak = blocks.some(block =>
    !block.isCustom && block.definition.type === 'break' && block.durationMinutes < 8)
  const hasMarathonBreak = blocks.some(block =>
    !block.isCustom && block.definition.type === 'break' && block.durationMinutes >= 60)

  if (hasTokenBreak) {
    tips.push({
      id: 'energy-token-break',
      message: 'A five-minute break is a transition, not a rest. Give people 12 to 15 minutes.',
      tone: 'warning',
      meter: 'energyCurve',
      priority: 56
    })
  }

  if (hasMarathonBreak) {
    tips.push({
      id: 'energy-marathon-break',
      message: 'An hour-long break disperses the room. Restoration peaks around 20 to 25 minutes.',
      tone: 'warning',
      meter: 'energyCurve',
      priority: 54
    })
  }

  if (minimum < 35) {
    tips.push({
      id: 'energy-crash',
      message: 'Energy bottoms out mid-event. Add a break or food block before the low point.',
      tone: 'warning',
      meter: 'energyCurve',
      priority: 85
    })
  } else if (value >= 70 && hasDrainingBlock) {
    tips.push({
      id: 'energy-steady',
      message: 'Recovery is well paced. Energy stays high all the way through.',
      tone: 'boost',
      meter: 'energyCurve',
      priority: 45
    })
  }

  return { value, tips, byItem, minimum: Math.round(minimum) }
}

function computeBoredomMeter(
  typedBlocks: ResolvedAgendaBlock[],
  eventType: EventBuilderEventType
): MeterComputation {
  const profile = eventBuilderTypeProfiles[eventType]
  const tips: EventBalanceTip[] = []

  // Variety is earned from session formats; welcome, breaks, and food are
  // logistics, not variety.
  const sessionTypes = new Set(
    typedBlocks
      .filter(block => block.definition.kind === 'session')
      .map(block => block.definition.type)
  ).size
  const hasCeremony = typedBlocks.some(block => block.definition.kind === 'ceremony')
  const distinctCount = sessionTypes + (hasCeremony ? 1 : 0)
  let value = distinctCount >= 4
    ? 85
    : distinctCount === 3
      ? 75
      : distinctCount === 2
        ? 60
        : distinctCount === 1 ? 40 : 0

  const interactiveMinutes = typedBlocks
    .filter(block => block.definition.interactive)
    .reduce((total, block) => total + block.durationMinutes, 0)

  value += 15 * clampValue(interactiveMinutes / 30, 0, 1)

  let previousPassiveType: string | null = null
  let passiveStretchMinutes = 0
  let repeatedPairPenalties = 0
  let overlongPenalties = 0
  let stretchExceeded = false

  for (const block of typedBlocks) {
    const passive = isPassiveBlock(block.definition)

    if (!passive) {
      previousPassiveType = null
      passiveStretchMinutes = 0
      continue
    }

    if (block.definition.stretchExempt) {
      continue
    }

    // Consecutive short talks are a lightning round, not monotony.
    if (previousPassiveType === block.definition.type && block.durationMinutes > 20) {
      repeatedPairPenalties += 1
    }

    passiveStretchMinutes += block.durationMinutes

    if (block.durationMinutes > Math.max(block.definition.defaultDurationMinutes, 40)) {
      overlongPenalties += 1
    }

    if (passiveStretchMinutes > profile.maxPassiveStretchMinutes) {
      stretchExceeded = true
    }

    previousPassiveType = block.definition.type
  }

  value -= repeatedPairPenalties * 12 + overlongPenalties * 10 + (stretchExceeded ? 16 : 0)

  if (interactiveMinutes === 0 && typedBlocks.length >= 2) {
    value -= 15
    tips.push({
      id: 'boredom-no-interaction',
      message: 'Every session is passive. Add a workshop, demos, networking, or hands-on block.',
      tone: 'warning',
      meter: 'boredomRisk',
      priority: 80
    })
  }

  if (repeatedPairPenalties > 0) {
    tips.push({
      id: 'boredom-repeats',
      message: 'Back-to-back long sessions of the same type get monotonous. Alternate the formats.',
      tone: 'warning',
      meter: 'boredomRisk',
      priority: 60
    })
  }

  if (overlongPenalties > 0) {
    tips.push({
      id: 'boredom-overlong',
      message: 'Overlong passive sessions lose the room. Split them or add interaction.',
      tone: 'warning',
      meter: 'boredomRisk',
      priority: 65
    })
  }

  if (stretchExceeded) {
    tips.push({
      id: 'boredom-long-stretch',
      message: 'A long passive stretch builds up. Put a break, food, or hands-on block in the middle.',
      tone: 'warning',
      meter: 'boredomRisk',
      priority: 66
    })
  }

  if (value >= 85 && typedBlocks.length >= 3) {
    tips.push({
      id: 'boredom-varied',
      message: 'Nice variety. The format changes keep attention fresh.',
      tone: 'boost',
      meter: 'boredomRisk',
      priority: 42
    })
  }

  return { value: clampValue(value, 0, 100), tips }
}

interface ReturnIntentContext {
  input: EventBalanceScoringInput
  typedBlocks: ResolvedAgendaBlock[]
  totalAgendaMinutes: number
  includeAgendaSignals: boolean
}

function computeReturnIntentMeter(context: ReturnIntentContext): MeterComputation {
  const { input, typedBlocks, totalAgendaMinutes, includeAgendaSignals } = context
  const profile = eventBuilderTypeProfiles[input.eventType]
  const tips: EventBalanceTip[] = []
  let value = 40

  if (includeAgendaSignals) {
    const lastTyped = typedBlocks[typedBlocks.length - 1]
    const closesWithConnection = lastTyped
      && (lastTyped.definition.type === 'networking' || lastTyped.definition.type === 'demos')
      && lastTyped.durationMinutes >= minimumCloseMinutes

    if (closesWithConnection) {
      value += 20
      tips.push({
        id: 'return-strong-close',
        message: 'Strong finish. Closing on connection or community demos boosts return intent.',
        tone: 'boost',
        meter: 'returnIntent',
        priority: 75
      })
    } else if (lastTyped?.definition.type === 'awards_closing') {
      value += 14
    } else if (lastTyped?.definition.kind === 'recovery') {
      value += 9
    } else if (typedBlocks.length >= 3) {
      tips.push({
        id: 'return-weak-close',
        message: 'The event ends on a heavy session. Close with networking, demos, or a wrap-up instead.',
        tone: 'warning',
        meter: 'returnIntent',
        priority: 58
      })
    }

    const foodMinutes = typedBlocks
      .filter(block => block.definition.type === 'food')
      .reduce((total, block) => total + block.durationMinutes, 0)
    const foodExpected = totalAgendaMinutes >= foodExpectedTotalMinutes

    if (foodMinutes >= minimumFoodMinutes) {
      value += foodExpected ? 12 : 7
    } else if (foodExpected) {
      tips.push({
        id: 'return-no-food',
        message: 'A long event without a real meal drags. Feed your builders.',
        tone: 'warning',
        meter: 'returnIntent',
        priority: 62
      })
    }

    const socialMinutes = typedBlocks
      .filter(block => block.definition.kind === 'social')
      .reduce((total, block) => total + block.durationMinutes, 0)

    value += clampValue(socialMinutes / profile.socialMinutesTarget, 0, 1) * 16

    // Field lesson: social time split between sections beats one dead block.
    let socialGaps = 0

    for (let index = 1; index < typedBlocks.length - 1; index += 1) {
      const previous = typedBlocks[index - 1]!
      const current = typedBlocks[index]!
      const next = typedBlocks[index + 1]!
      const isGapKind = current.definition.kind === 'social' || current.definition.kind === 'recovery'

      if (isGapKind && previous.definition.kind === 'session' && next.definition.kind === 'session') {
        socialGaps += 1
      }
    }

    if (socialGaps >= 2) {
      value += 6
    }
  } else {
    value += 18
  }

  const eventStart = Date.parse(
    input.agendaItems[0]?.startsAt ?? input.registrationClosesAt ?? ''
  )
  const registrationOpens = Date.parse(input.registrationOpensAt ?? '')
  const registrationCloses = Date.parse(input.registrationClosesAt ?? '')

  if (!Number.isNaN(eventStart) && !Number.isNaN(registrationOpens)) {
    // The window that matters is how long people can actually register.
    const windowEnd = Number.isNaN(registrationCloses) ? eventStart : Math.min(eventStart, registrationCloses)
    const leadDays = (windowEnd - registrationOpens) / dayMilliseconds

    if (leadDays >= 14) {
      value += 12
    } else if (leadDays >= 7) {
      value += 7
    } else if (leadDays >= 3) {
      value += 3
    } else {
      tips.push({
        id: 'return-short-lead',
        message: 'The registration window is short. Give people two weeks or more to plan for the event.',
        tone: 'warning',
        meter: 'returnIntent',
        priority: 50
      })
    }
  }

  // Advisory only: heavy forms cost sign-ups, but selective registration also
  // produces the best show-up rates in the field data. No points either way.
  if (input.requiredApplicationFieldCount > frictionRequiredFieldWarningThreshold) {
    tips.push({
      id: 'return-heavy-application',
      message: 'The application form asks a lot. Every extra required field costs sign-ups.',
      tone: 'warning',
      meter: 'returnIntent',
      priority: 68
    })
  }

  return { value: clampValue(Math.round(value), 0, 100), tips }
}

function selectTips(tips: EventBalanceTip[]): EventBalanceTip[] {
  const warnings = tips
    .filter(tip => tip.tone === 'warning')
    .sort((a, b) => b.priority - a.priority)
  const boosts = tips
    .filter(tip => tip.tone === 'boost')
    .sort((a, b) => b.priority - a.priority)

  const selected = warnings.slice(0, boosts.length > 0 ? 3 : 4)

  for (const boost of boosts) {
    if (selected.length >= 4) {
      break
    }

    selected.push(boost)
  }

  return selected
}

export function computeEventBalance(input: EventBalanceScoringInput): EventBalanceResult {
  const blocks = resolveAgendaBlocks(input.agendaItems)
  const typedBlocks = blocks.filter(block => !block.isCustom)
  const scoredBlocks = blocks.filter(isScoredBlock)
  const totalDuration = blocks.reduce((total, block) => total + block.durationMinutes, 0)
  const scoredDuration = scoredBlocks.reduce((total, block) => total + block.durationMinutes, 0)
  const scoredCoverage = totalDuration > 0 ? scoredDuration / totalDuration : 0
  const profile = eventBuilderTypeProfiles[input.eventType]

  const hasAgenda = blocks.length > 0
  const lowConfidence = hasAgenda && scoredCoverage < minimumTypedCoverage

  let focusValue: number
  let energyValue: number
  let boredomValue: number
  let focusSpent = 0
  let focusState: EventBalanceFocusState = 'thin'
  let energyByItem: number[] = blocks.map(() => neutralMeterValue)
  let energyMinimum = neutralMeterValue
  let focusByItem: number[] = blocks.map(() => 0)
  const collectedTips: EventBalanceTip[] = []

  if (!hasAgenda) {
    focusValue = 20
    energyValue = 50
    boredomValue = 50
    energyByItem = []
    energyMinimum = 50
    collectedTips.push({
      id: 'agenda-empty',
      message: 'The agenda is empty. Add session blocks to shape the event.',
      tone: 'warning',
      meter: 'focusBudget',
      priority: 100
    })
  } else if (lowConfidence) {
    focusValue = neutralMeterValue
    energyValue = neutralMeterValue
    boredomValue = neutralMeterValue
    collectedTips.push({
      id: 'agenda-low-confidence',
      message: 'Most agenda items are untyped. Assign block types in the builder to unlock full scoring.',
      tone: 'warning',
      meter: 'focusBudget',
      priority: 30
    })
  } else {
    const focus = computeFocusMeter(scoredBlocks, input.eventType)
    const energy = computeEnergyMeter(blocks)
    const boredom = computeBoredomMeter(typedBlocks, input.eventType)

    focusValue = Math.round(focus.value)
    energyValue = energy.value
    boredomValue = Math.round(boredom.value)
    focusSpent = focus.spent
    focusState = focus.state
    energyByItem = energy.byItem
    energyMinimum = energy.minimum

    let cumulativeFocus = 0

    focusByItem = blocks.map((block) => {
      if (isScoredBlock(block)) {
        cumulativeFocus += blockFocusCost(block)
      }

      return Math.round(cumulativeFocus)
    })

    collectedTips.push(...focus.tips, ...energy.tips, ...boredom.tips)
  }

  const returnIntent = computeReturnIntentMeter({
    input,
    typedBlocks,
    totalAgendaMinutes: totalDuration,
    includeAgendaSignals: hasAgenda && !lowConfidence
  })

  collectedTips.push(...returnIntent.tips)

  const weights = scoreWeightsByEventType[input.eventType]
  let score = Math.round(clampValue(
    focusValue * weights.focusBudget
    + energyValue * weights.energyCurve
    + boredomValue * weights.boredomRisk
    + returnIntent.value * weights.returnIntent,
    0,
    100
  ))

  // Metadata polish can't rescue an event without a program.
  if (!hasAgenda) {
    score = Math.min(score, 30)
  } else if (lowConfidence) {
    score = Math.min(score, lowConfidenceScoreCap)
  } else if (!scoredBlocks.some(isContentBlock)) {
    score = Math.min(score, 35)
    collectedTips.push({
      id: 'agenda-no-session',
      message: 'There is no main session yet. An event needs at least one talk, demo, workshop, or build-style block.',
      tone: 'warning',
      meter: 'focusBudget',
      priority: 95
    })
  }

  return {
    score,
    band: resolveEventBalanceBand(score),
    breakdown: {
      engineVersion: eventBalanceEngineVersion,
      lowConfidence,
      focusBudget: focusValue,
      energyCurve: energyValue,
      boredomRisk: boredomValue,
      returnIntent: returnIntent.value
    },
    tips: selectTips(collectedTips),
    focusSpent,
    focusBudget: profile.focusBudget,
    focusState,
    energyByItem,
    energyMinimum,
    focusByItem
  }
}
