import { normalizeApiError } from '~/lib/api'

export type PublishedEventRosterRole = 'judge' | 'staff'

export interface PublishedEventRosterMember {
  id: string
  fullName: string
  company: string | null
  bio: string | null
  xProfileUrl: string | null
  linkedinProfileUrl: string | null
  githubProfileUrl: string | null
  profileIconUpdatedAt: string | null
}

export interface PublishedEventRosterLink {
  key: 'x' | 'linkedin' | 'github'
  label: 'X' | 'LinkedIn' | 'GitHub'
  href: string
}

export interface PublishedEventRosterLoadState {
  members: PublishedEventRosterMember[]
  errorMessage: string | null
}

export function getPublishedEventRosterEndpoint(role: PublishedEventRosterRole) {
  return role === 'judge' ? 'judges' : 'staff'
}

export function createEmptyPublishedEventRosterLoadState(): PublishedEventRosterLoadState {
  return {
    members: [],
    errorMessage: null
  }
}

export async function loadPublishedEventRoster(
  request: (path: string) => Promise<{ data: PublishedEventRosterMember[] }>,
  input: {
    eventId: string
    role: PublishedEventRosterRole
  }
): Promise<PublishedEventRosterLoadState> {
  try {
    const response = await request(
      `/api/events/${input.eventId}/${getPublishedEventRosterEndpoint(input.role)}`
    )

    return {
      members: response.data,
      errorMessage: null
    }
  } catch (error) {
    return {
      members: [],
      errorMessage: normalizeApiError(error).message
    }
  }
}

function normalizeUrl(value: string | null | undefined) {
  const normalized = value?.trim()

  return normalized ? normalized : null
}

export function getPublishedEventRosterLinks(member: Pick<
  PublishedEventRosterMember,
  'xProfileUrl' | 'linkedinProfileUrl' | 'githubProfileUrl'
>) {
  const links: PublishedEventRosterLink[] = []
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
