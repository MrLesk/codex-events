import { describe, expect, test } from 'vitest'

import { eventBuilderBlockDefinitions } from '../../../../../shared/domains/events/builder-blocks'
import { computeEventBalance } from '../../../../../shared/domains/events/builder-scoring'
import {
  eventBuilderTemplates,
  getEventBuilderTemplates
} from '../../../../../shared/domains/events/builder-templates'
import { buildTemplateScoringInput } from './builder-scoring.test'

describe('event builder templates', () => {
  test('every event type has at least one template and filtering works', () => {
    for (const eventType of ['hackathon', 'meetup', 'build'] as const) {
      const templates = getEventBuilderTemplates(eventType)

      expect(templates.length).toBeGreaterThanOrEqual(1)

      for (const template of templates) {
        expect(template.eventType).toBe(eventType)
      }
    }
  })

  test('template ids are unique', () => {
    const ids = eventBuilderTemplates.map(template => template.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every template block is available for its event type', () => {
    for (const template of eventBuilderTemplates) {
      for (const block of template.blocks) {
        const definition = eventBuilderBlockDefinitions[block.builderBlockType]

        expect(definition.appliesTo).toContain(template.eventType)
        expect(block.durationMinutes).toBeGreaterThan(0)
        expect(block.title.trim().length).toBeGreaterThan(0)
      }
    }
  })

  test('every template scores at least Good (70) on agenda alone', () => {
    for (const template of eventBuilderTemplates) {
      const result = computeEventBalance(buildTemplateScoringInput(template.eventType, template.blocks))

      expect(result.score, `template ${template.id} scored ${result.score}`).toBeGreaterThanOrEqual(70)
    }
  })
})
