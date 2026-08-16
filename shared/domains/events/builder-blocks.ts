export type EventBuilderEventType = 'hackathon' | 'meetup' | 'build'

export const eventBuilderBlockTypes = [
  'welcome',
  'keynote',
  'talk',
  'lightning_talk',
  'panel',
  'workshop',
  'demos',
  'hacking',
  'build',
  'team_formation',
  'demos_judging',
  'awards_closing',
  'break',
  'food',
  'networking',
  'custom'
] as const

export type EventBuilderBlockType = (typeof eventBuilderBlockTypes)[number]

export type EventBuilderBlockKind = 'session' | 'recovery' | 'social' | 'ceremony'

export interface EventBuilderBlockDefinition {
  type: EventBuilderBlockType
  label: string
  tagline: string
  kind: EventBuilderBlockKind
  interactive: boolean
  defaultDurationMinutes: number
  focusCost: number
  energyDelta: number
  appliesTo: readonly EventBuilderEventType[]
  /** Long focused stretches of this block are the point of the event, not a pacing problem. */
  stretchExempt: boolean
}

const allEventTypes: readonly EventBuilderEventType[] = ['hackathon', 'meetup', 'build']

export const eventBuilderBlockDefinitions: Record<EventBuilderBlockType, EventBuilderBlockDefinition> = {
  welcome: {
    type: 'welcome',
    label: 'Welcome & Check-in',
    tagline: 'Arrivals, badges, and orientation.',
    kind: 'ceremony',
    interactive: false,
    defaultDurationMinutes: 15,
    focusCost: 4,
    energyDelta: -3,
    appliesTo: allEventTypes,
    stretchExempt: false
  },
  keynote: {
    type: 'keynote',
    label: 'Keynote',
    tagline: 'Inspire with big ideas and vision.',
    kind: 'session',
    interactive: false,
    defaultDurationMinutes: 30,
    focusCost: 16,
    energyDelta: -10,
    appliesTo: allEventTypes,
    stretchExempt: false
  },
  talk: {
    type: 'talk',
    label: 'Talk',
    tagline: 'A focused session on one topic.',
    kind: 'session',
    interactive: false,
    defaultDurationMinutes: 30,
    focusCost: 15,
    energyDelta: -12,
    appliesTo: allEventTypes,
    stretchExempt: false
  },
  lightning_talk: {
    type: 'lightning_talk',
    label: 'Lightning Talk',
    tagline: 'Quick ideas. Big impact.',
    kind: 'session',
    interactive: false,
    // Field data: short-format slots run 5-10 minutes (community demos,
    // lightning rounds); costs are rebased to the 10-minute reference.
    defaultDurationMinutes: 10,
    focusCost: 4,
    energyDelta: -3,
    appliesTo: allEventTypes,
    stretchExempt: false
  },
  panel: {
    type: 'panel',
    label: 'Panel',
    tagline: 'Diverse perspectives. Real talk.',
    kind: 'session',
    interactive: false,
    defaultDurationMinutes: 45,
    focusCost: 16,
    energyDelta: -18,
    appliesTo: allEventTypes,
    stretchExempt: false
  },
  workshop: {
    type: 'workshop',
    label: 'Workshop',
    tagline: 'Hands-on learning together.',
    kind: 'session',
    interactive: true,
    defaultDurationMinutes: 60,
    focusCost: 22,
    energyDelta: -16,
    appliesTo: allEventTypes,
    stretchExempt: false
  },
  demos: {
    type: 'demos',
    label: 'Community Demos',
    tagline: 'Members show what they built.',
    kind: 'session',
    interactive: true,
    defaultDurationMinutes: 45,
    focusCost: 8,
    energyDelta: 6,
    appliesTo: allEventTypes,
    stretchExempt: false
  },
  hacking: {
    type: 'hacking',
    label: 'Hacking Block',
    tagline: 'Heads-down building time.',
    kind: 'session',
    interactive: true,
    defaultDurationMinutes: 120,
    focusCost: 12,
    energyDelta: -22,
    appliesTo: ['hackathon'],
    stretchExempt: true
  },
  build: {
    type: 'build',
    label: 'Build Block',
    tagline: 'Guided building time.',
    kind: 'session',
    interactive: true,
    defaultDurationMinutes: 120,
    focusCost: 12,
    energyDelta: -20,
    appliesTo: ['build'],
    stretchExempt: true
  },
  team_formation: {
    type: 'team_formation',
    label: 'Team Formation',
    tagline: 'Find your crew and pitch ideas.',
    kind: 'social',
    interactive: true,
    defaultDurationMinutes: 30,
    focusCost: 8,
    energyDelta: -6,
    appliesTo: ['hackathon'],
    stretchExempt: false
  },
  demos_judging: {
    type: 'demos_judging',
    label: 'Demos & Judging',
    tagline: 'Show what you built.',
    kind: 'ceremony',
    interactive: false,
    defaultDurationMinutes: 60,
    focusCost: 18,
    energyDelta: -16,
    appliesTo: ['hackathon'],
    stretchExempt: false
  },
  awards_closing: {
    type: 'awards_closing',
    label: 'Awards & Closing',
    tagline: 'Key takeaways and winners.',
    kind: 'ceremony',
    interactive: false,
    defaultDurationMinutes: 30,
    focusCost: 6,
    energyDelta: 4,
    appliesTo: ['hackathon'],
    stretchExempt: false
  },
  break: {
    type: 'break',
    label: 'Break',
    tagline: 'Recharge and reset.',
    kind: 'recovery',
    interactive: false,
    defaultDurationMinutes: 15,
    focusCost: 0,
    energyDelta: 12,
    appliesTo: allEventTypes,
    stretchExempt: false
  },
  food: {
    type: 'food',
    label: 'Food & Drinks',
    tagline: 'Meals keep momentum.',
    kind: 'recovery',
    interactive: false,
    // 30-minute reference; a 45-minute lunch still lands near the old +22
    // through the saturating curve.
    defaultDurationMinutes: 30,
    focusCost: 0,
    energyDelta: 18,
    appliesTo: allEventTypes,
    stretchExempt: false
  },
  networking: {
    type: 'networking',
    label: 'Networking',
    tagline: 'Connect, collaborate, and build.',
    kind: 'social',
    interactive: true,
    defaultDurationMinutes: 45,
    focusCost: 6,
    energyDelta: 2,
    appliesTo: allEventTypes,
    stretchExempt: false
  },
  custom: {
    type: 'custom',
    label: 'Custom Session',
    tagline: 'Anything the palette does not cover.',
    kind: 'session',
    interactive: false,
    defaultDurationMinutes: 30,
    focusCost: 0,
    energyDelta: 0,
    appliesTo: allEventTypes,
    stretchExempt: true
  }
}

