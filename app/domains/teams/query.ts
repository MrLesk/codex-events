import type { LocationQueryValue } from 'vue-router'

function getFirstQueryValue(value: LocationQueryValue | LocationQueryValue[] | null | undefined) {
  if (value === null || value === undefined) {
    return null
  }

  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value
}

export function normalizeTeamSlugQueryValue(value: LocationQueryValue | LocationQueryValue[] | null | undefined) {
  const firstValue = getFirstQueryValue(value)

  if (typeof firstValue !== 'string') {
    return null
  }

  const normalized = firstValue.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

export function buildAccountEventTeamsTabHref(eventSlug: string, teamSlug?: string | null) {
  const encodedEventSlug = encodeURIComponent(eventSlug.trim())
  const normalizedTeamSlug = teamSlug?.trim().toLowerCase() ?? ''
  const baseHref = `/account/events/${encodedEventSlug}?tab=teams`

  if (!normalizedTeamSlug) {
    return baseHref
  }

  return `${baseHref}&team=${encodeURIComponent(normalizedTeamSlug)}`
}

export function buildAccountEventWorkspaceTabHref(eventSlug: string) {
  const encodedEventSlug = encodeURIComponent(eventSlug.trim())
  return `/account/events/${encodedEventSlug}?tab=workspace`
}

export function buildAbsoluteAccountEventTeamsTabHref(
  origin: string,
  eventSlug: string,
  teamSlug?: string | null
) {
  return new URL(buildAccountEventTeamsTabHref(eventSlug, teamSlug), origin).toString()
}

export function isSharedTeamSelection(input: {
  selectedTeamSlug?: string | null
  currentTeamId?: string | null
  currentTeamSlug?: string | null
  ownTeamId?: string | null
}) {
  const normalizedSelectedTeamSlug = normalizeTeamSlugQueryValue(input.selectedTeamSlug)
  const normalizedCurrentTeamSlug = normalizeTeamSlugQueryValue(input.currentTeamSlug)

  if (!normalizedSelectedTeamSlug || normalizedCurrentTeamSlug !== normalizedSelectedTeamSlug) {
    return false
  }

  return input.currentTeamId !== null && input.currentTeamId !== input.ownTeamId
}

export function shouldSyncSelectedTeamSlug(input: {
  selectedTeamSlug?: string | null
  previousTeamSlug?: string | null
  nextTeamSlug?: string | null
}) {
  const normalizedSelectedTeamSlug = normalizeTeamSlugQueryValue(input.selectedTeamSlug)
  const normalizedPreviousTeamSlug = normalizeTeamSlugQueryValue(input.previousTeamSlug)
  const normalizedNextTeamSlug = normalizeTeamSlugQueryValue(input.nextTeamSlug)

  if (!normalizedSelectedTeamSlug || !normalizedPreviousTeamSlug || !normalizedNextTeamSlug) {
    return false
  }

  return normalizedSelectedTeamSlug === normalizedPreviousTeamSlug
    && normalizedSelectedTeamSlug !== normalizedNextTeamSlug
}
