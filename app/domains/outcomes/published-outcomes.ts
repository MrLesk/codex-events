import type { PrizeDefinition } from '~/domains/outcomes/prizes'

export interface WinnerEntry {
  teamId: string
  teamName: string
  submissionId: string
  projectName: string | null
  summary: string | null
  repositoryUrl: string | null
  demoUrl: string | null
  finalRank: number
  prizes: PrizeDefinition[]
  teamMembers: Array<{
    id: string
    fullName: string
    bio: string | null
    xProfileUrl: string | null
    linkedinProfileUrl: string | null
    githubProfileUrl: string | null
    chatgptEmail?: string | null
    openaiOrgId?: string | null
    profileIconUrl: string | null
  }>
}

export interface PublishedProjectEntry {
  teamId: string
  teamName: string
  submissionId: string
  projectName: string | null
  summary: string | null
  repositoryUrl: string | null
  demoUrl: string | null
  teamMembers: WinnerEntry['teamMembers']
}
