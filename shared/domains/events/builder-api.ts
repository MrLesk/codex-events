import { z } from 'zod'

import {
  eventBuilderBlockDefinitions,
  eventBuilderBlockTypes,
  eventBuilderTypeProfiles
} from './builder-blocks'
import { computeEventBalance } from './builder-scoring'
import {
  eventBuilderApplicationFieldKeys,
  eventBuilderTemplates
} from './builder-templates'

const isoTimestampSchema = z.string().refine(
  value => !Number.isNaN(Date.parse(value)),
  'Expected an ISO-8601 timestamp.'
)

const eventBuilderAnalyzeAgendaItemSchema = z.object({
  startsAt: isoTimestampSchema,
  endsAt: isoTimestampSchema.nullable().default(null),
  builderBlockType: z.enum(eventBuilderBlockTypes).optional(),
  builderFocusCost: z.number().int().min(0).max(99).optional(),
  builderEnergyDelta: z.number().int().min(-99).max(99).optional()
}).superRefine((item, ctx) => {
  if (item.endsAt && Date.parse(item.endsAt) <= Date.parse(item.startsAt)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Agenda item end time must be after its start time.',
      path: ['endsAt']
    })
  }
})

export const eventBuilderAnalyzeInputSchema = z.object({
  eventType: z.enum(['hackathon', 'meetup', 'build']),
  agendaItems: z.array(eventBuilderAnalyzeAgendaItemSchema).max(200),
  registrationOpensAt: isoTimestampSchema.nullable().default(null),
  registrationClosesAt: isoTimestampSchema.nullable().default(null),
  visibleApplicationFieldCount: z.number().int().min(0).max(eventBuilderApplicationFieldKeys.length).default(0),
  requiredApplicationFieldCount: z.number().int().min(0).max(eventBuilderApplicationFieldKeys.length).default(0)
}).superRefine((input, ctx) => {
  if (input.requiredApplicationFieldCount > input.visibleApplicationFieldCount) {
    ctx.addIssue({
      code: 'custom',
      message: 'Required application fields must also be visible.',
      path: ['requiredApplicationFieldCount']
    })
  }
})

export type EventBuilderAnalyzeInput = z.output<typeof eventBuilderAnalyzeInputSchema>

export function getEventBuilderCatalog() {
  return {
    blockDefinitions: eventBuilderBlockTypes.map(type => eventBuilderBlockDefinitions[type]),
    typeProfiles: eventBuilderTypeProfiles,
    templates: eventBuilderTemplates,
    applicationFieldKeys: eventBuilderApplicationFieldKeys
  }
}

export function analyzeEventBuilderDraft(input: EventBuilderAnalyzeInput) {
  return computeEventBalance({
    eventType: input.eventType,
    agendaItems: input.agendaItems.map(item => ({
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      builderBlockType: item.builderBlockType,
      focusCost: item.builderFocusCost,
      energyDelta: item.builderEnergyDelta
    })),
    registrationOpensAt: input.registrationOpensAt,
    registrationClosesAt: input.registrationClosesAt,
    visibleApplicationFieldCount: input.visibleApplicationFieldCount,
    requiredApplicationFieldCount: input.requiredApplicationFieldCount
  })
}
