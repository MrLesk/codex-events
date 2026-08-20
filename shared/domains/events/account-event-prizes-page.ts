import { z } from 'zod'

import type {
  AccountOverviewEventState,
  AccountOverviewEventType,
  AccountOverviewOutcomeSummary
} from '#shared/domains/account/account-overview-page'
import {
  accountEventSettingsEventSchema,
  type AccountEventSettingsEvent
} from './account-event-settings-page'

export const accountEventPrizesPagePath = '/api/account/events/:slug/prizes' as const

const eventTypeSchema = z.enum(['hackathon', 'meetup', 'build'])
const eventStateSchema = z.enum([
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
])

const prizeSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  description: z.string(),
  rewardType: z.enum(['api_credits', 'subscription', 'physical', 'other']),
  rewardValue: z.string(),
  rewardCurrency: z.string().nullable(),
  awardScope: z.enum(['team', 'member']),
  rankStart: z.number().int(),
  rankEnd: z.number().int(),
  displayOrder: z.number().int(),
  createdAt: z.string()
})

const publishedProjectMemberSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  bio: z.string().nullable(),
  xProfileUrl: z.string().nullable(),
  linkedinProfileUrl: z.string().nullable(),
  githubProfileUrl: z.string().nullable(),
  chatgptEmail: z.string().nullable().optional(),
  openaiOrgId: z.string().nullable().optional(),
  profileIconUrl: z.string().nullable()
})

const publishedProjectSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  submissionId: z.string(),
  projectName: z.string().nullable(),
  summary: z.string().nullable(),
  repositoryUrl: z.string().nullable(),
  demoUrl: z.string().nullable(),
  teamMembers: z.array(publishedProjectMemberSchema)
})

const participantRankSchema = z.object({
  basis: z.enum(['final', 'blind_review']),
  rank: z.number().int(),
  rankedTeamCount: z.number().int(),
  totalTeamCount: z.number().int()
})

const participantOutcomeSchema = z.object({
  isShortlisted: z.boolean(),
  isWinner: z.boolean(),
  finalRank: z.number().int().nullable(),
  rankedTeamCount: z.number().int(),
  prizes: z.array(z.object({
    id: z.string(),
    name: z.string()
  }))
})

export interface AccountEventPrizesEvent {
  id: string
  eventType: AccountOverviewEventType
  state: AccountOverviewEventState
}

export interface AccountEventPrize {
  id: string
  eventId: string
  name: string
  description: string
  rewardType: 'api_credits' | 'subscription' | 'physical' | 'other'
  rewardValue: string
  rewardCurrency: string | null
  awardScope: 'team' | 'member'
  rankStart: number
  rankEnd: number
  displayOrder: number
  createdAt: string
}

export interface AccountEventPublishedProjectMember {
  id: string
  fullName: string
  bio: string | null
  xProfileUrl: string | null
  linkedinProfileUrl: string | null
  githubProfileUrl: string | null
  chatgptEmail?: string | null
  openaiOrgId?: string | null
  profileIconUrl: string | null
}

export interface AccountEventPublishedProject {
  teamId: string
  teamName: string
  submissionId: string
  projectName: string | null
  summary: string | null
  repositoryUrl: string | null
  demoUrl: string | null
  teamMembers: AccountEventPublishedProjectMember[]
}

export interface AccountEventWinner extends AccountEventPublishedProject {
  finalRank: number
  prizes: AccountEventPrize[]
}

export interface AccountEventPrizesPage {
  event: AccountEventPrizesEvent
  adminSettingsEvent: AccountEventSettingsEvent | null
  prizes: AccountEventPrize[]
  winners: AccountEventWinner[]
  publishedProjects: AccountEventPublishedProject[]
  participantRank: {
    basis: 'final' | 'blind_review'
    rank: number
    rankedTeamCount: number
    totalTeamCount: number
  } | null
  participantOutcome: AccountOverviewOutcomeSummary | null
}

export const accountEventPrizesPageSchema = z.object({
  event: z.object({
    id: z.string(),
    eventType: eventTypeSchema,
    state: eventStateSchema
  }),
  adminSettingsEvent: accountEventSettingsEventSchema.nullable(),
  prizes: z.array(prizeSchema),
  winners: z.array(publishedProjectSchema.extend({
    finalRank: z.number().int(),
    prizes: z.array(prizeSchema)
  })),
  publishedProjects: z.array(publishedProjectSchema),
  participantRank: participantRankSchema.nullable(),
  participantOutcome: participantOutcomeSchema.nullable()
})
