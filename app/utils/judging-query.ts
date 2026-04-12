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

export function normalizeJudgeAssignmentIdQueryValue(
  value: LocationQueryValue | LocationQueryValue[] | null | undefined
) {
  const firstValue = getFirstQueryValue(value)

  if (typeof firstValue !== 'string') {
    return null
  }

  const normalized = firstValue.trim()
  return normalized.length > 0 ? normalized : null
}

export function buildAccountHackathonJudgingTabHref(
  hackathonSlug: string,
  assignmentId?: string | null
) {
  const encodedHackathonSlug = encodeURIComponent(hackathonSlug.trim())
  const normalizedAssignmentId = assignmentId?.trim() ?? ''
  const baseHref = `/account/hackathons/${encodedHackathonSlug}?tab=judging`

  if (!normalizedAssignmentId) {
    return baseHref
  }

  return `${baseHref}&assignment=${encodeURIComponent(normalizedAssignmentId)}`
}
