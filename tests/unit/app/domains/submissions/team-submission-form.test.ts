import { describe, expect, test } from 'vitest'

import { createTeamSubmissionFormSchema } from '../../../../../app/domains/submissions/team-submission-form'

describe('team submission form schema', () => {
  test('requires a selected track only when the hackathon has tracks', () => {
    expect(createTeamSubmissionFormSchema({
      trackRequired: false,
      requireSummary: false,
      requireRepositoryUrl: false,
      requireDemoUrl: false
    }).safeParse({
      projectName: 'North Star',
      summary: 'A submission summary.',
      repositoryUrl: 'https://github.com/example/north-star',
      demoUrl: 'https://example.com/north-star',
      trackId: null
    }).success).toBe(true)

    expect(createTeamSubmissionFormSchema({
      trackRequired: true,
      requireSummary: false,
      requireRepositoryUrl: false,
      requireDemoUrl: false
    }).safeParse({
      projectName: 'North Star',
      summary: 'A submission summary.',
      repositoryUrl: 'https://github.com/example/north-star',
      demoUrl: 'https://example.com/north-star',
      trackId: null
    }).success).toBe(false)
  })

  test('requires only the submission fields configured by the hackathon', () => {
    const result = createTeamSubmissionFormSchema({
      trackRequired: false,
      requireSummary: true,
      requireRepositoryUrl: false,
      requireDemoUrl: true
    }).safeParse({
      projectName: 'North Star',
      summary: '',
      repositoryUrl: '',
      demoUrl: '',
      trackId: null
    })

    expect(result.success).toBe(false)

    if (result.success) {
      return
    }

    expect(result.error.flatten().fieldErrors.summary).toEqual(['Summary is required.'])
    expect(result.error.flatten().fieldErrors.demoUrl).toEqual(['Demo URL is required.'])
    expect(result.error.flatten().fieldErrors.repositoryUrl).toBeUndefined()
  })

  test('keeps optional submission URLs format-validated when provided', () => {
    const result = createTeamSubmissionFormSchema({
      trackRequired: false,
      requireSummary: false,
      requireRepositoryUrl: false,
      requireDemoUrl: false
    }).safeParse({
      projectName: 'North Star',
      summary: '',
      repositoryUrl: 'not-a-url',
      demoUrl: '',
      trackId: null
    })

    expect(result.success).toBe(false)

    if (result.success) {
      return
    }

    expect(result.error.flatten().fieldErrors.repositoryUrl).toEqual(['Enter a valid repository URL.'])
  })
})
