import { describe, expect, test } from 'vitest'

import {
  createEmptyEventFormState,
  eventConfigFormSchema
} from '../../../../../app/domains/events/admin-event'

function createValidEventFormState() {
  return {
    ...createEmptyEventFormState(),
    name: 'Codex Spring Builders 2026',
    slug: 'codex-spring-builders-2026',
    description: 'Canonical fixture event.',
    city: 'Vienna',
    country: 'Austria',
    address: 'Operngasse 20, 1040 Vienna',
    registrationOpensAt: '2026-03-20T12:00',
    registrationClosesAt: '2026-03-22T12:00',
    submissionOpensAt: '2026-03-22T12:00',
    submissionClosesAt: '2026-03-24T12:00',
    requireChatgptEmail: false,
    requireOpenaiOrgId: false,
    requireLumaEmail: false
  }
}

describe('event config form schema', () => {
  test('allows an empty luma event URL', () => {
    const result = eventConfigFormSchema.safeParse(createValidEventFormState())

    expect(result.success).toBe(true)
  })

  test('rejects non-http Discord server URLs', () => {
    const result = eventConfigFormSchema.safeParse({
      ...createValidEventFormState(),
      discordServerUrl: 'discord://codex-builders'
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Enter a valid Discord server URL.')
  })

  test('accepts markdown-formatted descriptions', () => {
    const result = eventConfigFormSchema.safeParse({
      ...createValidEventFormState(),
      description: '  ## Overview\n\n- Build\n- Demo  '
    })

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    expect(result.data.description).toBe('## Overview\n\n- Build\n- Demo')
  })

  test('rejects non-http luma event URLs', () => {
    const result = eventConfigFormSchema.safeParse({
      ...createValidEventFormState(),
      lumaEventUrl: 'ftp://lu.ma/codex-builders'
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Enter a valid Luma event URL.')
  })

  test('rejects invalid luma event API ids', () => {
    const result = eventConfigFormSchema.safeParse({
      ...createValidEventFormState(),
      lumaEventApiId: 'abc-123'
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Enter a valid Luma event API ID like evt-123.')
  })

  test('accepts configured submission tracks with name and description', () => {
    const result = eventConfigFormSchema.safeParse({
      ...createValidEventFormState(),
      tracks: [
        {
          id: 'track-1',
          name: 'Best AI Agent',
          description: 'Projects focused on autonomous workflows.',
          displayOrder: 1
        }
      ]
    })

    expect(result.success).toBe(true)
  })

  test('requires at least one judging stage', () => {
    const result = eventConfigFormSchema.safeParse({
      ...createValidEventFormState(),
      blindReviewCount: 0,
      pitchReviewEnabled: false
    })

    expect(result.success).toBe(false)

    if (result.success) {
      return
    }

    expect(result.error.flatten().fieldErrors.blindReviewCount).toEqual(['Enable at least one judging stage.'])
    expect(result.error.flatten().fieldErrors.pitchReviewEnabled).toEqual(['Enable at least one judging stage.'])
  })

  test('requires score weights to add up to 100 when both judging stages are enabled', () => {
    const result = eventConfigFormSchema.safeParse({
      ...createValidEventFormState(),
      blindReviewCount: 2,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 60,
      pitchScoreWeightPercent: 30
    })

    expect(result.success).toBe(false)

    if (result.success) {
      return
    }

    expect(result.error.flatten().fieldErrors.blindScoreWeightPercent).toEqual(['Blind and pitch score weights must add up to 100.'])
    expect(result.error.flatten().fieldErrors.pitchScoreWeightPercent).toEqual(['Blind and pitch score weights must add up to 100.'])
  })

  test('accepts pitch review without blind review', () => {
    const result = eventConfigFormSchema.safeParse({
      ...createValidEventFormState(),
      blindReviewCount: 0,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 0,
      pitchScoreWeightPercent: 100
    })

    expect(result.success).toBe(true)
  })

  test('requires at least one preselected finalist when shortlist is configured', () => {
    const result = eventConfigFormSchema.safeParse({
      ...createValidEventFormState(),
      shortlistFinalistCount: 0
    })

    expect(result.success).toBe(false)

    if (result.success) {
      return
    }

    expect(result.error.flatten().fieldErrors.shortlistFinalistCount).toEqual([
      'Too small: expected number to be >=1'
    ])
  })
})
