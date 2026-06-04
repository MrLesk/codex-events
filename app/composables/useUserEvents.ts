import type { PublicEventState } from '~/domains/events/presentation'

export type UserApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'withdrawn'
export type UserSubmissionStatus = 'draft' | 'submitted' | 'withdrawn' | 'locked' | 'disqualified' | null
export type UserEventRole = 'event_admin' | 'judge' | 'staff'
export type UserEventPrimaryActionIcon = 'i-lucide-arrow-up-right' | 'i-lucide-users' | 'i-lucide-rocket'

export interface UserEventEntry {
  id: string
  slug: string
  name: string
  description: string
  state: PublicEventState
  city: string
  country: string
  address: string
  bannerImageUrl: string | null
  backgroundImageUrl: string | null
  displayBackgroundImageUrl: string | null
  registrationOpensAt: string
  registrationClosesAt: string
  submissionOpensAt: string
  submissionClosesAt: string
  applicationStatus: UserApplicationStatus | null
  team: {
    id: string
    name: string
    slug: string
    role: 'member' | 'admin'
  } | null
  submissionStatus: UserSubmissionStatus
  roles: UserEventRole[]
}

export interface UserEventsResponse {
  data: {
    current: UserEventEntry[]
    past: UserEventEntry[]
  }
}

export interface UserEventPrimaryAction {
  label: string
  to: string
  icon: UserEventPrimaryActionIcon
}

function startCase(value: string) {
  return value
    .split('_')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function formatUserApplicationStatus(status: UserApplicationStatus) {
  return startCase(status)
}

export function resolveUserApplicationStatusColor(status: UserApplicationStatus) {
  switch (status) {
    case 'submitted':
      return 'warning'
    case 'approved':
      return 'success'
    case 'rejected':
      return 'error'
    case 'withdrawn':
      return 'neutral'
  }
}

export function formatUserSubmissionStatus(status: UserSubmissionStatus) {
  return status ? startCase(status) : 'No submission'
}

export function resolveUserSubmissionStatusColor(status: UserSubmissionStatus) {
  switch (status) {
    case null:
      return 'neutral'
    case 'draft':
      return 'warning'
    case 'submitted':
      return 'primary'
    case 'locked':
      return 'info'
    case 'withdrawn':
      return 'neutral'
    case 'disqualified':
      return 'error'
  }
}

export function formatUserEventRole(role: UserEventRole) {
  if (role === 'event_admin') {
    return 'Event admin'
  }

  if (role === 'judge') {
    return 'Judge'
  }

  return 'Staff'
}

export function resolveUserEventPrimaryAction(entry: UserEventEntry): UserEventPrimaryAction {
  if (entry.team) {
    return {
      label: entry.state === 'completed' ? 'Review workspace' : 'Open workspace',
      to: `/account/events/${entry.slug}?tab=workspace`,
      icon: 'i-lucide-arrow-up-right'
    }
  }

  if (entry.applicationStatus === 'approved') {
    return {
      label: entry.state === 'completed' ? 'Review workspace' : 'Open workspace',
      to: `/account/events/${entry.slug}?tab=workspace`,
      icon: 'i-lucide-users'
    }
  }

  return {
    label: entry.applicationStatus === null ? 'Open details' : 'Review program details',
    to: `/events/${entry.slug}`,
    icon: entry.applicationStatus === null ? 'i-lucide-arrow-up-right' : 'i-lucide-rocket'
  }
}

export function useUserEvents() {
  const user = useUser()

  return useApiFetch<UserEventsResponse>('/api/account/events', {
    key: () => `account-events:${user.value?.sub ?? 'anonymous'}`,
    default: () => ({
      data: {
        current: [],
        past: []
      }
    }),
    watch: [computed(() => user.value?.sub ?? null)]
  })
}
