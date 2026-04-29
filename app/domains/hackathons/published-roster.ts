import { normalizeParticipantApiError } from '~/domains/applications/participant-application'

export type PublishedHackathonRosterRole = 'judge' | 'staff'

export interface PublishedHackathonRosterMember {
  id: string
  fullName: string
  company: string | null
  bio: string | null
  xProfileUrl: string | null
  linkedinProfileUrl: string | null
  githubProfileUrl: string | null
  profileIconUpdatedAt: string | null
}

export interface PublishedHackathonRosterLink {
  key: 'x' | 'linkedin' | 'github'
  label: 'X' | 'LinkedIn' | 'GitHub'
  href: string
}

export interface PublishedHackathonRosterLoadState {
  members: PublishedHackathonRosterMember[]
  errorMessage: string | null
}

export function getPublishedHackathonRosterEndpoint(role: PublishedHackathonRosterRole) {
  return role === 'judge' ? 'judges' : 'staff'
}

export function createEmptyPublishedHackathonRosterLoadState(): PublishedHackathonRosterLoadState {
  return {
    members: [],
    errorMessage: null
  }
}

export async function loadPublishedHackathonRoster(
  request: (path: string) => Promise<{ data: PublishedHackathonRosterMember[] }>,
  input: {
    hackathonId: string
    role: PublishedHackathonRosterRole
  }
): Promise<PublishedHackathonRosterLoadState> {
  try {
    const response = await request(
      `/api/hackathons/${input.hackathonId}/${getPublishedHackathonRosterEndpoint(input.role)}`
    )

    return {
      members: response.data,
      errorMessage: null
    }
  } catch (error) {
    return {
      members: [],
      errorMessage: normalizeParticipantApiError(error).message
    }
  }
}

function normalizeUrl(value: string | null | undefined) {
  const normalized = value?.trim()

  return normalized ? normalized : null
}

export function getPublishedHackathonRosterLinks(member: Pick<
  PublishedHackathonRosterMember,
  'xProfileUrl' | 'linkedinProfileUrl' | 'githubProfileUrl'
>) {
  const links: PublishedHackathonRosterLink[] = []
  const xProfileUrl = normalizeUrl(member.xProfileUrl)
  const linkedinProfileUrl = normalizeUrl(member.linkedinProfileUrl)
  const githubProfileUrl = normalizeUrl(member.githubProfileUrl)

  if (xProfileUrl) {
    links.push({
      key: 'x',
      label: 'X',
      href: xProfileUrl
    })
  }

  if (linkedinProfileUrl) {
    links.push({
      key: 'linkedin',
      label: 'LinkedIn',
      href: linkedinProfileUrl
    })
  }

  if (githubProfileUrl) {
    links.push({
      key: 'github',
      label: 'GitHub',
      href: githubProfileUrl
    })
  }

  return links
}
