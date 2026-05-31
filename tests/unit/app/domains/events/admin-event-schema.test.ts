import { describe, expect, test } from 'vitest'

import {
  buildEventConfigurationPatch,
  createEmptyEventFormState,
  eventConfigFormSchema,
  eventDetailsFormSchema
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

  test('ignores hidden hackathon fields for non-hackathon events', () => {
    const result = eventConfigFormSchema.safeParse({
      ...createValidEventFormState(),
      eventType: 'meetup',
      tracks: [
        {
          id: 'track-1',
          name: '',
          description: '',
          displayOrder: 1
        }
      ],
      submissionOpensAt: undefined,
      submissionClosesAt: undefined,
      maxTeamMembers: undefined,
      blindReviewCount: undefined,
      pitchReviewEnabled: undefined,
      blindScoreWeightPercent: undefined,
      pitchScoreWeightPercent: undefined,
      shortlistFinalistCount: undefined,
      requireSubmissionSummary: undefined,
      requireSubmissionRepositoryUrl: undefined,
      requireSubmissionDemoUrl: undefined
    })

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    expect(result.data.tracks).toEqual([])
    expect(result.data.maxTeamMembers).toBe(1)
    expect(result.data.pitchReviewEnabled).toBe(false)
  })

  test('rejects application fields required while hidden', () => {
    const result = eventConfigFormSchema.safeParse({
      ...createValidEventFormState(),
      applicationGithubProfileVisible: false,
      requireGithubProfile: true
    })

    expect(result.success).toBe(false)

    if (result.success) {
      return
    }

    expect(result.error.flatten().fieldErrors.requireGithubProfile).toEqual([
      'GitHub profile cannot be required while hidden from the application form.'
    ])
  })

  test('omits competition fields from registration-only configuration patches', () => {
    const patch = buildEventConfigurationPatch({
      ...createValidEventFormState(),
      eventType: 'meetup',
      tracks: [
        {
          id: 'track-1',
          name: 'Track',
          description: 'Track description',
          displayOrder: 1
        }
      ],
      maxTeamMembers: 9,
      participantsLimit: 80,
      blindReviewCount: 2,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 60,
      pitchScoreWeightPercent: 40,
      shortlistFinalistCount: 12,
      requireProofOfExecution: true,
      requireSubmissionSummary: true,
      requireSubmissionRepositoryUrl: true,
      requireSubmissionDemoUrl: true
    }, 'meetup')

    expect(patch).toMatchObject({
      participantsLimit: 80,
      requireProofOfExecution: true
    })
    expect(patch).not.toHaveProperty('tracks')
    expect(patch).not.toHaveProperty('submissionOpensAt')
    expect(patch).not.toHaveProperty('submissionClosesAt')
    expect(patch).not.toHaveProperty('maxTeamMembers')
    expect(patch).not.toHaveProperty('blindReviewCount')
    expect(patch).not.toHaveProperty('pitchReviewEnabled')
    expect(patch).not.toHaveProperty('blindScoreWeightPercent')
    expect(patch).not.toHaveProperty('pitchScoreWeightPercent')
    expect(patch).not.toHaveProperty('shortlistFinalistCount')
    expect(patch).not.toHaveProperty('requireSubmissionSummary')
    expect(patch).not.toHaveProperty('requireSubmissionRepositoryUrl')
    expect(patch).not.toHaveProperty('requireSubmissionDemoUrl')
  })

  test('rejects invalid hackathon tracks', () => {
    const result = eventConfigFormSchema.safeParse({
      ...createValidEventFormState(),
      tracks: [
        {
          id: 'track-1',
          name: '',
          description: 'Projects focused on autonomous workflows.',
          displayOrder: 1
        }
      ]
    })

    expect(result.success).toBe(false)

    if (result.success) {
      return
    }

    expect(result.error.flatten().fieldErrors.tracks).toEqual(['Enter a track name.'])
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

describe('event details form schema', () => {
  test('ignores hidden full-configuration fields', () => {
    const result = eventDetailsFormSchema.safeParse({
      ...createValidEventFormState(),
      slug: 'Invalid Slug',
      registrationOpensAt: '',
      registrationClosesAt: '',
      submissionOpensAt: '',
      submissionClosesAt: '',
      blindReviewCount: 0,
      pitchReviewEnabled: false,
      agendaItems: [],
      city: 'Tokyo',
      country: 'Japan',
      address: 'Shibuya'
    })

    expect(result.success).toBe(true)
  })

  test('rejects invalid visible details fields', () => {
    const result = eventDetailsFormSchema.safeParse({
      ...createValidEventFormState(),
      agendaItems: [
        {
          id: 'agenda-item-1',
          startsAt: '2026-03-22T13:00',
          endsAt: '2026-03-22T12:00',
          title: 'Opening',
          details: '',
          displayOrder: 1
        }
      ],
      city: '',
      country: 'Japan',
      address: 'Shibuya'
    })

    expect(result.success).toBe(false)

    if (result.success) {
      return
    }

    expect(result.error.flatten().fieldErrors.agendaItems).toEqual([
      'Agenda end time must be on or after the start time.'
    ])
    expect(result.error.flatten().fieldErrors.city).toEqual([
      'Too small: expected string to have >=1 characters'
    ])
  })
})
