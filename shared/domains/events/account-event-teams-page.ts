import { z } from 'zod'

import type { AccountEventParticipantApplication } from './account-event-participants-page'
import { accountEventParticipantsPageSchema } from './account-event-participants-page'

const teamUserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string().nullable().optional(),
  xProfileUrl: z.string().nullable().optional(),
  linkedinProfileUrl: z.string().nullable().optional(),
  githubProfileUrl: z.string().nullable().optional(),
  chatgptEmail: z.string().nullable().optional(),
  openaiOrgId: z.string().nullable().optional(),
  lumaUsername: z.string().nullable().optional()
}).passthrough()

const teamMemberSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  userId: z.string(),
  role: z.enum(['member', 'admin']),
  joinedAt: z.string(),
  leftAt: z.string().nullable(),
  createdAt: z.string(),
  user: teamUserSchema.optional()
})

const teamSummarySchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  bio: z.string().nullable(),
  slug: z.string(),
  workspaceMode: z.enum(['solo', 'team']),
  isOpenToJoinRequests: z.boolean(),
  createdByUserId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  activeMemberCount: z.number().int().nonnegative().optional()
}).passthrough()

const teamDetailSchema = teamSummarySchema.extend({
  members: z.array(teamMemberSchema)
})

const joinRequestSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  userId: z.string(),
  status: z.enum(['pending', 'approved', 'rejected', 'canceled']),
  requestedAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewedByUserId: z.string().nullable(),
  createdAt: z.string(),
  user: teamUserSchema.optional()
})

const visibleTeamFilterCountsSchema = z.object({
  all: z.number().int().nonnegative(),
  open_to_join: z.number().int().nonnegative(),
  solo: z.number().int().nonnegative(),
  multi_person: z.number().int().nonnegative(),
  full: z.number().int().nonnegative()
})

const eventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  state: z.enum([
    'draft',
    'registration_open',
    'submission_open',
    'judging_preparation',
    'blind_review',
    'shortlist',
    'pitch',
    'pitch_review',
    'final_deliberation',
    'winners_announced',
    'completed'
  ]),
  maxTeamMembers: z.number().int().positive(),
  submissionOpensAt: z.string().nullable(),
  requireSubmissionSummary: z.boolean(),
  requireSubmissionRepositoryUrl: z.boolean(),
  requireSubmissionDemoUrl: z.boolean(),
  tracks: z.array(accountEventParticipantsPageSchema.shape.event.shape.tracks.element.extend({
    shortDescription: z.string()
  }))
})

export const accountEventTeamsPageSchema = z.object({
  event: eventSchema,
  application: accountEventParticipantsPageSchema.shape.applications.element.nullable(),
  ownTeam: teamDetailSchema.nullable(),
  ownMembership: teamMemberSchema.nullable(),
  selectedTeam: teamDetailSchema.nullable(),
  joinRequests: z.array(joinRequestSchema),
  visibleTeams: z.array(teamSummarySchema),
  visibleTeamsMeta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    filterCounts: visibleTeamFilterCountsSchema
  })
})

export type AccountEventTeamUser = z.infer<typeof teamUserSchema>
export type AccountEventTeamMember = z.infer<typeof teamMemberSchema>
export type AccountEventTeamSummary = z.infer<typeof teamSummarySchema>
export type AccountEventTeamDetail = z.infer<typeof teamDetailSchema>
export type AccountEventTeamJoinRequest = z.infer<typeof joinRequestSchema>
export type AccountEventTeamsEvent = z.infer<typeof eventSchema>
export type AccountEventTeamsPage = z.infer<typeof accountEventTeamsPageSchema> & {
  application: AccountEventParticipantApplication | null
}
