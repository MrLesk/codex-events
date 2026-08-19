import { z } from 'zod'

import { accountEventOperationsPageSchema } from './account-event-operations-page'

const criterionSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  description: z.string(),
  weight: z.number(),
  displayOrder: z.number().int(),
  createdAt: z.string()
})

const assignmentSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  submissionId: z.string(),
  judgeUserId: z.string(),
  reviewStage: z.enum(['blind_review', 'pitch_review']),
  status: z.enum(['assigned', 'judge_started', 'judge_completed', 'skipped']),
  assignedAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  skippedAt: z.string().nullable(),
  skippedByUserId: z.string().nullable(),
  skipReason: z.string().nullable(),
  ineligibilityStatus: z.enum(['eligible', 'ineligible']),
  ineligibilityReason: z.string().nullable(),
  ineligibilityMarkedAt: z.string().nullable(),
  ineligibilityMarkedByUserId: z.string().nullable(),
  createdAt: z.string()
})

const assignmentSummarySchema = z.object({
  totalAssignmentCount: z.number().int().nonnegative(),
  activeAssignmentCount: z.number().int().nonnegative(),
  completedPitchAssignmentCount: z.number().int().nonnegative()
})

const assignmentWorkspaceSchema = z.object({
  event: accountEventOperationsPageSchema.shape.event,
  assignment: assignmentSchema,
  criteria: z.array(criterionSchema)
})

export const accountEventJudgingPageSchema = z.object({
  event: accountEventOperationsPageSchema.shape.event,
  assignments: z.array(assignmentSchema),
  criteria: z.array(criterionSchema),
  summary: assignmentSummarySchema
})

export const accountJudgeInboxPageSchema = z.object({
  groups: z.array(z.object({
    event: accountEventOperationsPageSchema.shape.event,
    assignments: z.array(assignmentSchema)
  })),
  assignmentCount: z.number().int().nonnegative(),
  inProgressCount: z.number().int().nonnegative()
})

export const accountJudgeAssignmentWorkspacePageSchema = assignmentWorkspaceSchema

export type AccountEventJudgingPage = z.infer<typeof accountEventJudgingPageSchema>
export type AccountJudgeInboxPage = z.infer<typeof accountJudgeInboxPageSchema>
export type AccountJudgeAssignmentWorkspacePage = z.infer<typeof accountJudgeAssignmentWorkspacePageSchema>
export type AccountEventJudgingAssignment = AccountEventJudgingPage['assignments'][number]
export type AccountEventJudgingCriterion = AccountEventJudgingPage['criteria'][number]
