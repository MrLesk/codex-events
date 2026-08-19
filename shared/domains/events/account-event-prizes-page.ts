import { z } from 'zod'

import type {
  AccountOverviewEventState,
  AccountOverviewEventType,
  AccountOverviewOutcomeSummary
} from '#shared/domains/account/account-overview-page'

export const accountEventPrizesPagePath = '/api/account/events/:slug/prizes' as const

export interface AccountEventPrizesEvent extends Record<string, unknown> {
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

export interface AccountEventPrizesPage extends Record<string, unknown> {
  event: AccountEventPrizesEvent
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
    eventType: z.enum(['hackathon', 'meetup', 'build']),
    state: z.string()
  }).passthrough(),
  prizes: z.array(z.unknown()),
  winners: z.array(z.unknown()),
  publishedProjects: z.array(z.unknown()),
  participantRank: z.unknown().nullable(),
  participantOutcome: z.unknown().nullable()
}).passthrough()