export interface EventBuilderTypeProfile {
  /** Total focus points the audience can spend across the event. */
  focusBudget: number
  /**
   * Session-content minutes below this read as thin: not enough reason to
   * show up. Thin and overstuffed are different currencies on purpose: thin
   * measures content minutes, overstuffed measures focus spend.
   */
  minContentMinutes: number
  /** Above this share of the budget the agenda reads as overstuffed. */
  overstuffedFocusRatio: number
  /** Longest acceptable passive stretch before boredom penalties apply. */
  maxPassiveStretchMinutes: number
  /** Social/community minutes that earn the full return-intent bonus. */
  socialMinutesTarget: number
}

export const eventBuilderTypeProfiles: Record<EventBuilderEventType, EventBuilderTypeProfile> = {
  meetup: {
    focusBudget: 90,
    minContentMinutes: 45,
    overstuffedFocusRatio: 0.85,
    maxPassiveStretchMinutes: 60,
    socialMinutesTarget: 30
  },
  build: {
    focusBudget: 130,
    minContentMinutes: 90,
    overstuffedFocusRatio: 0.85,
    maxPassiveStretchMinutes: 90,
    socialMinutesTarget: 40
  },
  hackathon: {
    focusBudget: 160,
    minContentMinutes: 150,
    overstuffedFocusRatio: 0.9,
    maxPassiveStretchMinutes: 105,
    socialMinutesTarget: 60
  }
}

const eventBuilderBlockTypeSet = new Set<string>(eventBuilderBlockTypes)

export function resolveEventBuilderBlockType(value: string | null | undefined): EventBuilderBlockType {
  if (value && eventBuilderBlockTypeSet.has(value)) {
    return value as EventBuilderBlockType
  }

  return 'custom'
}

export function getEventBuilderPaletteBlockTypes(eventType: EventBuilderEventType): EventBuilderBlockType[] {
  // Custom always closes the palette: freeform blocks for anything not covered.
  return [
    ...eventBuilderBlockTypes.filter(type =>
      type !== 'custom' && eventBuilderBlockDefinitions[type].appliesTo.includes(eventType)
    ),
    'custom'
  ]
}
