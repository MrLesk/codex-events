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

export function buildAccountHackathonTeamTabHref(hackathonSlug: string, teamSlug?: string | null) {
  const encodedHackathonSlug = encodeURIComponent(hackathonSlug.trim())
  const normalizedTeamSlug = teamSlug?.trim().toLowerCase() ?? ''
  const baseHref = `/account/hackathons/${encodedHackathonSlug}?tab=team`

  if (!normalizedTeamSlug) {
    return baseHref
  }

  return `${baseHref}&team=${encodeURIComponent(normalizedTeamSlug)}`
}
