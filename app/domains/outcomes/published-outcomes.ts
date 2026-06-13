import type { PrizeDefinition } from '~/domains/outcomes/prizes'

export interface PublishedProjectShowcaseMember {
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

export interface PublishedProjectShowcaseEntry {
  teamId: string
  teamName: string
  submissionId: string
  projectName: string | null
  summary: string | null
  repositoryUrl: string | null
  demoUrl: string | null
  teamMembers: PublishedProjectShowcaseMember[]
}

export interface WinnerEntry extends PublishedProjectShowcaseEntry {
  finalRank: number
  prizes: PrizeDefinition[]
}

export type PublishedProjectEntry = PublishedProjectShowcaseEntry
