import { z } from 'zod'

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function createOptionalHttpUrlSchema(message: string) {
  return z.string().trim().refine(
    value => value.length === 0 || isHttpUrl(value),
    message
  )
}

export function createTeamSubmissionFormSchema(options: {
  trackRequired: boolean
  requireSummary: boolean
  requireRepositoryUrl: boolean
  requireDemoUrl: boolean
}) {
  return z.object({
    projectName: z.string().trim().min(1, 'Project name is required.'),
    summary: z.string().trim(),
    repositoryUrl: createOptionalHttpUrlSchema('Enter a valid repository URL.'),
    demoUrl: createOptionalHttpUrlSchema('Enter a valid demo URL.'),
    trackId: z.string().trim().nullable()
  }).superRefine((input, context) => {
    if (options.requireSummary && input.summary.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['summary'],
        message: 'Summary is required.'
      })
    }

    if (options.requireRepositoryUrl && input.repositoryUrl.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['repositoryUrl'],
        message: 'Repository URL is required.'
      })
    }

    if (options.requireDemoUrl && input.demoUrl.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['demoUrl'],
        message: 'Demo URL is required.'
      })
    }

    if (!options.trackRequired) {
      return
    }

    if (!input.trackId?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['trackId'],
        message: 'Select a track.'
      })
    }
  })
}
